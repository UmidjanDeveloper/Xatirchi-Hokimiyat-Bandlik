/**
 * ============================================================
 *  САНА ВА ВАҚТ — СИНОВ
 *
 *  Бу файл 2026-йил 16-сентябрда, даладан келган шикоятдан
 *  кейин туғилди.
 *
 *  Ҳолат: маҳалла ходими соат 12:22 да хатлов киритди, рўйхатда
 *  эса «07:22» бўлиб турди — БЕШ СОАТ орқада. Ходим ўзи
 *  киритган ёзувни топа олмади.
 *
 *  Сабаб: Vercel сервери UTC да юради, `formatDate` эса
 *  `getHours()` ни ўқирди — яъни сервернинг минтақасини.
 *  Ўзбекистон UTC+5 да.
 *
 *  Синовлар СЕРВЕР МИНТАҚАСИДАН ҚАТЪИЙ НАЗАР бир хил натижа
 *  чиқишини қўриқлайди: ходим Тошкент вақтини кўриши керак,
 *  сайт қаерда ишлашидан қатъи назар.
 * ============================================================
 */

import { formatDate, toshkentKuni, toshkentVaqti } from '../src/lib/utils';
import { sanaQisqa, sanaUzun } from '../src/lib/hisobot/sana';

type Sinov = { nomi: string; tekshir: () => boolean };

const SINOVLAR: Sinov[] = [
  /* ── ДАЛАДАН КЕЛГАН ҲОЛАТ ── */
  {
    nomi: 'Даладаги ҳолат: 07:22 UTC → 12:22 Тошкент',
    tekshir: () => formatDate('2026-09-16T07:22:00.000Z') === '16.09.2026, 12:22',
  },
  {
    nomi: 'Тун ярмидан ошган вақт КЕЙИНГИ кунга ўтади',
    tekshir: () =>
      /* 20:30 UTC = эртаси куни 01:30 Тошкент */
      formatDate('2026-09-16T20:30:00.000Z') === '17.09.2026, 01:30',
  },
  {
    nomi: 'Ой ва йил чегараси ҳам тўғри кўчади',
    tekshir: () =>
      formatDate('2026-12-31T19:00:00.000Z') === '01.01.2027, 00:00',
  },
  {
    nomi: 'Тошкент яримтунидаги вақт ўша кунда қолади',
    tekshir: () => formatDate('2026-09-15T19:00:00.000Z') === '16.09.2026, 00:00',
  },

  /* ── ҲИСОБОТ САНАСИ ── */
  {
    nomi: 'Ҳисобот муқоваси: тунги ҳисобот КЕЧАГИ санани ёзмайди',
    tekshir: () =>
      /* 21:00 UTC 16-сентябр = 02:00 Тошкент 17-сентябр */
      sanaQisqa('2026-09-16T21:00:00.000Z') === '17.09.2026',
  },
  {
    nomi: 'Узун сана ҳам Тошкент бўйича',
    tekshir: () =>
      sanaUzun('2026-09-16T21:00:00.000Z', false) === '17 сентябр 2026 йил' &&
      sanaUzun('2026-09-16T21:00:00.000Z', true) === '17 sentabr 2026 yil',
  },

  /* ── БУЗИЛМАГАН ҲОЛАТЛАР ── */
  {
    nomi: 'Нотўғри сана қуламайди — тире қайтаради',
    tekshir: () => formatDate('шунчаки матн') === '—' && sanaQisqa('шунчаки матн') === '—',
  },
  {
    nomi: '`toshkentKuni` ҳам шу минтақада',
    tekshir: () => toshkentKuni(new Date('2026-09-16T20:30:00.000Z')) === '2026-09-17',
  },
  {
    nomi: '`toshkentVaqti` аниқ беш соат суради',
    tekshir: () => {
      const xom = new Date('2026-09-16T07:22:00.000Z');
      return toshkentVaqti(xom).getTime() - xom.getTime() === 5 * 60 * 60 * 1000;
    },
  },

  /* ── ЭНГ МУҲИМИ: СЕРВЕР МИНТАҚАСИ АҲАМИЯТСИЗ ── */
  {
    nomi: 'Сервер минтақаси ўзгарса ҳам натижа бир хил',
    tekshir: () => {
      const oldingi = process.env.TZ;
      const kutilgan = '16.09.2026, 12:22';
      const sana = '2026-09-16T07:22:00.000Z';
      try {
        for (const tz of ['UTC', 'America/New_York', 'Asia/Tashkent', 'Pacific/Kiritimati']) {
          process.env.TZ = tz;
          if (formatDate(sana) !== kutilgan) return false;
        }
        return true;
      } finally {
        if (oldingi === undefined) delete process.env.TZ;
        else process.env.TZ = oldingi;
      }
    },
  },
];

let xato = 0;
for (const s of SINOVLAR) {
  let ok = false;
  try {
    ok = s.tekshir();
  } catch (e) {
    ok = false;
    console.log(`     xatolik: ${(e as Error).message}`);
  }
  if (!ok) xato++;
  console.log(`${ok ? 'OK  ' : 'XATO'} ${s.nomi}`);
}
console.log(`\n${SINOVLAR.length - xato}/${SINOVLAR.length} o'tdi`);
process.exit(xato ? 1 : 0);
