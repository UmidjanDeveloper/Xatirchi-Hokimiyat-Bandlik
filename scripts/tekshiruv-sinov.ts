/**
 * ============================================================
 *  АНКЕТА ТЕКШИРУВИ — СИНОВ
 *
 *  Бу файл 2026-йил 16-сентябрда, ДАЛАДАН келган хатодан кейин
 *  туғилди.
 *
 *  Ҳолат: хонадонда иш ёшидаги одам бор эди — илгари
 *  ногиронлиги бўлган, ҳозир расман йўқ, аммо ўзини меҳнатга
 *  лаёқатсиз деб ҳисоблайди ва ишламайди. Ходим уни
 *  «лаёқатлилар» дан чиқарди ва «ишсизлар» га қўшди. Анкета
 *  рад этди: «ишлайдиган (1) ва ишсиз (1) жами 2 — лаёқатлилар
 *  сонидан (1) кўп».
 *
 *  Одам бор эди, уни ёзадиган катак йўқ эди. Энди бор.
 *
 *  Синовлар айнан шу занжирни қўриқлайди: катак ишлайдими,
 *  бандлик тенгламасига аралашмайдими ва хато матни ЙЎЛ
 *  кўрсатадими.
 * ============================================================
 */

import { xatlovTekshir, type XatlovRaqamlari } from '../src/lib/xatlov-tekshiruvi';

type Sinov = { nomi: string; tekshir: () => boolean };

/** Хатолар ичида шу майдон борми */
const xatoBor = (d: XatlovRaqamlari, maydon: string) =>
  xatlovTekshir(d).xatolar.some((x) => x.maydon === maydon);

/** Шу майдондаги хато матни */
const xatoMatni = (d: XatlovRaqamlari, maydon: string) =>
  xatlovTekshir(d).xatolar.find((x) => x.maydon === maydon)?.xabar ?? '';

const SINOVLAR: Sinov[] = [
  /* ── ДАЛАДАН КЕЛГАН ҲОЛАТ ── */
  {
    nomi: 'Даладаги ҳолат: лаёқатсиз одам ишсизлар қаторидан чиқарилса — хато йўқ',
    tekshir: () =>
      !xatoBor(
        {
          jamiAzo: 3,
          bolalarSoni: 1,
          mehnatgaLayoqatli: 1,
          mehnatgaLayoqatsiz: 1,
          ishlaydiganlar: 1,
          ishsizlarSoni: 0,
        },
        'ishsizlarSoni'
      ),
  },
  {
    nomi: 'Эски ёзув усули ҳали ҳам хато беради (ишсизга қўшилса)',
    tekshir: () =>
      xatoBor(
        {
          jamiAzo: 3,
          bolalarSoni: 1,
          mehnatgaLayoqatli: 1,
          mehnatgaLayoqatsiz: 0,
          ishlaydiganlar: 1,
          ishsizlarSoni: 1,
        },
        'ishsizlarSoni'
      ),
  },
  {
    nomi: 'Хато матни ЙЎЛ кўрсатади — «лаёқатсизлар» катагини айтади',
    tekshir: () =>
      xatoMatni(
        { jamiAzo: 3, mehnatgaLayoqatli: 1, ishlaydiganlar: 1, ishsizlarSoni: 1 },
        'ishsizlarSoni'
      ).includes('лаёқатсиз'),
  },

  /* ── ЛАЁҚАТСИЗ БАНДЛИК ТЕНГЛАМАСИГА АРАЛАШМАЙДИ ── */
  {
    nomi: 'Лаёқатсизлар сони ишлайдиган+ишсиз тенгламасига қўшилмайди',
    tekshir: () => {
      const asos: XatlovRaqamlari = {
        jamiAzo: 6,
        mehnatgaLayoqatli: 2,
        ishlaydiganlar: 1,
        ishsizlarSoni: 1,
      };
      /* Лаёқатсиз 0 бўлса ҳам, 3 бўлса ҳам бандлик хатоси чиқмаслиги керак */
      return (
        !xatoBor({ ...asos, mehnatgaLayoqatsiz: 0 }, 'ishsizlarSoni') &&
        !xatoBor({ ...asos, mehnatgaLayoqatsiz: 3 }, 'ishsizlarSoni')
      );
    },
  },

  /* ── АММО ОИЛА ТАРКИБИДАН ОШИБ КЕТОЛМАЙДИ ── */
  {
    nomi: 'Болалар + лаёқатли + лаёқатсиз хонадон аъзоларидан ошса — хато',
    tekshir: () =>
      xatoBor(
        {
          jamiAzo: 4,
          bolalarSoni: 2,
          mehnatgaLayoqatli: 2,
          mehnatgaLayoqatsiz: 1,
        },
        'mehnatgaLayoqatli'
      ),
  },
  {
    nomi: 'Аниқ тенг бўлса — хато йўқ',
    tekshir: () =>
      !xatoBor(
        {
          jamiAzo: 5,
          bolalarSoni: 2,
          mehnatgaLayoqatli: 2,
          mehnatgaLayoqatsiz: 1,
        },
        'mehnatgaLayoqatli'
      ),
  },
  {
    nomi: 'Лаёқатсиз бўлмаса, хато матни ҳам уни эсламайди',
    tekshir: () => {
      const m = xatoMatni(
        { jamiAzo: 2, bolalarSoni: 2, mehnatgaLayoqatli: 2, mehnatgaLayoqatsiz: 0 },
        'mehnatgaLayoqatli'
      );
      return m.includes('Болалар') && !m.includes('лаёқатсизлар');
    },
  },

  /* ── ЭСКИ ҚОИДАЛАР БУЗИЛМАГАНИ ── */
  {
    nomi: 'Давлат + хусусий сектор ишлайдиганлардан ошса — хато',
    tekshir: () =>
      xatoBor(
        {
          jamiAzo: 5,
          mehnatgaLayoqatli: 3,
          ishlaydiganlar: 2,
          davlatKorxonada: 2,
          xususiySektorda: 1,
        },
        'xususiySektorda'
      ),
  },
  {
    nomi: 'Тўғри тўлдирилган анкетада умуман хато йўқ',
    tekshir: () =>
      xatlovTekshir({
        jamiAzo: 5,
        bolalarSoni: 2,
        mehnatgaLayoqatli: 2,
        mehnatgaLayoqatsiz: 1,
        ishlaydiganlar: 1,
        davlatKorxonada: 0,
        xususiySektorda: 1,
        ishsizlarSoni: 1,
      }).xatolar.length === 0,
  },

  /* ── ТОМОРҚАДАН ФОЙДАЛАНИШ ── */
  {
    nomi: 'Томорқа бор-у баҳо қўйилмаган — хато',
    tekshir: () =>
      xatoBor(
        { jamiAzo: 1, tomorqaBor: true, ekinMaydoni: 5, tomorqaFoydalanish: null },
        'tomorqaFoydalanish'
      ),
  },
  {
    nomi: 'Баҳо қўйилса — хато йўқ',
    tekshir: () =>
      !xatoBor(
        { jamiAzo: 1, tomorqaBor: true, ekinMaydoni: 5, tomorqaFoydalanish: 'Yomon' },
        'tomorqaFoydalanish'
      ),
  },
  {
    nomi: 'Томорқа йўқ бўлса — баҳо сўралмайди',
    tekshir: () =>
      !xatoBor({ jamiAzo: 1, tomorqaBor: false, tomorqaFoydalanish: null }, 'tomorqaFoydalanish'),
  },

  /* ── ҚЎШИМЧА ЕР ── */
  {
    nomi: 'Қўшимча ер бор-у майдони ёзилмаган — хато',
    tekshir: () =>
      xatoBor({ jamiAzo: 1, qoshimchaYerBor: true, qoshimchaYerMaydoni: null }, 'qoshimchaYerMaydoni'),
  },
  {
    nomi: 'Майдон ёзилган-у «ер йўқ» дейилган — хато',
    tekshir: () =>
      xatoBor({ jamiAzo: 1, qoshimchaYerBor: false, qoshimchaYerMaydoni: 8 }, 'qoshimchaYerMaydoni'),
  },
  {
    nomi: 'Иккови ҳам тўғри — хато йўқ',
    tekshir: () =>
      !xatoBor({ jamiAzo: 1, qoshimchaYerBor: true, qoshimchaYerMaydoni: 8 }, 'qoshimchaYerMaydoni'),
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
