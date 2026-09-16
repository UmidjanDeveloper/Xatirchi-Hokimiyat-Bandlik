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

import { toshkentVaqti } from '@/lib/utils';

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

/*
 * ── Вақт минтақаси ──
 *
 * Ҳисобот СЕРВЕРДА тайёрланади, Vercel сервери эса UTC да
 * юради. Тошкентда соат 02:00 да олинган ҳисоботнинг
 * муқовасида КЕЧАГИ сана турарди — ҳужжат эса ҳокимга
 * борарди.
 *
 * `toshkentVaqti` вақтни суради, кейин UTC қисмлари ўқилади.
 */

/** «12 сентябр 2026 йил» ёки «12 sentabr 2026 yil» */
export function sanaUzun(sana: string | Date, lotin: boolean): string {
  const d = toshkentVaqti(sana);
  if (Number.isNaN(d.getTime())) return '—';
  const oy = (lotin ? OYLAR_LOTIN : OYLAR_KIRILL)[d.getUTCMonth()];
  return `${d.getUTCDate()} ${oy} ${d.getUTCFullYear()} ${lotin ? 'yil' : 'йил'}`;
}

/** «12.09.2026» — колонтитул ва жадвал учун */
export function sanaQisqa(sana: string | Date): string {
  const d = toshkentVaqti(sana);
  if (Number.isNaN(d.getTime())) return '—';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getUTCDate())}.${p(d.getUTCMonth() + 1)}.${d.getUTCFullYear()}`;
}
