import xomHududlar from './qishloqlar.json';

/**
 * ============================================================
 *  ХАРИТА ГЕОМЕТРИЯСИ ВА УНИ БАЗАГА УЛАШ
 *
 *  ── Икки рўйхат, битта туман ──
 *
 *  Харита файлида 69 та қишлоқ контури бор, базада эса 70 та
 *  МФЙ. Иккови БОШҚА-БОШҚА манбадан келган: биринчиси
 *  геодезия маълумотидан, иккинчиси ҳокимликнинг свод
 *  жадвалидан. Номлар бир хил ёзилмаган:
 *
 *      харитада   базада
 *      ──────────────────────
 *      оқ-олтин   Оқ Олтин
 *      полвон-ота Полвонота
 *      кориз-араб Кориз Араб
 *
 *  Тире, бўшлиқ ва бош ҳарф — ягона фарқ. Шунинг учун улаш
 *  НОРМАЛЛАШТИРИЛГАН калит бўйича кетади: кичик ҳарф, ҳарфдан
 *  бошқа ҳамма белги олиб ташланади.
 *
 *  ── Нега «тахминан» улаш йўқ ──
 *
 *  Ўхшаш номларни тахмин билан улаш мумкин эди (Левенштейн
 *  масофаси ва ҳоказо). Қилинмади: харита ҲОКИМ ҚАРОР
 *  ҚАБУЛ ҚИЛАДИГАН экранда туради. «Тахминан Найман» деган
 *  ҳудудга «Найман» рақамини ёзиб қўйиш — ёлғон. Мос
 *  келмагани нейтрал рангда қолади ва рўйхатда айтилади.
 * ============================================================
 */

/** Харитадаги битта ҳудуд контури */
export interface Hudud {
  /** Харита файлидаги калит — кирилл, кичик ҳарфда */
  id: string;
  /** Экранда кўринадиган ном — лотин */
  name: string;
  /** SVG контури, `viewBox` координаталарида */
  d: string;
}

export const HUDUDLAR: Hudud[] = xomHududlar as Hudud[];

/**
 * Харита файли қайси ўлчамга проекция қилинган.
 *
 * Геометрия шу тўртбурчакка мосланган ҳолда сақланган —
 * ўзгартирилса, контурлар силжийди.
 */
export const XARITA_ENI = 1676;
export const XARITA_BOYI = 800;

/**
 * Ҳудуд контурларининг ҲАҚИҚИЙ чегараси.
 *
 * Файл 1676×800 га мосланган, аммо Хатирчи тумани ўша
 * тўртбурчакнинг ҳаммасини эгалламайди: чапда ва тепада катта
 * бўш жой қолади. Тўлиқ `viewBox` ишлатилса, харита экраннинг
 * ярмида кичкина бўлиб турарди.
 *
 * Шунинг учун чегара контурлардан ҲИСОБЛАНАДИ ва `viewBox`
 * шунга қараб қисқаради.
 */
function chegaraHisobla(): { x: number; y: number; eni: number; boyi: number } {
  let engChapX = Infinity;
  let engOngX = -Infinity;
  let engTepaY = Infinity;
  let engPastY = -Infinity;

  for (const h of HUDUDLAR) {
    const sonlar = h.d.match(/-?\d+(?:\.\d+)?/g);
    if (!sonlar) continue;
    for (let i = 0; i + 1 < sonlar.length; i += 2) {
      const x = Number(sonlar[i]);
      const y = Number(sonlar[i + 1]);
      if (x < engChapX) engChapX = x;
      if (x > engOngX) engOngX = x;
      if (y < engTepaY) engTepaY = y;
      if (y > engPastY) engPastY = y;
    }
  }

  /* Атрофда бироз ҳаво — чекка ҳудуднинг чизиғи кесилмасин */
  const hovo = 16;
  return {
    x: Math.round(engChapX - hovo),
    y: Math.round(engTepaY - hovo),
    eni: Math.round(engOngX - engChapX + hovo * 2),
    boyi: Math.round(engPastY - engTepaY + hovo * 2),
  };
}

export const CHEGARA = chegaraHisobla();

export const VIEW_BOX = `${CHEGARA.x} ${CHEGARA.y} ${CHEGARA.eni} ${CHEGARA.boyi}`;

/**
 * Улаш калити: кичик ҳарф, фақат ҳарф ва рақам.
 *
 * «Оқ Олтин», «оқ-олтин» ва «Оқ-олтин» — учови бир хил
 * калитга тушади.
 */
export function xaritaKaliti(nom: string): string {
  return nom.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
}

export interface UlanishNatijasi {
  /** Харита ҳудуди id си → база МФЙ id си */
  hududdanMahallaga: Map<string, string>;
  /** База МФЙ id си → харита ҳудуди id си */
  mahalladanHududga: Map<string, string>;
  /** Харитада бор, аммо базада топилмаган ҳудудлар */
  bazadaYoq: Hudud[];
  /** Базада бор, аммо харитада контури йўқ МФЙ лар */
  xaritadaYoq: { id: string; nomiKirill: string }[];
}

/**
 * Харита контурларини база МФЙ ларига улайди.
 *
 * Иккала томон ҳам қайтади: мос келмагани ЯШИРИЛМАЙДИ, чунки
 * ҳоким «харитада 69 та, рўйхатда 70 та» деган фарқни билиши
 * керак — акс ҳолда битта МФЙ рақами жимгина йўқолади.
 */
export function xaritaniUla(
  mahallalar: { id: string; nomiKirill: string; nomi?: string }[]
): UlanishNatijasi {
  const kalitdanMahallaga = new Map<string, { id: string; nomiKirill: string }>();
  for (const m of mahallalar) {
    kalitdanMahallaga.set(xaritaKaliti(m.nomiKirill), m);
    /*
     * Лотин ном ҳам калит сифатида қўшилади: базада кирилл
     * ёзуви тузатилса-ю, лотини эски қолса, улаш узилиб
     * қолмасин.
     */
    if (m.nomi) {
      const lotinKalit = xaritaKaliti(m.nomi);
      if (!kalitdanMahallaga.has(lotinKalit)) kalitdanMahallaga.set(lotinKalit, m);
    }
  }

  const hududdanMahallaga = new Map<string, string>();
  const mahalladanHududga = new Map<string, string>();
  const bazadaYoq: Hudud[] = [];

  for (const h of HUDUDLAR) {
    const m =
      kalitdanMahallaga.get(xaritaKaliti(h.id)) ?? kalitdanMahallaga.get(xaritaKaliti(h.name));
    if (m) {
      hududdanMahallaga.set(h.id, m.id);
      mahalladanHududga.set(m.id, h.id);
    } else {
      bazadaYoq.push(h);
    }
  }

  const xaritadaYoq = mahallalar
    .filter((m) => !mahalladanHududga.has(m.id))
    .map((m) => ({ id: m.id, nomiKirill: m.nomiKirill }));

  return { hududdanMahallaga, mahalladanHududga, bazadaYoq, xaritadaYoq };
}
