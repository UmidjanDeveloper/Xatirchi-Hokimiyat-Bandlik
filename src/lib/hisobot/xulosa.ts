/**
 * ============================================================
 *  ҲИСОБОТ ХУЛОСАСИ — «энди нима қилиш керак»
 *
 *  Диаграмма «нима бўляпти» дейди. Бу модул «нима қилиш керак»
 *  дейди — йиғилишда айнан шу саҳифа ўқилади.
 *
 *  ── Иккита манба, битта шакл ──
 *
 *  1. QOIDA — `tavsiyalar.ts` даги чегаралар. Ҳар доим ишлайди,
 *     интернет ва калит талаб қилмайди, натижаси такрорланади.
 *  2. AI — Claude. Қоидалар кўрмайдиган боғланишларни топади:
 *     «ҳунарманд хонадонлар кўп, аммо молиявий кўмак сўраганлар
 *     кам — демак масала пулда эмас, бозорда».
 *
 *  Калит бўлмаса ёки сўров узилса — QOIDA га тушади ва ҳисобот
 *  БАРИБИР чиқади. Хулосасиз ҳисобот чиқаришдан кўра қоида
 *  бўйича хулоса яхши.
 *
 *  ── Шахсий маълумот ──
 *
 *  AI га ФАҚАТ жамланган сонлар юборилади: «143 хонадонда газ
 *  йўқ», «64 фуқаро 18-30 ёшда». Ф.И.Ш., манзил, телефон ва
 *  маҳалла раисларининг номи юборилмайди. Туман ва вилоят номи
 *  юборилади — улар очиқ маълумот ва хулосанинг мазмуни учун
 *  керак (тоғли туманда бошқа чора, шаҳар ёнида бошқа).
 *
 *  Буни текшириш осон бўлиши учун юбориладиган матн битта
 *  жойда — `dalilnomaYasa()` да — тузилади ва у фақат
 *  `Korsatkich`/`Jadval` лардан ўқийди, хом ёзувлардан эмас.
 * ============================================================
 */
import { matnSora } from '@/lib/ai';
import { MASUL_TASHKILOT, kirillcha } from '@/lib/constants';
import { tavsiyalarniHisobla } from '@/lib/tavsiyalar';
import type { TahlilNatijasi } from '@/lib/tahlil';
import type { Bolim, HisobotTavsiyasi, Xulosa } from './turlar';
import { foiz, foizi, son } from './format';

/**
 * AI га юбориладиган далилнома.
 *
 * Фақат бўлимлардаги кўрсаткич ва жадвал сарлавҳаларидан
 * тузилади — ya'ni хом ёзувга йўл йўқ. Матн қасддан ихчам:
 * узун бўлса модел муҳим рақамни эътибордан четда қолдиради.
 */
function dalilnomaYasa(qamrovNomi: string, bolimlar: Bolim[], asos: { xonadon: number; fuqaro: number }): string {
  const satrlar: string[] = [
    `Ҳудуд: ${qamrovNomi}, Хатирчи тумани, Навоий вилояти (Ўзбекистон).`,
    `Ҳисобот асоси: ${asos.xonadon} хонадон хатлови, ${asos.fuqaro} ишсиз фуқаро ёзуви.`,
    '',
  ];

  for (const b of bolimlar) {
    satrlar.push(`## ${b.sarlavha}`);

    for (const k of b.korsatkichlar ?? []) {
      satrlar.push(`- ${k.nomi}: ${k.qiymat}${k.izoh ? ` (${k.izoh})` : ''}`);
    }

    for (const j of b.jadvallar ?? []) {
      satrlar.push(`### ${j.sarlavha}`);
      // Фақат биринчи 12 қатор: узун жадвал моделни чалғитади
      for (const q of j.qatorlar.slice(0, 12)) {
        satrlar.push(`- ${q.nomi}: ${q.qiymatlar.join(' · ')}`);
      }
    }
    satrlar.push('');
  }

  return satrlar.join('\n');
}

const TIZIM_KORSATMASI = `Сен Ўзбекистон, Навоий вилояти, Хатирчи туманидаги камбағалликни қисқартириш ва бандлик бўйича таҳлилчисан. Сенга маҳалла ёки туман кесимидаги ЖАМЛАНГАН статистика берилади.

Вазифа: раҳбар йиғилишда ўқийдиган қисқа хулоса ва амалий тавсиялар ёзиш.

ҚАТЪИЙ ТАЛАБЛАР:
1. ФАҚАТ кирилл ёзувидаги ўзбек тилида ёз. Рус, инглиз ёки лотин ёзувида ёзма.
2. Ҳар бир тавсия РАҚАМЛИ ДАЛИЛга таянсин. Далилни берилган маълумотдан ол, ўзингдан рақам ўйлаб чиқарма.
3. Умумий гап ёзма. «Ишни кучайтириш керак» — бу тавсия эмас. «143 хонадонда газ йўқ — тумангаз билан биргаликда босқичли режа тузиш» — бу тавсия.
4. Ҳар бир тавсияда КИМ нима қилиши кўринсин (масалан: бандлик маркази, туман ҳокимлиги, маҳалла раиси, таълим бўлими).
5. Маълумотда йўқ нарса ҳақида хулоса чиқарма. Маълумот кам бўлса — шуни айт.
6. Шахс исми, манзил ёки телефон ёзма — сенга улар берилмаган.

ЖАВОБ ШАКЛИ — фақат JSON, изоҳсиз:
{
  "holat": "2-4 гап: ҳозирги ҳолат. Энг муҳим уч-тўрт рақамни ичига ол.",
  "tavsiyalar": [
    {"daraja": "shoshilinch|muhim|imkoniyat", "sarlavha": "қисқа сарлавҳа, 8 сўзгача", "dalil": "рақамли далил ва ким нима қилиши — 1-2 гап"}
  ]
}

"daraja" маъноси: shoshilinch — кечиктирилса зарар ортади; muhim — режага киритилиши шарт; imkoniyat — қўшимча натижа бериши мумкин.
4 тадан 7 тагача тавсия ёз, энг муҳимидан бошлаб.`;

interface AiJavobi {
  holat?: unknown;
  tavsiyalar?: unknown;
}

/** Моделнинг JSON жавобини текширади — ишонмасдан */
function javobniTekshir(xom: string): { holat: string; tavsiyalar: HisobotTavsiyasi[] } | null {
  // Модел баъзан JSON ни ```json блокига ўрайди
  const tozalangan = xom.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');

  let d: AiJavobi;
  try {
    d = JSON.parse(tozalangan) as AiJavobi;
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


  const darajalar = new Set(['shoshilinch', 'muhim', 'imkoniyat']);
  const tavsiyalar: HisobotTavsiyasi[] = [];

  for (const x of d.tavsiyalar) {
    if (typeof x !== 'object' || x === null) continue;
    const t = x as Record<string, unknown>;
    if (typeof t.sarlavha !== 'string' || typeof t.dalil !== 'string') continue;
    const daraja = typeof t.daraja === 'string' && darajalar.has(t.daraja) ? t.daraja : 'muhim';
    tavsiyalar.push({
      daraja: daraja as HisobotTavsiyasi['daraja'],
      // Узун сарлавҳа жадвалга сиғмайди
      sarlavha: t.sarlavha.trim().slice(0, 90),
      dalil: t.dalil.trim().slice(0, 400),
    });
  }

  if (!tavsiyalar.length) return null;

  const tartib = { shoshilinch: 0, muhim: 1, imkoniyat: 2 } as const;
  tavsiyalar.sort((a, b) => tartib[a.daraja] - tartib[b.daraja]);

  return { holat: d.holat.trim().slice(0, 1200), tavsiyalar: tavsiyalar.slice(0, 8) };
}

/**
 * AI дан хулоса сўрайди. Муваффақиятсиз бўлса `null`.
 *
 * Тармоқ узилди, калит нотўғри ёки муддат ўтди — фарқи йўқ,
 * барибир қоидага тушамиз. Провайдер `lib/ai.ts` да танланади.
 */
async function aiXulosasi(dalilnoma: string): Promise<{ holat: string; tavsiyalar: HisobotTavsiyasi[] } | null> {
  const matn = await matnSora({
    tizim: TIZIM_KORSATMASI,
    savol: dalilnoma,
    maxTokens: 2000,
  });
  return matn ? javobniTekshir(matn) : null;
}

/**
 * Қоида бўйича ҳолат матни.
 *
 * AI йўқ бўлганда ҳам ҳисобот «шунча хонадон, шунча фуқаро»
 * дан кўпроқ нарса айтиши керак. Бу матн ўша минимумни беради:
 * қамров, натижа ва энг катта иккита муаммо.
 */
function qoidaHolati(t: TahlilNatijasi, qamrovNomi: string): string {
  const j = t.jami;
  const gaplar: string[] = [];

  gaplar.push(
    `${qamrovNomi} бўйича базада ${son(j.bazaXonadon)} хонадон рўйхатда турибди, шундан ${son(j.xatlovXonadon)} таси хатловдан ўтган (${foiz(foizi(j.xatlovXonadon, j.bazaXonadon))}).`
  );

  if (j.aniqlangan > 0) {
    gaplar.push(
      `Хатлов натижасида ${son(j.aniqlangan)} ишсиз фуқаро аниқланган, ${son(j.joylashtirilgan)} таси ишга жойлаштирилган (${foiz(foizi(j.joylashtirilgan, j.aniqlangan))}).`
    );
  } else {
    gaplar.push('Ҳали бирорта ишсиз фуқаро тизимга киритилмаган — хатловни давом эттириш керак.');
  }

  const kechikkan = t.kechikkanlar.reduce((s, k) => s + k.soni, 0);
  if (kechikkan > 0) {
    const eng = t.kechikkanlar[0];
    gaplar.push(
      `${son(kechikkan)} та топшириқнинг муддати ўтган; энг кўпи — ${kirillcha(MASUL_TASHKILOT, eng.tashkilot)} (${son(eng.soni)} та).`
    );
  }

  if (j.radEtgan > 0 && j.aniqlangan >= 20) {
    gaplar.push(
      `${son(j.radEtgan)} фуқаро таклифдан бош тортган (${foiz(foizi(j.radEtgan, j.aniqlangan))}) — таклифлар мослигини кўриб чиқиш керак.`
    );
  }

  return gaplar.join(' ');
}

/* ── Кеш ─────────────────────────────────────────────────────── */

/**
 * AI жавоби КЕШЛАНАДИ.
 *
 * Сабаби иккита. Биринчиси — пул: ҳоким панелни кунда ўн марта
 * очади ва ҳар сафар модел чақирилса, ҳисобот текинга тушмайди.
 * Иккинчиси — ишонч: бир хил маълумотга ҳар сафар бошқа матн
 * чиқса, йиғилишда «эрталаб бошқача ёзилган эди» деган савол
 * чиқади.
 *
 * Калитга ЁЗУВ СОНЛАРИ ҳам киради: янги анкета юборилса калит
 * ўзгаради ва хулоса қайта ҳисобланади. Ya'ni кеш эскирган
 * маълумотни кўрсатиб қолмайди.
 *
 * Кеш процесс хотирасида. Vercel да ҳар инстанс ўзича кешлайди
 * ва инстанс ўчса кеш йўқолади — бу етарли: мақсад такрорий
 * чақириқни камайтириш, абадий сақлаш эмас.
 */
const KESH_MUDDATI_MS = 15 * 60 * 1000;

interface KeshYozuvi {
  vaqti: number;
  xulosa: Xulosa;
}

const kesh = new Map<string, KeshYozuvi>();

function keshKaliti(qamrovNomi: string, asos: { xonadon: number; fuqaro: number }): string {
  return `${qamrovNomi}|${asos.xonadon}|${asos.fuqaro}`;
}

/** Кеш чексиз ўсмаслиги учун — эски ёзувлар олиб ташланади */
function keshniTozala(): void {
  const hozir = Date.now();
  for (const [k, v] of kesh) {
    if (hozir - v.vaqti > KESH_MUDDATI_MS) kesh.delete(k);
  }
  // Ҳар эҳтимолга қарши юқори чегара
  if (kesh.size > 200) {
    const eskilar = [...kesh.entries()].sort((a, b) => a[1].vaqti - b[1].vaqti);
    for (const [k] of eskilar.slice(0, 100)) kesh.delete(k);
  }
}

/**
 * Хулоса ва тавсияларни тайёрлайди.
 *
 * Аввал AI га уринади, бўлмаса қоидага тушади. Иккала ҳолда ҳам
 * `manba` ёзилади: ўқувчи матнни ким ёзганини билиши шарт.
 */
export async function xulosaOl(
  tahlil: TahlilNatijasi,
  bolimlar: Bolim[],
  qamrovNomi: string,
  asos: { xonadon: number; fuqaro: number }
): Promise<Xulosa> {
  const kalit = keshKaliti(qamrovNomi, asos);
  const saqlangan = kesh.get(kalit);
  if (saqlangan && Date.now() - saqlangan.vaqti < KESH_MUDDATI_MS) {
    return saqlangan.xulosa;
  }

  const qoidaTavsiyalari: HisobotTavsiyasi[] = tavsiyalarniHisobla(tahlil).map((t) => ({
    daraja: t.daraja,
    sarlavha: t.sarlavha,
    dalil: t.dalil,
  }));

  // Маълумот жуда кам бўлса AI га умуман бормаймиз: у ҳам
  // асоссиз хулоса чиқарарди, фақат пул ва вақт кетарди.
  const yetarli = asos.xonadon >= 5;

  if (yetarli) {
    const ai = await aiXulosasi(dalilnomaYasa(qamrovNomi, bolimlar, asos));
    if (ai) {
      /*
       * Қоида тавсияларини ҳам қўшамиз, лекин AI такрорлаган
       * сарлавҳаларни ташлаб. Қоидалар аниқ чегараларга таянади
       * (муддати ўтган топшириқ, тўлган курс гуруҳи) — AI уларни
       * эътибордан четда қолдирса, ҳисобот камбағаллашади.
       */
      const borSarlavhalar = new Set(ai.tavsiyalar.map((t) => t.sarlavha.toLowerCase()));
      const qoshimcha = qoidaTavsiyalari.filter(
        (t) => !borSarlavhalar.has(t.sarlavha.toLowerCase())
      );

      const tartib = { shoshilinch: 0, muhim: 1, imkoniyat: 2 } as const;
      const hammasi = [...ai.tavsiyalar, ...qoshimcha].sort(
        (a, b) => tartib[a.daraja] - tartib[b.daraja]
      );

      const natija: Xulosa = {
        manba: 'ai',
        holat: ai.holat,
        tavsiyalar: hammasi.slice(0, 12),
        ogohlik:
          'Хулоса матни сунъий интеллект томонидан, фақат жамланган статистика асосида тайёрланган. Шахсий маълумот (Ф.И.Ш., манзил, телефон) юборилмаган. Қарор қабул қилишдан олдин рақамларни ҳисоботнинг ўзидан текширинг.',
      };

      keshniTozala();
      kesh.set(kalit, { vaqti: Date.now(), xulosa: natija });
      return natija;
    }
  }

  /*
   * Қоида натижаси кешланмайди: у арзон ва ҳар доим бир хил
   * чиқади. Кешлаш фақат AI жавоб бермаган ҳолатни муҳрлаб
   * қўярди — кейинги уринишда AI ишлаб кетса ҳам, 15 дақиқа
   * қоида матни кўриниб турарди.
   */
  return {
    manba: 'qoida',
    holat: qoidaHolati(tahlil, qamrovNomi),
    tavsiyalar: qoidaTavsiyalari,
    ogohlik: yetarli
      ? 'Хулоса белгиланган чегаралар бўйича ҳисоблангани — сунъий интеллект жавоб бермади ёки калит созланмаган.'
      : 'Маълумот ҳали кам: хулоса фақат чегаралар бўйича ҳисобланган. Хатлов давом этгани сари таҳлил аниқлашади.',
  };
}
