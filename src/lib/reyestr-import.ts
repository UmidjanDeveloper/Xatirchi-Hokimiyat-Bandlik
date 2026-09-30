import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import { lotinga } from './alifbo';
import { dalilQoshish, JOYLASHGAN_FILTRI } from './joylashuv-dalili';

/**
 * ============================================================
 *  РЕЕСТР КЎЧИРМАСИНИ СОЛИШТИРИШ
 *
 *  ── Нега керак ──
 *
 *  Тизимда «ишга жойлаштирилди» деб турган ҳар бир ёзув —
 *  ходимнинг айтгани. Давлат реестри эса АЙТМАЙДИ, ёзиб
 *  қўяди: одам расман ишга олинган бўлса, у ерда бор.
 *
 *  Иккита рўйхатни солиштириш — бутун тизимдаги энг арзон ва
 *  энг кучли текширув. Ҳеч ким ҳеч кимни сўроқ қилмайди,
 *  ҳеч қандай қўшимча иш юзага келмайди: файл юкланади ва
 *  рақам ўз ўрнига тушади.
 *
 *  ── Нега исм бўйича ва бу хавфлими ──
 *
 *  Фуқаро ёзувида ЖШШИР йўқ — анкетада сўралмаган. Шунинг
 *  учун солиштириш Ф.И.Ш. ва туғилган сана бўйича кетади.
 *
 *  Бу хато қилиши мумкин, ва айнан шунинг учун:
 *
 *    • иккита номзод топилса, ҲЕЧ БИРИ танланмайди — қатор
 *      «шубҳали» рўйхатига тушади ва одам қарайди;
 *    • реестрда топилган-у, тизимда «жойлашмаган» деб турган
 *      одамнинг ҲОЛАТИ ЎЗГАРТИРИЛМАЙДИ — фақат хабар
 *      берилади.
 *
 *  Файлдан туриб фуқаронинг ҳолатини жимгина ўзгартириш —
 *  айнан тизимга ишончни йўқотадиган нарса. Шунинг учун
 *  импорт ФАҚАТ далил қўшади.
 *
 *  ── Нега иш берувчи номи сақланади ──
 *
 *  Тизимда «Оқ Олтин МЧЖ» ёзилиб, реестрда бошқа корхона
 *  чиқса — бу хато эмас, ҲОДИСА: фуқаро бошқа жойга ишга
 *  кирган ва буни ҳеч ким ёзмаган. Иккала ном ҳам сақланади
 *  ва фарқ ҳисоботда айтилади.
 * ============================================================
 */

export interface ReyestrSatri {
  fish: string;
  ishJoyi?: string | null;
  tugilganSana?: Date | null;
}

export interface MosKelgan {
  ishsizId: string;
  fish: string;
  reyestrIshJoyi: string | null;
  /** Тизимдаги иш жойи реестрдагидан фарқ қиладими */
  boshqaIshJoyi: boolean;
  tizimIshJoyi: string | null;
}

export interface ReyestrNatijasi {
  /** Файлдаги жами сатр */
  jami: number;
  /** Жойлашган деб турганлар — далил ёзилди */
  mos: MosKelgan[];
  /** Реестрда бор, тизимда «иш кутяпти» деб турганлар */
  yangiTopilgan: { ishsizId: string; fish: string; holati: string }[];
  /** Иккита ва ундан кўп номзод — ҳеч бири танланмади */
  shubhali: { fish: string; nomzodlar: number }[];
  /**
   * ТЕКШИРУВ ТАЛАБ ҚИЛАДИГАНЛАР.
   *
   * Исм мос келди, аммо автоматик тасдиқлаш учун етарли
   * эмас. Икки хил сабаб бор ва улар АРАЛАШТИРИЛМАЙДИ:
   *
   *   · `sana-qarama-qarshi` — иккала томонда ҳам сана бор
   *     ва улар ҲАР ХИЛ. Бу катта эҳтимол билан БОШҚА одам;
   *
   *   · `sana-yetishmaydi` — бир томонда сана умуман йўқ.
   *     Бу «нотўғри» эмас, «билмаймиз» — ва билмаган нарсани
   *     тасдиқлаб бўлмайди.
   *
   * Аввал бундай гуруҳ УМУМАН йўқ эди: битта номзод
   * топилса, туғилган сана солиштирилмасдан «мос» деб
   * ёзиларди.
   */
  tekshirilsin: {
    fish: string;
    ishsizId: string;
    sabab: 'sana-qarama-qarshi' | 'sana-yetishmaydi';
    tizimSanasi: string | null;
    reyestrSanasi: string | null;
  }[];
  /** Тизимда умуман топилмаганлар */
  topilmadi: string[];
  /** Аллақачон ўша сана билан ёзилган — такрор ёзилмади */
  takror: number;
}

/**
 * Исм калити.
 *
 * ── Нега сўзлар САРАЛАНАДИ ──
 *
 * Реестрда «Алиев Анвар Собирович», анкетада «Анвар Алиев»
 * бўлиши мумкин. Тартиб ҳар хил, сўзлар эса бир хил.
 * Саралангандан кейин иккови битта калитга тушади.
 *
 * Отасининг исми ортиқча бўлса, калит фарқ қилиб кетади —
 * шунинг учун қисқароқ калит ҳам ҳисобланади (пастга қаранг).
 */
export function ismKaliti(fish: string): string {
  return lotinga(fish)
    .toLowerCase()
    .replace(/[''ʻʼ`´]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .sort()
    .join(' ');
}

/**
 * Иш жойи номлари бир хилми.
 *
 * «Оқ Олтин МЧЖ» ва «ОҚ ОЛТИН МЧж» — бир хил. Ҳуқуқий шакл
 * («МЧЖ», «ООО», «ЙТТ») эса ташлаб юборилади: у манбага
 * қараб ҳар хил ёзилади ва фарқ сифатида саналмаслиги керак.
 */
const HUQUQIY_SHAKL = /\b(mchj|ooo|mas|xk|ak|yatt|ytt|qxk|fx|llc|ltd)\b/g;

export function ishJoyiKaliti(nom: string | null | undefined): string {
  if (!nom) return '';
  return lotinga(nom)
    .toLowerCase()
    .replace(/[''ʻʼ`´"«»]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(HUQUQIY_SHAKL, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Санани `2020-01-02` кўринишида — экранда кўрсатиш учун */
function sanaMatni(d: Date | null | undefined): string | null {
  if (!d) return null;
  return d.toISOString().slice(0, 10);
}

/** Икки санани КУН аниқлигида таққослайди */
function sanaTeng(a: Date | null | undefined, b: Date | null | undefined): boolean {
  if (!a || !b) return false;
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

interface Nomzod {
  id: string;
  fish: string;
  holati: string;
  ishJoyi: string | null;
  tugilganSana: Date | null;
}

/**
 * Кўчирмани солиштиради — ҲЕЧ НАРСА ЁЗМАЙДИ.
 *
 * Администратор натижани аввал КЎРАДИ: нечтаси мос келди,
 * нечтаси шубҳали, нечтаси топилмади. Шундан кейингина
 * ёзишга рози бўлади.
 *
 * Кўр-кўрона ёзиш хавфли: исм бўйича солиштириш хато
 * қилиши мумкин, ва хато далил йўқ далилдан ёмонроқ.
 */
export async function reyestrniSolishtir(
  satrlar: ReyestrSatri[],
  mahallaId?: string
): Promise<ReyestrNatijasi> {
  const natija: ReyestrNatijasi = {
    jami: satrlar.length,
    mos: [],
    yangiTopilgan: [],
    shubhali: [],
    tekshirilsin: [],
    topilmadi: [],
    takror: 0,
  };
  if (satrlar.length === 0) return natija;

  const qayer: Prisma.UnemployedPersonWhereInput = {
    arxivSanasi: null,
    ...(mahallaId ? { mahallaId } : {}),
  };

  const odamlar = await prisma.unemployedPerson.findMany({
    where: qayer,
    select: { id: true, fish: true, holati: true, ishJoyi: true, tugilganSana: true },
  });

  const kalitlar = new Map<string, Nomzod[]>();
  for (const o of odamlar) {
    const k = ismKaliti(o.fish);
    if (!k) continue;
    const royxat = kalitlar.get(k) ?? [];
    royxat.push(o);
    kalitlar.set(k, royxat);
  }

  const joylashganHolatlar = new Set(['JOYLASHTIRILDI', 'TASDIQLANDI']);

  for (const satr of satrlar) {
    const k = ismKaliti(satr.fish);
    let nomzodlar = k ? (kalitlar.get(k) ?? []) : [];

    /*
     * Иккитадан кўп бўлса, туғилган сана ажратиб беради.
     * Сана йўқ бўлса — ҳеч бири танланмайди.
     */
    if (nomzodlar.length > 1 && satr.tugilganSana) {
      const aniq = nomzodlar.filter((n) => sanaTeng(n.tugilganSana, satr.tugilganSana));
      if (aniq.length === 1) nomzodlar = aniq;
    }

    if (nomzodlar.length === 0) {
      natija.topilmadi.push(satr.fish);
      continue;
    }
    if (nomzodlar.length > 1) {
      natija.shubhali.push({ fish: satr.fish, nomzodlar: nomzodlar.length });
      continue;
    }

    const n = nomzodlar[0];

    /*
     * ── ТУҒИЛГАН САНА ҲАР ДОИМ СОЛИШТИРИЛАДИ ──
     *
     * Аввал сана ФАҚАТ бир нечта номзод топилганда
     * ишлатиларди. Битта номзод бўлса, сана фарқи УМУМАН
     * кўрилмасди.
     *
     * Яъни:
     *
     *   тизимда:  Али Валиев, 01.01.1990
     *   реестрда: Али Валиев, 02.02.2000
     *
     * — булар «мос» деб топилар ва БОШҚА одамнинг ишга
     * жойлашгани биринчисига ёзиб қўйиларди. Ҳокимликнинг
     * «тасдиқланган жойлаштириш» рақами ёлғон чиқарди.
     *
     * Энди уч ҳолат аниқ ажратилади:
     *
     *   · иккала сана бор ва ТЕНГ      → мос, давом этамиз;
     *   · иккала сана бор, ҲАР ХИЛ     → ЗИДДИЯТ, одам кўрсин;
     *   · бир томонда сана ЙЎҚ         → билмаймиз, одам кўрсин.
     *
     * Иккинчи ва учинчиси АРАЛАШТИРИЛМАЙДИ: «қарама-қарши»
     * билан «етишмайди» ҳар хил нарса ва ходимга ҳар хил
     * қарор керак.
     */
    const ikkalasidaSanaBor = Boolean(n.tugilganSana && satr.tugilganSana);
    if (ikkalasidaSanaBor && !sanaTeng(n.tugilganSana, satr.tugilganSana)) {
      natija.tekshirilsin.push({
        fish: satr.fish,
        ishsizId: n.id,
        sabab: 'sana-qarama-qarshi',
        tizimSanasi: sanaMatni(n.tugilganSana),
        reyestrSanasi: sanaMatni(satr.tugilganSana),
      });
      continue;
    }
    if (!ikkalasidaSanaBor) {
      natija.tekshirilsin.push({
        fish: satr.fish,
        ishsizId: n.id,
        sabab: 'sana-yetishmaydi',
        tizimSanasi: sanaMatni(n.tugilganSana),
        reyestrSanasi: sanaMatni(satr.tugilganSana),
      });
      continue;
    }

    if (!joylashganHolatlar.has(n.holati)) {
      /*
       * Реестрда бор, тизимда эса «иш кутяпти». Бу — ЯНГИЛИК:
       * одам ишга кирган ва буни ҳеч ким ёзмаган.
       *
       * Ҳолат ЎЗГАРТИРИЛМАЙДИ. Файлдан туриб фуқаронинг
       * ҳолатини жимгина ўзгартириш айнан тизимга ишончни
       * йўқотадиган нарса — мутахассис кўриб, ўзи қарор
       * қилади.
       */
      natija.yangiTopilgan.push({ ishsizId: n.id, fish: n.fish, holati: n.holati });
      continue;
    }

    const tizim = ishJoyiKaliti(n.ishJoyi);
    const reyestr = ishJoyiKaliti(satr.ishJoyi);

    natija.mos.push({
      ishsizId: n.id,
      fish: n.fish,
      reyestrIshJoyi: satr.ishJoyi ?? null,
      tizimIshJoyi: n.ishJoyi,
      boshqaIshJoyi: Boolean(tizim && reyestr && tizim !== reyestr),
    });
  }

  return natija;
}

/**
 * ============================================================
 *  СОЛИШТИРАДИ ВА МОС КЕЛГАНЛАРГА ДАЛИЛ ЁЗАДИ
 *
 *  ── Нега энди ДАРҲОЛ ТАСДИҚЛАНМАЙДИ ──
 *
 *  Аввал бу ерда шундай ёзилганди: «Реестр далили дарҳол
 *  тасдиқланган ҳисобланади: у давлат манбаидан олинган».
 *
 *  Жумланинг биринчи қисми рост, иккинчиси эса ТАХМИН.
 *  Тизимга келган нарса — давлат манбаи ЭМАС, балки
 *  администратор компьютеридаги Excel файл. У файл:
 *
 *    · таҳрирланган бўлиши мумкин;
 *    · бошқаси билан алмаштирилган бўлиши мумкин;
 *    · қачон ва қаердан олингани ёзилмаган.
 *
 *  Яъни тизим «давлат айтди» билан «администратор шундай
 *  деб юклади» ни АЖРАТМАСДИ — ва иккинчисини биринчиси
 *  деб ҳисоблаб, ҳокимликнинг энг муҳим рақамига қўшарди.
 *
 *  Энди бу далилларнинг манбаси `QOLDA_REYESTR` бўлиб
 *  ёзилади ва улар ТЕКШИРУВ НАВБАТИГА тушади. Ҳисоботда
 *  «расмий манба» билан «қўлда тасдиқланган» алоҳида
 *  кўринади.
 *
 *  Автоматик тасдиқ ФАҚАТ `RASMIY_INTEGRATSIYA` да — яъни
 *  тизим маълумотни ЎЗИ, текширилган канал орқали олганда.
 *  Бундай интеграция ҳозир йўқ; у пайдо бўлганда шу
 *  манбани юборади ва қоиданинг ўзи ўзгармайди.
 *
 *  ── Иш ҲАЖМИ ортадими ──
 *
 *  Ҳа: аввал 100 сатр 100 та «тасдиқланган» берарди, энди
 *  100 та текширилиши керак бўлган ёзув беради. Аммо
 *  аввалги 100 та рақам ТЕКШИРИЛМАГАН эди — фақат
 *  текширилган бўлиб КЎРИНАРДИ.
 * ============================================================
 */
export async function reyestrniYukla(
  satrlar: ReyestrSatri[],
  p: {
    kiritganId: string;
    reyestrSanasi: Date;
    mahallaId?: string;
    /**
     * Файлнинг SHA-256 изи.
     *
     * ДИҚҚАТ: из файлнинг ЎЗГАРМАГАНИНИ кўрсатади, ҲАҚИҚИЙ
     * эканини ЭМАС. У «шу ёзув ўша файлдан» деган боғни
     * сақлайди, холос — икки юклашни солиштириш учун.
     */
    faylIzi?: string | null;
    /** Кўчирмани берган ташкилот — администратор ёзади */
    manbaTashkilot?: string | null;
  }
): Promise<ReyestrNatijasi> {
  const natija = await reyestrniSolishtir(satrlar, p.mahallaId);
  if (natija.mos.length === 0) return natija;

  /*
   * ── БИТТА ЮКЛАШ — БИТТА БЕЛГИ ──
   *
   * Юз сатрдан юз далил чиқади ва улар базада АЛОҲИДА
   * ёзувлар бўлиб ётади. Кейин «бу далил қайси юклашдан
   * келган» деган савол туғилади — масалан кўчирма нотўғри
   * чиқиб, БУТУН юклашни орқага олиш керак бўлса.
   *
   * Аввал жавоб йўқ эди: фақат сана бор, у эса кунда бир
   * нечта юклашни ажратмайди.
   */
  const yuklashIzi = randomUUID();

  /*
   * ── ТАКРОР ЮКЛАШ ──
   *
   * Бир хил кўчирма икки марта юкланиши оддий ҳол: администратор
   * «ўтдими-йўқми» деб иккинчи марта босади.
   *
   * Ўша санадаги реестр далили аллақачон бўлса, иккинчиси
   * ёзилмайди — акс ҳолда битта одамда ўнта бир хил далил
   * тўпланиб, саҳифа ўқиб бўлмас ҳолга келарди.
   */
  const borlar = await prisma.joylashuvDalili.findMany({
    where: {
      turi: 'REYESTR',
      ishsizId: { in: natija.mos.map((m) => m.ishsizId) },
      reyestrSanasi: p.reyestrSanasi,
    },
    select: { ishsizId: true },
  });
  const borlarToplami = new Set(borlar.map((b) => b.ishsizId));

  /*
   * ── ФАЙЛ ИЧИДАГИ ТАКРОР ──
   *
   * Аввал бу тўплам сиклдан ОЛДИН бир марта ўқиларди ва
   * ичида ҳеч қачон янгиланмасди. Яъни битта файлда бир
   * одам икки сатрда турса (расмий кўчирмаларда оддий
   * ҳол: битта одам икки корхонада), ИККАЛА сатр ҳам
   * далил яратарди.
   *
   * Натижа: бир одамда иккита бир хил далил, саҳифа эса
   * ўқиб бўлмас ҳолга келарди.
   *
   * Энди тўплам ҳар ёзишдан кейин ЯНГИЛАНАДИ.
   */
  for (const m of natija.mos) {
    if (borlarToplami.has(m.ishsizId)) {
      natija.takror += 1;
      continue;
    }
    borlarToplami.add(m.ishsizId);

    try {
      await dalilQoshish({
        ishsizId: m.ishsizId,
        turi: 'REYESTR',
        /*
         * Қўлда юкланган кўчирма. Автоматик тасдиқланмайди —
         * қоида `dalil-ishonchi.ts` да.
         */
        manbaTuri: 'QOLDA_REYESTR',
        manbaTashkilot: p.manbaTashkilot ?? null,
        hujjatSanasi: p.reyestrSanasi,
        importId: yuklashIzi,
        faylIzi: p.faylIzi ?? null,
        kiritganId: p.kiritganId,
        reyestrIshJoyi: m.reyestrIshJoyi,
        reyestrSanasi: p.reyestrSanasi,
        izoh: m.boshqaIshJoyi
          ? `Диққат: тизимда «${m.tizimIshJoyi ?? '—'}», реестрда «${m.reyestrIshJoyi ?? '—'}»`
          : null,
      });
    } catch (e) {
      /*
       * ── ИККИТА АДМИНИСТРАТОР БИР ВАҚТДА ──
       *
       * Базадаги ягоналик чегараси (`dalil_takrori`) иккинчи
       * ёзишни рад этади. Бу ХАТО эмас — биринчиси
       * ўтиб кетган ва ёзув жойида.
       *
       * Аввал бу ҳол умуман кўрилмасди: юклаш 500 билан
       * тўхтар ва ҚОЛГАН сатрлар ҳам ёзилмай қоларди.
       */
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        natija.takror += 1;
        continue;
      }
      throw e;
    }
  }

  return natija;
}
