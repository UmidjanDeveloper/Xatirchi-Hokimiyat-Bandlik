import * as XLSX from 'xlsx';
import { lotinga } from './alifbo';
import type { ReyestrSatri } from './reyestr-import';
import { prototipQoriqchisi } from './prototip-qoriqchi';

/**
 * ============================================================
 *  РЕЕСТР ФАЙЛИНИ ЎҚИШ
 *
 *  ── Нега устун номлари ИЗЛАНАДИ ──
 *
 *  Кўчирма ҳар сафар бир хил чиқмайди: у солиқ идорасидан,
 *  пенсия жамғармасидан ёки бандлик тизимидан келиши мумкин
 *  ва устун сарлавҳалари ҳар хил ёзилади — «Ф.И.Ш.»,
 *  «Фамилия исми», «FISH», «Ходим».
 *
 *  Устунни рақами бўйича олиш («иккинчи устун — исм») бир
 *  марта ишларди ва иккинчи файлда жимгина нотўғри ишларди:
 *  исм ўрнига ЖШШИР ўқилиб, ҳеч ким топилмасди — ва бу
 *  «реестрда ҳеч ким йўқ экан» деб ўқиларди.
 *
 *  Шунинг учун сарлавҳа МАЗМУНИ бўйича изланади ва топилмаса,
 *  файл рад этилади — жим ишлаш ўрнига очиқ хато.
 * ============================================================
 */

/*
 * ── НЕГА КАЛИТ ЛОТИНГА ЎГИРИЛАДИ ──
 *
 * Кўчирма кирилл ёки лотин ёзувида келиши мумкин, ва бу
 * манбага боғлиқ: солиқ идорасининг файли кириллда, бандлик
 * тизимининг файли лотинда чиқади.
 *
 * Иккита рўйхат сақлаш ярамайди: бири янгиланиб, иккинчиси
 * эскириб қоларди. Шунинг учун сарлавҳа лотинга ўгирилади ва
 * рўйхат БИТТА.
 *
 * Бир пайтлар рўйхат фақат ёзувни кичрайтирарди, ва «Ходим»
 * деб ёзилган кирилл сарлавҳа лотин «xodim» га мос
 * келмасди — файл жимгина рад этиларди.
 */
const ISM_SOZLARI = ['fish', 'f i sh', 'fio', 'familiya', 'ism', 'xodim', 'fuqaro'];
const ISH_SOZLARI = ['ish joyi', 'korxona', 'tashkilot', 'ish beruvchi', 'ish beruvchisi'];
const SANA_SOZLARI = ['tugilgan', 'tavallud', 'sana tug'];

function kalit(x: unknown): string {
  return lotinga(String(x ?? ''))
    .toLowerCase()
    .replace(/[\u2018\u2019\u02BB\u02BC`\u00B4'.]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function ustunniTop(sarlavha: unknown[], sozlar: string[], tashqari: number[] = []): number {
  for (let i = 0; i < sarlavha.length; i++) {
    if (tashqari.includes(i)) continue;
    const k = kalit(sarlavha[i]);
    if (!k) continue;
    if (sozlar.some((s) => k.includes(s))) return i;
  }
  return -1;
}

/**
 * ============================================================
 *  САНА — «ЯҚИН ҚИЙМАТ» ЭМАС, ЁКИ ТЎҒРИ, ЁКИ ХАТО
 * ============================================================
 *
 *  ── Қандай нуқсон бор эди ──
 *
 *  `new Date(Date.UTC(2000, 1, 31))` — яъни «31 феврал» —
 *  хато бермайди. JavaScript уни ЖИМГИНА 2 мартга суриб
 *  қўяди.
 *
 *  Реестрда `31.02.2000` деб ёзилган сана базага
 *  `2000-03-02` бўлиб тушарди. Кейин ўша сана бўйича
 *  фуқаро ИЗЛАНАР ва топилмасди — ёки, бундан ҳам ёмони,
 *  БОШҚА фуқаро топиларди.
 *
 *  Терилишдаги хато аниқ ХАТО бўлиши керак: ходим уни
 *  кўриб, ҳужжатдан текширсин.
 *
 *  ── Кабиса йили ──
 *
 *  `29.02.2000` — тўғри (2000 кабиса йили).
 *  `29.02.2001` — хато ва рад этилади.
 *  Текширув сунъий эмас: ўгирилган санани ОРҚАГА ўқиб,
 *  берилган кун, ой ва йил билан солиштирамиз.
 *
 *  ── Вақт минтақаси ──
 *
 *  Ҳаммаси UTC да ясалади. Маҳаллий вақтда ясалса,
 *  Тошкент (UTC+5) да «01.01.1990» серверда «31.12.1989»
 *  бўлиб кўринарди — туғилган йил бир йилга силжирди.
 */

/** Кун, ой, йил ҲАҚИҚАТДА мавжудми */
export function sanaHaqiqiymi(kun: number, oy: number, yil: number): boolean {
  if (!Number.isInteger(kun) || !Number.isInteger(oy) || !Number.isInteger(yil)) return false;
  if (yil < 1900 || yil > 2200) return false;
  if (oy < 1 || oy > 12) return false;
  if (kun < 1 || kun > 31) return false;

  const d = new Date(Date.UTC(yil, oy - 1, kun));
  /*
   * ОРҚАГА ўқиймиз. «31.02» сурилиб кетган бўлса, ой ёки
   * кун мос келмайди ва биз буни кўрамиз.
   */
  return d.getUTCFullYear() === yil && d.getUTCMonth() === oy - 1 && d.getUTCDate() === kun;
}

/** Сана келажакдами (бугундан кейинми) */
export function kelajakdami(d: Date, hozir: Date = new Date()): boolean {
  return d.getTime() > hozir.getTime();
}

/**
 * Excel сана рақамини ёки матнни `Date` га келтиради.
 *
 * Нотўғри сана `null` қайтаради — ЖИМГИНА тузатилмайди.
 */
export function sanaOqi(x: unknown): Date | null {
  if (x === null || x === undefined || x === '') return null;

  if (x instanceof Date) return Number.isNaN(x.getTime()) ? null : x;

  /*
   * Excel санани 1899-12-30 дан бошлаб КУН сифатида сақлайди.
   * Матн сифатида ўқилса «45 234» бўлиб чиқади.
   */
  if (typeof x === 'number') {
    if (!Number.isFinite(x) || x < 1 || x > 300_000) return null;
    const ms = Math.round((x - 25569) * 86400 * 1000);
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const matn = String(x).trim();

  /* «12.05.1990», «12/05/1990», «12-05-1990» */
  const nuqtali = matn.match(/^(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{4})$/);
  if (nuqtali) {
    const kun = Number(nuqtali[1]);
    const oy = Number(nuqtali[2]);
    const yil = Number(nuqtali[3]);
    if (!sanaHaqiqiymi(kun, oy, yil)) return null;
    return new Date(Date.UTC(yil, oy - 1, kun));
  }

  /* «1990-05-12» — ISO тартиби */
  const iso = matn.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) {
    const yil = Number(iso[1]);
    const oy = Number(iso[2]);
    const kun = Number(iso[3]);
    if (!sanaHaqiqiymi(kun, oy, yil)) return null;
    return new Date(Date.UTC(yil, oy - 1, kun));
  }

  /*
   * Бошқа шакллар `Date` нинг ўзига қолдирилади, аммо
   * натижа ТЕКШИРИЛАДИ: у ҳам сурилган санани жимгина
   * қабул қилиши мумкин.
   */
  const d = new Date(matn);
  if (Number.isNaN(d.getTime())) return null;
  if (!sanaHaqiqiymi(d.getUTCDate(), d.getUTCMonth() + 1, d.getUTCFullYear())) return null;
  return d;
}

export interface FaylNatijasi {
  ok: true;
  satrlar: ReyestrSatri[];
  /** Топилган устунлар — администраторга кўрсатилади */
  ustunlar: { ism: string; ishJoyi: string | null; sana: string | null };
}

export interface FaylXatosi {
  ok: false;
  sabab: string;
  /**
   * Fayl o'qilayotganda dastur prototiplari o'zgargan (prototype pollution
   * urinishi): fayl rad etildi, prototiplar tiklandi. Chaqiruvchi buni xato
   * jurnaliga yozishi kerak.
   */
  xavfli?: string[];
}

/**
 * ── RESURS CHEGARALARI ──
 *
 * Fayl hajmi (bayt) yagona chegara emas: kichik xlsx fayl millionlab
 * bo'sh katakli diapazonni e'lon qilishi mumkin va o'qish uni xotirada
 * ochadi. Shuning uchun satr, ustun va ma'lumot satrlari alohida cheklanadi.
 *
 *  · `MAKS_XOM_SATR`: varaqdagi jami satr (muqova va bo'sh satrlar bilan);
 *    o'qish shu joyda to'xtaydi (`sheetRows`);
 *  · `MAKS_USTUN`: diapazondagi ustunlar - o'qishdan OLDIN tekshiriladi;
 *  · `MAKS_SATR`: ma'lumot satrlari (bo'sh va "jami" qatorlarsiz).
 */
export const MAKS_XOM_SATR = 20_000;
export const MAKS_USTUN = 100;
export const MAKS_SATR = 10_000;

/** Fayl resurs chegarasidan oshdi - xabar xodimga ko'rsatiladi */
export class FaylChegarasiXatosi extends Error {}

/** Birinchi varaqni satrlar massivi sifatida o'qiydi (sinov uchun almashtirilishi mumkin) */
export type VaraqOqiydigan = (bayt: ArrayBuffer) => unknown[][] | null;

/**
 * Haqiqiy o'qiydigan: `xlsx` (xlsx, xls va csv ni taniydi).
 * `null` — varaq yo'q.
 */
export const xlsxVaraq: VaraqOqiydigan = (bayt) => {
  const kitob = XLSX.read(bayt, { type: 'array', cellDates: true, sheetRows: MAKS_XOM_SATR + 1 });
  const nom = kitob.SheetNames[0];
  if (!nom) return null;
  const varaq = kitob.Sheets[nom];
  /* Ustunlar `sheet_to_json` dan OLDIN tekshiriladi: u har satrni to'liq kenglikda ochadi */
  const diapazon = varaq?.['!ref'];
  if (diapazon) {
    const r = XLSX.utils.decode_range(diapazon);
    if (r.e.c - r.s.c + 1 > MAKS_USTUN) {
      throw new FaylChegarasiXatosi(`Файлда устун жуда кўп (${MAKS_USTUN} дан ортиқ) — тайёр жадвални юборинг`);
    }
  }
  return XLSX.utils.sheet_to_json(varaq, {
    header: 1,
    raw: true,
    defval: '',
  }) as unknown[][];
};

/**
 * Жадвални ўқийди.
 *
 * Биринчи варақ олинади: кўчирмада одатда битта варақ бўлади,
 * иккинчиси эса «изоҳ» ёки «шарҳ» бўлиб чиқади ва ундан одам
 * ўқилмайди.
 *
 * ── Нега сарлавҳа биринчи ўн сатрдан изланади ──
 *
 * Расмий кўчирманинг тепасида одатда муқова бўлади: идора
 * номи, санаси, «маълумотнома» деган сарлавҳа. Жадвалнинг
 * ўз сарлавҳаси учинчи-тўртинчи сатрда туради.
 */
export function reyestrniOqi(bayt: ArrayBuffer, oqiydigan: VaraqOqiydigan = xlsxVaraq): FaylNatijasi | FaylXatosi {
  let varaq: unknown[][];
  try {
    /*
     * Tashqi fayl o'qilayotganda dastur prototiplari QO'RIQLANADI
     * (`src/lib/prototip-qoriqchi.ts`): `xlsx` 0.18.5 maxsus fayl bilan
     * `Object.prototype` ni ifloslantirishi mumkin. Ifloslansa fayl rad
     * etiladi (o'qish xato bilan tugasa ham), prototiplar tiklanadi.
     */
    const q = prototipQoriqchisi(() => oqiydigan(bayt));
    if (q.iflos.length > 0) {
      return { ok: false, sabab: 'Файл хавфли деб топилди ва рад этилди', xavfli: q.iflos };
    }
    if ('xato' in q) throw q.xato;
    if (!q.natija) return { ok: false, sabab: 'Файлда варақ йўқ' };
    varaq = q.natija;
  } catch (e) {
    if (e instanceof FaylChegarasiXatosi) return { ok: false, sabab: e.message };
    return { ok: false, sabab: 'Файлни ўқиб бўлмади — Excel ёки CSV юборинг' };
  }

  /* Satr va ustun chegarasi (sinov uchun almashtiriladigan o'qiydigan ham shu yerdan o'tadi) */
  if (varaq.length > MAKS_XOM_SATR) {
    return {
      ok: false,
      sabab: `Файлда сатр жуда кўп (${MAKS_XOM_SATR.toLocaleString('ru-RU')} дан ортиқ) — кўчирмани қисмларга бўлиб юкланг`,
    };
  }
  const kenglik = varaq.slice(0, 50).reduce((m, q) => Math.max(m, Array.isArray(q) ? q.length : 0), 0);
  if (kenglik > MAKS_USTUN) {
    return { ok: false, sabab: `Файлда устун жуда кўп (${MAKS_USTUN} дан ортиқ) — тайёр жадвални юборинг` };
  }

  const ENG_KOP_MUQOVA = 10;

  /*
   * ── НЕГА АВВАЛ ИШ ЖОЙИ, КЕЙИН ИСМ ──
   *
   * «Ташкилот исми» деган сарлавҳа ИККАЛА рўйхатга ҳам мос
   * келади: унда «ism» ҳам, «tashkilot» ҳам бор. Исм
   * биринчи изланса, корхона устуни одам исми деб ўқиларди
   * ва ҳеч ким топилмасди.
   *
   * Иш жойи устуни аввал топилиб, исм қидирувидан
   * ЧИҚАРИЛАДИ — шундан кейин чалкашиш мумкин эмас.
   */
  let sarlavhaOrni = -1;
  let ismUstuni = -1;
  let ishUstuni = -1;

  for (let i = 0; i < Math.min(varaq.length, ENG_KOP_MUQOVA); i++) {
    const qator = varaq[i] ?? [];
    const ish = ustunniTop(qator, ISH_SOZLARI);
    const ism = ustunniTop(qator, ISM_SOZLARI, ish >= 0 ? [ish] : []);
    if (ism >= 0) {
      sarlavhaOrni = i;
      ismUstuni = ism;
      ishUstuni = ish;
      break;
    }
  }

  if (sarlavhaOrni < 0) {
    return {
      ok: false,
      sabab: 'Ф.И.Ш. устуни топилмади — сарлавҳада «Ф.И.Ш.» ёки «Фамилия исми» бўлиши керак',
    };
  }

  const sarlavha = varaq[sarlavhaOrni];
  const sanaUstuni = ustunniTop(sarlavha, SANA_SOZLARI, [ismUstuni, ishUstuni].filter((n) => n >= 0));

  const satrlar: ReyestrSatri[] = [];
  for (let i = sarlavhaOrni + 1; i < varaq.length; i++) {
    const q = varaq[i] ?? [];
    const fish = String(q[ismUstuni] ?? '').trim();
    /* Бўш сатр ва «жами» каби якуний қаторлар ташланади */
    if (fish.length < 4) continue;

    satrlar.push({
      fish,
      ishJoyi: ishUstuni >= 0 ? String(q[ishUstuni] ?? '').trim() || null : null,
      tugilganSana: sanaUstuni >= 0 ? sanaOqi(q[sanaUstuni]) : null,
    });
  }

  if (satrlar.length > MAKS_SATR) {
    return {
      ok: false,
      sabab: `Файлда маълумот сатрлари жуда кўп (${MAKS_SATR.toLocaleString('ru-RU')} дан ортиқ) — кўчирмани қисмларга бўлиб юкланг`,
    };
  }

  return {
    ok: true,
    satrlar,
    ustunlar: {
      ism: String(sarlavha[ismUstuni] ?? '').trim(),
      ishJoyi: ishUstuni >= 0 ? String(sarlavha[ishUstuni] ?? '').trim() : null,
      sana: sanaUstuni >= 0 ? String(sarlavha[sanaUstuni] ?? '').trim() : null,
    },
  };
}
