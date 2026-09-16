import type { Prisma } from '@prisma/client';
import { itYonalishimi } from './constants';
import { itKasbimi } from './constants';

/**
 * ============================================================
 *  XATLOVDAN CHORA-TADBIR — AVTOMATIK ZANJIR
 *
 *  ── Nima uchun kerak bo'ldi ──
 *
 *  Hokim "Chora-tadbirlar rejasi" sahifasini ochdi va u yerda
 *  NOL turardi: 0 topshiriq, 0% bajarilish. Holbuki mahalla
 *  xodimlari xatlov o'tkazayotgan, fuqarolar kasb so'ragan,
 *  moliyaviy ehtiyoj bildirgan edi.
 *
 *  Sabab oddiy edi: chora-tadbir FAQAT qo'lda yaratilardi.
 *  Ya'ni mahalla xodimi xonadonni xatlovdan o'tkazadi, fuqaro
 *  "payvandchilik o'rganmoqchiman" deydi — va bu gap anketa
 *  ichida yotib qolardi. Hech kimga topshiriq bermasdi.
 *
 *  Natijada hokim "kim nima qildi, kimni qayerga yo'naltirdi"
 *  degan savolga javob ololmasdi. Ma'lumot bor edi, HARAKAT
 *  yo'q edi.
 *
 *  Bu modul o'sha bo'shliqni yopadi: xatlov yakunlanganda
 *  anketadagi ehtiyojlar o'z-o'zidan topshiriqqa aylanadi —
 *  mas'ul tashkilot va muddat bilan.
 *
 *  ── Nega kam, lekin aniq ──
 *
 *  Har bir belgidan topshiriq yasash mumkin edi, lekin unda
 *  ro'yxat yuzlab qatorga aylanardi va hech kim uni o'qimasdi.
 *  Shuning uchun faqat CHORA CHIQADIGAN holatlar olingan:
 *  aniq mas'uli va aniq keyingi qadami bori.
 *
 *  ── Takrorlanmaslik ──
 *
 *  Xatlov tahrirlanib qayta yuborilishi mumkin. Shuning uchun
 *  har topshiriq `muammo` matni bilan tanib olinadi: xuddi shu
 *  xonadon (yoki fuqaro) uchun xuddi shu muammo allaqachon
 *  bo'lsa, ikkinchisi yaratilmaydi.
 * ============================================================
 */

/** Topshiriq muddati - bugundan necha kun keyin */
function muddat(kun: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + kun);
  return d;
}

export interface ChoraManbai {
  id: string;
  moliyaEhtiyoji: boolean | null;
  talabQilinganMablag: bigint | null;
  maktabYoshdagi: number | null;
  maktabQamrovda: number | null;
  uzoqDavolanish: boolean | null;
  nogironlikBor: boolean | null;
  ishsizlar: {
    id: string;
    fish: string;
    kasbHunarEhtiyoji: boolean | null;
    organmoqchiKasb: string | null;
    itShaharchaVaucheri: boolean | null;
  }[];
}

export interface YangiChora {
  householdId: string | null;
  ishsizId: string | null;
  muammo: string;
  sababi: string | null;
  yechim: string;
  masulTashkilot: string;
  muddat: Date;
}

/**
 * Xatlovdan kelib chiqadigan topshiriqlar ro'yxati.
 *
 * Faqat HISOBLAYDI - bazaga yozmaydi. Shu tufayli sinovdan
 * o'tkazish oson va qoidalarni baza bo'lmasdan ham tekshirish
 * mumkin.
 */
export function choralarniHisobla(x: ChoraManbai): YangiChora[] {
  const ro: YangiChora[] = [];

  /* ── Har bir ishsiz fuqaro bo'yicha ── */
  for (const p of x.ishsizlar) {
    /*
     * Ishsiz topilgan - bandlik markazi u bilan SUHBAT
     * o'tkazishi kerak. Bu zanjirning birinchi halqasi:
     * suhbatsiz na taklif, na joylashtirish bo'ladi.
     */
    ro.push({
      householdId: x.id,
      ishsizId: p.id,
      muammo: `${p.fish} — ишсиз, суҳбат ўтказилмаган`,
      sababi: 'Хатлов вақтида ишсиз деб қайд этилди',
      yechim: 'Бандлик маркази мутахассиси суҳбат ўтказсин ва мос иш ўрни таклиф қилсин',
      masulTashkilot: 'Bandlik markazi',
      muddat: muddat(14),
    });

    if (!p.kasbHunarEhtiyoji) continue;

    const kasb = (p.organmoqchiKasb ?? '').trim();
    const itmi = p.itShaharchaVaucheri || itKasbimi(kasb) || itYonalishimi(kasb);

    if (itmi) {
      /*
       * IT ning yo'li boshqa: tumanda guruh to'lishini kutmaydi,
       * bitta odam ham vaucher bilan yuboriladi. Shuning uchun
       * muddat ham qisqaroq.
       */
      ro.push({
        householdId: x.id,
        ishsizId: p.id,
        muammo: `${p.fish} — IT-шаҳарча ваучери расмийлаштирилмаган`,
        sababi: kasb ? `Ўрганмоқчи касби: ${kasb}` : 'IT йўналишини ўрганмоқчи',
        yechim:
          'Бандлик маркази ваучерни расмийлаштириб, фуқарони IT-шаҳарча дастурига йўналтирсин',
        masulTashkilot: 'Bandlik markazi',
        muddat: muddat(14),
      });
    } else if (kasb) {
      ro.push({
        householdId: x.id,
        ishsizId: p.id,
        muammo: `${p.fish} — «${kasb}» касбини ўрганиш истаги`,
        sababi: 'Хатлов вақтида касб-ҳунарга ўқиш истаги билдирилди',
        yechim: `«${kasb}» йўналиши бўйича курсга рўйхатга олинсин; гуруҳ тўлмаса, энг яқин тумандаги курс кўрилсин`,
        masulTashkilot: 'Kasb-hunar markazi',
        muddat: muddat(30),
      });
    }
  }

  /* ── Moliyaviy ehtiyoj ── */
  if (x.moliyaEhtiyoji && (x.talabQilinganMablag ?? 0n) > 0n) {
    const mln = Math.round(Number(x.talabQilinganMablag) / 1_000_000);
    ro.push({
      householdId: x.id,
      ishsizId: null,
      muammo: 'Хонадон кредит-субсидия сўраган',
      sababi: `Талаб қилинган маблағ: ${mln} млн сўм`,
      yechim: 'Банк ариза ва тақдим этилган ҳужжатларни кўриб чиқсин, жавобини хонадонга етказсин',
      masulTashkilot: 'Bank',
      muddat: muddat(30),
    });
  }

  /* ── Maktab yoshidagi bola ta'limdan tashqarida ── */
  const maktabYosh = x.maktabYoshdagi ?? 0;
  const qamrovda = x.maktabQamrovda ?? 0;
  if (maktabYosh > 0 && qamrovda < maktabYosh) {
    ro.push({
      householdId: x.id,
      ishsizId: null,
      muammo: `${maktabYosh - qamrovda} та мактаб ёшидаги бола таълим билан қамраб олинмаган`,
      sababi: `Хонадонда ${maktabYosh} та мактаб ёшидаги боладан ${qamrovda} таси мактабга қатнайди`,
      yechim: 'Халқ таълими бўлими сабабини аниқласин ва болани мактабга жалб қилсин',
      masulTashkilot: 'Xalq ta’limi',
      muddat: muddat(14),
    });
  }

  /* ── Uzoq davolanishga muhtoj a'zo ── */
  if (x.uzoqDavolanish) {
    ro.push({
      householdId: x.id,
      ishsizId: null,
      muammo: 'Хонадонда узоқ даволанишга муҳтож аъзо бор',
      sababi: 'Хатлов вақтида қайд этилди',
      yechim: 'Соғлиқни сақлаш бўлими тиббий кўрикдан ўтказсин ва зарур ёрдамни белгиласин',
      masulTashkilot: 'Sog‘liqni saqlash',
      muddat: muddat(21),
    });
  }

  /* ── Nogironligi bo'lgan shaxs ── */
  if (x.nogironlikBor) {
    ro.push({
      householdId: x.id,
      ishsizId: null,
      muammo: 'Хонадонда ногиронлиги бўлган шахс бор',
      sababi: 'Хатлов вақтида қайд этилди',
      yechim:
        'Ижтимоий ҳимоя бўлими нафақа ва имтиёзлар тўлиқ берилаётганини текширсин',
      masulTashkilot: 'Ijtimoiy himoya',
      muddat: muddat(21),
    });
  }

  return ro;
}

/**
 * Bu xonadon uchun HALI YOZILMAGAN topshiriqlar.
 *
 * Xatlov tahrirlanib qayta yuborilishi mumkin. Har safar
 * yangi topshiriq yaratilsa, ro'yxat bir xil qatorlar bilan
 * to'lib ketardi va hokim haqiqiy ishni ko'rmasdi. Shuning
 * uchun bor topshiriqlar `muammo` matni bo'yicha chiqarib
 * tashlanadi.
 *
 * Yozishdan ajratib qo'yilgan, chunki bir martalik skript
 * (`scripts/chora-toldirish.ts`) avval NIMA chiqishini
 * ko'rsatadi, keyin yozadi - va ikkovi bir xil qoida bilan
 * hisoblanishi shart.
 */
export async function yangiChoralar(
  tx: Prisma.TransactionClient,
  manba: ChoraManbai
): Promise<YangiChora[]> {
  const kerakli = choralarniHisobla(manba);
  if (kerakli.length === 0) return [];

  /* Shu xonadon bo'yicha ALLAQACHON bor topshiriqlar */
  const mavjud = await tx.actionPlan.findMany({
    where: { householdId: manba.id },
    select: { muammo: true },
  });
  const bor = new Set(mavjud.map((m) => m.muammo));

  return kerakli.filter((k) => !bor.has(k.muammo));
}

/**
 * Yangi topshiriqlarni bazaga yozadi - TAKRORLAMASDAN.
 *
 * @returns nechta YANGI topshiriq yaratildi
 */
export async function choralarniYoz(
  tx: Prisma.TransactionClient,
  manba: ChoraManbai,
  yaratganId: string
): Promise<number> {
  const yangi = await yangiChoralar(tx, manba);
  if (yangi.length === 0) return 0;

  await tx.actionPlan.createMany({
    data: yangi.map((k) => ({ ...k, yaratganId })),
  });

  return yangi.length;
}
