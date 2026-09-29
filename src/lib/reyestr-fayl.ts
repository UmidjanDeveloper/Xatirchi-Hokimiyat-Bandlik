import * as XLSX from 'xlsx';
import { lotinga } from './alifbo';
import type { ReyestrSatri } from './reyestr-import';

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

/** Excel сана рақамини ёки матнни `Date` га келтиради */
function sanaOqi(x: unknown): Date | null {
  if (x === null || x === undefined || x === '') return null;

  if (x instanceof Date) return Number.isNaN(x.getTime()) ? null : x;

  /*
   * Excel санани 1899-12-30 дан бошлаб КУН сифатида сақлайди.
   * Матн сифатида ўқилса «45 234» бўлиб чиқади.
   */
  if (typeof x === 'number') {
    const ms = Math.round((x - 25569) * 86400 * 1000);
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const matn = String(x).trim();
  /* «12.05.1990» ва «1990-05-12» */
  const nuqtali = matn.match(/^(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{4})$/);
  if (nuqtali) {
    const [, kun, oy, yil] = nuqtali;
    return new Date(Date.UTC(Number(yil), Number(oy) - 1, Number(kun)));
  }
  const d = new Date(matn);
  return Number.isNaN(d.getTime()) ? null : d;
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
}

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
export function reyestrniOqi(bayt: ArrayBuffer): FaylNatijasi | FaylXatosi {
  let varaq: unknown[][];
  try {
    const kitob = XLSX.read(bayt, { type: 'array', cellDates: true });
    const nom = kitob.SheetNames[0];
    if (!nom) return { ok: false, sabab: 'Файлда варақ йўқ' };
    varaq = XLSX.utils.sheet_to_json(kitob.Sheets[nom], {
      header: 1,
      raw: true,
      defval: '',
    }) as unknown[][];
  } catch {
    return { ok: false, sabab: 'Файлни ўқиб бўлмади — Excel ёки CSV юборинг' };
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
