/**
 * ============================================================
 *  ЗАНЖИРНИНГ УЗИЛГАН ЖОЙЛАРИ — СИНОВ
 *
 *  Бу файл 2026-йил 17-сентябрда, беш дона аниқ нуқсон
 *  кўрсатилгандан кейин туғилди. Ҳар бири КЎРИНМАЙДИГАН эди:
 *  код ишлайверарди, фақат натижа ёлғон бўларди.
 *
 *  1. Эълоннинг охири йўқ эди — корхона воз кечса ҳам эълон
 *     абадий фаол турарди ва фуқаро бекорга бориб қайтарди.
 *  2. Масъул ном эркин матн эди — «Xalq ta’limi» билан
 *     «Ta'lim bo'limi» кесимда ИККИ ташкилот бўлиб турарди.
 *  3. Узоқ муддатли ишсизлик ҳисобга олинмасди — икки ойлик
 *     ишсиз билан тўрт йиллик ишсиз рўйхатда бир хил эди.
 *  4. Жойлаштиришдан кейинги 3 ойлик текширув фақат қўлда
 *     белгиланарди — ҳеч ким эсламади.
 *
 *  Синовлар шу тўрттасини қўриқлайди.
 * ============================================================
 */

import { elonKuchdami, odatiyMuddat, qolganKun } from '../src/lib/elon-muddati';
import { tashkilotNormal, TASHKILOT_BOSHQA } from '../src/lib/masul-tashkilot';
import {
  ishsizlikOylari,
  muddatMatni,
  oyFarqi,
  uzoqIshsizmi,
} from '../src/lib/uzoq-ishsizlik';
import { MUSTAHKAMLASH_KUN, mustahkamlashChorasi } from '../src/lib/chora-yaratish';

type Sinov = { nomi: string; tekshir: () => boolean };

/** Бугундан N кун кейин (ёки манфий бўлса — олдин) */
function kun(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

/** Бугундан N ой олдин */
function oyOldin(n: number): Date {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d;
}

const SINOVLAR: Sinov[] = [
  /* ══ 1. ЭЪЛОН МУДДАТИ ══ */
  {
    nomi: 'Муддати ЎТГАН эълон кучда эмас',
    tekshir: () => !elonKuchdami({ faol: true, amalQilishMuddati: kun(-1) }),
  },
  {
    nomi: 'Муддати келажакда бўлса — кучда',
    tekshir: () => elonKuchdami({ faol: true, amalQilishMuddati: kun(5) }),
  },
  {
    nomi: 'Муддатсиз эълон кучда қолади — эски эълонлар йўқолмасин',
    tekshir: () => elonKuchdami({ faol: true, amalQilishMuddati: null }),
  },
  {
    nomi: 'Қўлда ёпилган эълон муддати келажакда бўлса ҳам кучда эмас',
    tekshir: () => !elonKuchdami({ faol: false, amalQilishMuddati: kun(30) }),
  },
  {
    nomi: 'Қолган кун тўғри ҳисобланади',
    tekshir: () => qolganKun(kun(7)) === 7 && qolganKun(kun(-3)) === -3,
  },
  {
    nomi: 'Бугун тугайдиган эълонда 0 кун қолади — соат аҳамиятсиз',
    tekshir: () => qolganKun(kun(0)) === 0,
  },
  {
    nomi: 'Муддатсизда қолган кун — null',
    tekshir: () => qolganKun(null) === null,
  },
  {
    nomi: 'Одатий муддат бир ой ва у КУЧДА',
    tekshir: () => {
      const m = odatiyMuddat();
      return qolganKun(m) === 30 && elonKuchdami({ faol: true, amalQilishMuddati: m });
    },
  },

  /* ══ 2. МАСЪУЛ ТАШКИЛОТ ══ */
  {
    nomi: 'Даладаги ҳолат: «Ta\'lim bo\'limi» халқ таълимига бирлашади',
    tekshir: () => tashkilotNormal("Ta'lim bo'limi") === 'Xalq ta’limi',
  },
  {
    nomi: 'Иккови БИР ХИЛ қийматга тушади — кесим бўлинмайди',
    tekshir: () =>
      tashkilotNormal("Ta'lim bo'limi") === tashkilotNormal('Xalq ta’limi'),
  },
  {
    nomi: 'Расмий қиймат ЎЗГАРМАЙДИ',
    tekshir: () => tashkilotNormal('Bandlik markazi') === 'Bandlik markazi',
  },
  {
    nomi: 'Кириллча ёзилгани ҳам лотин қийматга тушади',
    tekshir: () => tashkilotNormal('Бандликка кўмаклашиш маркази') === 'Bandlik markazi',
  },
  {
    nomi: 'Апостроф хили аҳамиятсиз — уч хил ёзув, бир хил натижа',
    tekshir: () => {
      const a = tashkilotNormal('Sog‘liqni saqlash');
      return (
        a === tashkilotNormal("Sog'liqni saqlash") && a === tashkilotNormal('Sogliqni saqlash')
      );
    },
  },
  {
    nomi: 'Катта-кичик ҳарф ва бўш жой аҳамиятсиз',
    tekshir: () => tashkilotNormal('  BANDLIK   MARKAZI  ') === 'Bandlik markazi',
  },
  {
    nomi: 'Узун ёзув ҳам тутилади: «Халқ таълими бўлими Хатирчи тумани»',
    tekshir: () => tashkilotNormal('Халқ таълими бўлими Хатирчи тумани') === 'Xalq ta’limi',
  },
  {
    nomi: 'Танилмаган ном «Бошқа» га тушади — йўқотилмайди',
    tekshir: () => tashkilotNormal('Фалон ташкилот') === TASHKILOT_BOSHQA,
  },
  {
    nomi: 'Бўш ном ҳам «Бошқа» — қуламайди',
    tekshir: () =>
      tashkilotNormal('') === TASHKILOT_BOSHQA &&
      tashkilotNormal(null) === TASHKILOT_BOSHQA &&
      tashkilotNormal(undefined) === TASHKILOT_BOSHQA,
  },

  /* ══ 3. УЗОҚ МУДДАТЛИ ИШСИЗЛИК ══ */
  {
    nomi: 'Ой фарқи тўғри: тўлиқ ой ўтмаса ҳисобланмайди',
    tekshir: () =>
      oyFarqi(new Date('2026-01-15'), new Date('2026-03-14')) === 1 &&
      oyFarqi(new Date('2026-01-15'), new Date('2026-03-15')) === 2,
  },
  {
    nomi: '13 ой олдин ишдан чиққан — УЗОҚ муддатли',
    tekshir: () => uzoqIshsizmi({ ishdanBoshaganSana: oyOldin(13) }),
  },
  {
    nomi: '11 ой олдин чиққан — ҳали узоқ эмас',
    tekshir: () => !uzoqIshsizmi({ ishdanBoshaganSana: oyOldin(11) }),
  },
  {
    nomi: 'Аниқ 12 ой — чегарага киради',
    tekshir: () => uzoqIshsizmi({ ishdanBoshaganSana: oyOldin(12) }),
  },
  {
    nomi: 'Санаси йўқ бўлса — хонадондаги муддат ишлатилади',
    tekshir: () =>
      uzoqIshsizmi({ ishdanBoshaganSana: null, household: { ishsizlikMuddatiOy: 24 } }),
  },
  {
    nomi: 'Аниқ сана ҚАЙТА ҚАЙТАРМАЙДИ хонадон тахминини',
    tekshir: () =>
      /* Санаси 2 ой — хонадонда 40 ой ёзилган бўлса ҳам узоқ эмас */
      !uzoqIshsizmi({
        ishdanBoshaganSana: oyOldin(2),
        household: { ishsizlikMuddatiOy: 40 },
      }),
  },
  {
    nomi: 'Иккови ҳам йўқ — узоқ деб белгиланмайди, тахмин билан тамға босилмайди',
    tekshir: () =>
      !uzoqIshsizmi({ ishdanBoshaganSana: null, household: null }) &&
      ishsizlikOylari({ ishdanBoshaganSana: null, household: null }) === null,
  },
  {
    nomi: 'Келажакдаги сана (хато киритилган) манфий ой бермайди',
    tekshir: () => {
      const oy = ishsizlikOylari({ ishdanBoshaganSana: oyOldin(-5) });
      return oy === null;
    },
  },
  {
    nomi: 'Муддат матни ўқиладиган: 26 ой → «2 йил 2 ой»',
    tekshir: () => muddatMatni(26) === '2 йил 2 ой',
  },
  {
    nomi: 'Аниқ йил бўлса ой ёзилмайди: 24 → «2 йил»',
    tekshir: () => muddatMatni(24) === '2 йил',
  },
  {
    nomi: 'Бир йилдан кам — ойда: 7 → «7 ой»',
    tekshir: () => muddatMatni(7) === '7 ой',
  },
  {
    nomi: 'Номаълум муддат матни ҳам бор — бўш қолмайди',
    tekshir: () => muddatMatni(null) === 'номаълум',
  },

  /* ══ 4. МУСТАҲКАМЛАШ ТЕКШИРУВИ ══ */
  {
    nomi: 'Жойлаштиришдан 90 кун кейинга топшириқ',
    tekshir: () => {
      const bugun = new Date();
      const c = mustahkamlashChorasi({
        ishsizId: 'i1',
        householdId: 'x1',
        fish: 'Тошматов Тошмат',
        ishJoyi: 'Нон заводи',
        ishgaKirganSana: bugun,
      });
      return qolganKun(c.muddat) === MUSTAHKAMLASH_KUN;
    },
  },
  {
    nomi: 'Муддат ИШГА КИРГАН кундан ҳисобланади, бугундан эмас',
    tekshir: () => {
      /* 80 кун олдин ишга кирган — текширувга 10 кун қолган */
      const c = mustahkamlashChorasi({
        ishsizId: 'i1',
        householdId: null,
        fish: 'Тошматов Тошмат',
        ishJoyi: null,
        ishgaKirganSana: kun(-80),
      });
      return qolganKun(c.muddat) === MUSTAHKAMLASH_KUN - 80;
    },
  },
  {
    nomi: 'Эски жойлаштиришда муддат аллақачон ЎТГАН — кечиккан бўлиб кўринади',
    tekshir: () => {
      const c = mustahkamlashChorasi({
        ishsizId: 'i1',
        householdId: null,
        fish: 'Тошматов Тошмат',
        ishJoyi: null,
        ishgaKirganSana: kun(-200),
      });
      return (qolganKun(c.muddat) ?? 0) < 0;
    },
  },
  {
    nomi: 'Масъул — бандлик маркази, фуқаро исми муаммода',
    tekshir: () => {
      const c = mustahkamlashChorasi({
        ishsizId: 'i1',
        householdId: null,
        fish: 'Тошматов Тошмат',
        ishJoyi: 'Нон заводи',
        ishgaKirganSana: new Date(),
      });
      return (
        c.masulTashkilot === 'Bandlik markazi' &&
        c.muammo.includes('Тошматов Тошмат') &&
        (c.sababi ?? '').includes('Нон заводи')
      );
    },
  },
  {
    nomi: 'Муаммо матни ТАКРОР аниқлаш учун барқарор — иш жойи ўзгарса ҳам',
    tekshir: () => {
      const a = mustahkamlashChorasi({
        ishsizId: 'i1',
        householdId: null,
        fish: 'Тошматов Тошмат',
        ishJoyi: 'Нон заводи',
        ishgaKirganSana: new Date(),
      });
      const b = mustahkamlashChorasi({
        ishsizId: 'i1',
        householdId: null,
        fish: 'Тошматов Тошмат',
        ishJoyi: 'Пахта заводи',
        ishgaKirganSana: kun(-10),
      });
      return a.muammo === b.muammo;
    },
  },
  {
    nomi: 'Сана йўқ бўлса бугундан ҳисобланади — қуламайди',
    tekshir: () => {
      const c = mustahkamlashChorasi({
        ishsizId: 'i1',
        householdId: null,
        fish: 'Тошматов Тошмат',
        ishJoyi: null,
        ishgaKirganSana: null,
      });
      return qolganKun(c.muddat) === MUSTAHKAMLASH_KUN;
    },
  },
  {
    nomi: 'Масъул номи расмий рўйхатда — кесимда «Бошқа» га тушмайди',
    tekshir: () => {
      const c = mustahkamlashChorasi({
        ishsizId: 'i1',
        householdId: null,
        fish: 'Тошматов Тошмат',
        ishJoyi: null,
        ishgaKirganSana: null,
      });
      return tashkilotNormal(c.masulTashkilot) === c.masulTashkilot;
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
