import { A } from '@/lib/alifbo';
import { kalitSozlar, mahallaniTop } from '@/lib/bot-savol';
import { tumanHolati } from '@/lib/tuman-holati';
import { taklifYarat } from './amallar';
import { MATN } from './matnlar';
import { hisobotSahifasi, rolSahifalari, SAHIFALAR, sahifaManzili, sahifaMumkinmi, type FiltrQiymati, type SahifaTavsifi } from './sahifalar';
import type { Amal, AgentKontekst, Manba } from './turlar';

/**
 * ============================================================
 *  HUDHUD: QOIDALI ZAXIRA REJIM (til modelisiz)
 *
 *  GPT §18: "AI ishlamasa asosiy xizmatlar to'xtamasin". Model kaliti
 *  yo'q, provayder uzilgan yoki limit tugagan bo'lsa ham xodim ovozli
 *  buyruq bilan sahifani ocha olishi va umumiy holatni bilishi kerak.
 *
 *  Bu rejim PUL TURMAYDI va modelga bog'liq emas. U kam narsani biladi,
 *  lekin bilganini aniq bajaradi, bilmaganini "tushunmadim" deydi
 *  (taxmin qilmaydi):
 *
 *    · sahifa nomi (ro'yxatdagi iboralar) → sahifani ochadi;
 *    · "suhbat kutayotgan", "muddati o'tgan", "12 oydan ortiq" kabi
 *      qisqa filtrlar;
 *    · mahalla nomi (bot savol-javobidagi o'sha aniq moslik) → shu
 *      mahalla paneli;
 *    · "nechta / qanday / holat" → tuman holati (tablo bilan bir xil
 *      funksiya), manba bilan;
 *    · rahmat, salom, yordam.
 *
 *  Matnlar kirillda yoziladi va foydalanuvchi alifbosiga o'tkaziladi.
 * ============================================================
 */

export interface ZaxiraJavobi {
  javob: string;
  amallar: Amal[];
  manbalar: Manba[];
  /** Buyruq tushunildimi (tushunilmagan bo'lsa yordam matni qaytadi) */
  tushunildi: boolean;
}

const OCHISH_FELLARI = ['och', 'ochib', 'ochay', 'korsat', 'korsatib', 'otkaz', 'bor', 'boray', 'chiq', 'kirish', 'ber', 'royxat', 'royxati', 'sahifa'];
const SAVOL_SOZLARI = ['nechta', 'necha', 'qancha', 'foiz', 'qaysi', 'qanday', 'qanaqa', 'nima', 'holat', 'ahvol'];

/** Ibora so'zlar ichida ketma-ket, har so'z alohida so'zning BOSHI sifatida bormi */
export function iboraMos(sozlar: string[], ibora: string): boolean {
  const q = ibora.split(' ').filter(Boolean);
  if (q.length === 0) return false;
  for (let i = 0; i + q.length <= sozlar.length; i++) {
    if (q.every((w, k) => sozlar[i + k].startsWith(w))) return true;
  }
  return false;
}

function engMosSahifa(sozlar: string[], sahifalar: SahifaTavsifi[]): SahifaTavsifi | null {
  let eng: { s: SahifaTavsifi; ball: number } | null = null;
  for (const s of sahifalar) {
    for (const ibora of s.aytilishi) {
      if (iboraMos(sozlar, ibora)) {
        const ball = ibora.length;
        if (!eng || ball > eng.ball) eng = { s, ball };
      }
    }
  }
  return eng?.s ?? null;
}

function raqam(n: number): string {
  return n.toLocaleString('ru-RU').replace(/ | /g, ' ');
}

function filtrlarniAjrat(sozlar: string[], sahifa: SahifaTavsifi): Record<string, FiltrQiymati> {
  const f: Record<string, FiltrQiymati> = {};
  const bor = (...iboralar: string[]) => iboralar.some((i) => iboraMos(sozlar, i));

  if (sahifa.kalit === 'ishsizlar') {
    if (bor('suhbat kut')) f.holati = 'ANIQLANDI';
    else if (bor('taklif kut')) f.holati = 'SUHBAT_OTKAZILDI';
    else if (bor('joylash', 'ishga kir')) f.holati = 'JOYLASHTIRILDI';
    else if (bor('rad', 'bosh tort')) f.holati = 'RAD_ETDI';
    if (bor('uzoq', '12 oy', 'bir yildan', 'oydan ortiq')) f.uzoq = true;
    if (bor('mustahkam', 'tekshiruv')) f.tekshiruv = true;
  }
  if (sahifa.kalit === 'murojaatlar' && bor('muddat', 'kechik')) f.holat = 'muddatli';
  return f;
}

async function tumanJavobi(ctx: AgentKontekst): Promise<ZaxiraJavobi> {
  const h = await tumanHolati(ctx.hozir);
  const qatorlar = [
    `Хатловдан ўтган хонадон: ${raqam(h.xatlovXonadon)} / ${raqam(h.bazaXonadon)} (${h.qamrovFoizi}%).`,
    `Хатловда топилган ишсиз: ${raqam(h.topilganIshsiz)}; шахсий анкетаси борлар: ${raqam(h.anketa)}.`,
    `Жойлаштирилган: ${raqam(h.joylashtirilgan)} (шундан ҳужжат билан тасдиқланган: ${raqam(h.tasdiqlanganJoylashuv)}).`,
    `Хатловни бошлаган маҳалла: ${raqam(h.boshlaganMahalla)} / ${raqam(h.jamiMahalla)}.`,
  ];
  return {
    javob: A(`Хатирчи тумани бўйича умумий ҳолат. ${qatorlar.join(' ')}`, ctx.alifbo),
    amallar: [],
    manbalar: [{ nom: 'Хатлов анкеталари ва ишсиз фуқаро ёзувлари', vaqt: ctx.hozir.toISOString() }],
    tushunildi: true,
  };
}

export async function qoidaBilanJavob(ctx: AgentKontekst, matn: string): Promise<ZaxiraJavobi> {
  const soz = kalitSozlar(matn).split(' ').filter(Boolean);
  const oddiy = (k: keyof typeof MATN, tushunildi = true): ZaxiraJavobi => ({
    javob: A(MATN[k], ctx.alifbo),
    amallar: [],
    manbalar: [],
    tushunildi,
  });

  if (soz.length === 0) return oddiy('tushunmadim', false);

  const sahifalar = rolSahifalari(ctx.rol);
  /* Avval BARCHA sahifalar orasidan: rolga yopiq sahifa so'ralsa "tushunmadim" emas, aniq rad */
  const barchasidan = engMosSahifa(soz, [...SAHIFALAR]);
  const sahifa = barchasidan && sahifaMumkinmi(ctx.rol, barchasidan) ? barchasidan : engMosSahifa(soz, sahifalar);
  const ochishFeli = soz.some((w) => OCHISH_FELLARI.some((f) => w.startsWith(f)));
  const savol = soz.some((w) => SAVOL_SOZLARI.some((f) => w.startsWith(f)));

  if (iboraMos(soz, 'rahmat') || iboraMos(soz, 'raxmat') || iboraMos(soz, 'tashakkur')) return oddiy('rahmatga');
  if (!sahifa && (iboraMos(soz, 'yordam') || iboraMos(soz, 'nima qila') || iboraMos(soz, 'nima qilasan') || iboraMos(soz, 'help'))) {
    return oddiy('yordam');
  }
  if (!sahifa && (iboraMos(soz, 'salom') || iboraMos(soz, 'assalom')) && soz.length <= 3) return oddiy('salomga');

  /* Hisobotni YUKLASH ("hisobotni yuklab ber", "excel hisobot ol"): "hisobotni och" esa sahifani ochadi */
  if (iboraMos(soz, 'hisobot') && ['yukla', 'yuklab', 'ol', 'olib', 'chiqar', 'tayyorla', 'excel', 'pdf', 'eksel'].some((w) => iboraMos(soz, w))) {
    const format = iboraMos(soz, 'excel') || iboraMos(soz, 'eksel') ? 'excel' : iboraMos(soz, 'pdf') ? 'pdf' : null;
    if (!format) return { javob: A('Қайси кўринишда: PDF ёки Excel?', ctx.alifbo), amallar: [], manbalar: [], tushunildi: true };
    const mahH = await mahallaniTop(matn);
    const m = hisobotSahifasi(ctx.rol, mahH?.id);
    if (!m.ok) return oddiy('ruxsatYoq');
    return {
      javob: A(`${format === 'pdf' ? 'PDF' : 'Excel'} ҳисобот тайёрланмоқда${mahH ? ` (${mahH.nomiKirill})` : ' (бутун туман)'} — бир неча сониядан кейин юкланади.`, ctx.alifbo),
      amallar: [{ tur: 'hisobot', format, url: m.url, nomi: m.nomi }],
      manbalar: [],
      tushunildi: true,
    };
  }

  /* Yozish amali: faqat TAKLIF (tasdiq tugmasi bilan bajariladi) */
  const amal =
    iboraMos(soz, 'qayta yubor') && (iboraMos(soz, 'xabar') || iboraMos(soz, 'navbat') || iboraMos(soz, 'telegram'))
      ? 'navbatni_qayta_yubor'
      : iboraMos(soz, 'xato') && (iboraMos(soz, 'korildi') || iboraMos(soz, 'belgila'))
        ? 'xatolarni_korildi'
        : null;
  if (amal) {
    const t = await taklifYarat(ctx.userId, ctx.rol, amal, ctx.hozir);
    if (!t.ok) return oddiy('amalRuxsatYoq');
    return {
      javob: A(`Таклиф тайёр: «${t.sarlavha}». Бажариш учун тасдиқлаш тугмасини босинг — у босилмагунча ҳеч нарса ўзгармайди.`, ctx.alifbo),
      amallar: [{ tur: 'tasdiq', id: t.id, sarlavha: t.sarlavha, muddat: t.muddat.toISOString() }],
      manbalar: [],
      tushunildi: true,
    };
  }

  /* Rolga yopiq sahifani OCHISH so'ralgan: aniq rad */
  if (barchasidan && !sahifa && (ochishFeli || !savol)) return oddiy('ruxsatYoq');

  const mah = await mahallaniTop(matn);

  /* Sahifa: "ishsizlar", "muddati o'tgan murojaatlar", "Qorabuloq mahallasini och" */
  if (sahifa && (ochishFeli || !savol)) {
    const f = filtrlarniAjrat(soz, sahifa);
    if (mah && 'mahalla' in sahifa.filtrlar) f.mahalla = mah.id;
    const m = sahifaManzili(ctx.rol, sahifa.kalit, f);
    if (m.ok) {
      return {
        javob: A(`«${m.nomi}» саҳифасини очяпман${mah && f.mahalla ? ` (${mah.nomiKirill})` : ''}.`, ctx.alifbo),
        amallar: [{ tur: 'ochish', url: m.url, nomi: m.nomi }],
        manbalar: [],
        tushunildi: true,
      };
    }
  }

  /* Faqat mahalla nomi aytilgan: shu mahallaning paneli */
  if (!sahifa && mah) {
    const kalit = sahifalar.some((s) => s.kalit === 'tahlil_paneli') ? 'tahlil_paneli' : 'operatsion_panel';
    const m = sahifaManzili(ctx.rol, kalit, { mahalla: mah.id });
    if (m.ok) {
      return {
        javob: A(`${mah.nomiKirill} маҳалласи бўйича «${m.nomi}» ни очяпман.`, ctx.alifbo),
        amallar: [{ tur: 'ochish', url: m.url, nomi: m.nomi }],
        manbalar: [],
        tushunildi: true,
      };
    }
  }

  /* Umumiy holat */
  if (savol || iboraMos(soz, 'xatlov') || iboraMos(soz, 'tuman') || iboraMos(soz, 'umumiy')) {
    return tumanJavobi(ctx);
  }

  return oddiy('tushunmadim', false);
}
