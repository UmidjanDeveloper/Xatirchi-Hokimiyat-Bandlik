/**
 * ============================================================
 *  ИДЕМПОТЕНТЛИК ва ПАРАЛЛЕЛ ТАҲРИР — СИНОВ
 *
 *  Ишга тушириш:  npx tsx scripts/idempotent-sinov.ts
 *
 *  ── Нима қўриқланади ──
 *
 *  Қуйидаги ҳолат ходимнинг бир соатлик ишини ЖИМГИНА
 *  йўқотар эди ва у қайта ҳосил қилиб кўрилди:
 *
 *    1. Қоралама серверда сақланди (калит K);
 *    2. Жавоб йўқолди — браузер ёзувнинг `id` сини олмади;
 *    3. Ходим анкетани якунлаб юборди (ўша K, `id` ҳамон йўқ);
 *    4. Сервер «ok: true, takror: true» деб 200 қайтарди.
 *
 *  Базада эса ҳамон ярим тўлдирилган ҚОРАЛАМА ва биронта
 *  ишсиз ёзуви йўқ эди.
 *
 *  Синовлар қоидани текширади — серверсиз, базасиз. Шунинг
 *  учун улар тез ва ҳар доим бир хил натижа беради.
 * ============================================================
 */
import { readFileSync } from 'node:fs';
import { kalitQarori, mazmunIzi, type KalitYozuvi } from '../src/lib/idempotentlik';
import { prisma } from '../src/lib/prisma';

const kodiOl = (m: string) =>
  m.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const oqi = (y: string) => kodiOl(readFileSync(y, 'utf8'));

type Sinov = { nomi: string; tekshir: () => boolean | Promise<boolean> };

const MEN = 'xodim-1';
const IZ_A = mazmunIzi({ manzil: 'Navoiy 12', oila: 'Aliyev' });
const IZ_B = mazmunIzi({ manzil: 'Navoiy 12', oila: 'Aliyev', jamiAzo: 5 });

function yozuv(qism: Partial<KalitYozuvi>): KalitYozuvi {
  return {
    id: 'xon-1',
    holati: 'QORALAMA',
    mahallaId: 'mfy-1',
    idempotentAmal: 'qoralama',
    idempotentUserId: MEN,
    idempotentIzi: IZ_A,
    ...qism,
  };
}

const SINOVLAR: Sinov[] = [
  // ── МАЗМУН ИЗИ ──
  {
    nomi: 'Майдонлар тартиби изни ЎЗГАРТИРМАЙДИ',
    tekshir: () =>
      mazmunIzi({ a: 1, b: 2 }) === mazmunIzi({ b: 2, a: 1 }),
  },
  {
    nomi: 'Мазмун ўзгарса — из ҳам ўзгаради',
    tekshir: () => mazmunIzi({ a: 1 }) !== mazmunIzi({ a: 2 }),
  },
  {
    nomi: '`undefined` майдон изга таъсир қилмайди',
    tekshir: () => mazmunIzi({ a: 1, b: undefined }) === mazmunIzi({ a: 1 }),
  },
  {
    nomi: 'Сана ISO га келтирилади — иккита бир хил сана бир хил из беради',
    tekshir: () =>
      mazmunIzi({ s: new Date('2020-01-02T00:00:00Z') }) ===
      mazmunIzi({ s: new Date('2020-01-02T00:00:00Z') }),
  },
  {
    nomi: 'Ичма-ич объект ва рўйхат ҳам барқарор',
    tekshir: () =>
      mazmunIzi({ x: [{ a: 1, b: 2 }] }) === mazmunIzi({ x: [{ b: 2, a: 1 }] }),
  },

  // ── ЯНГИ ──
  {
    nomi: 'Калит топилмаса — янги ёзув',
    tekshir: () => kalitQarori(null, { amal: 'qoralama', userId: MEN, izi: IZ_A }).turi === 'yangi',
  },

  // ── ТАКРОР ──
  {
    nomi: 'АЙНАН ўша сўров қайта келса — такрор',
    tekshir: () => {
      const q = kalitQarori(yozuv({}), { amal: 'qoralama', userId: MEN, izi: IZ_A });
      return q.turi === 'takror' && q.id === 'xon-1';
    },
  },
  {
    nomi: 'Якуний ҳам айнан ўзи келса — такрор',
    tekshir: () => {
      const q = kalitQarori(
        yozuv({ idempotentAmal: 'yakuniy', holati: 'YUBORILGAN' }),
        { amal: 'yakuniy', userId: MEN, izi: IZ_A }
      );
      return q.turi === 'takror';
    },
  },

  // ── ЭНГ МУҲИМИ: ҚОРАЛАМА → ЯКУНИЙ ──
  {
    /*
     * Айнан шу йўл ходимнинг ишини йўқотар эди.
     * Натижа «такрор» ЭМАС, «давом» бўлиши шарт —
     * яъни топилган ёзув якуний маълумот билан янгиланади.
     */
    nomi: 'ҚОРАЛАМА → ЯКУНИЙ: такрор ЭМАС, ёзув янгиланади',
    tekshir: () => {
      const q = kalitQarori(yozuv({}), { amal: 'yakuniy', userId: MEN, izi: IZ_B });
      return q.turi === 'davom' && q.sabab === 'qoralamadan-yakuniyga' && q.id === 'xon-1';
    },
  },
  {
    nomi: 'Қоралама → якуний, мазмун ЎЗГАРМАГАН бўлса ҳам — давом',
    tekshir: () => {
      const q = kalitQarori(yozuv({}), { amal: 'yakuniy', userId: MEN, izi: IZ_A });
      return q.turi === 'davom';
    },
  },
  {
    nomi: 'ЯКУНИЙ → ҚОРАЛАМА тескари йўл йўқ — зиддият',
    tekshir: () => {
      const q = kalitQarori(
        yozuv({ idempotentAmal: 'yakuniy', holati: 'YUBORILGAN' }),
        { amal: 'qoralama', userId: MEN, izi: IZ_B }
      );
      return q.turi === 'ziddiyat';
    },
  },

  // ── БИР ХИЛ КАЛИТ, БОШҚА МАЗМУН ──
  {
    nomi: 'Қораламани қайта сақлаш — ёзув янгиланади',
    tekshir: () => {
      const q = kalitQarori(yozuv({}), { amal: 'qoralama', userId: MEN, izi: IZ_B });
      return q.turi === 'davom' && q.sabab === 'qoralama-qayta';
    },
  },
  {
    nomi: 'Якуний икки марта, БОШҚА мазмун билан — ЗИДДИЯТ',
    tekshir: () => {
      const q = kalitQarori(
        yozuv({ idempotentAmal: 'yakuniy', holati: 'YUBORILGAN' }),
        { amal: 'yakuniy', userId: MEN, izi: IZ_B }
      );
      return q.turi === 'ziddiyat' && q.id === 'xon-1';
    },
  },

  // ── ЭГАСИ ──
  {
    nomi: 'Бошқа ходимнинг калити — бегона',
    tekshir: () => {
      const q = kalitQarori(yozuv({ idempotentUserId: 'xodim-2' }), {
        amal: 'qoralama',
        userId: MEN,
        izi: IZ_A,
      });
      return q.turi === 'begona';
    },
  },
  {
    nomi: 'Эгаси белгиланмаган эски ёзув бегона деб саналмайди',
    tekshir: () => {
      const q = kalitQarori(yozuv({ idempotentUserId: null, idempotentAmal: null }), {
        amal: 'qoralama',
        userId: MEN,
        izi: IZ_A,
      });
      return q.turi === 'takror';
    },
  },
  {
    nomi: 'Амали номаълум эски ёзув, мазмун бошқа — давом',
    tekshir: () => {
      const q = kalitQarori(yozuv({ idempotentAmal: null, idempotentIzi: IZ_A }), {
        amal: 'yakuniy',
        userId: MEN,
        izi: IZ_B,
      });
      return q.turi === 'davom';
    },
  },

  // ── ЙЎЛ КОДИ ──
  {
    nomi: 'Йўл эрта қайтишни ТАШЛАГАН — қарор модулидан фойдаланади',
    tekshir: () => {
      const k = oqi('src/app/api/xatlov/route.ts');
      return (
        k.includes('kalitQarori(avvalgi, {') &&
        k.includes("const yozuvId = id ?? kalitYozuviId;") &&
        /* Эски эрта қайтиш йўқолган бўлиши шарт */
        !k.includes('if (avvalgi) {\n      return NextResponse.json({')
      );
    },
  },
  {
    nomi: 'Калит АМАЛ, ЭГАСИ ва ИЗ билан сақланади',
    tekshir: () => {
      const k = oqi('src/app/api/xatlov/route.ts');
      return (
        k.includes('idempotentAmal: turi') &&
        k.includes('idempotentUserId: q.sessiya.userId') &&
        k.includes('idempotentIzi: izi')
      );
    },
  },
  {
    nomi: 'Параллел таҳрир: версия билан `updateMany` ва 409',
    tekshir: () => {
      const k = oqi('src/app/api/xatlov/route.ts');
      return (
        k.includes('tx.household.updateMany({') &&
        k.includes('versiya: mijozVersiyasi') &&
        k.includes('if (natijasi.count === 0) throw new VersiyaZiddiyati(yozuvId);') &&
        k.includes('e instanceof VersiyaZiddiyati')
      );
    },
  },
  {
    /*
     * ── УЛАНИШ СИЗИШИ ──
     *
     * Транзакция ичида `xomPrisma` (транзакциядан ташқаридаги
     * мижоз) ишлатилса, у ИККИНЧИ уланишни сўрайди. Тўғридан-
     * тўғри уланишда чегара БИТТА, яъни транзакция ўзи ушлаб
     * турган уланишни кутиб қолади ва 10 сонияда йиқилади.
     *
     * Қайта ҳосил қилинди: `connection_limit=1` да якуний
     * юбориш УМУМАН ўтмасди. Продукцияда пулер орқали 5 та —
     * демак бир вақтда уч-тўрт ходим юборса, ўша ҳол
     * қайтарилар эди.
     */
    nomi: 'Транзакция ичида транзакциядан ташқари мижоз ЙЎҚ',
    tekshir: () => {
      const k = oqi('src/app/api/xatlov/route.ts');
      return !k.includes('xomPrisma');
    },
  },
  {
    nomi: 'Узун транзакцияга аниқ муддат қўйилган',
    tekshir: () => {
      const k = oqi('src/app/api/xatlov/route.ts');
      return k.includes('timeout: 25_000') && k.includes('maxWait: 10_000');
    },
  },
  {
    nomi: 'Форма версияни юборади ва жавобдан янгилайди',
    tekshir: () => {
      const k = oqi('src/components/xatlov/xatlov-formasi.tsx');
      return (
        k.includes("turi: 'qoralama', id, kalit, versiya") &&
        k.includes("turi: 'yakuniy', id, kalit, versiya") &&
        k.includes("if (typeof natija.versiya === 'number') setVersiya(natija.versiya);")
      );
    },
  },
  // ═══════════════════════════════════════════════════════════
  //  ХУЛҚ: АРХИВ ФИЛЬТРИНИ ЧЕТЛАБ ЎТИШ ҲАҚИҚАТДА ИШЛАЙДИМИ
  //
  //  Хатлов таҳрирланганда архивдаги фуқаро ҳам кўриниши
  //  керак — акс ҳолда анкетада исми турган одам «янги» деб
  //  ҳисобланиб, ДУБЛИКАТ яратиларди.
  //
  //  Аввал бунинг учун транзакциядан ташқаридаги мижоз
  //  ишлатиларди ва у уланишни ейиб қўярди. Энди фильтр
  //  `arxivSanasi` калитини очиқ ёзиш орқали четлаб
  //  ўтилади. Бу — шу ваъданинг ҲАҚИҚИЙ синови.
  // ═══════════════════════════════════════════════════════════
  {
    nomi: 'Архивдаги фуқаро `arxivSanasi: undefined` билан КЎРИНАДИ',
    tekshir: async () => {
      const mahalla = await prisma.mahalla.findFirst({ select: { id: true } });
      if (!mahalla) throw new Error('Синов учун маҳалла топилмади');

      const nom = `Arxiv Sinov ${Date.now()}`;
      const odam = await prisma.unemployedPerson.create({
        data: {
          mahallaId: mahalla.id,
          fish: nom,
          jinsi: 'Erkak',
          arxivSanasi: new Date(),
          arxivSababi: 'Синов',
        },
        select: { id: true },
      });

      try {
        /* Оддий сўров — қоровул архивдагини яширади */
        const yashirin = await prisma.unemployedPerson.findMany({
          where: { fish: nom },
          select: { id: true },
        });

        /* Калит ОЧИҚ ёзилган — қоровул тегмайди */
        const korinadi = await prisma.unemployedPerson.findMany({
          where: { fish: nom, arxivSanasi: undefined },
          select: { id: true },
        });

        return yashirin.length === 0 && korinadi.length === 1 && korinadi[0].id === odam.id;
      } finally {
        await prisma.unemployedPerson.delete({ where: { id: odam.id } }).catch(() => undefined);
      }
    },
  },
];

/* tsx CJS га ўгиради — юқори даражадаги `await` ишламайди */
async function main() {
  let xato = 0;
  for (const s of SINOVLAR) {
    let ok = false;
    try {
      ok = await s.tekshir();
    } catch (e) {
      console.log(`     xatolik: ${(e as Error).message}`);
    }
    if (!ok) xato++;
    console.log(`${ok ? 'OK  ' : 'XATO'} ${s.nomi}`);
  }
  console.log(`\n${SINOVLAR.length - xato}/${SINOVLAR.length} o'tdi`);
  await prisma.$disconnect().catch(() => undefined);
  process.exit(xato ? 1 : 0);
}

void main();
