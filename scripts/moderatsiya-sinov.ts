/**
 * ============================================================
 *  МОДЕРАЦИЯ: АТОМАР ҚАРОР — СИНОВ
 *
 *  Ишга тушириш:  npx tsx scripts/moderatsiya-sinov.ts
 *
 *  ── Қандай нуқсон қўриқланади ──
 *
 *  Модерация хабари БАРЧА раҳбарга боради. Демак иккови бир
 *  вақтда тугма босиши — оддий ҳол, тасодиф эмас.
 *
 *  Аввал код «ўқи → текшир → ёз» тартибида эди:
 *
 *    Раҳбар A: ҳолат KUTILMOQDA ми? — ҳа
 *    Раҳбар B: ҳолат KUTILMOQDA ми? — ҳа
 *    Раҳбар A: ёзади — ТАСДИҚЛАНДИ
 *    Раҳбар B: ёзади — РАД ЭТИЛДИ
 *
 *  Иккаласига ҳам «бажарилди» деб жавоб борарди, иш
 *  берувчига эса иккита қарама-қарши хабар кетарди.
 *
 *  Бу синов АЙНАН шуни текширади — кодда сўз қидириб эмас,
 *  иккита қарорни ПАРАЛЛЕЛ юбориб.
 * ============================================================
 */
/*
 * ── МУҲИТНИ ЎЗИ ЮКЛАЙДИ ──
 *
 * Бу синов базага уланади, демак `DATABASE_URL` керак.
 * Аввал у чақирилмасди ва синов МУҲИТГА таянарди: CI да ва
 * `ci-taqlid` да ўзгарувчи ташқаридан келарди, `npm run
 * sinov` да эса келмасди — ва синов «Environment variable
 * not found» деб йиқиларди.
 *
 * Лойиҳада бу хато УЧИНЧИ марта: биринчиси `/tmp` даги файл,
 * иккинчиси базадаги раҳбар ҳисоблари эди. Атроф-муҳитга
 * таянган синов — синов эмас.
 */
import { envYukla } from './env-yukla';
envYukla();

import { readFileSync } from 'node:fs';
import { prisma } from '../src/lib/prisma';
import { beruvchiniHalQil, elonniHalQil } from '../src/lib/ish-beruvchi';
import { dalilniHalQil, dalilQaroriniOzgartir } from '../src/lib/joylashuv-dalili';

const kodiOl = (m: string) =>
  m.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const oqi = (y: string) => kodiOl(readFileSync(y, 'utf8'));

type Sinov = { nomi: string; tekshir: () => Promise<boolean> | boolean };

/** Синов яратган ёзувлар — охирида тозаланади */
const tozalanadi = { beruvchi: [] as string[], elon: [] as string[], dalil: [] as string[], ishsiz: [] as string[], user: [] as string[] };

const noyob = () => `${Date.now()}${Math.floor(Math.random() * 9999)}`;

async function rahbarYarat(): Promise<string> {
  const u = await prisma.user.create({
    data: {
      username: `sinov_mod_${noyob()}`,
      passwordHash: 'x:y',
      fullName: 'Синов Раҳбари',
      rol: 'BANDLIK_RAHBAR',
      parolAlmashtirilsin: false,
    },
    select: { id: true },
  });
  tozalanadi.user.push(u.id);
  return u.id;
}

async function beruvchiYarat(): Promise<string> {
  const m = await prisma.mahalla.findFirstOrThrow({ select: { id: true } });
  const b = await prisma.ishBeruvchi.create({
    data: {
      korxonaNomi: `Синов корхона ${noyob()}`,
      telegramChatId: `sinov-chat-${noyob()}`,
      masulShaxs: 'Синов Масъул',
      telefon: `+99890${Math.floor(1000000 + Math.random() * 8999999)}`,
      mahallaId: m.id,
      holati: 'KUTILMOQDA',
    },
    select: { id: true },
  });
  tozalanadi.beruvchi.push(b.id);
  return b.id;
}

const SINOVLAR: Sinov[] = [
  {
    /*
     * ЭНГ МУҲИМИ. Иккита қарор бир вақтда юборилади ва
     * ФАҚАТ БИТТАСИ ўтиши шарт.
     */
    nomi: 'Иккита раҳбар бир вақтда: фақат БИТТА қарор ўтади',
    tekshir: async () => {
      const a = await rahbarYarat();
      const b = await rahbarYarat();
      const beruvchiId = await beruvchiYarat();

      const [n1, n2] = await Promise.all([
        beruvchiniHalQil({ beruvchiId, userId: a, qabul: true }),
        beruvchiniHalQil({ beruvchiId, userId: b, qabul: false, sabab: 'Маълумот етарли эмас' }),
      ]);

      const otganlar = [n1, n2].filter((n) => n.ok).length;
      const radEtilganlar = [n1, n2].filter((n) => !n.ok && n.sabab === 'allaqachon').length;

      const hozir = await prisma.ishBeruvchi.findUnique({
        where: { id: beruvchiId },
        select: { holati: true, halQilganId: true },
      });

      return (
        otganlar === 1 &&
        radEtilganlar === 1 &&
        hozir?.holati !== 'KUTILMOQDA' &&
        Boolean(hozir?.halQilganId)
      );
    },
  },
  {
    nomi: 'Иккинчи қарорга КИМ ҳал қилгани айтилади',
    tekshir: async () => {
      const a = await rahbarYarat();
      const b = await rahbarYarat();
      const beruvchiId = await beruvchiYarat();

      await beruvchiniHalQil({ beruvchiId, userId: a, qabul: true });
      const ikkinchi = await beruvchiniHalQil({ beruvchiId, userId: b, qabul: false, sabab: 'Кеч' });

      return (
        !ikkinchi.ok &&
        ikkinchi.sabab === 'allaqachon' &&
        ikkinchi.hozirgiHolati === 'TASDIQLANDI' &&
        ikkinchi.halQilgan === 'Синов Раҳбари'
      );
    },
  },
  {
    nomi: 'Йўқ аризага «топилмади» жавоби',
    tekshir: async () => {
      const a = await rahbarYarat();
      const n = await beruvchiniHalQil({ beruvchiId: 'yoq-bunday-id', userId: a, qabul: true });
      return !n.ok && n.sabab === 'topilmadi';
    },
  },
  {
    nomi: 'Рад этилганда САБАБ сақланади',
    tekshir: async () => {
      const a = await rahbarYarat();
      const beruvchiId = await beruvchiYarat();
      await beruvchiniHalQil({ beruvchiId, userId: a, qabul: false, sabab: 'Телефон ишламайди' });
      const b = await prisma.ishBeruvchi.findUnique({
        where: { id: beruvchiId },
        select: { holati: true, radSababi: true, halQilinganSana: true },
      });
      return (
        b?.holati === 'RAD_ETILDI' &&
        b.radSababi === 'Телефон ишламайди' &&
        b.halQilinganSana !== null
      );
    },
  },

  // ── ЭЪЛОН МОДЕРАЦИЯСИ ──
  {
    nomi: 'Эълон: иккита раҳбар бир вақтда — биттаси ўтади',
    tekshir: async () => {
      const a = await rahbarYarat();
      const b = await rahbarYarat();
      const m = await prisma.mahalla.findFirstOrThrow({ select: { id: true } });
      const e = await prisma.vacancy.create({
        data: {
          lavozim: `Синов лавозим ${noyob()}`,
          korxonaNomi: 'Синов корхона',
          mahallaId: m.id,
          ornlarSoni: 1,
          moderatsiya: 'KUTILMOQDA',
        },
        select: { id: true },
      });
      tozalanadi.elon.push(e.id);

      const [n1, n2] = await Promise.all([
        elonniHalQil({ vacancyId: e.id, userId: a, qabul: true }),
        elonniHalQil({ vacancyId: e.id, userId: b, qabul: false, sabab: 'Маош кўрсатилмаган' }),
      ]);

      const hozir = await prisma.vacancy.findUnique({
        where: { id: e.id },
        select: { moderatsiya: true, moderatsiyaQilganId: true, moderatsiyaSanasi: true },
      });

      return (
        [n1, n2].filter((n) => n.ok).length === 1 &&
        hozir?.moderatsiya !== 'KUTILMOQDA' &&
        Boolean(hozir?.moderatsiyaQilganId) &&
        Boolean(hozir?.moderatsiyaSanasi)
      );
    },
  },
  {
    nomi: 'Эълон рад этилганда САБАБ ва ким рад этгани сақланади',
    tekshir: async () => {
      const a = await rahbarYarat();
      const m = await prisma.mahalla.findFirstOrThrow({ select: { id: true } });
      const e = await prisma.vacancy.create({
        data: {
          lavozim: `Синов лавозим ${noyob()}`,
          korxonaNomi: 'Синов корхона',
          mahallaId: m.id,
          ornlarSoni: 1,
          moderatsiya: 'KUTILMOQDA',
        },
        select: { id: true },
      });
      tozalanadi.elon.push(e.id);

      await elonniHalQil({ vacancyId: e.id, userId: a, qabul: false, sabab: 'Маош кўрсатилмаган' });
      const hozir = await prisma.vacancy.findUnique({
        where: { id: e.id },
        select: { moderatsiya: true, moderatsiyaSababi: true, faol: true },
      });
      /* Рад этилган эълон ЁПИЛАДИ ҳам */
      return (
        hozir?.moderatsiya === 'RAD_ETILDI' &&
        hozir.moderatsiyaSababi === 'Маош кўрсатилмаган' &&
        hozir.faol === false
      );
    },
  },

  // ── ДАЛИЛ ──
  {
    nomi: 'Далил: иккита мутахассис бир вақтда — биттаси ўтади',
    tekshir: async () => {
      const a = await rahbarYarat();
      const b = await rahbarYarat();
      const m = await prisma.mahalla.findFirstOrThrow({ select: { id: true } });
      const odam = await prisma.unemployedPerson.create({
        data: { mahallaId: m.id, fish: `Синов Далил ${noyob()}`, jinsi: 'Erkak' },
        select: { id: true },
      });
      tozalanadi.ishsiz.push(odam.id);
      const d = await prisma.joylashuvDalili.create({
        data: { ishsizId: odam.id, turi: 'SHARTNOMA', holati: 'KIRITILDI' },
        select: { id: true },
      });
      tozalanadi.dalil.push(d.id);

      const [n1, n2] = await Promise.all([
        dalilniHalQil({ dalilId: d.id, userId: a, tasdiqlandi: true }),
        dalilniHalQil({ dalilId: d.id, userId: b, tasdiqlandi: false }),
      ]);

      return [n1, n2].filter((n) => n.ok).length === 1;
    },
  },
  {
    /*
     * Аввал ҳолат УМУМАН текширилмасди: тасдиқланган
     * далилни кейинги босиш жимгина рад этилганга
     * айлантирарди.
     */
    nomi: 'Тасдиқланган далилни оддий йўл билан ЎЗГАРТИРИБ бўлмайди',
    tekshir: async () => {
      const a = await rahbarYarat();
      const m = await prisma.mahalla.findFirstOrThrow({ select: { id: true } });
      const odam = await prisma.unemployedPerson.create({
        data: { mahallaId: m.id, fish: `Синов Далил ${noyob()}`, jinsi: 'Erkak' },
        select: { id: true },
      });
      tozalanadi.ishsiz.push(odam.id);
      const d = await prisma.joylashuvDalili.create({
        data: { ishsizId: odam.id, turi: 'SHARTNOMA', holati: 'KIRITILDI' },
        select: { id: true },
      });
      tozalanadi.dalil.push(d.id);

      await dalilniHalQil({ dalilId: d.id, userId: a, tasdiqlandi: true });
      const ikkinchi = await dalilniHalQil({ dalilId: d.id, userId: a, tasdiqlandi: false });

      const hozir = await prisma.joylashuvDalili.findUnique({
        where: { id: d.id },
        select: { holati: true },
      });
      return !ikkinchi.ok && ikkinchi.sabab === 'allaqachon' && hozir?.holati === 'TASDIQLANDI';
    },
  },
  {
    nomi: 'Қарорни ЎЗГАРТИРИШ сабабсиз бўлмайди',
    tekshir: async () => {
      const a = await rahbarYarat();
      const m = await prisma.mahalla.findFirstOrThrow({ select: { id: true } });
      const odam = await prisma.unemployedPerson.create({
        data: { mahallaId: m.id, fish: `Синов Далил ${noyob()}`, jinsi: 'Erkak' },
        select: { id: true },
      });
      tozalanadi.ishsiz.push(odam.id);
      const d = await prisma.joylashuvDalili.create({
        data: { ishsizId: odam.id, turi: 'SHARTNOMA', holati: 'TASDIQLANDI' },
        select: { id: true },
      });
      tozalanadi.dalil.push(d.id);

      const bosh = await dalilQaroriniOzgartir({ dalilId: d.id, userId: a, tasdiqlandi: false, sabab: 'qisqa' });
      return !bosh.ok && bosh.sabab === 'sababsiz';
    },
  },
  {
    nomi: 'Қарор ўзгарса, ОЛДИНГИСИ изоҳда сақланади',
    tekshir: async () => {
      const a = await rahbarYarat();
      const m = await prisma.mahalla.findFirstOrThrow({ select: { id: true } });
      const odam = await prisma.unemployedPerson.create({
        data: { mahallaId: m.id, fish: `Синов Далил ${noyob()}`, jinsi: 'Erkak' },
        select: { id: true },
      });
      tozalanadi.ishsiz.push(odam.id);
      const d = await prisma.joylashuvDalili.create({
        data: { ishsizId: odam.id, turi: 'SHARTNOMA', holati: 'KIRITILDI' },
        select: { id: true },
      });
      tozalanadi.dalil.push(d.id);

      await dalilniHalQil({ dalilId: d.id, userId: a, tasdiqlandi: true });
      const n = await dalilQaroriniOzgartir({
        dalilId: d.id,
        userId: a,
        tasdiqlandi: false,
        sabab: 'Шартнома сохта экани аниқланди',
      });

      const hozir = await prisma.joylashuvDalili.findUnique({
        where: { id: d.id },
        select: { holati: true, izoh: true },
      });
      return (
        n.ok &&
        hozir?.holati === 'RAD_ETILDI' &&
        Boolean(hozir.izoh?.includes('Олдинги қарор: TASDIQLANDI')) &&
        Boolean(hozir.izoh?.includes('сохта'))
      );
    },
  },

  // ── КОД ──
  {
    nomi: 'Учала йўлда ҳам `updateMany` билан шартли ёзиш',
    tekshir: () => {
      const b = oqi('src/lib/ish-beruvchi.ts');
      const d = oqi('src/lib/joylashuv-dalili.ts');
      return (
        b.includes("where: { id: b.id, holati: 'KUTILMOQDA' }") &&
        /* `faol: true` qo'shilishi mumkin (yopilgan e'lonni tiriltirmaslik uchun) - asosiy shart: holat bazada tekshiriladi */
        /where:\s*\{\s*id:\s*e\.id,\s*moderatsiya:\s*'KUTILMOQDA'[^}]*\}/.test(b) &&
        d.includes("where: { id: p.dalilId, holati: 'KIRITILDI' }")
      );
    },
  },
  {
    nomi: 'Йўллар 409 ва тушунтириш қайтаради',
    tekshir: () => {
      const b = oqi('src/app/api/ish-beruvchilar/route.ts');
      const d = oqi('src/app/api/ishsizlar/[id]/dalil/route.ts');
      return (
        b.includes('ziddiyatXabari(n.hozirgiHolati, n.halQilgan)') &&
        b.includes('status: n.sabab === \'topilmadi\' ? 404 : 409') &&
        d.includes('ziddiyat: true') &&
        d.includes('status: 409')
      );
    },
  },
];

async function tozala() {
  await prisma.joylashuvDalili.deleteMany({ where: { id: { in: tozalanadi.dalil } } });
  await prisma.unemployedPerson.deleteMany({ where: { id: { in: tozalanadi.ishsiz } } });
  await prisma.vacancy.deleteMany({ where: { id: { in: tozalanadi.elon } } });
  await prisma.ishBeruvchi.deleteMany({ where: { id: { in: tozalanadi.beruvchi } } });
  await prisma.user.deleteMany({ where: { id: { in: tozalanadi.user } } });
}

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
  await tozala().catch((e) => console.log('tozalashda xato:', (e as Error).message));
  console.log(`\n${SINOVLAR.length - xato}/${SINOVLAR.length} o'tdi`);
  await prisma.$disconnect().catch(() => undefined);
  process.exit(xato ? 1 : 0);
}

void main();
