/**
 * ============================================================
 *  ҲУЖЖАТДАГИ САНА
 *
 *  `toLocaleDateString('ru-RU', { month: 'long' })` ишлатилмайди:
 *  у «12 сентября 2026 г.» қайтаради — РУС тилида. Лотин
 *  ёзувидаги ҳисоботда бу ажралиб турарди, кириллда эса ҳам
 *  ўзбекча эмас эди.
 *
 *  Ой номлари шу ерда, иккала ёзувда. Рўйхат қисқа ва ўзгармайди,
 *  шунинг учун кутубхона қўшишнинг маъноси йўқ.
 * ============================================================
 */

const OYLAR_KIRILL = [
  'январ',
  'феврал',
  'март',
  'апрел',
  'май',
  'июн',
  'июл',
  'август',
  'сентябр',
  'октябр',
  'ноябр',
  'декабр',
] as const;

const OYLAR_LOTIN = [
  'yanvar',
  'fevral',
  'mart',
  'aprel',
  'may',
  'iyun',
  'iyul',
  'avgust',
  'sentabr',
  'oktabr',
  'noyabr',
  'dekabr',
] as const;

/** «12 сентябр 2026 йил» ёки «12 sentabr 2026 yil» */
export function sanaUzun(sana: string | Date, lotin: boolean): string {
  const d = typeof sana === 'string' ? new Date(sana) : sana;
  if (Number.isNaN(d.getTime())) return '—';
  const oy = (lotin ? OYLAR_LOTIN : OYLAR_KIRILL)[d.getMonth()];
  return `${d.getDate()} ${oy} ${d.getFullYear()} ${lotin ? 'yil' : 'йил'}`;
}

/** «12.09.2026» — колонтитул ва жадвал учун */
export function sanaQisqa(sana: string | Date): string {
  const d = typeof sana === 'string' ? new Date(sana) : sana;
  if (Number.isNaN(d.getTime())) return '—';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()}`;
}
