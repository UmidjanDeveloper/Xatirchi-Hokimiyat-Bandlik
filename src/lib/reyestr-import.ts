import type { Prisma } from '@prisma/client';
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
 * Солиштиради ВА мос келганларга далил ёзади.
 *
 * Реестр далили дарҳол тасдиқланган ҳисобланади: у давлат
 * манбаидан олинган ва уни қўлда яна текширишнинг маъноси
 * йўқ. Қўлда киритилган далил эса аввал мутахассис кўзидан
 * ўтади.
 */
export async function reyestrniYukla(
  satrlar: ReyestrSatri[],
  p: { kiritganId: string; reyestrSanasi: Date; mahallaId?: string }
): Promise<ReyestrNatijasi> {
  const natija = await reyestrniSolishtir(satrlar, p.mahallaId);
  if (natija.mos.length === 0) return natija;

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

  for (const m of natija.mos) {
    if (borlarToplami.has(m.ishsizId)) {
      natija.takror += 1;
      continue;
    }

    await dalilQoshish({
      ishsizId: m.ishsizId,
      turi: 'REYESTR',
      tasdiqlangan: true,
      kiritganId: p.kiritganId,
      reyestrIshJoyi: m.reyestrIshJoyi,
      reyestrSanasi: p.reyestrSanasi,
      izoh: m.boshqaIshJoyi
        ? `Диққат: тизимда «${m.tizimIshJoyi ?? '—'}», реестрда «${m.reyestrIshJoyi ?? '—'}»`
        : null,
    });
  }

  return natija;
}
