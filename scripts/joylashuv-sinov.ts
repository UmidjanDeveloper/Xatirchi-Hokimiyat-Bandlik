/**
 * ============================================================
 *  «ИШ ТОПДИМ» ЗАНЖИРИ — СИНОВ
 *
 *  Занжир беш ҳалқадан иборат ва ҳар бирининг ЎЗ мақсади бор:
 *
 *    1. эълон → маҳалла ходимига хабар (исмлар билан)
 *    2. ходим тугмани босади → хабар ёзилади
 *    3. раҳбарларга «хабар қилинди» кетади
 *    4. марказ тасдиқлайди → фуқаро РАСМАН жойлаштирилади
 *    5. ҳокимга «таъминланди», ходимга «раҳмат» кетади
 *
 *  Синов ҳар ҳалқани АЛОҲИДА текширади: биттаси узилса,
 *  қолгани «ишлаяпти» бўлиб кўринади ва нуқсон фақат ойлик
 *  ҳисоботда — рақам мос келмаганда — сезиларди.
 * ============================================================
 */
import { readFileSync } from 'node:fs';

type Sinov = { nomi: string; tekshir: () => boolean };

/** Изоҳларсиз код */
const kodiOl = (m: string) =>
  m
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/^\s*\/\/.*$/gm, '');

const XABAR = kodiOl(readFileSync('src/lib/joylashuv-xabari.ts', 'utf8'));
const XABARNOMA = kodiOl(readFileSync('src/lib/xabarnoma.ts', 'utf8'));
const WEBHOOK = kodiOl(readFileSync('src/app/api/telegram/webhook/route.ts', 'utf8'));
const ROUT = kodiOl(readFileSync('src/app/api/joylashuv-xabari/[id]/route.ts', 'utf8'));
const ORIN_ROUT = kodiOl(
  readFileSync('src/app/api/ish-orinlari/[id]/joylashtirish/route.ts', 'utf8')
);
const JOYLASH = kodiOl(readFileSync('src/lib/joylashtirish.ts', 'utf8'));
const PANEL = kodiOl(readFileSync('src/app/(ilova)/bandlik/page.tsx', 'utf8'));
const SXEMA = readFileSync('prisma/schema.prisma', 'utf8');

const SINOVLAR: Sinov[] = [
  /* ══ 1-ҲАЛҚА: эълон → ходимга исмлар ва тугмалар ══ */
  {
    /*
     * Илгари хабарда фақат СОН турарди: «3 та мос фуқаро бор,
     * иловадан кўринг». Ходим иловани очиши, эълонни топиши,
     * рўйхатни солиштириши керак эди — ва кўпинча очмасди.
     */
    nomi: '1. Хабарга номзодлар ТУГМАСИ қўшилади',
    tekshir: () =>
      XABARNOMA.includes('export interface Tugma') &&
      XABARNOMA.includes('inline_keyboard') &&
      XABARNOMA.includes("belgi: `${ISH_BELGISI}:${orin.id}:${n.id}`"),
  },
  {
    /*
     * Тугма ЮБОРИШ пайтида ҳисобланади. Навбат билан юбориш
     * ораси соатлаб бўлиши мумкин — ўша орада жойлашиб кетган
     * фуқарога тугма чиқмаслиги керак.
     */
    nomi: '1. Тугма ЮБОРИШ пайтида ҳисобланади, навбатга қўйилганда эмас',
    tekshir: () =>
      XABARNOMA.includes('const tugmalar = await xabarTugmalari(x);') &&
      XABARNOMA.includes('vacancyId: null,') &&
      XABARNOMA.includes('joylashuvXabarlari: { none: { vacancyId: orin.id } }'),
  },
  {
    /* Телефон рақами Telegram'га ЮБОРИЛМАЙДИ — иловада қолади */
    nomi: '1. Тугмада ФАҚАТ исм — телефон рақами юборилмайди',
    tekshir: () => {
      /*
       * Чегара — КЕЙИНГИ функция. `\n}` бўйича кесиш нотўғри
       * эди: функция ичида объект литераллари ҳам шундай
       * тугайди ва кесма эрта узилиб қоларди.
       */
      const i = XABARNOMA.indexOf('async function xabarTugmalari');
      const j = XABARNOMA.indexOf('function qisqaIsm', i);
      const tana = XABARNOMA.slice(i, j > i ? j : undefined);
      return tana.includes('select: { id: true, fish: true }') && !/telefon/i.test(tana);
    },
  },

  /* ══ 2-ҲАЛҚА: тугма босилди → хабар ёзилади ══ */
  {
    nomi: '2. Вебхук тугма босилишини қабул қилади',
    tekshir: () =>
      WEBHOOK.includes('callback_query: z') &&
      WEBHOOK.includes('await tugmaBosildi(bosildi);') &&
      WEBHOOK.includes('answerCallbackQuery'),
  },
  {
    /*
     * Telegram'дан келган сўровда СЕССИЯ ЙЎҚ. Учта қатлам
     * керак: белги шакли, боғланган ходим, маҳалла.
     */
    nomi: '2. Тугма УЧТА қатламдан ўтади — шакл, ходим, маҳалла',
    tekshir: () =>
      WEBHOOK.includes("qism.length !== 3 || qism[0] !== ISH_BELGISI") &&
      WEBHOOK.includes('telegramChatId: String(q.from.id), faol: true') &&
      XABAR.includes('odam.mahallaId !== p.xabarchiMahallaId'),
  },
  {
    /* Икки марта босилса иккита хабар туғилмасин */
    nomi: '2. Такрор босиш иккинчи хабар ярамайди',
    tekshir: () =>
      XABAR.includes('const mavjud = await prisma.joylashuvXabari.findUnique') &&
      XABAR.includes('if (mavjud) return { ok: true, xabarId: mavjud.id, allaqachon: true };') &&
      SXEMA.includes('@@unique([vacancyId, ishsizId])'),
  },
  {
    /*
     * Тугма босилгани билан фуқаро ЖОЙЛАШТИРИЛМАЙДИ: рақам
     * ҳужжат билан тасдиқланиши керак. 70 та ходим туман
     * рақамини бевосита ўзгартира олмайди.
     */
    nomi: '2. Тугма фуқаро ҲОЛАТИНИ ўзгартирмайди',
    tekshir: () => {
      const i = XABAR.indexOf('export async function ishTopildiXabari');
      const tana = XABAR.slice(i, XABAR.indexOf('\n}', i));
      return !tana.includes('unemployedPerson.update') && !tana.includes('JOYLASHTIRILDI');
    },
  },

  /* ══ 3-ҲАЛҚА: раҳбарларга хабар ══ */
  {
    nomi: '3. Раҳбарлар тасдиқни КУТМАЙ хабар олади',
    tekshir: () =>
      XABAR.includes("turi: 'ISH_TOPILDI'") &&
      XABAR.includes("rol: { in: ['BANDLIK', 'BANDLIK_RAHBAR', 'HOKIM'] }"),
  },

  /* ══ 4-ҲАЛҚА: марказ тасдиқлайди ══ */
  {
    /*
     * Жойлаштириш мантиғи БИТТА жойда: иловадагиси ҳам,
     * Telegram хабарини тасдиқлаш ҳам ўша функцияни чақиради.
     * Иккита нусха бўлса, бири эскириб рақамлар бўлинарди.
     */
    nomi: '4. Жойлаштириш мантиғи БИТТА — иккала йўл ҳам ўшани чақиради',
    tekshir: () =>
      JOYLASH.includes('export async function joylashtirishAmali(') &&
      XABAR.includes('await joylashtirishAmali(tx, {') &&
      ORIN_ROUT.includes('return joylashtirishAmali(tx, {') &&
      /*
       * Эски нусха ФАҚАТ жойлаштиришда (POST) қолмаган
       * бўлсин. `DELETE` — бекор қилиш, у бошқа амал ва ўз
       * мантиғи бор; уни ҳам тақиқлаш нотўғри бўларди.
       */
      !ORIN_ROUT.slice(
        ORIN_ROUT.indexOf('export async function POST'),
        ORIN_ROUT.indexOf('export async function DELETE')
      ).includes('tx.unemployedPerson.update'),
  },
  {
    nomi: '4. Тасдиқлангандан кейин хабар ҳолати ёзилади',
    tekshir: () =>
      XABAR.includes("holati: 'TASDIQLANDI'") &&
      XABAR.includes('halQilganId: p.kim.userId') &&
      XABAR.includes("if (xabar.holati !== 'XABAR_QILINDI')"),
  },
  {
    /* Рад этишда сабаб МАЖБУРИЙ: ходим нега рад этилганини билсин */
    nomi: '4. Рад этишда сабаб мажбурий',
    tekshir: () =>
      ROUT.includes("if (!d.izoh?.trim())") && ROUT.includes("holati: 'RAD_ETILDI'"),
  },

  /* ══ 5-ҲАЛҚА: натижа ҳаммага қайтади ══ */
  {
    nomi: '5. Ҳокимга «таъминланди» боради',
    tekshir: () =>
      XABAR.includes("turi: 'JOYLASHUV_TASDIQLANDI'") &&
      XABAR.includes('export function tasdiqlandiMatni'),
  },
  {
    /*
     * Хабар қилган ходимга ҲАМ. Усиз занжир унинг учун очиқ
     * қоларди: босди-ю, нима бўлганини билмади — ва кейинги
     * сафар босишга иккиланарди.
     */
    nomi: '5. Хабар қилган ходимга натижа қайтади',
    tekshir: () =>
      XABAR.includes('userId: xabar.xabarchiId,') &&
      XABAR.includes('Хабарингиз тасдиқланди'),
  },

  /* ══ ЗАНЖИР КЎРИНАДИГАН ЖОЙДА ══ */
  {
    /*
     * Тасдиқламаган хабар — ҳужжатсиз турган рақам. Агар
     * тасдиқлайдиган жой бўлмаса, хабарлар базада ётиб
     * қоларди ва занжир шу ерда узиларди.
     */
    nomi: 'Навбат бандлик панелида КЎРИНАДИ',
    tekshir: () =>
      PANEL.includes('<TasdiqlashNavbati') &&
      PANEL.includes("holati: 'XABAR_QILINDI'") &&
      PANEL.includes('kechikkan: x.muddat.getTime() < Date.now()'),
  },
  {
    /* Муддат ўтса кўринсин — акс ҳолда навбат жимгина ўсарди */
    nomi: 'Тасдиқлашга муддат қўйилади',
    tekshir: () =>
      XABAR.includes('export const TASDIQLASH_MUDDATI_KUN') &&
      XABAR.includes('muddat.setDate(muddat.getDate() + TASDIQLASH_MUDDATI_KUN)'),
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
