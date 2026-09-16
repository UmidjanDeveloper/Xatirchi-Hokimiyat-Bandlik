import { prisma } from './prisma';
import type { XatlovHolati } from '@/components/xatlov/holat';
import { bosHolat } from '@/components/xatlov/holat';

/**
 * Bazadagi xatlovni forma holatiga aylantiradi.
 *
 * Ikkita nozik joy bor:
 *
 *  1. `null` qiymatlar formaga `''` bo'lib tushishi kerak. React
 *     boshqariladigan maydonga `null` bersak, u "boshqarilmaydigan"
 *     rejimga o'tib ketadi va konsolda ogohlantirish chiqaradi.
 *
 *  2. `BigInt` maydonlar (pul) `Number` ga o'tkaziladi. So'mdagi
 *     eng katta qiymat 100 mlrd - bu `Number.MAX_SAFE_INTEGER`
 *     (9 kvadrillion) dan ancha kichik, ya'ni aniqlik yo'qolmaydi.
 */
export async function xatlovniYukla(
  id: string
): Promise<{ id: string; mahallaId: string; holati: string; holat: XatlovHolati } | null> {
  const x = await prisma.household.findUnique({
    where: { id },
    include: { ishsizlar: { orderBy: { createdAt: 'asc' } } },
  });
  if (!x) return null;

  const s = (v: number | null | undefined): number | '' => (v == null ? '' : v);
  const t = (v: string | null | undefined): string => v ?? '';
  const p = (v: bigint | null | undefined): number | '' => (v == null ? '' : Number(v));

  /**
   * Shaxslar ro'yxatini (`Json`) forma qatorlariga aylantiradi.
   *
   * DIQQAT: ilgari bu YO'Q edi va nogironlik hamda parvarish
   * ro'yxatlari tahrirlashda UMUMAN yuklanmasdi. Ya'ni xodim
   * saqlangan xatlovni ochib, bitta vergulni tuzatib qayta
   * yuborsa, bazadagi ismlar RO'YXATI O'CHIB KETARDI — ekranda
   * esa hech qanday ogohlantirish chiqmasdi.
   *
   * `qatorId` faqat brauzerda, React ro'yxatni qayta chizganda
   * kerak; bazada uning o'rni yo'q, shuning uchun shu yerda
   * yangidan beriladi.
   */
  const shaxslar = (v: unknown): XatlovHolati['nogironShaxslar'] => {
    if (!Array.isArray(v)) return [];
    return v
      .filter((r): r is Record<string, unknown> => !!r && typeof r === 'object')
      .map((r, i) => ({
        qatorId: `yuklandi-${i}-${Math.random().toString(36).slice(2, 7)}`,
        fish: typeof r.fish === 'string' ? r.fish : '',
        orni: typeof r.orni === 'string' ? r.orni : '',
        orniIzoh: typeof r.orniIzoh === 'string' ? r.orniIzoh : '',
        guruhi: typeof r.guruhi === 'string' ? r.guruhi : null,
      }))
      .filter((r) => r.fish.trim().length > 0);
  };

  const holat: XatlovHolati = {
    ...bosHolat(x.mahallaId),

    manzil: x.manzil,
    oilaBoshligi: x.oilaBoshligi,
    oilaBoshligiTugilganSana: x.oilaBoshligiTugilganSana
      ? x.oilaBoshligiTugilganSana.toLocaleDateString('en-CA')
      : '',
    tugilganYili: s(x.tugilganYili),
    telefon: t(x.telefon),
    jamiAzo: s(x.jamiAzo),
    bolalarSoni: s(x.bolalarSoni),
    bolalar0_3Yosh: s(x.bolalar0_3Yosh),
    bolalar3_17Yosh: s(x.bolalar3_17Yosh),
    bolalar18Yoshdan: s(x.bolalar18Yoshdan),

    mehnatgaLayoqatli: s(x.mehnatgaLayoqatli),
    mehnatgaLayoqatsiz: s(x.mehnatgaLayoqatsiz),
    ishlaydiganlar: s(x.ishlaydiganlar),
    davlatKorxonada: s(x.davlatKorxonada),
    xususiySektorda: s(x.xususiySektorda),
    ishsizlarSoni: s(x.ishsizlarSoni),
    bogchaKutayotganAyollar: s(x.bogchaKutayotganAyollar),
    ishsizlikMuddatiOy: s(x.ishsizlikMuddatiOy),
    ishTuriIstagi: x.ishTuriIstagi,
    kasbHunarIstagi: x.kasbHunarIstagi,
    kasbHunarYonalishi: x.kasbHunarYonalishi,
    bandlikTakliflari: t(x.bandlikTakliflari),

    tadbirkorlikIstagi: x.tadbirkorlikIstagi,
    tadbirkorlikSohasi: x.tadbirkorlikSohasi,
    moliyaEhtiyoji: x.moliyaEhtiyoji,
    moliyaTuri: x.moliyaTuri,
    talabQilinganMablag: p(x.talabQilinganMablag),
    mablagYonalishi: x.mablagYonalishi,
    mablagYonalishiBoshqa: t(x.mablagYonalishiBoshqa),

    chetElMehnati: x.chetElMehnati,
    chetElIshchilar: s(x.chetElIshchilar),
    chetElDavlatlari: x.chetElDavlatlari,
    chetElBoshqaDavlat: t(x.chetElBoshqaDavlat),
    chetElOylikPul: p(x.chetElOylikPul),
    chetElValyuta: x.chetElValyuta ?? 'UZS',
    chetElShaharlari: x.chetElShaharlari ?? [],
    chetElBoshqaShahar: t(x.chetElBoshqaShahar),

    oylikDaromad: p(x.oylikDaromad),
    daromadManbalari: x.daromadManbalari,
    daromadImkoniyati: t(x.daromadImkoniyati),
    kambagallikSabablari: x.kambagallikSabablari,

    maktabgachaYoshdagi: s(x.maktabgachaYoshdagi),
    maktabgachaQamrovda: s(x.maktabgachaQamrovda),
    maktabgachaQamrovsizSababi: t(x.maktabgachaQamrovsizSababi),
    maktabYoshdagi: s(x.maktabYoshdagi),
    maktabQamrovda: s(x.maktabQamrovda),
    bolalarQiziqishlari: x.bolalarQiziqishlari,
    togarakQamrovi: s(x.togarakQamrovi),
    togarakSababi: t(x.togarakSababi),

    uzoqDavolanish: x.uzoqDavolanish,
    uzoqDavolanishIzoh: t(x.uzoqDavolanishIzoh),
    doriEhtiyoji: t(x.doriEhtiyoji),
    tibbiyXizmatEhtiyoji: t(x.tibbiyXizmatEhtiyoji),
    oxirgiTibbiyKorik: t(x.oxirgiTibbiyKorik),

    uyHolati: x.uyHolati,
    ichimlikSuvi: x.ichimlikSuvi,
    sugorishSuvi: x.sugorishSuvi,
    elektr: x.elektr,
    gaz: x.gaz,
    kanalizatsiya: x.kanalizatsiya,
    sanitariya: t(x.sanitariya),
    boshqaMuammolar: t(x.boshqaMuammolar),

    nogironlikBor: x.nogironlikBor,
    nogironlikIzoh: t(x.nogironlikIzoh),
    nogironShaxslar: shaxslar(x.nogironShaxslar),
    yolgizKeksa: x.yolgizKeksa,
    yolgizKeksaShaxslar: shaxslar(x.yolgizKeksaShaxslar),
    parvarishgaMuhtoj: x.parvarishgaMuhtoj,
    parvarishIzoh: t(x.parvarishIzoh),
    parvarishShaxslar: shaxslar(x.parvarishShaxslar),
    boshqaMuhtojlar: t(x.boshqaMuhtojlar),

    hujjatlarToliq: x.hujjatlarToliq,
    hujjatIzoh: t(x.hujjatIzoh),
    xizmatTosiqlari: t(x.xizmatTosiqlari),

    tomorqaBor: x.tomorqaBor,
    ekinMaydoni: s(x.ekinMaydoni),
    chorvaBor: x.chorvaBor,
    chorvaTurlari: x.chorvaTurlari ?? [],
    yirikShoxliSoni: s(x.yirikShoxliSoni),
    maydaShoxliSoni: s(x.maydaShoxliSoni),
    parrandaSoni: s(x.parrandaSoni),
    hunarmandBor: x.hunarmandBor,
    hunarTurlari: x.hunarTurlari ?? [],
    hunarmandchilik: t(x.hunarmandchilik),
    zarurKomak: x.zarurKomak,
    issiqxonaTalabi: x.issiqxonaTalabi,
    issiqxonaMaydoni: s(x.issiqxonaMaydoni),
    ijaraYer: x.ijaraYer,
    ijaraYerMaydoni: s(x.ijaraYerMaydoni),


    passivDaromadIstagi: x.passivDaromadIstagi,
    passivDaromadTurlari: x.passivDaromadTurlari ?? [],
    /*
     * Миқдорлар `Json` да сақланади, шунинг учун тури текширилади:
     * эски ёзувда бу устун бўш бўлиши мумкин.
     */
    passivDaromadSonlari:
      x.passivDaromadSonlari && typeof x.passivDaromadSonlari === 'object'
        ? Object.fromEntries(
            Object.entries(x.passivDaromadSonlari as Record<string, unknown>)
              .filter(([, v]) => typeof v === 'number')
              .map(([k, v]) => [k, v as number])
          )
        : {},
    passivDaromadIzohi: t(x.passivDaromadIzohi),

    infratuzilmaMuammolari: x.infratuzilmaMuammolari ?? [],
    infratuzilmaBoshqa: t(x.infratuzilmaBoshqa),
    infratuzilmaIzohi: t(x.infratuzilmaIzohi),

    umumiyXulosa: t(x.umumiyXulosa),

    ishsizlar: x.ishsizlar.map((i) => ({
      qatorId: i.id,
      fish: i.fish,
      telefon: t(i.telefon),
      jinsi: i.jinsi,
      /*
       * `Date` -> `YYYY-MM-DD` matn.
       *
       * `<input type="date">` faqat shu shaklni qabul qiladi.
       * `toISOString()` UTC ga o'giradi va mahalliy vaqt zonasida
       * sana bir kunga surilib ketishi mumkin, shuning uchun
       * `en-CA` ishlatiladi - u aynan `YYYY-MM-DD` beradi va
       * mahalliy kunni saqlaydi.
       */
      tugilganSana: i.tugilganSana
        ? i.tugilganSana.toLocaleDateString('en-CA')
        : '',
      malumoti: i.malumoti,
      mutaxassisligi: t(i.mutaxassisligi),
      ishTajribasiYil: s(i.ishTajribasiYil),
      xohlaganIsh: t(i.xohlaganIsh),
      kutilayotganMaosh: p(i.kutilayotganMaosh),
      haydovchilikGuvohnomasi: i.haydovchilikGuvohnomasi,
      haydovchilikToifasi: i.haydovchilikToifasi,
      kasbHunarEhtiyoji: i.kasbHunarEhtiyoji,
      organmoqchiKasb: t(i.organmoqchiKasb),
      itShaharchaVaucheri: i.itShaharchaVaucheri,
    })),
  };

  return { id: x.id, mahallaId: x.mahallaId, holati: x.holati, holat };
}
