import { matnSora } from './ai';
import {
  CHET_EL_DAVLATI,
  CHORVA_TURI,
  DAROMAD_MANBAI,
  HUNAR_TURI,
  ICHIMLIK_SUVI,
  KAMBAGALLIK_SABABI,
  KASB_YONALISHI,
  MABLAG_YONALISHI,
  MALUMOT,
  MOLIYA_TURI,
  UY_HOLATI,
  type Variant,
  kirillcha,
} from './constants';

/**
 * ============================================================
 *  ХОНАДОН БЎЙИЧА ХУЛОСА — «шу оила билан нима қилиш керак»
 *
 *  Ҳисобот хулосаси (`hisobot/xulosa.ts`) туман ва маҳалла
 *  даражасида ишлайди: «143 хонадонда газ йўқ». Бу модул эса
 *  БИТТА ОИЛА ҳақида: анкетадаги 12 бўлимни ўқиб, «нимадан
 *  бошлаш керак» деб айтади.
 *
 *  Иккита манба, битта шакл:
 *    1. ҚОИДА — анкетадаги чегаралар. Ҳар доим ишлайди, калит
 *       ва интернет талаб қилмайди, натижаси такрорланади.
 *    2. AI — Claude. Қоида кўрмайдиган боғланишни топади:
 *       «оилада ҳунарманд бор, тўғри, аммо ер ҳам бор ва
 *       иссиқхона сўралмаган — иккиси бирга кўпроқ натижа беради».
 *
 *  ── ШАХСИЙ МАЪЛУМОТ: нима юборилади ва нима ЮБОРИЛМАЙДИ ──
 *
 *  AI га ЮБОРИЛАДИ: сонлар, каталог қийматлари (уй ҳолати, сув
 *  манбаи, чорва тури...) ва касб номлари.
 *
 *  AI га ЮБОРИЛМАЙДИ: оила бошлиғининг исми, манзил, телефон,
 *  ишсизларнинг Ф.И.Ш.си, ногирон ва парвариш талаб қилувчи
 *  шахслар рўйхати (уларда исм бор), ҳамда ходим ёзган ҲАР
 *  ҚАНДАЙ эркин матн — изоҳлар, сабаблар, «бошқа муаммолар»,
 *  умумий хулоса.
 *
 *  Эркин матн БУТУНЛАЙ чиқариб ташланганининг сабаби оддий:
 *  унга ходим нима ёзганини олдиндан билиб бўлмайди. «Изоҳ»
 *  майдонига «қўшниси Каримов айтишича...» деб ёзилса, исм
 *  ташқарига чиқиб кетарди. Каталог қиймати эса ҳар доим
 *  рўйхатдан танланган — унда исм бўлиши мумкин эмас.
 *
 *  Касб номлари истисно: улар хулоса учун ЗАРУР (касбсиз
 *  тавсия ёзиб бўлмайди) ва одам номи эмас. Барибир улар
 *  `tozala()` дан ўтади — узун рақам кетма-кетлиги (телефон)
 *  олиб ташланади ва узунлиги чекланади.
 * ============================================================
 */

/**
 * Аҳоли жон бошига энг кам истеъмол харажати (сўм/ой).
 *
 * Ҳар йили ўзгаради — янгиланиб турилиши керак. Бу чегара
 * «даромад етарлими» деган саволга жавоб бериш учун, расмий
 * камбағаллик мақоми учун эмас: мақомни туман комиссияси
 * беради, дастур эмас.
 */
const MINIMAL_ISTEMOL_SOM = 621_000;

/** Узоқ муддатли ишсизлик чегараси (ой) */
const UZOQ_ISHSIZLIK_OY = 12;

export type XulosaDarajasi = 'shoshilinch' | 'muhim' | 'imkoniyat';

/** `xonadonDalili()` га кераклиси — Prisma ёзувининг бир қисми */
export interface XonadonYozuvi extends Omit<XonadonDalili, 'ishsizlar'> {
  ishsizlar: {
    jinsi: string;
    tugilganSana: Date | null;
    malumoti: string | null;
    mutaxassisligi: string | null;
    xohlaganIsh: string | null;
    organmoqchiKasb: string | null;
    holati: string;
    nogironlik: boolean;
  }[];
}

export interface XonadonTavsiyasi {
  daraja: XulosaDarajasi;
  sarlavha: string;
  dalil: string;
}

export interface XonadonXulosasi {
  manba: 'ai' | 'qoida';
  holat: string;
  tavsiyalar: XonadonTavsiyasi[];
}

/** Хулоса ёзилганда ҳисобга олинадиган майдонлар */
export interface XonadonDalili {
  jamiAzo: number;
  bolalarSoni: number;
  mehnatgaLayoqatli: number;
  mehnatgaLayoqatsiz: number;
  ishlaydiganlar: number;
  ishsizlarSoni: number;
  bogchaKutayotganAyollar: number;
  ishsizlikMuddatiOy: number | null;
  kasbHunarIstagi: boolean;
  kasbHunarYonalishi: string[];
  tadbirkorlikIstagi: boolean;
  tadbirkorlikSohasi: string[];
  moliyaEhtiyoji: boolean;
  moliyaTuri: string[];
  talabQilinganMablag: bigint | null;
  mablagYonalishi: string[];
  oylikDaromad: bigint | null;
  chetElMehnati: boolean;
  chetElIshchilar: number;
  chetElDavlatlari: string[];
  chetElBoshqaDavlat: string | null;
  chetElOylikPul: bigint | null;
  daromadManbalari: string[];
  kambagallikSabablari: string[];
  maktabgachaYoshdagi: number;
  maktabgachaQamrovda: number;
  maktabYoshdagi: number;
  maktabQamrovda: number;
  togarakQamrovi: number;
  uzoqDavolanish: boolean;
  uyHolati: string | null;
  ichimlikSuvi: string | null;
  sugorishSuvi: boolean;
  elektr: boolean;
  gaz: boolean;
  gazTuri: string | null;
  kanalizatsiya: boolean;
  nogironlikBor: boolean;
  yolgizKeksa: boolean;
  parvarishgaMuhtoj: boolean;
  hujjatlarToliq: boolean;
  tomorqaBor: boolean;
  ekinMaydoni: number | null;
  chorvaBor: boolean;
  chorvaTurlari: string[];
  hunarmandBor: boolean;
  hunarTurlari: string[];
  zarurKomak: string[];
  issiqxonaTalabi: boolean;
  ijaraYer: boolean;
  /** Ишсизлар — ИСМСИЗ, фақат ҳолат */
  ishsizlar: {
    jinsi: string;
    yoshi: number | null;
    malumoti: string | null;
    mutaxassisligi: string | null;
    xohlaganIsh: string | null;
    organmoqchiKasb: string | null;
    holati: string;
    nogironlik: boolean;
  }[];
}

/**
 * Касб номини тозалайди.
 *
 * Узун рақам кетма-кетлиги (телефон) олиб ташланади ва узунлик
 * чекланади. Ходим касб майдонига телефон ёзиб қўйиши эҳтимоли
 * кичик, лекин нолга тенг эмас — шунинг учун ўтказиб юбормаймиз.
 */
function tozala(matn: string | null): string | null {
  if (!matn) return null;
  const t = matn.replace(/[\d+\-() ]{7,}/g, ' ').replace(/\s+/g, ' ').trim();
  return t.length >= 2 ? t.slice(0, 60) : null;
}

const son = (n: number) => n.toLocaleString('ru-RU').replace(/ /g, ' ');
const pul = (n: number) => `${son(Math.round(n))} сўм`;

/**
 * Каталог қийматлари базада ЛОТИНДА сақланади (`constants.ts`
 * даги қоида). Кирилл жумла ичида улар ажралиб турмаслиги учун
 * ҳар бири ўз каталогидан кирилл кўринишига ўгирилади.
 */
const royxat = (qiymatlar: string[], katalog: Variant[]): string =>
  qiymatlar.map((v) => kirillcha(katalog, v)).join(', ');

/**
 * AI га юбориладиган далилнома.
 *
 * Фақат сон ва каталог қийматидан тузилади. Бу функция —
 * ЯГОНА жой, ундан ташқарида AI га ҳеч нима юборилмайди;
 * шунинг учун «нима юборилди» деган саволга жавоб бериш учун
 * шу функцияни ўқиш кифоя.
 */
export function dalilnomaYasa(x: XonadonDalili): string {
  const s: string[] = ['Ҳудуд: Хатирчи тумани, Навоий вилояти (Ўзбекистон). Битта хонадон.', ''];

  s.push('## Оила таркиби');
  s.push(`- Жами аъзо: ${x.jamiAzo}, шундан бола: ${x.bolalarSoni}`);
  s.push(
    `- Меҳнатга лаёқатли: ${x.mehnatgaLayoqatli}, ишлайдиган: ${x.ishlaydiganlar}, ишсиз: ${x.ishsizlarSoni}` +
      (x.mehnatgaLayoqatsiz > 0 ? `, меҳнатга лаёқатсиз: ${x.mehnatgaLayoqatsiz}` : '')
  );
  if (x.bogchaKutayotganAyollar > 0) {
    s.push(`- Боғча бўлса ишлашга тайёр аёл: ${x.bogchaKutayotganAyollar}`);
  }
  if (x.ishsizlikMuddatiOy != null) s.push(`- Энг узоқ ишсизлик муддати: ${x.ishsizlikMuddatiOy} ой`);

  s.push('', '## Даромад');
  /*
   * Чет элдан келадиган пул ҲАМ шу ерга ёзилади.
   *
   * Акс ҳолда AI «даромади йўқ» деган хулосага келади ва қоида
   * бўйича хулоса билан ЗИДДИЯТГА тушади: биттаси «темир
   * дафтарга тавсия қиламан» дейди, иккинчиси демайди. Иккита
   * хулоса бир экранда турибди — ходим қайси бирига ишонишни
   * билмай қолади.
   */
  const chetElPuli = x.chetElMehnati && x.chetElOylikPul != null ? Number(x.chetElOylikPul) : 0;
  if (x.oylikDaromad != null) {
    s.push(`- Маҳаллий ойлик даромад: ${pul(Number(x.oylikDaromad))}`);
  } else {
    s.push('- Маҳаллий ойлик даромад кўрсатилмаган');
  }
  if (chetElPuli > 0) s.push(`- Чет элдан ойига келадиган пул: ${pul(chetElPuli)}`);
  if (x.oylikDaromad != null || chetElPuli > 0) {
    const jami = Number(x.oylikDaromad ?? 0) + chetElPuli;
    if (chetElPuli > 0) s.push(`- Жами ойлик даромад: ${pul(jami)}`);
    if (x.jamiAzo > 0) {
      s.push(`- Жон бошига: ${pul(jami / x.jamiAzo)} (энг кам истеъмол харажати: ${pul(MINIMAL_ISTEMOL_SOM)})`);
    }
  }
  if (x.daromadManbalari.length) {
    s.push(`- Манбалари: ${x.daromadManbalari.map((v) => kirillcha(DAROMAD_MANBAI, v)).join(', ')}`);
  }
  if (x.kambagallikSabablari.length) {
    s.push(`- Ходим белгилаган сабаблар: ${x.kambagallikSabablari.map((v) => kirillcha(KAMBAGALLIK_SABABI, v)).join(', ')}`);
  }

  if (x.chetElMehnati) {
    const davlatlar = x.chetElDavlatlari
      .map((d) => (d === 'Boshqa' ? tozala(x.chetElBoshqaDavlat) || 'кўрсатилмаган' : kirillcha(CHET_EL_DAVLATI, d)))
      .filter(Boolean);
    s.push('', '## Чет элдаги меҳнат');
    s.push(`- Чет элда ишлаётганлар: ${x.chetElIshchilar} киши`);
    if (davlatlar.length) s.push(`- Давлатлар: ${davlatlar.join(', ')}`);
    if (chetElPuli === 0) s.push('- Ойига юборадиган пул кўрсатилмаган');
  }

  if (x.ishsizlar.length) {
    s.push('', '## Ишсиз аъзолар (исмсиз)');
    x.ishsizlar.forEach((p, i) => {
      const qismlar = [
        p.jinsi === 'Ayol' ? 'аёл' : 'эркак',
        p.yoshi != null ? `${p.yoshi} ёш` : null,
        p.malumoti ? kirillcha(MALUMOT, p.malumoti) : null,
        tozala(p.mutaxassisligi) ? `мутахассислиги: ${tozala(p.mutaxassisligi)}` : null,
        tozala(p.xohlaganIsh) ? `хоҳлаган иши: ${tozala(p.xohlaganIsh)}` : null,
        tozala(p.organmoqchiKasb) ? `ўрганмоқчи: ${tozala(p.organmoqchiKasb)}` : null,
        p.nogironlik ? 'ногиронлиги бор' : null,
      ].filter(Boolean);
      s.push(`- ${i + 1}-шахс: ${qismlar.join(', ')}`);
    });
  }

  s.push('', '## Болалар таълими');
  s.push(`- Мактабгача ёшда: ${x.maktabgachaYoshdagi}, боғчада: ${x.maktabgachaQamrovda}`);
  s.push(`- Мактаб ёшида: ${x.maktabYoshdagi}, мактабда: ${x.maktabQamrovda}, тўгаракда: ${x.togarakQamrovi}`);

  s.push('', '## Уй-жой ва коммунал');
  s.push(`- Уй ҳолати: ${x.uyHolati ? kirillcha(UY_HOLATI, x.uyHolati) : 'кўрсатилмаган'}`);
  s.push(`- Ичимлик суви: ${x.ichimlikSuvi ? kirillcha(ICHIMLIK_SUVI, x.ichimlikSuvi) : 'кўрсатилмаган'}`);
  s.push(`- Электр: ${x.elektr ? 'бор' : 'ЙЎҚ'}, газ: ${x.gaz ? x.gazTuri ?? 'бор' : 'ЙЎҚ'}, канализация: ${x.kanalizatsiya ? 'бор' : 'йўқ'}`);
  s.push(`- Суғориш суви: ${x.sugorishSuvi ? 'бор' : 'йўқ'}`);

  s.push('', '## Ижтимоий ҳолат');
  s.push(`- Ногиронлиги бор аъзо: ${x.nogironlikBor ? 'бор' : 'йўқ'}`);
  s.push(`- Ёлғиз кекса: ${x.yolgizKeksa ? 'ҳа' : 'йўқ'}, парваришга муҳтож: ${x.parvarishgaMuhtoj ? 'ҳа' : 'йўқ'}`);
  s.push(`- Узоқ муддатли даволаниш: ${x.uzoqDavolanish ? 'ҳа' : 'йўқ'}`);
  s.push(`- Ҳужжатлар тўлиқ: ${x.hujjatlarToliq ? 'ҳа' : 'ЙЎҚ'}`);

  s.push('', '## Ер, чорва, ҳунар ва тадбиркорлик');
  s.push(`- Томорқа: ${x.tomorqaBor ? 'бор' : 'йўқ'}${x.ekinMaydoni ? `, экин майдони ${x.ekinMaydoni} сотих` : ''}`);
  s.push(`- Ижара ер: ${x.ijaraYer ? 'бор' : 'йўқ'}, иссиқхона талаби: ${x.issiqxonaTalabi ? 'бор' : 'йўқ'}`);
  s.push(
    `- Чорва: ${x.chorvaBor ? x.chorvaTurlari.map((v) => kirillcha(CHORVA_TURI, v)).join(', ') || 'бор' : 'йўқ'}`
  );
  s.push(
    `- Ҳунармандчилик: ${x.hunarmandBor ? x.hunarTurlari.map((v) => kirillcha(HUNAR_TURI, v)).join(', ') || 'бор' : 'йўқ'}`
  );
  if (x.zarurKomak.length) s.push(`- Сўралган кўмак: ${royxat(x.zarurKomak, MOLIYA_TURI)}`);
  s.push(
    `- Тадбиркорлик истаги: ${x.tadbirkorlikIstagi ? royxat(x.tadbirkorlikSohasi, MABLAG_YONALISHI) || 'бор' : 'йўқ'}`
  );
  s.push(
    `- Молиявий эҳтиёж: ${
      x.moliyaEhtiyoji
        ? `${royxat(x.moliyaTuri, MOLIYA_TURI)}${x.talabQilinganMablag ? ` — ${pul(Number(x.talabQilinganMablag))}` : ''}`
        : 'йўқ'
    }`
  );
  s.push(
    `- Касб-ҳунарга ўқиш истаги: ${x.kasbHunarIstagi ? royxat(x.kasbHunarYonalishi, KASB_YONALISHI) || 'бор' : 'йўқ'}`
  );

  return s.join('\n');
}

const TIZIM_KORSATMASI = `Сен Ўзбекистон, Навоий вилояти, Хатирчи туманидаги камбағалликни қисқартириш бўйича мутахассиссан. Сенга БИТТА хонадоннинг хатлов маълумоти берилади — исмсиз, фақат ҳолат.

Вазифа: шу оила билан нимадан бошлаш кераклигини айтиш. Матнни маҳалла ходими ва бандлик маркази мутахассиси ўқийди.

ҚАТЪИЙ ТАЛАБЛАР:
1. ФАҚАТ кирилл ёзувидаги ўзбек тилида ёз.
2. Ҳар бир тавсия берилган МАЪЛУМОТГА таянсин. Ўзингдан рақам ёки ҳолат ўйлаб чиқарма.
3. Умумий гап ёзма. «Ёрдам бериш керак» — тавсия эмас. «Мактаб ёшидаги 2 та боладан 1 таси мактабда — таълим бўлими билан сабабини аниқлаш» — тавсия.
4. Ҳар тавсияда КИМ нима қилиши кўринсин: маҳалла ходими, бандлик маркази, таълим бўлими, туман ҳокимлиги, тиббиёт муассасаси, ижтимоий ҳимоя.
5. Оила КУЧЛИ томонини ҳам кўр: ер, ҳунар, касб, чорва. Фақат муаммо санаш фойда бермайди.
6. Маълумотда йўқ нарса ҳақида хулоса чиқарма.
7. Шахс исми, манзил ёки телефон ёзма — сенга улар берилмаган.

ЖАВОБ ШАКЛИ — фақат JSON, изоҳсиз:
{
  "holat": "2-3 гап: оиланинг ҳозирги аҳволи. Энг муҳим уч рақамни ичига ол.",
  "tavsiyalar": [
    {"daraja": "shoshilinch|muhim|imkoniyat", "sarlavha": "қисқа сарлавҳа, 8 сўзгача", "dalil": "далил ва ким нима қилиши — 1-2 гап"}
  ]
}

"daraja" маъноси: shoshilinch — кечиктирилса зарар ортади; muhim — режага киритилиши шарт; imkoniyat — қўшимча даромад бериши мумкин.
3 тадан 6 тагача тавсия ёз, энг муҳимидан бошлаб.`;

/**
 * Моделнинг JSON жавобини текширади — ишонмасдан.
 *
 * Модел жавоби ИШОНЧСИЗ манба: у ```json блокига ўралиши,
 * майдонни тушириб қолдириши ёки «daraja» ўрнига ўзи ўйлаб
 * топган сўзни ёзиши мумкин. Шунинг учун ҳар майдон алоҳида
 * текширилади ва ярамагани жимгина ташланади — битта нотўғри
 * банд бутун хулосани йўқотмаслиги керак.
 *
 * Синов учун экспорт қилинган (`scripts/xulosa-sinov.ts`).
 */
export function javobniTekshir(xom: string): { holat: string; tavsiyalar: XonadonTavsiyasi[] } | null {
  const tozalangan = xom.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');

  let d: { holat?: unknown; tavsiyalar?: unknown };
  try {
    d = JSON.parse(tozalangan) as { holat?: unknown; tavsiyalar?: unknown };
  } catch {
    return null;
  }

  if (typeof d.holat !== 'string' || !d.holat.trim()) return null;
  if (!Array.isArray(d.tavsiyalar)) return null;

  /*
   * ЖАВОБ КИРИЛЛДА БЎЛИШИ ШАРТ.
   *
   * Кўрсатмада «фақат кирилл ёзувидаги ўзбек тилида» дейилган,
   * аммо очиқ моделлар (Llama ва ҳ.к.) буни ҳар доим ҳам
   * бажармайди — инглизча ёки лотинча жавоб қайтариши мумкин.
   *
   * Бундай матнни қабул қилиб бўлмайди: бутун илова кириллда
   * сақлайди ва керак бўлганда лотинга ЎГИРАДИ (`lotinga()`).
   * Инглизча матн эса иккала алифбода ҳам инглизча бўлиб
   * қолаверади ва ҳисоботни бузади.
   *
   * Шунинг учун кириллсиз жавоб РАД ЭТИЛАДИ ва қоида бўйича
   * хулоса ишлатилади — у ҳар доим тўғри ёзувда.
   */
  if (!/[\u0400-\u04FF]/.test(d.holat)) return null;


  const darajalar = new Set<XulosaDarajasi>(['shoshilinch', 'muhim', 'imkoniyat']);
  const tavsiyalar: XonadonTavsiyasi[] = [];

  for (const x of d.tavsiyalar) {
    if (typeof x !== 'object' || x === null) continue;
    const t = x as Record<string, unknown>;
    if (typeof t.sarlavha !== 'string' || typeof t.dalil !== 'string') continue;
    const daraja =
      typeof t.daraja === 'string' && darajalar.has(t.daraja as XulosaDarajasi)
        ? (t.daraja as XulosaDarajasi)
        : 'muhim';
    tavsiyalar.push({
      daraja,
      sarlavha: t.sarlavha.trim().slice(0, 90),
      dalil: t.dalil.trim().slice(0, 400),
    });
  }

  if (!tavsiyalar.length) return null;

  const tartib = { shoshilinch: 0, muhim: 1, imkoniyat: 2 } as const;
  tavsiyalar.sort((a, b) => tartib[a.daraja] - tartib[b.daraja]);

  return { holat: d.holat.trim().slice(0, 900), tavsiyalar: tavsiyalar.slice(0, 8) };
}

/**
 * AI дан хулоса сўрайди. Муваффақиятсиз бўлса `null`.
 *
 * Провайдер (Gemini ёки Claude) `lib/ai.ts` да танланади —
 * бу ерда қайси модел ишлаётгани аҳамиятсиз.
 */
async function aiXulosasi(dalilnoma: string): Promise<{ holat: string; tavsiyalar: XonadonTavsiyasi[] } | null> {
  const matn = await matnSora({
    tizim: TIZIM_KORSATMASI,
    savol: dalilnoma,
    maxTokens: 1500,
  });
  return matn ? javobniTekshir(matn) : null;
}

/* ── Қоида бўйича хулоса ───────────────────────────────────── */

/**
 * Анкетадаги чегаралар бўйича тавсиялар.
 *
 * Бу қисм калит бўлмаганда ҳам ИШЛАЙДИ ва ходимга биринчи
 * қадамни кўрсатади. Қоидалар атайлаб АНИҚ: ҳар бири битта
 * майдонга ёки иккитасининг нисбатига таянади, шунинг учун
 * натижани текшириш ҳам осон.
 */
export function qoidaTavsiyalari(x: XonadonDalili): XonadonTavsiyasi[] {
  const t: XonadonTavsiyasi[] = [];

  /* ── Шошилинч ── */

  if (!x.hujjatlarToliq) {
    t.push({
      daraja: 'shoshilinch',
      sarlavha: 'Ҳужжатлар тўлиқ эмас',
      dalil:
        'Ҳужжатсиз оила на нафақа, на кредит, на тиббий хизмат ола билади — қолган ҳар қандай чора шундан кейин ишлайди. Маҳалла ходими ИИБ ва фуқаролик ҳолати бўлими билан биргаликда расмийлаштиришни бошласин.',
    });
  }

  const maktabsiz = x.maktabYoshdagi - x.maktabQamrovda;
  if (maktabsiz > 0) {
    t.push({
      daraja: 'shoshilinch',
      sarlavha: 'Мактаб ёшидаги бола мактабда эмас',
      dalil: `Мактаб ёшидаги ${x.maktabYoshdagi} боладан ${maktabsiz} таси мактабга қатнамаяпти. Таълим бўлими билан сабабини аниқлаш ва шу ўқув йилида қамровга олиш.`,
    });
  }

  if (!x.elektr) {
    t.push({
      daraja: 'shoshilinch',
      sarlavha: 'Электр таъминоти йўқ',
      dalil: 'Электрсиз уйда бола дарс тайёрлай олмайди, овқат сақланмайди. Ҳудудий электр тармоқлари билан улаш масаласини кўтариш.',
    });
  }

  /*
   * ЖОН БОШИГА ДАРОМАД — чет элдан келадиган пул ҲАМ қўшилади.
   *
   * Хонадон эгаси кўпинча ўғли Россиядан юборадиган пулни
   * «даромад» деб ҳисобламайди: у «иш ҳақи» эмас-да. Натижада
   * ойига 5 млн сўм олаётган оила «даромади 0» бўлиб, «темир
   * дафтар» тавсиясини оларди — ва ҳақиқатан муҳтож оиланинг
   * ўрнини эгалларди. Шунинг учун бу ерда иккови ЙИҒИНДИСИ
   * олинади, тавсия матнида эса иккови алоҳида кўрсатилади:
   * ходим рақам қаердан чиққанини кўриб турсин.
   */
  const chetElPuli = x.chetElMehnati && x.chetElOylikPul != null ? Number(x.chetElOylikPul) : 0;
  if ((x.oylikDaromad != null || chetElPuli > 0) && x.jamiAzo > 0) {
    const jamiDaromad = Number(x.oylikDaromad ?? 0) + chetElPuli;
    const jonBoshiga = jamiDaromad / x.jamiAzo;
    if (jonBoshiga < MINIMAL_ISTEMOL_SOM) {
      const tarkib = chetElPuli > 0
        ? ` (маҳаллий даромад ${pul(Number(x.oylikDaromad ?? 0))} + чет элдан ${pul(chetElPuli)})`
        : '';
      t.push({
        daraja: 'shoshilinch',
        sarlavha: 'Даромад энг кам истеъмол харажатидан паст',
        dalil: `Жон бошига ойига ${pul(jonBoshiga)} тўғри келади${tarkib} — энг кам истеъмол харажати ${pul(MINIMAL_ISTEMOL_SOM)}. Оилани «темир дафтар» кўриб чиқувига киритиш ва ижтимоий нафақа ҳуқуқини текшириш.`,
      });
    }
  }

  if (x.ishsizlikMuddatiOy != null && x.ishsizlikMuddatiOy >= UZOQ_ISHSIZLIK_OY) {
    t.push({
      daraja: 'shoshilinch',
      sarlavha: 'Узоқ муддатли ишсизлик',
      dalil: `Оилада ${x.ishsizlikMuddatiOy} ойдан буён ишсиз аъзо бор. Узоқ ишсизликда кўникма йўқолади — бандлик маркази шахсий режа тузиб, аввал қисқа муддатли иш ёки жамоат ишига жойлаштирсин.`,
    });
  }

  const suhbatsiz = x.ishsizlar.filter((p) => p.holati === 'ANIQLANDI').length;
  if (suhbatsiz > 0) {
    t.push({
      daraja: 'shoshilinch',
      sarlavha: 'Ишсиз билан ҳали суҳбат бўлмаган',
      dalil: `${suhbatsiz} та ишсиз фуқаро аниқланган, лекин суҳбат ўтказилмаган. Бандлик маркази мутахассиси шахсий анкетани тўлдирмагунча уларга ҳеч қандай таклиф берилмайди.`,
    });
  }

  /* ── Муҳим ── */

  const bogchasiz = x.maktabgachaYoshdagi - x.maktabgachaQamrovda;
  if (bogchasiz > 0) {
    const ayol = x.bogchaKutayotganAyollar > 0;
    t.push({
      daraja: 'muhim',
      sarlavha: 'Боғча қамровидан ташқаридаги бола',
      dalil: `Мактабгача ёшдаги ${x.maktabgachaYoshdagi} боладан ${bogchasiz} таси боғчага бормайди.${
        ayol
          ? ` Оилада боғча бўлса ишлашга тайёр ${x.bogchaKutayotganAyollar} аёл бор — боғча ўрни битта эмас, ИККИ масалани ечади.`
          : ' Мактабгача таълим бўлими билан навбат масаласини кўриб чиқиш.'
      }`,
    });
  } else if (x.bogchaKutayotganAyollar > 0) {
    t.push({
      daraja: 'muhim',
      sarlavha: 'Боғча ўрни — ишга чиқиш шарти',
      dalil: `${x.bogchaKutayotganAyollar} аёл боғча ўрни бўлса ишлашга тайёр. Уларни бандлик навбатига қўйиш ва боғча масаласини параллел ҳал қилиш.`,
    });
  }

  if (x.chetElMehnati) {
    const davlatlar = x.chetElDavlatlari.length
      ? x.chetElDavlatlari
          .map((d) => (d === 'Boshqa' ? (x.chetElBoshqaDavlat ?? 'бошқа давлат') : kirillcha(CHET_EL_DAVLATI, d)))
          .join(', ')
      : 'давлат кўрсатилмаган';
    const oylik = x.chetElOylikPul != null && Number(x.chetElOylikPul) > 0
      ? ` Ойига оилага ${pul(Number(x.chetElOylikPul))} юборилади — бу оила даромадининг бир қисми ва режалаштиришда ҳисобга олиниши керак.`
      : ' Пул юбориш миқдори кўрсатилмаган — уни аниқлаш керак, чунки оила даромади шунга боғлиқ.';
    t.push({
      daraja: 'muhim',
      sarlavha: 'Оила аъзоси чет элда ишлайди',
      dalil: `${x.chetElIshchilar} киши ${davlatlar}да меҳнат қилмоқда.${oylik} Қайтиб келганда иш билан таъминлаш учун бандлик маркази уларни ҳисобга олиб борсин: мигрант қайтгач иш қидиради, лекин ҳеч қайси рўйхатда бўлмайди.`,
    });
  }

  if (!x.gaz) {
    t.push({
      daraja: 'muhim',
      sarlavha: 'Газ таъминоти йўқ',
      dalil: 'Газсиз оила қишда ўтин ва кўмирга пул сарфлайди — бу даромаднинг сезиларли қисми. Тумангаз билан улаш ёки муқобил иситиш кўмагини кўриб чиқиш.',
    });
  }

  /*
   * Сув манбаи КАТАЛОГ ҚИЙМАТИ бўйича текширилади, матн ичидан
   * сўз қидириб эмас.
   *
   * Илгари бу ерда «қувур» сўзи изланарди, ҳолбуки каталогда
   * ундай сўз умуман йўқ: қийматлар «Марказлашган», «Қудуқ»,
   * «Йўқ». Натижада МАРКАЗЛАШГАН суви бор оилага ҳам «суви
   * марказлашмаган» деган тавсия чиқарди — ва буни экранда
   * сезиб бўлмасди, чунки тавсия ўзи чиройли кўринарди.
   */
  if (x.ichimlikSuvi === "Yo'q") {
    t.push({
      daraja: 'shoshilinch',
      sarlavha: 'Ичимлик суви манбаи йўқ',
      dalil:
        'Анкетада ичимлик суви манбаи «йўқ» деб белгиланган. Бу — биринчи навбатдаги масала: «Тошкентсувтаъминот» ҳудудий бўлими ва маҳалла билан биргаликда сув етказиш йўлини ҳал қилиш.',
    });
  } else if (x.ichimlikSuvi && x.ichimlikSuvi !== 'Markazlashgan') {
    t.push({
      daraja: 'muhim',
      sarlavha: 'Ичимлик суви марказлашган эмас',
      dalil: `Сув манбаи: ${kirillcha(ICHIMLIK_SUVI, x.ichimlikSuvi)}. Сувдан юқадиган касалликлар хавфи бор — «Тошкентсувтаъминот» ҳудудий бўлими билан улаш имконини текшириш.`,
    });
  }

  if (x.nogironlikBor || x.parvarishgaMuhtoj || x.yolgizKeksa) {
    const sabab = [
      x.nogironlikBor ? 'ногиронлиги бор аъзо' : null,
      x.parvarishgaMuhtoj ? 'парваришга муҳтож аъзо' : null,
      x.yolgizKeksa ? 'ёлғиз кекса' : null,
    ].filter(Boolean).join(', ');
    t.push({
      daraja: 'muhim',
      sarlavha: 'Ижтимоий ҳимоя кўриги',
      dalil: `Оилада ${sabab} бор. «Инсон» ижтимоий хизматлар маркази билан имтиёз, протез-ортопедия ва парвариш хизматлари ҳуқуқини текшириш.`,
    });
  }

  if (x.uzoqDavolanish) {
    t.push({
      daraja: 'muhim',
      sarlavha: 'Узоқ муддатли даволаниш',
      dalil: 'Оилада узоқ даволанишга муҳтож аъзо бор — бу ҳам харажат, ҳам иш кучини камайтиради. Оилавий поликлиника орқали диспансер ҳисобини ва дори таъминотини текшириш.',
    });
  }

  if (x.kasbHunarIstagi) {
    const yonalish = x.kasbHunarYonalishi.length
      ? royxat(x.kasbHunarYonalishi, KASB_YONALISHI)
      : 'йўналиш кўрсатилмаган';
    t.push({
      daraja: 'muhim',
      sarlavha: 'Касб-ҳунарга ўқиш истаги бор',
      dalil: `Оила аъзоси касб ўрганмоқчи (${yonalish}). Бандлик маркази ваучер тизими орқали курсга йўналтирсин — гуруҳ тўлишини кутмасдан, қўшни маҳаллалардаги талаб билан бирга ҳисобласин.`,
    });
  }

  /* ── Имконият ── */

  if (x.tadbirkorlikIstagi) {
    const soha = x.tadbirkorlikSohasi.length
      ? royxat(x.tadbirkorlikSohasi, MABLAG_YONALISHI)
      : 'соҳа кўрсатилмаган';
    const mablag = x.talabQilinganMablag ? ` Сўралган маблағ: ${pul(Number(x.talabQilinganMablag))}.` : '';
    t.push({
      daraja: 'imkoniyat',
      sarlavha: 'Тадбиркорлик истаги',
      dalil: `Оила ўз ишини бошламоқчи (${soha}).${mablag} Бизнесни қўллаб-қувватлаш маркази билан бизнес-режа тузиш ва имтиёзли кредит ҳужжатларини тайёрлаш.`,
    });
  }

  if (x.tomorqaBor && x.ekinMaydoni && x.ekinMaydoni >= 3 && !x.issiqxonaTalabi) {
    t.push({
      daraja: 'imkoniyat',
      sarlavha: 'Ердан тўлиқ фойдаланилмаяпти',
      dalil: `${x.ekinMaydoni} сотих экин майдони бор, аммо иссиқхона талаби билдирилмаган. Иссиқхона — йил бўйи даромад; қишлоқ хўжалиги бўлими орқали лойиҳа ва субсидия имконини тушунтириш.`,
    });
  }

  if (x.tomorqaBor && !x.chorvaBor) {
    t.push({
      daraja: 'imkoniyat',
      sarlavha: 'Чорва йўқ, ер бор',
      dalil: 'Томорқаси бор, аммо чорва боқилмаяпти. Имтиёзли кредит ёки лизинг асосида қорамол/парранда бериш — оила учун доимий даромад манбаи.',
    });
  }

  if (x.hunarmandBor) {
    const hunar = x.hunarTurlari.length
      ? x.hunarTurlari.map((v) => kirillcha(HUNAR_TURI, v)).join(', ')
      : 'ҳунар тури кўрсатилмаган';
    const komak = x.zarurKomak.length ? ` Сўралган кўмак: ${royxat(x.zarurKomak, MOLIYA_TURI)}.` : '';
    t.push({
      daraja: 'imkoniyat',
      sarlavha: 'Оилада ҳунарманд бор',
      dalil: `Ҳунар: ${hunar}.${komak} «Ҳунарманд» уюшмасига аъзо қилиш, ЯТТ сифатида расмийлаштириш ва маҳсулотни бозорга чиқариш йўлини кўрсатиш — бу энг тез натижа берадиган йўналиш.`,
    });
  }

  if (x.moliyaEhtiyoji && !x.tadbirkorlikIstagi) {
    t.push({
      daraja: 'imkoniyat',
      sarlavha: 'Молиявий эҳтиёж билдирилган',
      dalil: `Сўралган: ${royxat(x.moliyaTuri, MOLIYA_TURI) || 'тури кўрсатилмаган'}${
        x.talabQilinganMablag ? ` — ${pul(Number(x.talabQilinganMablag))}` : ''
      }. Маблағ нимага сарфланишини аниқлаштириш: даромад келтирадиган йўналишга қаратилса, кредит қайтариш ҳам осонлашади.`,
    });
  }

  const tartib = { shoshilinch: 0, muhim: 1, imkoniyat: 2 } as const;
  return t.sort((a, b) => tartib[a.daraja] - tartib[b.daraja]);
}

/** Қоида бўйича ҳолат матни */
export function qoidaHolati(x: XonadonDalili): string {
  const g: string[] = [];

  g.push(
    `Оилада ${x.jamiAzo} аъзо${x.bolalarSoni > 0 ? `, шундан ${x.bolalarSoni} бола` : ''}; меҳнатга лаёқатли ${x.mehnatgaLayoqatli} кишидан ${x.ishlaydiganlar} таси ишлайди, ${x.ishsizlarSoni} таси ишсиз.`
  );

  if (x.oylikDaromad != null && x.jamiAzo > 0) {
    const jon = Number(x.oylikDaromad) / x.jamiAzo;
    g.push(
      `Ойлик даромад ${pul(Number(x.oylikDaromad))}, жон бошига ${pul(jon)} — энг кам истеъмол харажатининг ${Math.round((jon / MINIMAL_ISTEMOL_SOM) * 100)} фоизи.`
    );
  } else {
    g.push('Ойлик даромад кўрсатилмаган — уни аниқлаштирмасдан чора танлаш қийин.');
  }

  const kuchli = [
    x.tomorqaBor ? 'томорқа' : null,
    x.chorvaBor ? 'чорва' : null,
    x.hunarmandBor ? 'ҳунармандчилик' : null,
    x.tadbirkorlikIstagi ? 'тадбиркорлик истаги' : null,
    x.kasbHunarIstagi ? 'касб ўрганиш истаги' : null,
  ].filter(Boolean);

  g.push(
    kuchli.length
      ? `Оиланинг таянчи: ${kuchli.join(', ')} — чора шулардан бошланиши керак.`
      : 'Анкетада оиланинг таянч имконияти (ер, чорва, ҳунар, тадбиркорлик истаги) кўрсатилмаган — суҳбатда шуни аниқлаштириш керак.'
  );

  return g.join(' ');
}

/**
 * Хонадон ёзувидан далил объектини тузади.
 *
 * Хонадонни бутунлигича узатиб бўлмайди: унда исм, манзил,
 * телефон ва ходим ёзган эркин матнлар бор. Шунинг учун керакли
 * майдонлар ШУ ЕРДА, битта жойда кўчирилади — сервер ва саҳифа
 * иккиси ҳам шуни чақиради ва улар орасида фарқ бўлиши мумкин
 * эмас.
 */
export function xonadonDalili(x: XonadonYozuvi): XonadonDalili {
  const yil = new Date().getFullYear();
  return {
    jamiAzo: x.jamiAzo,
    bolalarSoni: x.bolalarSoni,
    mehnatgaLayoqatli: x.mehnatgaLayoqatli,
    mehnatgaLayoqatsiz: x.mehnatgaLayoqatsiz,
    ishlaydiganlar: x.ishlaydiganlar,
    ishsizlarSoni: x.ishsizlarSoni,
    bogchaKutayotganAyollar: x.bogchaKutayotganAyollar,
    ishsizlikMuddatiOy: x.ishsizlikMuddatiOy,
    kasbHunarIstagi: x.kasbHunarIstagi,
    kasbHunarYonalishi: x.kasbHunarYonalishi,
    tadbirkorlikIstagi: x.tadbirkorlikIstagi,
    tadbirkorlikSohasi: x.tadbirkorlikSohasi,
    moliyaEhtiyoji: x.moliyaEhtiyoji,
    moliyaTuri: x.moliyaTuri,
    talabQilinganMablag: x.talabQilinganMablag,
    mablagYonalishi: x.mablagYonalishi,
    oylikDaromad: x.oylikDaromad,
    chetElMehnati: x.chetElMehnati,
    chetElIshchilar: x.chetElIshchilar,
    chetElDavlatlari: x.chetElDavlatlari,
    chetElBoshqaDavlat: x.chetElBoshqaDavlat,
    chetElOylikPul: x.chetElOylikPul,
    daromadManbalari: x.daromadManbalari,
    kambagallikSabablari: x.kambagallikSabablari,
    maktabgachaYoshdagi: x.maktabgachaYoshdagi,
    maktabgachaQamrovda: x.maktabgachaQamrovda,
    maktabYoshdagi: x.maktabYoshdagi,
    maktabQamrovda: x.maktabQamrovda,
    togarakQamrovi: x.togarakQamrovi,
    uzoqDavolanish: x.uzoqDavolanish,
    uyHolati: x.uyHolati,
    ichimlikSuvi: x.ichimlikSuvi,
    sugorishSuvi: x.sugorishSuvi,
    elektr: x.elektr,
    gaz: x.gaz,
    gazTuri: x.gazTuri,
    kanalizatsiya: x.kanalizatsiya,
    nogironlikBor: x.nogironlikBor,
    yolgizKeksa: x.yolgizKeksa,
    parvarishgaMuhtoj: x.parvarishgaMuhtoj,
    hujjatlarToliq: x.hujjatlarToliq,
    tomorqaBor: x.tomorqaBor,
    ekinMaydoni: x.ekinMaydoni,
    chorvaBor: x.chorvaBor,
    chorvaTurlari: x.chorvaTurlari,
    hunarmandBor: x.hunarmandBor,
    hunarTurlari: x.hunarTurlari,
    zarurKomak: x.zarurKomak,
    issiqxonaTalabi: x.issiqxonaTalabi,
    ijaraYer: x.ijaraYer,
    ishsizlar: x.ishsizlar.map((p) => ({
      jinsi: p.jinsi,
      yoshi: p.tugilganSana ? yil - p.tugilganSana.getFullYear() : null,
      malumoti: p.malumoti,
      mutaxassisligi: p.mutaxassisligi,
      xohlaganIsh: p.xohlaganIsh,
      organmoqchiKasb: p.organmoqchiKasb,
      holati: p.holati,
      nogironlik: p.nogironlik,
    })),
  };
}

/**
 * ФАҚАТ ҚОИДА бўйича хулоса — сўровсиз, дарҳол.
 *
 * Ҳар хонадон саҳифаси очилганда ҳисобланади ва ҳамма роль
 * кўради. Ҳеч қаерга сўров юборилмайди, шунинг учун ҳам текин,
 * ҳам интернетсиз ишлайди.
 */
export function qoidaXulosasi(x: XonadonDalili): XonadonXulosasi {
  return { manba: 'qoida', holat: qoidaHolati(x), tavsiyalar: qoidaTavsiyalari(x) };
}

/**
 * Хонадон бўйича хулоса тайёрлайди.
 *
 * Аввал AI га уринади, бўлмаса қоидага тушади. Иккала ҳолда ҳам
 * `manba` ёзилади: ўқувчи матнни ким ёзганини билиши шарт.
 */
export async function xonadonXulosasiOl(x: XonadonDalili): Promise<XonadonXulosasi> {
  const qoida = qoidaTavsiyalari(x);

  const ai = await aiXulosasi(dalilnomaYasa(x));
  if (ai) {
    /*
     * Қоида тавсиялари ҳам қўшилади, AI такрорлаганлари ташлаб.
     * Қоидалар аниқ чегараларга таянади (ҳужжат, мактаб қамрови,
     * даромад чегараси) — AI уларни эътибордан четда қолдирса,
     * хулоса камбағаллашади.
     */
    const bor = new Set(ai.tavsiyalar.map((t) => t.sarlavha.toLowerCase()));
    const qoshimcha = qoida.filter((t) => !bor.has(t.sarlavha.toLowerCase()));
    const tartib = { shoshilinch: 0, muhim: 1, imkoniyat: 2 } as const;

    return {
      manba: 'ai',
      holat: ai.holat,
      tavsiyalar: [...ai.tavsiyalar, ...qoshimcha]
        .sort((a, b) => tartib[a.daraja] - tartib[b.daraja])
        .slice(0, 10),
    };
  }

  return { manba: 'qoida', holat: qoidaHolati(x), tavsiyalar: qoida };
}

export const XULOSA_DARAJASI: Record<XulosaDarajasi, { nomi: string; sinf: string }> = {
  shoshilinch: { nomi: 'Шошилинч', sinf: 'bg-danger-bg text-danger' },
  muhim: { nomi: 'Муҳим', sinf: 'bg-warn-bg text-warn' },
  imkoniyat: { nomi: 'Имконият', sinf: 'bg-info-bg text-info' },
};
