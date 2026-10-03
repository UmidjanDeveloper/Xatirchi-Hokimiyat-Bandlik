import { z } from 'zod';
import type { Rol } from '@prisma/client';
import { tahlilOl } from '@/lib/tahlil';
import { tumanHolati } from '@/lib/tuman-holati';
import { bolimlarTahlili, type BolimlarTahlili, type UlushQatori } from '@/lib/bolimlar-tahlili';
import { vazifalarim } from '@/lib/vazifalar';
import { murojaatKorsatkichlari } from '@/lib/murojaatlar';
import { ishlarHolati, navbatHolati, zaxiraHolati } from '@/lib/tizim-kuzatuvi';
import { serverXatosi } from '@/lib/tizim-kuzatuvi';
import { AMAL_KALITLARI, amalRolgaOchiqmi, taklifYarat, type AmalKaliti } from './amallar';
import { mahallaKorinishi, mahallaTop } from './mahalla';
import { DAVRLAR, ISHSIZ_HOLATLARI, MUROJAAT_FILTRLARI, rolSahifalari, sahifaManzili, hisobotSahifasi } from './sahifalar';
import type { AgentKontekst, Asbob, AsbobNatijasi, Manba } from './turlar';

/**
 * ============================================================
 *  HUDHUD ASBOBLARI
 *
 *  Model bazaga to'g'ridan-to'g'ri murojaat qila olmaydi. U faqat shu
 *  asboblarni chaqiradi, har bir asbob esa MAVJUD, rolga bog'langan
 *  kutubxona funksiyasini chaqiradi (panel, tablo, vazifalar taxtasi
 *  ishlatadigan o'sha funksiyalar). Shuning uchun agent ekranda
 *  ko'rinadigan raqamdan boshqa raqam aytmaydi.
 *
 *  ── Shaxsiy ma'lumot ──
 *
 *  Asbob natijasi tashqi modelga ketadi (GPT §18: "shaxsiy ma'lumotlar
 *  tashqi modelga zaruratsiz yuborilmasin"). Shuning uchun natijada:
 *    · faqat SONLAR, foizlar, mahalla nomlari va sanalar bor;
 *    · fuqaro ismi, telefon, manzil, ro'yxat qatorlari YO'Q;
 *    · "ro'yxatning o'zi" kerak bo'lsa agent SAHIFANI OCHADI — ro'yxat
 *      xodimning o'z logini bilan, brauzerda ko'rinadi.
 *
 *  ── Ma'lumot yetishmasa ──
 *
 *  Har asbob "yetishmayotgan narsa"ni aniq aytadi (masalan, xatlov hali
 *  boshlanmagan). Model bunda taxmin qilmaydi (tizim ko'rsatmasiga qarang).
 * ============================================================
 */

const mahallaSxemasi = z.string().trim().min(2).max(80).optional();

function manba(nom: string, hozir: Date): Manba {
  return { nom, vaqt: hozir.toISOString() };
}

function foiz(qism: number, butun: number): number | null {
  return butun > 0 ? Math.round((qism / butun) * 1000) / 10 : null;
}

/** Mahalla nomini topadi: topilsa id, aks holda model uchun tushunarli xato */
async function mahallaniHalQil(
  ctx: AgentKontekst,
  nom: string | undefined
): Promise<
  | { ok: true; id: string | undefined; nomi: string }
  | { ok: false; natija: AsbobNatijasi }
> {
  if (!nom) return { ok: true, id: undefined, nomi: 'Xatirchi tumani' };
  const t = await mahallaTop(nom);
  if (t.holat === 'topildi') {
    return { ok: true, id: t.mahalla.id, nomi: mahallaKorinishi(t.mahalla, ctx.alifbo) };
  }
  return {
    ok: false,
    natija: {
      malumot:
        t.holat === 'noaniq'
          ? {
              xato: 'mahalla_noaniq',
              izoh: "Bir nechta mahalla mos keldi. Foydalanuvchidan qaysi biri ekanini so'rang.",
              variantlar: t.variantlar.map((m) => mahallaKorinishi(m, ctx.alifbo)),
            }
          : { xato: 'mahalla_topilmadi', izoh: "Bunday nomli mahalla topilmadi. Nomni qayta so'rang." },
      manbalar: [],
    },
  };
}

const rollar = {
  hammasi: ['HOKIM', 'BANDLIK', 'BANDLIK_RAHBAR', 'ADMIN'] as const satisfies readonly Rol[],
  boshqaruv: ['HOKIM', 'BANDLIK_RAHBAR', 'ADMIN'] as const satisfies readonly Rol[],
  admin: ['ADMIN'] as const satisfies readonly Rol[],
};

function ulush(q: UlushQatori[], n = 5): { qiymat: string; soni: number }[] {
  return [...q].sort((a, b) => b.soni - a.soni).slice(0, n).map((x) => ({ qiymat: x.qiymat, soni: x.soni }));
}

/** Bo'lim nomi -> modelga beriladigan jamlama (faqat sonlar) */
function bolimniAjrat(b: BolimlarTahlili, bolim: string): Record<string, unknown> | null {
  switch (bolim) {
    case 'oila':
      return { ...b.oila };
    case 'mehnat':
      return { ...b.mehnat };
    case 'tadbirkorlik':
      return {
        istagi: b.tadbirkorlik.istagi,
        moliyaEhtiyoji: b.tadbirkorlik.moliyaEhtiyoji,
        issiqxonaTalabi: b.tadbirkorlik.issiqxonaTalabi,
        ijaraYer: b.tadbirkorlik.ijaraYer,
        sohalar: ulush(b.tadbirkorlik.sohalar),
        moliyaTuri: ulush(b.tadbirkorlik.moliyaTuri),
      };
    case 'chet_el':
      return {
        chetElMehnatiOila: b.chetEl.oila,
        chetElIshchi: b.chetEl.ishchi,
        oylikPulSom: b.chetEl.oylikSom,
        pulKelayotganOila: b.chetEl.pulliOila,
        davlatlar: ulush(b.chetEl.davlatlar),
      };
    case 'daromad':
      return {
        daromadYozganOila: b.daromad.oila,
        jami: b.daromad.jami,
        ortacha: b.daromad.ortacha,
        manbalar: ulush(b.daromad.manbalar),
        sabablar: ulush(b.daromad.sabablar),
      };
    case 'talim':
      return { ...b.talim };
    case 'soglik':
      return { ...b.soglik };
    case 'uy_joy':
      return {
        elektrYoq: b.uyJoy.elektrYoq,
        gazYoq: b.uyJoy.gazYoq,
        kanalizatsiyaYoq: b.uyJoy.kanalizatsiyaYoq,
        sugorishYoq: b.uyJoy.sugorishYoq,
        holati: ulush(b.uyJoy.holati),
        ichimlikSuvi: ulush(b.uyJoy.ichimlikSuvi),
      };
    case 'ijtimoiy':
      return { ...b.ijtimoiy };
    case 'yer':
      return {
        tomorqaOila: b.yer.tomorqaOila,
        ekinMaydoniGa: b.yer.ekinMaydoni,
        qoshimchaYerOila: b.yer.qoshimchaYerOila,
        chorvaOila: b.yer.chorvaOila,
        hunarmandOila: b.yer.hunarmandOila,
        chorvaTurlari: ulush(b.yer.chorvaTurlari),
      };
    case 'infratuzilma':
      return { muammolar: ulush(b.infratuzilma.muammolar, 8) };
    default:
      return null;
  }
}

export const BOLIM_KALITLARI = [
  'oila', 'mehnat', 'tadbirkorlik', 'chet_el', 'daromad', 'talim', 'soglik', 'uy_joy', 'ijtimoiy', 'yer', 'infratuzilma',
] as const;

const QAMROV_SARALASH = ['xatlov_kam', 'xatlov_kop', 'natija_kam', 'natija_kop'] as const;

/** Asboblar ro'yxati. Tartib modelga ko'rsatiladigan tartib. */
export const ASBOBLAR: readonly Asbob[] = [
  {
    nomi: 'korsatkichlar',
    tavsif:
      "Asosiy ko'rsatkichlar: xatlovdan o'tgan xonadonlar, topilgan ishsizlar, shaxsiy anketasi borlar, joylashtirilganlar, voronka. " +
      "Butun tuman yoki bitta mahalla uchun. 'Nechta?', 'qanday ahvol?', 'qancha foiz?' kabi savollar uchun.",
    parametrlar: {
      type: 'object',
      properties: { mahalla: { type: 'string', description: "Mahalla nomi (ixtiyoriy). Bo'sh qoldirilsa butun tuman." } },
      additionalProperties: false,
    },
    rollar: rollar.hammasi,
    async bajar(ctx, args) {
      const a = z.object({ mahalla: mahallaSxemasi }).parse(args ?? {});
      const h = await mahallaniHalQil(ctx, a.mahalla);
      if (!h.ok) return h.natija;

      const t = await tahlilOl(h.id, 'oy');
      const j = t.jami;
      const malumot: Record<string, unknown> = {
        hudud: h.nomi,
        xatlovBoshlanganmi: j.xatlovXonadon > 0,
        svodJadvali: { xonadon: j.bazaXonadon, ishsiz: j.bazaIshsiz, aholi: j.bazaAholi },
        xatlov: {
          xatlovdanOtganXonadon: j.xatlovXonadon,
          xonadonFoizi: foiz(j.xatlovXonadon, j.bazaXonadon),
          topilganIshsiz: j.xatlovdaTopilgan,
          topilganFoizi: foiz(j.xatlovdaTopilgan, j.bazaIshsiz),
          shaxsiyAnketasiBor: j.aniqlangan,
          anketasiz: j.anketasiz,
        },
        natija: {
          joylashtirilgan: j.joylashtirilgan,
          joylashtirilganFoizi_topilganlardan: foiz(j.joylashtirilgan, j.xatlovdaTopilgan),
          ishsizlikkaTasir_foiz: foiz(j.joylashtirilgan, j.bazaIshsiz),
          radEtgan: j.radEtgan,
          uzoqMuddatliIshsiz_12oydanOrtiq: j.uzoqIshsiz,
          mustahkamlashTekshiruviKutayotgan: j.tekshiruvKutayotgan,
        },
        voronka: t.voronka.map((v) => ({ bosqich: v.holati, soni: v.soni })),
        tarifi: {
          topilganIshsiz: "xodim xonadon anketasida 'nechta ishsiz bor' deb yozgan son; shaxsiy anketalar bilan alohida tasdiqlanmagan",
          joylashtirilgan: "ishsiz fuqaro 'joylashtirildi' yoki 'tasdiqlandi' holatida; ishga joylashish DALIL bilan tasdiqlanganmi, bu son buni hisobga olmaydi",
          ishsizlikkaTasir: "joylashtirilganlarning svod jadvalidagi ishsizlar soniga nisbati; xatlov tugamaguncha past chiqadi",
        },
      };
      if (j.xatlovXonadon === 0) {
        malumot.yetishmayotgan = "Xatlov hali boshlanmagan: xonadon va ishsiz sonlari faqat svod jadvalidan, xatlov natijasi yo'q";
      }

      /* Butun tuman uchun: dalil bilan tasdiqlangan natija alohida (xodim aytgani va hujjat bilan tasdiqlangani) */
      if (!h.id) {
        const th = await tumanHolati(ctx.hozir);
        malumot.dalilBilan = {
          xodimBildirganJoylashgan: th.joylashtirilgan,
          dalilBilanTasdiqlangan: th.tasdiqlanganJoylashuv,
          shundanRasmiyManba: th.rasmiyTasdiqlangan,
          tekshiruvKutayotganDalil: th.tekshiruvKutayotgan,
          oltmishKunDalilsiz: th.dalilsizJoylashuv,
        };
        malumot.tuman = {
          boshlaganMahalla: th.boshlaganMahalla,
          boshlamaganMahalla: th.boshlamaganMahalla,
          jamiMahalla: th.jamiMahalla,
          ochiqIshOrni: th.ochiqOrin,
          kechikkanTopshiriq: th.kechikkanTopshiriq,
          moderatsiyaKutayotganElon: th.moderatsiyaKutmoqda,
        };
      }

      return {
        malumot,
        manbalar: [manba('Хатлов анкеталари ва ишсиз фуқаро ёзувлари', ctx.hozir)],
      };
    },
  },

  {
    nomi: 'mahallalar_qamrovi',
    tavsif:
      "Mahallalarni xatlov qamrovi yoki natija bo'yicha solishtirish: kim orqada, kim oldinda. " +
      "Bu REYTING EMAS: faqat tanlangan ko'rsatkich va mahalla kattaligi (xonadon soni) ko'rsatiladi.",
    parametrlar: {
      type: 'object',
      properties: {
        saralash: {
          type: 'string',
          enum: [...QAMROV_SARALASH],
          description: "xatlov_kam: xatlov qamrovi eng past; xatlov_kop: eng yuqori; natija_kam/natija_kop: joylashtirilganlar ulushi bo'yicha",
        },
        soni: { type: 'integer', minimum: 1, maximum: 10, description: 'Nechta mahalla (odatiy 5)' },
      },
      required: ['saralash'],
      additionalProperties: false,
    },
    rollar: rollar.hammasi,
    async bajar(ctx, args) {
      const a = z.object({ saralash: z.enum(QAMROV_SARALASH), soni: z.number().int().min(1).max(10).optional() }).parse(args ?? {});
      const t = await tahlilOl(undefined, 'oy');
      const qatorlar = t.qamrov
        .filter((m) => m.bazaXonadon > 0)
        .map((m) => ({
          mahalla: mahallaKorinishi(m, ctx.alifbo),
          xatlovXonadon: m.xatlovXonadon,
          svodXonadon: m.bazaXonadon,
          xatlovFoizi: foiz(m.xatlovXonadon, m.bazaXonadon) ?? 0,
          svodIshsiz: m.bazaIshsiz,
          joylashtirilgan: m.joylashtirilgan,
          natijaFoizi: foiz(m.joylashtirilgan, m.bazaIshsiz),
        }));

      const kalit = a.saralash.startsWith('xatlov') ? 'xatlovFoizi' : 'natijaFoizi';
      const kamayish = a.saralash.endsWith('_kam');
      qatorlar.sort((x, y) => {
        const p = (x[kalit] ?? -1) - (y[kalit] ?? -1);
        return kamayish ? p : -p;
      });
      const xatlovBoshlangan = t.jami.xatlovXonadon > 0;
      return {
        malumot: {
          saralash: a.saralash,
          mahallalar: qatorlar.slice(0, a.soni ?? 5),
          jamiMahalla: qatorlar.length,
          izoh:
            "Bu reyting emas. Xatlov foizi — xatlovdan o'tgan xonadonlarning svod jadvalidagi xonadonlarga nisbati. " +
            "Mahalla kattaligi turlicha: kichik mahallada bitta xonadon foizga kuchli ta'sir qiladi.",
          ...(xatlovBoshlangan ? {} : { yetishmayotgan: "Xatlov hali boshlanmagan: hamma mahallada xatlov qamrovi 0" }),
        },
        manbalar: [manba('Маҳаллалар қамрови (хатлов ва свод жадвали)', ctx.hozir)],
      };
    },
  },

  {
    nomi: 'oila_bolimlari',
    tavsif:
      "Xatlov anketasining bitta bo'limi bo'yicha jamlama: oila (bolalar), mehnat, tadbirkorlik, chet_el (chet elda ishlayotganlar va pul), " +
      "daromad, talim, soglik, uy_joy, ijtimoiy, yer, infratuzilma. Butun tuman yoki bitta mahalla.",
    parametrlar: {
      type: 'object',
      properties: {
        bolim: { type: 'string', enum: [...BOLIM_KALITLARI] },
        mahalla: { type: 'string', description: "Mahalla nomi (ixtiyoriy)" },
      },
      required: ['bolim'],
      additionalProperties: false,
    },
    rollar: rollar.hammasi,
    async bajar(ctx, args) {
      const a = z.object({ bolim: z.enum(BOLIM_KALITLARI), mahalla: mahallaSxemasi }).parse(args ?? {});
      const h = await mahallaniHalQil(ctx, a.mahalla);
      if (!h.ok) return h.natija;
      const b = await bolimlarTahlili(h.id);
      if (b.xonadon === 0) {
        return {
          malumot: { hudud: h.nomi, bolim: a.bolim, yetishmayotgan: "Xatlov bu hudud uchun hali natija bermagan: bo'lim jamlanmasi yo'q" },
          manbalar: [manba('Бўлимлар бўйича хатлов жамланмаси', ctx.hozir)],
        };
      }
      return {
        malumot: {
          hudud: h.nomi,
          bolim: a.bolim,
          xatlovdanOtganXonadon: b.xonadon,
          malumot: bolimniAjrat(b, a.bolim),
          izoh: "Sonlar xatlov anketasida xodim kiritgan qiymatlar yig'indisi (qoralama va arxivga o'tkazilganlar olinmaydi)",
        },
        manbalar: [manba('Бўлимлар бўйича хатлов жамланмаси', ctx.hozir)],
      };
    },
  },

  {
    nomi: 'vazifalarim',
    tavsif: "Foydalanuvchining bugungi vazifalar taxtasi: nima shoshilinch, nima e'tibor talab qiladi. 'Bugun nima qilishim kerak?' savollari uchun.",
    parametrlar: { type: 'object', properties: {}, additionalProperties: false },
    rollar: rollar.hammasi,
    async bajar(ctx) {
      const t = await vazifalarim({ userId: ctx.userId, rol: ctx.rol, mahallaId: ctx.mahallaId });
      return {
        malumot: {
          sarlavha: t.sarlavha,
          bloklar: t.bloklar.map((b) => ({
            nomi: b.nomi,
            soni: b.soni,
            ogohlik: b.ogohlik,
            izoh: b.izoh,
            ...(b.yetishmayotgan ? { yetishmayotgan: b.yetishmayotgan } : {}),
          })),
        },
        manbalar: [manba('Вазифалар тахтаси', ctx.hozir)],
      };
    },
  },

  {
    nomi: 'murojaatlar_holati',
    tavsif: "Murojaatlar holati: nechta yangi, jarayonda, muddati o'tgan, vaqtida javob berilgan. Butun tuman yoki mahalla.",
    parametrlar: {
      type: 'object',
      properties: { mahalla: { type: 'string', description: 'Mahalla nomi (ixtiyoriy)' } },
      additionalProperties: false,
    },
    rollar: rollar.hammasi,
    async bajar(ctx, args) {
      const a = z.object({ mahalla: mahallaSxemasi }).parse(args ?? {});
      const h = await mahallaniHalQil(ctx, a.mahalla);
      if (!h.ok) return h.natija;
      const k = await murojaatKorsatkichlari(h.id, ctx.hozir);
      const javobBerilgan = k.javob.vaqtida + k.javob.kechikib;
      return {
        malumot: {
          hudud: h.nomi,
          jami: k.jami,
          yangi: k.yangi,
          jarayonda: k.jarayonda,
          javobBerilgan: k.javobBerilgan,
          yopilgan: k.yopilgan,
          muddati: { otgan: k.muddat.kechikkan, bugun: k.muddat.bugun, yaqin: k.muddat.yaqin },
          javobVaqtida: { vaqtida: k.javob.vaqtida, jami: javobBerilgan },
          izoh: "Javob muddati tizimdagi odatiy muddat; qonuniy muddat emas",
          ...(k.jami === 0 ? { yetishmayotgan: "Hali murojaat qayd etilmagan" } : {}),
        },
        manbalar: [manba('Мурожаатлар реестри', ctx.hozir)],
      };
    },
  },

  {
    nomi: 'tizim_holati',
    tavsif: "Tizim holati (faqat administrator): avtomatik ishlar vaqtida ishlayaptimi, Telegram xabarlari navbati, zaxira nusxadan tiklash sinovi.",
    parametrlar: { type: 'object', properties: {}, additionalProperties: false },
    rollar: rollar.admin,
    async bajar(ctx) {
      const [ishlar, navbat, zaxira] = await Promise.all([ishlarHolati(ctx.hozir), navbatHolati(ctx.hozir), zaxiraHolati(ctx.hozir)]);
      return {
        malumot: {
          avtomatikIshlar: ishlar.map((i) => ({
            nomi: i.nomi,
            baho: i.baho,
            davriSoat: i.davriSoat,
            songgiMuvaffaqiyat: i.songgiMuvaffaqiyat ? i.songgiMuvaffaqiyat.toISOString() : null,
          })),
          xabarNavbati: {
            kutilmoqda: navbat.kutilmoqda,
            qaytaUrinish: navbat.qaytaUrinish,
            xatoBilanTugagan: navbat.xato,
            ushlanibQolgan: navbat.ushlanib,
          },
          zaxiraTiklashSinovi: zaxira.baho,
        },
        manbalar: [manba('Тизим мониторинги', ctx.hozir)],
      };
    },
  },

  {
    nomi: 'hisobotni_yukla',
    tavsif:
      "Foydalanuvchi hisobotni YUKLAB BERISHNI so'raganda: PDF yoki Excel. Hisobot brauzerda tayyorlanadi va yuklab olinadi (bir necha soniya). " +
      "Format aytilmagan bo'lsa, avval foydalanuvchidan so'rang: PDF yoki Excel.",
    parametrlar: {
      type: 'object',
      properties: {
        format: { type: 'string', enum: ['pdf', 'excel'] },
        mahalla: { type: 'string', description: "Mahalla nomi (ixtiyoriy). Bo'sh qoldirilsa butun tuman." },
      },
      required: ['format'],
      additionalProperties: false,
    },
    rollar: rollar.hammasi,
    async bajar(ctx, args) {
      const a = z.object({ format: z.enum(['pdf', 'excel']), mahalla: mahallaSxemasi }).parse(args ?? {});
      let mahallaId: string | undefined;
      let hudud = 'Xatirchi tumani';
      if (a.mahalla) {
        const h = await mahallaniHalQil(ctx, a.mahalla);
        if (!h.ok) return h.natija;
        mahallaId = h.id;
        hudud = h.nomi;
      }
      const m = hisobotSahifasi(ctx.rol, mahallaId);
      if (!m.ok) return { malumot: { xato: m.sabab, izoh: m.izoh }, manbalar: [] };
      return {
        malumot: {
          boshlandi: `${a.format === 'pdf' ? 'PDF' : 'Excel'} hisobot, hudud: ${hudud}`,
          izoh: "Hisobot foydalanuvchining brauzerida tayyorlanadi va avtomatik yuklab olinadi (bir necha soniya)",
        },
        manbalar: [],
        amallar: [{ tur: 'hisobot', format: a.format, url: m.url, nomi: m.nomi }],
      };
    },
  },

  {
    nomi: 'sahifani_och',
    tavsif:
      "Foydalanuvchi sahifani OCHISHNI, ko'rsatishni yoki ro'yxatni ko'rishni so'raganda chaqiriladi. " +
      "Shaxsiy ma'lumotli ro'yxatlar (ishsizlar, xonadonlar) faqat shu orqali, foydalanuvchining o'z ekranida ochiladi.",
    parametrlar: { type: 'object', properties: {}, additionalProperties: false }, // rol bo'yicha dinamik to'ldiriladi
    rollar: rollar.hammasi,
    async bajar(ctx, args) {
      const a = z
        .object({
          sahifa: z.string().max(40),
          mahalla: mahallaSxemasi,
          holati: z.enum(ISHSIZ_HOLATLARI).optional(),
          holat: z.enum(MUROJAAT_FILTRLARI).optional(),
          davr: z.enum(DAVRLAR).optional(),
          qidiruv: z.string().max(120).optional(),
          uzoq: z.boolean().optional(),
          tekshiruv: z.boolean().optional(),
        })
        .parse(args ?? {});

      let mahallaId: string | undefined;
      if (a.mahalla) {
        const h = await mahallaniHalQil(ctx, a.mahalla);
        if (!h.ok) return h.natija;
        mahallaId = h.id;
      }

      const filtrlar: Record<string, string | boolean | undefined> = {
        holati: a.holati,
        holat: a.holat,
        davr: a.davr,
        qidiruv: a.qidiruv,
        uzoq: a.uzoq,
        tekshiruv: a.tekshiruv,
        mahalla: mahallaId,
      };
      /* Faqat shu sahifa taniydigan filtrlar qoladi; sahifa tanimasa — rad (jimgina tashlanmaydi) */
      const m = sahifaManzili(ctx.rol, a.sahifa, filtrlar);
      if (!m.ok) return { malumot: { xato: m.sabab, izoh: m.izoh }, manbalar: [] };
      return {
        malumot: { ochilmoqda: m.nomi, izoh: "Sahifa foydalanuvchining ekranida ochiladi" },
        manbalar: [],
        amallar: [{ tur: 'ochish', url: m.url, nomi: m.nomi }],
      };
    },
  },

  {
    nomi: 'amalni_taklif_qil',
    tavsif:
      "Yozish amalini TAKLIF qiladi (hali bajarmaydi). Xodim ekrandagi tugmani bosgandagina bajariladi. " +
      "Faqat shu amallar mavjud: navbatni_qayta_yubor (xato bilan tugagan Telegram xabarlarini navbatga qaytarish), xatolarni_korildi (xato jurnalini «ko'rildi» qilish).",
    parametrlar: {
      type: 'object',
      properties: { amal: { type: 'string', enum: [...AMAL_KALITLARI] } },
      required: ['amal'],
      additionalProperties: false,
    },
    rollar: ['ADMIN', 'BANDLIK_RAHBAR'],
    async bajar(ctx, args) {
      const a = z.object({ amal: z.string().max(40) }).parse(args ?? {});
      /* Ikkinchi qatlam: ro'yxatdan chiqarilgan bo'lsa ham, ko'rish rejimida taklif yaratilmaydi */
      if (ctx.oqishFaqat) {
        return { malumot: { xato: 'korish_rejimi', izoh: "Ko'rish rejimida yozish amali taklif qilinmaydi" }, manbalar: [] };
      }
      const t = await taklifYarat(ctx.userId, ctx.rol, a.amal, ctx.hozir);
      if (!t.ok) {
        return { malumot: { xato: t.sabab, izoh: t.sabab === 'ruxsat_yoq' ? 'Bu amal sizning rolingiz uchun emas' : "Bunday amal yo'q" }, manbalar: [] };
      }
      return {
        malumot: {
          holat: 'tasdiq_kutilmoqda',
          sarlavha: t.sarlavha,
          izoh: "Amal HALI BAJARILMADI. Foydalanuvchi ekrandagi tasdiqlash tugmasini bosgandagina bajariladi. 'Bajarildi' demang.",
        },
        manbalar: [],
        amallar: [{ tur: 'tasdiq', id: t.id, sarlavha: t.sarlavha, muddat: t.muddat.toISOString() }],
      };
    },
  },
];

/**
 * Rolga ochiq asboblar.
 *
 * `oqishFaqat` (ko'rish rejimi): yozish amalini taklif qiluvchi asbob
 * ro'yxatda umuman YO'Q — model uni ko'rmaydi ham, chaqira ham olmaydi.
 */
export function rolAsboblari(rol: Rol, oqishFaqat = false): Asbob[] {
  return ASBOBLAR.filter((a) => a.rollar.includes(rol)).filter((a) => {
    if (a.nomi !== 'amalni_taklif_qil') return true;
    if (oqishFaqat) return false;
    return (AMAL_KALITLARI as AmalKaliti[]).some((k) => amalRolgaOchiqmi(k, rol));
  });
}

/**
 * Modelga beriladigan JSON Schema. `sahifani_och` uchun sahifa ro'yxati
 * ROLGA qarab quriladi: model ruxsatsiz sahifani tanlay olmaydi (tanlasa ham
 * `sahifaManzili` rad etadi — bu ikkinchi qatlam).
 */
export function modelAsboblari(rol: Rol, oqishFaqat = false): { type: 'function'; function: { name: string; description: string; parameters: Record<string, unknown> } }[] {
  return rolAsboblari(rol, oqishFaqat).map((a) => {
    let parametrlar = a.parametrlar;
    if (a.nomi === 'sahifani_och') {
      const sahifalar = rolSahifalari(rol);
      parametrlar = {
        type: 'object',
        properties: {
          sahifa: {
            type: 'string',
            enum: sahifalar.map((s) => s.kalit),
            description: sahifalar.map((s) => `${s.kalit}: ${s.tavsif}`).join('; '),
          },
          mahalla: { type: 'string', description: "Mahalla nomi (ixtiyoriy): ishsizlar, xonadonlar, tahlil_paneli, operatsion_panel sahifalarida" },
          holati: { type: 'string', enum: [...ISHSIZ_HOLATLARI], description: "Faqat ishsizlar sahifasi: ANIQLANDI = suhbat kutayotgan, SUHBAT_OTKAZILDI = taklif kutayotgan" },
          holat: { type: 'string', enum: [...MUROJAAT_FILTRLARI], description: "Faqat murojaatlar sahifasi: muddatli = muddati o'tgan yoki yaqin" },
          davr: { type: 'string', enum: [...DAVRLAR], description: 'Faqat tahlil_paneli, operatsion_panel, boshqaruv' },
          qidiruv: { type: 'string', description: "Faqat ishsizlar va xonadonlar: qidiruv matni (ism yoki manzil)" },
          uzoq: { type: 'boolean', description: "Faqat ishsizlar: 12 oydan ortiq ishsizlar" },
          tekshiruv: { type: 'boolean', description: "Faqat ishsizlar: mustahkamlash tekshiruvi kutayotganlar" },
        },
        required: ['sahifa'],
        additionalProperties: false,
      };
    }
    return { type: 'function' as const, function: { name: a.nomi, description: a.tavsif, parameters: parametrlar } };
  });
}

export function asbobniTop(rol: Rol, nomi: string, oqishFaqat = false): Asbob | undefined {
  return rolAsboblari(rol, oqishFaqat).find((a) => a.nomi === nomi);
}

/**
 * Asbobni xavfsiz bajaradi: ruxsat tekshiriladi, xato modelga EMAS, jurnalga
 * yoziladi (maxfiy ma'lumotsiz). Model faqat "olib bo'lmadi" ni ko'radi.
 */
export async function asbobniBajar(
  ctx: AgentKontekst,
  nomi: string,
  args: unknown
): Promise<AsbobNatijasi & { xato?: boolean }> {
  const asbob = asbobniTop(ctx.rol, nomi, ctx.oqishFaqat);
  if (!asbob) {
    return { malumot: { xato: 'asbob_yoq', izoh: "Bunday asbob yo'q yoki sizning rolingiz uchun emas" }, manbalar: [], xato: true };
  }
  try {
    return await asbob.bajar(ctx, args);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return { malumot: { xato: 'parametr_notogri', izoh: "Parametrlar noto'g'ri berildi" }, manbalar: [], xato: true };
    }
    const { izId } = await serverXatosi(`agent:asbob:${nomi}`, e);
    return { malumot: { xato: 'malumot_olinmadi', izoh: `Ma'lumotni olib bo'lmadi (iz: ${izId})` }, manbalar: [], xato: true };
  }
}
