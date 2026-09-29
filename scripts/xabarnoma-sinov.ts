/**
 * ============================================================
 *  ХАБАРНОМА НАВБАТИ СИНОВИ
 *
 *  Ишга тушириш:  npx tsx scripts/xabarnoma-sinov.ts
 *
 *  Контейнердан `api.telegram.org` га чиқиб бўлмайди, шунинг
 *  учун ҲАҚИҚИЙ юбориш бу ерда синалмайди — у фақат
 *  продукцияда текширилади.
 *
 *  Аммо навбат мантиқи ундан МУҲИМРОҚ ва у тўлиқ синалади:
 *  юборувчи ўрнига сохта функция берилади ва хато бўлганда
 *  хабар ЙЎҚОЛМАСЛИГИ, уриниш сони ошиши, уч мартадан кейин
 *  тўхташи текширилади.
 *
 *  Нега бу муҳимроқ: юбориш хатоси кўринади (Telegram жавоб
 *  бермади), навбат хатоси эса КЎРИНМАЙДИ — хабар шунчаки
 *  йўқолади ва ходим уни кутилганини ҳам билмайди.
 * ============================================================
 */
import { envYukla } from './env-yukla';
envYukla();

import { PrismaClient } from '@prisma/client';
import {
  ishOrniMatni,
  navbatniYubor,
  ulanishMatni,
  xabarQoshish,
  type Yuboruvchi,
} from '../src/lib/xabarnoma';

const prisma = new PrismaClient();

type Sinov = { nomi: string; tekshir: () => Promise<boolean> };

/** Sinov uchun xodim - har sinovdan keyin tozalanadi */
async function sinovXodimi(chatId: string | null) {
  const mahalla = await prisma.mahalla.findFirst({ select: { id: true } });
  return prisma.user.create({
    data: {
      username: `sinov_xabar_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      fullName: 'Sinov Xodimi',
      passwordHash: 'x',
      rol: 'YETTILIK',
      mahallaId: mahalla!.id,
      telegramChatId: chatId,
    },
    select: { id: true },
  });
}

async function tozala(userId: string) {
  await prisma.xabarnoma.deleteMany({ where: { userId } });
  await prisma.user.delete({ where: { id: userId } });
}

/**
 * Уланган ходимга ОЧИҚ эълонлар кетиши.
 *
 * ── Нега бу синов ҳақиқий базада ──
 *
 * Бу мантиқни аввал фақат МАНБАНИ ЎҚИБ текширгандим: «кодда
 * шундай сатр борми». Синов ўтарди, амалда эса ишламасди —
 * икки марта. Сабаби оддий: кодда сатр бор бўлиши уни ТЎҒРИ
 * ишлашини билдирмайди.
 *
 * Шунинг учун бу ерда ҳақиқий ёзувлар яратилади ва
 * функциянинг ЎЗИ юргизилади.
 */
async function ochiqOrinSinovi(
  tayyorla: (xodimId: string, orinId: string) => Promise<void>
): Promise<{ soni: number; xodimId: string; orinId: string }> {
  const { ulangandaOchiqOrinlar } = await import('../src/lib/ish-orni-xabari');

  const mahalla = await prisma.mahalla.findFirst({ select: { id: true } });
  const xodim = await prisma.user.create({
    data: {
      username: `sinov_orin_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      fullName: 'Sinov Xodimi',
      passwordHash: 'x',
      rol: 'YETTILIK',
      mahallaId: mahalla!.id,
      telegramChatId: `sinov-chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    },
    select: { id: true },
  });
  const orin = await prisma.vacancy.create({
    data: {
      mahallaId: mahalla!.id,
      korxonaNomi: 'Sinov korxona',
      lavozim: 'Sinov lavozim',
      ornlarSoni: 1,
      faol: true,
    },
    select: { id: true },
  });

  await tayyorla(xodim.id, orin.id);
  const soni = await ulangandaOchiqOrinlar(xodim.id);
  return { soni, xodimId: xodim.id, orinId: orin.id };
}

async function orinTozala(xodimId: string, orinId: string) {
  await prisma.xabarnoma.deleteMany({ where: { userId: xodimId } });
  await prisma.vacancy.delete({ where: { id: orinId } });
  await prisma.user.delete({ where: { id: xodimId } });
}

/* ── «Рад этди» занжири — ҳақиқий базада ── */

/**
 * ============================================================
 *  СИНОВ ЎЗ МАЪЛУМОТИНИ ЎЗИ ЯРАТАДИ
 *
 *  ── Нега бу қоида пайдо бўлди ──
 *
 *  Бу учта синов ЛОКАЛДА ўтарди ва CI'да йиқиларди. Сабаби:
 *  улар «базада раҳбар бор» деб ўйларди.
 *
 *  Локал базада бор эди — уни мен қўлда яратганман. Тоза CI
 *  базасида эса `prisma db seed` фақат 70 та МФЙ ходимини
 *  яратади, биронта раҳбар йўқ. Хабар юбориладиган одам
 *  бўлмагач, «хабар кетдими» деган текширув йиқиларди.
 *
 *  Оқибати ундан ёмонроқ бўлди: мен бир неча марта
 *  «736/736 ўтди» деб ҳисобот бердим — локалда рост, CI'да
 *  ёлғон.
 *
 *  Қоида: синов ўзига керак ҳар бир ёзувни ЎЗИ яратади ва
 *  ўзи тозалайди. Атроф-муҳитга таянган синов — синов эмас.
 * ============================================================
 */
async function rahbarYarat(rol: 'BANDLIK' | 'BANDLIK_RAHBAR' | 'HOKIM' | 'ADMIN') {
  return prisma.user.create({
    data: {
      username: `sinov_${rol.toLowerCase()}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      fullName: `Sinov ${rol}`,
      passwordHash: 'x',
      rol,
      faol: true,
    },
    select: { id: true },
  });
}

async function radSinovi(): Promise<{
  xodimId: string;
  odamId: string;
  orinId: string;
  mahallaId: string;
  rahbarId: string;
}> {
  const mahalla = await prisma.mahalla.findFirst({ select: { id: true } });

  /*
   * ХАБАРНИ ОЛАДИГАН ОДАМ.
   *
   * `FUQARO_RAD_ETDI` → BANDLIK ёки BANDLIK_RAHBAR
   * `XODIM_UZILDI`    → BANDLIK_RAHBAR ёки ADMIN
   *
   * Битта BANDLIK_RAHBAR иккаласини ҳам қоплайди.
   */
  const rahbar = await rahbarYarat('BANDLIK_RAHBAR');
  const xodim = await prisma.user.create({
    data: {
      username: `sinov_rad_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      fullName: 'Sinov Xodimi',
      passwordHash: 'x',
      rol: 'YETTILIK',
      mahallaId: mahalla!.id,
      /* Уникал: `telegramChatId` ягона майдон */
      telegramChatId: `sinov-chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    },
    select: { id: true },
  });
  const odam = await prisma.unemployedPerson.create({
    data: {
      mahallaId: mahalla!.id,
      fish: 'Sinov Fuqaro',
      jinsi: 'ERKAK',
      holati: 'ANIQLANDI',
    },
    select: { id: true },
  });
  const orin = await prisma.vacancy.create({
    data: {
      mahallaId: mahalla!.id,
      korxonaNomi: 'Sinov korxona',
      lavozim: 'Sinov lavozim',
      ornlarSoni: 1,
      faol: true,
    },
    select: { id: true },
  });
  return {
    xodimId: xodim.id,
    odamId: odam.id,
    orinId: orin.id,
    mahallaId: mahalla!.id,
    rahbarId: rahbar.id,
  };
}

async function radTozala(r: {
  xodimId: string;
  odamId: string;
  orinId: string;
  rahbarId?: string;
}) {
  await prisma.xabarnoma.deleteMany({
    where: {
      OR: [
        { bogliqId: r.odamId },
        { bogliqId: r.xodimId },
        { userId: r.xodimId },
        ...(r.rahbarId ? [{ userId: r.rahbarId }] : []),
      ],
    },
  });
  await prisma.unemployedPerson.delete({ where: { id: r.odamId } });
  await prisma.vacancy.delete({ where: { id: r.orinId } });
  await prisma.user.delete({ where: { id: r.xodimId } });
  if (r.rahbarId) await prisma.user.delete({ where: { id: r.rahbarId } }).catch(() => undefined);
}

/* ── Ботдан эълон қўйиш — тўлиқ суҳбат ── */

async function elonRahbari() {
  return prisma.user.create({
    data: {
      username: `sinov_elon_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      fullName: 'Sinov Rahbar',
      passwordHash: 'x',
      rol: 'BANDLIK_RAHBAR',
    },
    select: { id: true },
  });
}

const SINOVLAR: Sinov[] = [
  {
    /*
     * Раҳбар тизимга кирмайди — тизим ўзи айтиши керак.
     * Матнда иккала савол ҳам жавоб топиши шарт: «кеча нима
     * бўлди» ва «жами қанча».
     */
    nomi: 'Брифингда КЕЧА ва ЖАМИ бўлимлари бор',
    tekshir: async () => {
      const { brifingYasa } = await import('../src/lib/hokim-brifingi');
      const b = await brifingYasa();
      return (
        b.matn.includes('КЕЧА') &&
        b.matn.includes('ЖАМИ') &&
        b.matn.includes('ЭЪТИБОР') &&
        b.matn.includes('Хатлов қамрови')
      );
    },
  },
  {
    /*
     * Ҳар куни бир хил рўйхат чиқса, раҳбар уни ўқимай
     * қўяди — ва ўша куни ҳақиқий муаммо ҳам ўтиб кетади.
     * Шунинг учун фақат ҲАҚИҚАТАН муаммо бўлганлари ёзилади.
     */
    nomi: 'Муаммо бўлмаса «ЭЪТИБОР» бўш эмас, аниқ айтилади',
    tekshir: async () => {
      const { brifingYasa } = await import('../src/lib/hokim-brifingi');
      const b = await brifingYasa();
      /* Ҳозирги базада муаммо бор — рўйхат бўш бўлмаслиги керак */
      const bolim = b.matn.split('ЭЪТИБОР')[1] ?? '';
      return bolim.trim().length > 0;
    },
  },
  {
    nomi: 'Брифинг фақат раҳбарларга кетади, маҳалла ходимига эмас',
    tekshir: async () => {
      const { brifingniYubor } = await import('../src/lib/hokim-brifingi');

      /*
       * Иккала ТОМОН ҳам синов томонидан яратилади: хабарни
       * ОЛИШИ керак бўлган ҳоким ва ОЛМАСЛИГИ керак бўлган
       * маҳалла ходими.
       *
       * Аввал бу синов «базада раҳбар бор» деб ўйларди ва
       * тоза базада йиқиларди. Ундан ташқари у суст эди:
       * `yettilikka === 0` ҳеч ким хабар олмаганда ҳам рост
       * бўлаверарди.
       */
      const hokim = await rahbarYarat('HOKIM');
      const mahalla = await prisma.mahalla.findFirst({ select: { id: true } });
      const xodim = await prisma.user.create({
        data: {
          username: `sinov_brif_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          fullName: 'Sinov Xodimi',
          passwordHash: 'x',
          rol: 'YETTILIK',
          mahallaId: mahalla!.id,
        },
        select: { id: true },
      });

      try {
        await prisma.xabarnoma.deleteMany({ where: { turi: 'ERTALABKI_BRIFING' } });
        const soni = await brifingniYubor();

        const hokimga = await prisma.xabarnoma.count({
          where: { turi: 'ERTALABKI_BRIFING', userId: hokim.id },
        });
        const xodimga = await prisma.xabarnoma.count({
          where: { turi: 'ERTALABKI_BRIFING', userId: xodim.id },
        });

        return soni > 0 && hokimga === 1 && xodimga === 0;
      } finally {
        await prisma.xabarnoma.deleteMany({ where: { turi: 'ERTALABKI_BRIFING' } });
        await prisma.user.delete({ where: { id: hokim.id } }).catch(() => undefined);
        await prisma.user.delete({ where: { id: xodim.id } }).catch(() => undefined);
      }
    },
  },
  {
    /*
     * Cron қайта чақирилиши ОДДИЙ ҳол: Vercel жавобни
     * ололмаса қайта уринади, администратор тугмани иккинчи
     * марта босади.
     *
     * Ҳимоясиз бўлса, раҳбарнинг телефонига бир хил брифинг
     * уч марта келарди — ва у тўртинчисини умуман очмасди.
     */
    nomi: 'Брифинг бир кунда БИР МАРТА юборилади',
    tekshir: async () => {
      const { brifingniYubor } = await import('../src/lib/hokim-brifingi');
      const hokim = await rahbarYarat('HOKIM');
      try {
        await prisma.xabarnoma.deleteMany({ where: { turi: 'ERTALABKI_BRIFING' } });

        const birinchi = await brifingniYubor();
        const ikkinchi = await brifingniYubor();
        const uchinchi = await brifingniYubor();

        const hokimga = await prisma.xabarnoma.count({
          where: { turi: 'ERTALABKI_BRIFING', userId: hokim.id },
        });

        return birinchi > 0 && ikkinchi === 0 && uchinchi === 0 && hokimga === 1;
      } finally {
        await prisma.xabarnoma.deleteMany({ where: { turi: 'ERTALABKI_BRIFING' } });
        await prisma.user.delete({ where: { id: hokim.id } }).catch(() => undefined);
      }
    },
  },
  {
    /*
     * Еттита савол, кейин тасдиқлаш. Ҳар қадам базага
     * ёзилади — Telegram'да «сеанс» йўқ.
     */
    nomi: 'Ботдан эълон қўйиш — бошидан охиригача',
    tekshir: async () => {
      const B = await import('../src/lib/bot-elon');
      const r = await elonRahbari();
      const mfy = await prisma.mahalla.findFirst({ select: { nomiKirill: true } });

      await B.suhbatniBoshla(r.id);
      await B.matnliJavob(r.id, mfy!.nomiKirill);
      await B.matnliJavob(r.id, 'Sinov korxona');
      await B.matnliJavob(r.id, 'Sinov lavozim');
      await B.tugmaliJavob(r.id, `${B.ELON.ORIN}:3`);
      await B.matnliJavob(r.id, '4.5');
      await B.matnliJavob(r.id, '+998901234567');
      await B.tugmaliJavob(r.id, `${B.ELON.MUDDAT}:30`);

      const n = await B.elonniYarat(r.id);
      let ok = false;
      if (n.ok) {
        const o = await prisma.vacancy.findUnique({
          where: { id: n.id },
          select: { ornlarSoni: true, maosh: true, amalQilishMuddati: true },
        });
        /* Маош ботда млн сўмда сўралади, базада сўмда сақланади */
        ok =
          o?.ornlarSoni === 3 &&
          Number(o.maosh) === 4_500_000 &&
          o.amalQilishMuddati !== null;
        await prisma.vacancy.delete({ where: { id: n.id } });
      }
      const qoldi = await prisma.botSuhbati.count({ where: { userId: r.id } });
      await prisma.user.delete({ where: { id: r.id } });
      return ok && qoldi === 0;
    },
  },
  {
    /* Нотўғри маош қабул қилинмайди — эълон ёлғон чиқмаслиги керак */
    nomi: 'Нотўғри маош рад этилади',
    tekshir: async () => {
      const B = await import('../src/lib/bot-elon');
      const r = await elonRahbari();
      const mfy = await prisma.mahalla.findFirst({ select: { nomiKirill: true } });

      await B.suhbatniBoshla(r.id);
      await B.matnliJavob(r.id, mfy!.nomiKirill);
      await B.matnliJavob(r.id, 'Sinov korxona');
      await B.matnliJavob(r.id, 'Sinov lavozim');
      await B.tugmaliJavob(r.id, `${B.ELON.ORIN}:1`);
      await B.matnliJavob(r.id, 'juda ko\'p');

      const s = await prisma.botSuhbati.findUnique({
        where: { userId: r.id },
        select: { bosqich: true },
      });
      await prisma.botSuhbati.deleteMany({ where: { userId: r.id } });
      await prisma.user.delete({ where: { id: r.id } });
      /* Қадам ОЛДИНГА силжимаслиги керак */
      return s?.bosqich === 'maosh';
    },
  },
  {
    /* Тугалланмаган суҳбатдан эълон яратиб бўлмайди */
    nomi: 'Тўлиқ бўлмаган суҳбатдан эълон чиқмайди',
    tekshir: async () => {
      const B = await import('../src/lib/bot-elon');
      const r = await elonRahbari();
      await B.suhbatniBoshla(r.id);
      const n = await B.elonniYarat(r.id);
      await prisma.botSuhbati.deleteMany({ where: { userId: r.id } });
      await prisma.user.delete({ where: { id: r.id } });
      return !n.ok;
    },
  },
  {
    /* Бекор қилинса ҳолат ҚОЛМАСЛИГИ керак */
    nomi: 'Бекор қилинган суҳбат тозаланади',
    tekshir: async () => {
      const B = await import('../src/lib/bot-elon');
      const r = await elonRahbari();
      await B.suhbatniBoshla(r.id);
      await B.suhbatniBekorQil(r.id);
      const qoldi = await prisma.botSuhbati.count({ where: { userId: r.id } });
      await prisma.user.delete({ where: { id: r.id } });
      return qoldi === 0;
    },
  },
  {
    nomi: 'Рад этиш ёзилади ва сабаби сақланади',
    tekshir: async () => {
      const { radniYoz } = await import('../src/lib/rad-etish');
      const r = await radSinovi();
      const n = await radniYoz({
        vacancyId: r.orinId,
        ishsizId: r.odamId,
        sababBelgisi: '2',
        xabarchiId: r.xodimId,
        xabarchiMahallaId: r.mahallaId,
      });
      const odam = await prisma.unemployedPerson.findUnique({
        where: { id: r.odamId },
        select: { holati: true, radSababi: true },
      });
      const ok =
        n.ok && odam?.holati === 'RAD_ETDI' && odam.radSababi === 'Маош кам деди';
      await radTozala(r);
      return ok;
    },
  },
  {
    /*
     * Тугма белгиси Telegram'дан келади ва уни қўлда
     * ўзгартириш мумкин. Сессия эса йўқ — текширув фақат
     * кодда.
     */
    nomi: 'Бошқа маҳалла фуқаросини рад этиб БЎЛМАЙДИ',
    tekshir: async () => {
      const { radniYoz } = await import('../src/lib/rad-etish');
      const r = await radSinovi();
      const boshqa = await prisma.mahalla.findFirst({
        where: { id: { not: r.mahallaId } },
        select: { id: true },
      });
      const n = await radniYoz({
        vacancyId: r.orinId,
        ishsizId: r.odamId,
        sababBelgisi: '1',
        xabarchiId: r.xodimId,
        xabarchiMahallaId: boshqa!.id,
      });
      const odam = await prisma.unemployedPerson.findUnique({
        where: { id: r.odamId },
        select: { holati: true },
      });
      const ok = !n.ok && odam?.holati === 'ANIQLANDI';
      await radTozala(r);
      return ok;
    },
  },
  {
    nomi: 'Рад этилганда бандлик марказига хабар боради',
    tekshir: async () => {
      const { radniYoz } = await import('../src/lib/rad-etish');
      const r = await radSinovi();
      await radniYoz({
        vacancyId: r.orinId,
        ishsizId: r.odamId,
        sababBelgisi: '3',
        xabarchiId: r.xodimId,
        xabarchiMahallaId: r.mahallaId,
      });
      const soni = await prisma.xabarnoma.count({
        where: { turi: 'FUQARO_RAD_ETDI', bogliqId: r.odamId },
      });
      await radTozala(r);
      return soni > 0;
    },
  },
  {
    /*
     * Узилган ходимнинг маҳалласига эълон хабари бормайди —
     * занжир жимгина тўхтайди. Раҳбар буни ЎША КУНИ билиши
     * керак.
     */
    nomi: 'Ходим узилганда раҳбарга хабар боради',
    tekshir: async () => {
      const { uzilganiniBildir } = await import('../src/lib/rad-etish');
      const r = await radSinovi();
      const soni = await uzilganiniBildir(r.xodimId);
      const yozuv = await prisma.xabarnoma.count({
        where: { turi: 'XODIM_UZILDI', bogliqId: r.xodimId },
      });
      await radTozala(r);
      return soni > 0 && yozuv > 0;
    },
  },
  {
    /*
     * `callback_data` 64 байт билан чекланган. Иккита cuid
     * аллақачон 50 байт — чегара яқин.
     */
    nomi: 'Тугма белгилари 64 байтдан ошмайди',
    tekshir: async () => {
      const { kimRadEtdi, sababniSora } = await import('../src/lib/rad-etish');
      const r = await radSinovi();
      const k = await kimRadEtdi(r.xodimId, r.orinId);
      const s = await sababniSora(r.orinId, r.odamId);
      const eng = Math.max(
        0,
        ...k.tugmalar.map((t) => t.belgi.length),
        ...s.tugmalar.map((t) => t.belgi.length)
      );
      if (eng > 64) console.log(`     eng uzun belgi: ${eng} bayt`);
      await radTozala(r);
      return eng > 0 && eng <= 64;
    },
  },
  {
    nomi: 'Уланган ходим ўз маҳалласидаги очиқ эълонни ОЛАДИ',
    tekshir: async () => {
      const r = await ochiqOrinSinovi(async () => {});
      const bor = await prisma.xabarnoma.count({
        where: { userId: r.xodimId, turi: 'YANGI_ISH_ORNI', bogliqId: r.orinId },
      });
      await orinTozala(r.xodimId, r.orinId);
      return r.soni >= 1 && bor === 1;
    },
  },
  {
    /*
     * ЭНГ МУҲИМ СИНОВ.
     *
     * Эълон қўйилганда ходим уланмаган бўлса, хабар ясалиб
     * кейин БЕКОР қилинади. Ходим уни ҳеч қачон олмаган.
     * Код эса уни «аллақачон кетган» деб ўтказиб юборарди —
     * ва айнан шу сабабдан ҳеч нарса келмасди.
     */
    nomi: 'БЕКОР қилинган хабар «юборилган» деб ҳисобланмайди',
    tekshir: async () => {
      const r = await ochiqOrinSinovi(async (xodimId, orinId) => {
        await prisma.xabarnoma.create({
          data: {
            userId: xodimId,
            turi: 'YANGI_ISH_ORNI',
            holati: 'BEKOR',
            matn: 'eski',
            bogliqTuri: 'Vacancy',
            bogliqId: orinId,
          },
        });
      });
      const yangi = await prisma.xabarnoma.count({
        where: {
          userId: r.xodimId,
          turi: 'YANGI_ISH_ORNI',
          holati: 'KUTILMOQDA',
          bogliqId: r.orinId,
        },
      });
      await orinTozala(r.xodimId, r.orinId);
      return yangi === 1;
    },
  },
  {
    /* Ҳақиқатан кетган хабар эса ҚАЙТА юборилмайди */
    nomi: 'ЮБОРИЛГАН хабар қайта юборилмайди',
    tekshir: async () => {
      const r = await ochiqOrinSinovi(async (xodimId, orinId) => {
        await prisma.xabarnoma.create({
          data: {
            userId: xodimId,
            turi: 'YANGI_ISH_ORNI',
            holati: 'YUBORILDI',
            matn: 'eski',
            bogliqTuri: 'Vacancy',
            bogliqId: orinId,
            yuborilganSana: new Date(),
          },
        });
      });
      const yangi = await prisma.xabarnoma.count({
        where: {
          userId: r.xodimId,
          turi: 'YANGI_ISH_ORNI',
          holati: 'KUTILMOQDA',
          bogliqId: r.orinId,
        },
      });
      await orinTozala(r.xodimId, r.orinId);
      return yangi === 0;
    },
  },
  {
    /* Уланмаган ходимга юборадиган жой йўқ */
    nomi: 'Уланмаган ходимга хабар ясалмайди',
    tekshir: async () => {
      const r = await ochiqOrinSinovi(async (xodimId) => {
        await prisma.user.update({
          where: { id: xodimId },
          data: { telegramChatId: null },
        });
      });
      await orinTozala(r.xodimId, r.orinId);
      return r.soni === 0;
    },
  },
  {
    nomi: 'Хабар навбатга тушади',
    tekshir: async () => {
      const x = await sinovXodimi('111');
      const n = await xabarQoshish([
        { userId: x.id, turi: 'YANGI_ISH_ORNI', matn: 'sinov' },
      ]);
      const bor = await prisma.xabarnoma.count({ where: { userId: x.id, holati: 'KUTILMOQDA' } });
      await tozala(x.id);
      return n === 1 && bor === 1;
    },
  },
  {
    nomi: 'Муваффақиятли юборилса — ЮБОРИЛДИ, сана ёзилади',
    tekshir: async () => {
      const x = await sinovXodimi('111');
      await xabarQoshish([{ userId: x.id, turi: 'YANGI_ISH_ORNI', matn: 'sinov' }]);
      const ok: Yuboruvchi = async () => {};
      const n = await navbatniYubor(ok);
      const xabar = await prisma.xabarnoma.findFirst({ where: { userId: x.id } });
      const natija =
        n.yuborildi >= 1 &&
        xabar?.holati === 'YUBORILDI' &&
        xabar.yuborilganSana !== null &&
        xabar.urinishlar === 1;
      await tozala(x.id);
      return natija;
    },
  },
  {
    /*
     * Энг муҳим синов. Telegram жавоб бермаса, хабар
     * ЙЎҚОЛМАСЛИГИ керак — у навбатда қолади ва кейинги
     * ишга туширишда яна уринилади.
     */
    nomi: 'Хато бўлса хабар ЙЎҚОЛМАЙДИ — навбатда қолади',
    tekshir: async () => {
      const x = await sinovXodimi('111');
      await xabarQoshish([{ userId: x.id, turi: 'YANGI_ISH_ORNI', matn: 'sinov' }]);
      const yiqiladi: Yuboruvchi = async () => {
        throw new Error('Telegram javob bermadi');
      };
      await navbatniYubor(yiqiladi);
      const xabar = await prisma.xabarnoma.findFirst({ where: { userId: x.id } });
      const natija =
        xabar?.holati === 'KUTILMOQDA' &&
        xabar.urinishlar === 1 &&
        (xabar.xatoMatni ?? '').includes('javob bermadi');
      await tozala(x.id);
      return natija;
    },
  },
  {
    nomi: 'Уч мартадан кейин ХАТО бўлади — чексиз уринмайди',
    tekshir: async () => {
      const x = await sinovXodimi('111');
      await xabarQoshish([{ userId: x.id, turi: 'YANGI_ISH_ORNI', matn: 'sinov' }]);
      const yiqiladi: Yuboruvchi = async () => {
        throw new Error('bot bloklangan');
      };
      await navbatniYubor(yiqiladi);
      await navbatniYubor(yiqiladi);
      await navbatniYubor(yiqiladi);
      const xabar = await prisma.xabarnoma.findFirst({ where: { userId: x.id } });
      /* Тўртинчи марта умуман олинмайди */
      const tortinchi = await navbatniYubor(yiqiladi);
      const natija =
        xabar?.holati === 'XATO' && xabar.urinishlar === 3 && tortinchi.korildi === 0;
      await tozala(x.id);
      return natija;
    },
  },
  {
    /*
     * Боғламаган ходим «хато» эмас, «бекор». Фарқи муҳим:
     * хато тузатилиши керак, боғламаган ходим эса шунчаки
     * боғламаган. Иккови бир хил кўринса, администратор
     * ҳақиқий хатони топа олмасди.
     */
    nomi: 'Telegram боғланмаган ходим — БЕКОР, хато эмас',
    tekshir: async () => {
      const x = await sinovXodimi(null);
      await xabarQoshish([{ userId: x.id, turi: 'YANGI_ISH_ORNI', matn: 'sinov' }]);
      const n = await navbatniYubor(async () => {});
      const xabar = await prisma.xabarnoma.findFirst({ where: { userId: x.id } });
      const natija =
        xabar?.holati === 'BEKOR' && n.ulanmagan >= 1 && n.xato === 0;
      await tozala(x.id);
      return natija;
    },
  },
  {
    nomi: 'Юборилган хабар қайта юборилмайди',
    tekshir: async () => {
      const x = await sinovXodimi('111');
      await xabarQoshish([{ userId: x.id, turi: 'YANGI_ISH_ORNI', matn: 'sinov' }]);
      await navbatniYubor(async () => {});
      let ikkinchiMarta = 0;
      await navbatniYubor(async () => {
        ikkinchiMarta++;
      });
      await tozala(x.id);
      return ikkinchiMarta === 0;
    },
  },
  {
    nomi: 'Бўш рўйхат хато бермайди',
    tekshir: async () => (await xabarQoshish([])) === 0,
  },

  /* ── Матн ── */
  {
    /*
     * Telegram — ТАШҚИ хизмат ва хабар унинг серверида
     * қолади. Шунинг учун хабарда исм-фамилия ва телефон
     * БЎЛМАСЛИГИ керак: фақат сон айтилади, қолгани
     * иловада рухсат текширилган ҳолда кўринади.
     */
    nomi: 'Иш ўрни хабарида ШАХСИЙ маълумот йўқ',
    tekshir: async () => {
      const m = ishOrniMatni({
        lavozim: 'Dasturchi',
        korxonaNomi: 'Xatirchi IT',
        mahallaNomi: 'Бахшижар',
        bosh: 3,
        nomzodlar: 4,
      });
      /* Сон бор, аммо телефон рақами ва «Ф.И.Ш.» йўқ */
      return m.includes('4 та') && !/\+998/.test(m) && !/\d{9}/.test(m);
    },
  },
  {
    nomi: 'Номзод топилмаса ҳам хабар мазмунли',
    tekshir: async () => {
      const m = ishOrniMatni({
        lavozim: 'Dasturchi',
        korxonaNomi: 'Xatirchi IT',
        mahallaNomi: 'Бахшижар',
        bosh: 3,
        nomzodlar: 0,
      });
      return m.includes('топилмади') && m.length > 50;
    },
  },
  {
    /*
     * Корхона номида `<` ёки `&` бўлса, Telegram HTML ни
     * нотўғри ўқийди ва хабарни умуман юбормайди.
     */
    nomi: 'HTML белгилари хавфсизлантирилади',
    tekshir: async () => {
      const m = ishOrniMatni({
        lavozim: '<b>xato</b>',
        korxonaNomi: 'A & B',
        mahallaNomi: 'X',
        bosh: 1,
        nomzodlar: 1,
      });
      return m.includes('&lt;b&gt;') && m.includes('A &amp; B');
    },
  },
  {
    nomi: 'Уланиш хабарида ходим исми бор',
    tekshir: async () => ulanishMatni('Aliyev Anvar').includes('Aliyev Anvar'),
  },
];

async function main() {
  let xato = 0;
  for (const s of SINOVLAR) {
    let ok = false;
    try {
      ok = await s.tekshir();
    } catch (e) {
      ok = false;
      console.log(`     xatolik: ${(e as Error).message}`);
    }
    if (!ok) xato++;
    console.log(`${ok ? 'OK  ' : 'XATO'} ${s.nomi}`);
  }
  console.log(`\n${SINOVLAR.length - xato}/${SINOVLAR.length} o'tdi`);
  await prisma.$disconnect();
  process.exit(xato ? 1 : 0);
}

main();
