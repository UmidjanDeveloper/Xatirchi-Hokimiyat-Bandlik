import type { VazifaBlogi, VazifaQatori } from './vazifalar';
import type { MurojaatKorsatkichlari } from './murojaatlar';
import type { KursKorsatkichlari } from './kurslar';
import type { BuyurtmaKorsatkichlari } from './buyurtmalar';
import type { YordamKorsatkichlari } from './yordam-dasturlari';
import { murojaatKorsatkichlari } from './murojaatlar';
import { kursKorsatkichlari } from './kurslar';
import { buyurtmaKorsatkichlari } from './buyurtmalar';
import { yordamKorsatkichlari } from './yordam-dasturlari';

/**
 * ============================================================
 *  MODULLAR NATIJASI — RAHBAR VA HOKIM UCHUN JAMLAMA
 *
 *  Murojaat, kurs, buyurtma va yordam dasturlari modullarining
 *  JAMLANGAN natijasi: ism, telefon, manzil yo'q, faqat sonlar.
 *  Shuning uchun hokim ham ko'ra oladi (modulning o'ziga u
 *  kirmaydi: u yerda shaxsiy ma'lumot bor).
 *
 *  ── Qoidalar ──
 *
 *   · Har son "n / m" shaklida, maxraj bilan. Maxraj 0 bo'lsa "0%"
 *     yozilmaydi — "ma'lumot yo'q": 0 ta murojaatdan 0 ta javob
 *     "hammasi yomon" degani emas.
 *   · Maxraj 10 dan kichik bo'lsa "namuna kichik" deyiladi: 2 dan 1 —
 *     bu 50% emas, shunchaki 1 ta holat.
 *   · Hammasi xodim qo'lda qayd etgan ma'lumot; qayd etilmagan narsa
 *     "ro'y bermagan" degani emas — blokning o'zida aytiladi.
 * ============================================================
 */

export const MODUL_KICHIK_NAMUNA = 10;

export interface ModullarMetrikasi {
  murojaat: MurojaatKorsatkichlari;
  kurs: KursKorsatkichlari;
  buyurtma: BuyurtmaKorsatkichlari;
  yordam: YordamKorsatkichlari;
}

/** "n / m" qatori: maxraj 0 - "ma'lumot yo'q", maxraj < 10 - "namuna kichik" */
export function nisbatQatori(id: string, matn: string, n: number, m: number, izoh?: string): VazifaQatori {
  const qismlar: string[] = [];
  if (m <= 0) {
    qismlar.push('маълумот йўқ');
  } else {
    qismlar.push(`${n} / ${m} · ${Math.round((n / m) * 100)}%`);
    if (m < MODUL_KICHIK_NAMUNA) qismlar.push('намуна кичик');
  }
  if (izoh) qismlar.push(izoh);
  return { id, matn, qoshimcha: qismlar.join(' · ') };
}

/** Sof hisob: tayyor ko'rsatkichlardan blok yasaydi (DB'siz sinaladi) */
export function modullarBlogi(k: ModullarMetrikasi): VazifaBlogi {
  const javobli = k.murojaat.javob.vaqtida + k.murojaat.javob.kechikib;
  const ochiq = k.murojaat.yangi + k.murojaat.jarayonda;
  const kursMaxraj = k.kurs.tamomlagan + k.kurs.tashlagan;

  const qatorlar: VazifaQatori[] = [
    nisbatQatori('murojaat-vaqtida', 'Мурожаатлар: жавоб муддатида берилган', k.murojaat.javob.vaqtida, javobli),
    nisbatQatori(
      'murojaat-kechikkan',
      'Мурожаатлар: очиқлардан муддати ўтгани',
      k.murojaat.muddat.kechikkan,
      ochiq
    ),
    nisbatQatori('kurs-tamomlagan', 'Курслар: тамомлаганлар (тамомлаган + ташлаган орасида)', k.kurs.tamomlagan, kursMaxraj),
    nisbatQatori(
      'kurs-ish',
      'Курслар: тамомлаб, иши ҳужжат билан тасдиқланганлар',
      k.kurs.natija.tasdiqlangan,
      k.kurs.natija.muddatiOtgan,
      k.kurs.natija.qaydEtilmagan > 0 ? `қайд этилмаган: ${k.kurs.natija.qaydEtilmagan} (бу «иш топмаган» дегани эмас)` : undefined
    ),
    nisbatQatori(
      'buyurtma-tasdiq',
      'Маҳаллий буюртмалар: икки томон тасдиқлаган',
      k.buyurtma.tasdiq.ikkiTomonlama,
      k.buyurtma.bajarilgan
    ),
    nisbatQatori(
      'yordam-amalda',
      'Ёрдам дастурлари: амалдагилари',
      k.yordam.amalda,
      k.yordam.jami,
      k.yordam.tekshirishKerak > 0 ? `манбадан текшириш керак: ${k.yordam.tekshirishKerak}` : undefined
    ),
  ];

  const muammo = k.murojaat.muddat.kechikkan + k.buyurtma.tasdiq.kechikkan + k.yordam.tekshirishKerak;

  return {
    kalit: 'modullar-natijasi',
    nomi: 'Модуллар натижаси',
    izoh: 'Мурожаат, курс, буюртма ва ёрдам дастурлари: жамланма (шахсий маълумотсиз)',
    soni: muammo,
    ogohlik: muammo > 0 ? 'diqqat' : 'tinch',
    qatorlar,
    hisoblash: {
      usuli:
        'Ҳар сон «n / m» кўринишида; m — тегишли ёзувлар сони. m = 0 бўлса «маълумот йўқ» (0% эмас), m < 10 бўлса «намуна кичик»',
      manbasi: 'Модуллар жадваллари (мурожаат, курс йўлланмаси, буюртма, ёрдам дастури)',
      ogohlik:
        'Ҳаммаси ходим қўлда қайд этган маълумот: қайд этилмаган нарса «рўй бермаган» дегани эмас. Рақам қарор эмас, текшириш учун сигнал',
    },
  };
}

/** Ko'rsatkichlarni olish: har biri alohida, bittasi yiqilsa blok umuman chiqmaydi (yolg'on "0" bo'lmasin) */
export async function modullarMetrikasi(hozir = new Date()): Promise<ModullarMetrikasi> {
  const [murojaat, kurs, buyurtma, yordam] = await Promise.all([
    murojaatKorsatkichlari(undefined, hozir),
    kursKorsatkichlari(undefined, hozir),
    buyurtmaKorsatkichlari(undefined, hozir),
    yordamKorsatkichlari(hozir),
  ]);
  return { murojaat, kurs, buyurtma, yordam };
}
