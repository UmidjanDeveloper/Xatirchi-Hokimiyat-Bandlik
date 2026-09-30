/**
 * ============================================================
 *  ИШГА ЖОЙЛАШИШ ВОҚЕАСИ ва ДАЛИЛНИНГ ИШОНЧЛИЛИГИ — СИНОВ
 *
 *  Ишга тушириш:  npx tsx scripts/joylashish-sinov.ts
 *
 *  ── Иккита нуқсон ──
 *
 *  1. ДАЛИЛ ОДАМГА боғланган эди, ишга эмас:
 *
 *       2024: «Оқ Олтин МЧЖ» — шартнома, ТАСДИҚЛАНДИ
 *       2025: ишдан чиқди, «Янги Йўл МЧЖ» га кирди
 *
 *     Иккинчи иш учун далил йўқ эди-ю, одамда «тасдиқланган
 *     далил бор» бўлиб турарди. ЭСКИ далил ЯНГИ ишни
 *     тасдиқлаб қўярди.
 *
 *  2. ҚЎЛДА ЮКЛАНГАН файлдан келган ёзув ДАРҲОЛ
 *     «тасдиқланган» бўларди — худди текширилган
 *     интеграциядан келгандек.
 *
 *  Иккови ҳам ҳокимликнинг ЭНГ МУҲИМ рақамига таъсир
 *  қилади. Шунинг учун синовларнинг ярми — «тасдиқланган»
 *  деб ҲИСОБЛАМАСЛИК ҳақида.
 * ============================================================
 */
import { envYukla } from './env-yukla';
envYukla();

import { readFileSync } from 'node:fs';
import { PrismaClient } from '@prisma/client';
import {
  manbaTuriTaxmin,
  ozidanTasdiqmi,
  tasdiqDarajasi,
  tasdiqSanaladimi,
} from '../src/lib/dalil-ishonchi';
import { MANBA_ISHONCHI, TASDIQ_DARAJASI_NOMI } from '../src/lib/dalil-nomlari';
import {
  YANGI_ISHGA_OTDI,
  bogliqsizDalillar,
  dalilniBoglash,
  joriyJoylashish,
  joylashishTarixi,
  joylashishYozib,
  joylashishniTugat,
  korxonaIzi,
} from '../src/lib/joylashish';
import {
  dalilQoshish,
  dalilniHalQil,
  odamTasdigi,
  tasdiqHisobi,
  tasdiqsizlar,
} from '../src/lib/joylashuv-dalili';

const prisma = new PrismaClient();

type Sinov = { nomi: string; tekshir: () => Promise<boolean> };

let mahallaId = '';
let xodimId = '';
let tekshiruvchiId = '';
const tozalanadi: string[] = [];

/** Изоҳларсиз код — изоҳдаги сўз текширувни алдамасин */
const kodiOl = (m: string) =>
  m.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const noyob = (asos: string) => `${asos} ${Date.now()}${Math.floor(Math.random() * 1000)}`;

async function tayyorla() {
  const m = await prisma.mahalla.findFirst({ select: { id: true } });
  if (!m) throw new Error('bazada mahalla yoq — avval `prisma db seed`');
  mahallaId = m.id;

  const x = await prisma.user.create({
    data: {
      username: `sinov_joyl_${Date.now()}`,
      fullName: 'Sinov Mutaxassis',
      passwordHash: 'x',
      rol: 'BANDLIK',
      mahallaId,
    },
    select: { id: true },
  });
  xodimId = x.id;

  const t = await prisma.user.create({
    data: {
      username: `sinov_joyl_tekshiruvchi_${Date.now()}`,
      fullName: 'Sinov Tekshiruvchi',
      passwordHash: 'x',
      rol: 'BANDLIK_RAHBAR',
      faol: true,
    },
    select: { id: true },
  });
  tekshiruvchiId = t.id;
}

async function tozala() {
  if (tozalanadi.length > 0) {
    await prisma.joylashuvDalili.deleteMany({ where: { ishsizId: { in: tozalanadi } } });
    await prisma.ishgaJoylashish.deleteMany({ where: { ishsizId: { in: tozalanadi } } });
    await prisma.unemployedPerson.deleteMany({ where: { id: { in: tozalanadi } } });
  }
  await prisma.user.deleteMany({ where: { id: { in: [xodimId, tekshiruvchiId] } } });
}

async function fuqaroYarat(p: { fish: string; ishJoyi?: string | null }) {
  const f = await prisma.unemployedPerson.create({
    data: {
      fish: p.fish,
      jinsi: 'ERKAK',
      mahallaId,
      holati: 'JOYLASHTIRILDI',
      ishJoyi: p.ishJoyi ?? null,
      tugilganSana: new Date(Date.UTC(1990, 4, 12)),
    },
    select: { id: true },
  });
  tozalanadi.push(f.id);
  return f.id;
}

const SANA = (y: number, o: number, k: number) => new Date(Date.UTC(y, o, k));

const SINOVLAR: Sinov[] = [
  /* ────────────────────────────────────────────────────────
   *  1. ИШОНЧ ҚОИДАСИ — база керак эмас
   * ──────────────────────────────────────────────────────── */
  {
    nomi: 'ФАҚАТ расмий интеграция ЎЗИ тасдиқ',
    tekshir: async () =>
      ozidanTasdiqmi('RASMIY_INTEGRATSIYA') &&
      !ozidanTasdiqmi('QOLDA_REYESTR') &&
      !ozidanTasdiqmi('QOLDA_HUJJAT') &&
      !ozidanTasdiqmi('XODIM_BILDIRDI'),
  },
  {
    /*
     * Тахмин ЭҲТИЁТКОР томонга оғиши керак. «Расмий» деб
     * тахмин қилинса, қоида ўзининг тешигини ясаган бўларди.
     */
    nomi: 'Тахмин ҲЕЧ ҚАЧОН «расмий» деб чиқмайди',
    tekshir: async () => {
      const turlar = ['REYESTR', 'SHARTNOMA', 'BUYRUQ', 'ISH_BERUVCHI', 'MAHALLA'] as const;
      return turlar.every((t) => !ozidanTasdiqmi(manbaTuriTaxmin(t)));
    },
  },
  {
    nomi: 'Реестр — қўлда кўчирма, маҳалла — ходимнинг гапи',
    tekshir: async () =>
      manbaTuriTaxmin('REYESTR') === 'QOLDA_REYESTR' &&
      manbaTuriTaxmin('MAHALLA') === 'XODIM_BILDIRDI' &&
      manbaTuriTaxmin('SHARTNOMA') === 'QOLDA_HUJJAT',
  },
  {
    nomi: 'Далил йўқ — «далилсиз»',
    tekshir: async () => tasdiqDarajasi([]) === 'DALILSIZ',
  },
  {
    nomi: 'Расмий тасдиқ энг юқори даража',
    tekshir: async () =>
      tasdiqDarajasi([
        { turi: 'REYESTR', holati: 'TASDIQLANDI', manbaTuri: 'RASMIY_INTEGRATSIYA' },
      ]) === 'RASMIY',
  },
  {
    nomi: 'Қўлда текширилган тасдиқ АЖРАТИБ кўрсатилади',
    tekshir: async () =>
      tasdiqDarajasi([
        { turi: 'REYESTR', holati: 'TASDIQLANDI', manbaTuri: 'QOLDA_REYESTR' },
      ]) === 'QOLDA_TASDIQ',
  },
  {
    /*
     * Битта расмий тасдиқ ўнта қўлда тасдиқдан кучли,
     * аксинчаси эмас.
     */
    nomi: 'Аралаш бўлса — ЭНГ ИШОНЧЛИ манба олинади',
    tekshir: async () =>
      tasdiqDarajasi([
        { turi: 'MAHALLA', holati: 'TASDIQLANDI', manbaTuri: 'XODIM_BILDIRDI' },
        { turi: 'REYESTR', holati: 'TASDIQLANDI', manbaTuri: 'RASMIY_INTEGRATSIYA' },
        { turi: 'SHARTNOMA', holati: 'TASDIQLANDI', manbaTuri: 'QOLDA_HUJJAT' },
      ]) === 'RASMIY',
  },
  {
    nomi: 'Киритилган-у текширилмаган — «кутилмоқда»',
    tekshir: async () =>
      tasdiqDarajasi([
        { turi: 'SHARTNOMA', holati: 'KIRITILDI', manbaTuri: 'QOLDA_HUJJAT' },
      ]) === 'KUTILMOQDA',
  },
  {
    /*
     * ── ЭНГ МУҲИМ АЖРАТИШ ──
     *
     * Рад этилган далил «далил йўқ» дан ЁМОНРОҚ: у «далил
     * ёлғон чиқди» дегани. Аввал иккови бир хил кўринарди
     * ва рад этилган ёзув шунчаки «ҳужжат кутилмоқда»
     * бўлиб ётаверарди.
     */
    nomi: 'РАД ЭТИЛГАН далил «далилсиз» деб кўрсатилмайди',
    tekshir: async () => {
      const d = tasdiqDarajasi([
        { turi: 'SHARTNOMA', holati: 'RAD_ETILDI', manbaTuri: 'QOLDA_HUJJAT' },
      ]);
      /* «далилсиз» ЭМАС: рад этилган далил бошқа нарса */
      return d === 'RAD_ETILGAN' && !tasdiqSanaladimi(d);
    },
  },
  {
    nomi: 'Фақат ходимнинг гапи — далил эмас, хабар',
    tekshir: async () => {
      const d = tasdiqDarajasi([
        { turi: 'MAHALLA', holati: 'KIRITILDI', manbaTuri: 'XODIM_BILDIRDI' },
      ]);
      return d === 'FAQAT_XODIM' && !tasdiqSanaladimi(d);
    },
  },
  {
    nomi: 'Ҳисобга ФАҚАТ тасдиқланган икки даража киради',
    tekshir: async () =>
      tasdiqSanaladimi('RASMIY') &&
      tasdiqSanaladimi('QOLDA_TASDIQ') &&
      !tasdiqSanaladimi('KUTILMOQDA') &&
      !tasdiqSanaladimi('FAQAT_XODIM') &&
      !tasdiqSanaladimi('RAD_ETILGAN') &&
      !tasdiqSanaladimi('DALILSIZ'),
  },
  {
    nomi: 'Ҳар даражанинг экранда номи бор',
    tekshir: async () =>
      Object.values(TASDIQ_DARAJASI_NOMI).every((n) => n.length > 3) &&
      MANBA_ISHONCHI.RASMIY_INTEGRATSIYA > MANBA_ISHONCHI.QOLDA_REYESTR &&
      MANBA_ISHONCHI.QOLDA_REYESTR > MANBA_ISHONCHI.XODIM_BILDIRDI,
  },

  /* ────────────────────────────────────────────────────────
   *  2. ВОҚЕА ЁЗИЛИШИ
   * ──────────────────────────────────────────────────────── */
  {
    nomi: 'Корхона изи — катта-кичик ҳарф ва бўшлиқ аҳамиятсиз',
    tekshir: async () =>
      korxonaIzi('  Oq Oltin   MCHJ ') === korxonaIzi('oq oltin mchj') &&
      korxonaIzi('Oq Oltin') !== korxonaIzi('Yangi Yol'),
  },
  {
    nomi: 'Биринчи сақлашда воқеа яратилади',
    tekshir: async () => {
      const id = await fuqaroYarat({ fish: noyob('Voqea Bir') });
      const n = await joylashishYozib({
        ishsizId: id,
        korxonaNomi: 'Оқ Олтин МЧЖ',
        boshlanganSana: SANA(2024, 0, 15),
        kiritganId: xodimId,
      });
      const joriy = await joriyJoylashish(id);
      return (
        n.yangi &&
        n.oldingisiYopildi === null &&
        joriy?.id === n.id &&
        joriy.korxonaNomi === 'Оқ Олтин МЧЖ' &&
        /* Бошланғич ҳолат — `NOMALUM`, «ишлаяпти» ЭМАС */
        joriy.holati === 'NOMALUM'
      );
    },
  },
  {
    /*
     * Анкета ўн марта сақланади. Ҳар сақлашда янги воқеа
     * яратилса, битта иш ўнта бўлиб кўринарди.
     */
    nomi: 'ЎША корхона — янги воқеа ЯРАТИЛМАЙДИ',
    tekshir: async () => {
      const id = await fuqaroYarat({ fish: noyob('Voqea Takror') });
      const a = await joylashishYozib({
        ishsizId: id,
        korxonaNomi: 'Оқ Олтин МЧЖ',
        boshlanganSana: SANA(2024, 0, 15),
      });
      const b = await joylashishYozib({
        ishsizId: id,
        korxonaNomi: '  оқ олтин   мчж  ',
        boshlanganSana: SANA(2024, 0, 15),
      });
      const tarix = await joylashishTarixi(id);
      return a.id === b.id && !b.yangi && tarix.length === 1;
    },
  },
  {
    nomi: 'Бўш майдонлар кейинги сақлашда тўлдирилади',
    tekshir: async () => {
      const id = await fuqaroYarat({ fish: noyob('Voqea Toldirish') });
      await joylashishYozib({
        ishsizId: id,
        korxonaNomi: 'Оқ Олтин МЧЖ',
        boshlanganSana: SANA(2024, 5, 1),
      });
      await joylashishYozib({
        ishsizId: id,
        korxonaNomi: 'Оқ Олтин МЧЖ',
        lavozim: 'Оператор',
        /* Аниқроқ сана одатда ЭРТАРОҚ бўлади */
        boshlanganSana: SANA(2024, 4, 20),
      });
      const joriy = await joriyJoylashish(id);
      return (
        joriy?.lavozim === 'Оператор' &&
        joriy.boshlanganSana.getTime() === SANA(2024, 4, 20).getTime()
      );
    },
  },
  {
    nomi: 'Корхона АЛМАШСА — эскиси ёпилади, янгиси яратилади',
    tekshir: async () => {
      const id = await fuqaroYarat({ fish: noyob('Ish Almashdi') });
      const a = await joylashishYozib({
        ishsizId: id,
        korxonaNomi: 'Оқ Олтин МЧЖ',
        boshlanganSana: SANA(2024, 0, 15),
      });
      const b = await joylashishYozib({
        ishsizId: id,
        korxonaNomi: 'Янги Йўл МЧЖ',
        boshlanganSana: SANA(2025, 2, 3),
      });

      const tarix = await joylashishTarixi(id);
      const eski = tarix.find((t) => t.id === a.id);
      const yangi = tarix.find((t) => t.id === b.id);

      return (
        b.yangi &&
        b.oldingisiYopildi === a.id &&
        tarix.length === 2 &&
        /* Эскиси ЁПИЛДИ — аммо ЎЧИРИЛМАДИ */
        eski?.tugaganSana?.getTime() === SANA(2025, 2, 3).getTime() &&
        eski.tugashSababi === YANGI_ISHGA_OTDI &&
        eski.holati === 'TUGADI' &&
        yangi?.tugaganSana === null
      );
    },
  },
  {
    nomi: 'Бир вақтда ФАҚАТ БИТТА очиқ воқеа қолади',
    tekshir: async () => {
      const id = await fuqaroYarat({ fish: noyob('Bitta Ochiq') });
      for (const nom of ['Корхона А', 'Корхона Б', 'Корхона В']) {
        await joylashishYozib({ ishsizId: id, korxonaNomi: nom, boshlanganSana: new Date() });
      }
      const ochiqlar = await prisma.ishgaJoylashish.count({
        where: { ishsizId: id, tugaganSana: null },
      });
      return ochiqlar === 1;
    },
  },
  {
    /*
     * Кечиккан киритиш: янги ишнинг санаси эскисидан
     * ИЛГАРИ. Манфий муддат чиқмаслиги керак.
     */
    nomi: 'Тескари сана манфий муддат ясамайди',
    tekshir: async () => {
      const id = await fuqaroYarat({ fish: noyob('Teskari Sana') });
      const a = await joylashishYozib({
        ishsizId: id,
        korxonaNomi: 'Корхона А',
        boshlanganSana: SANA(2025, 5, 1),
      });
      await joylashishYozib({
        ishsizId: id,
        korxonaNomi: 'Корхона Б',
        boshlanganSana: SANA(2024, 5, 1),
      });
      const eski = await prisma.ishgaJoylashish.findUnique({
        where: { id: a.id },
        select: { boshlanganSana: true, tugaganSana: true },
      });
      return (
        eski!.tugaganSana !== null && eski!.tugaganSana >= eski!.boshlanganSana
      );
    },
  },
  {
    nomi: 'Бўш корхона номи билан воқеа ёзилмайди',
    tekshir: async () => {
      const id = await fuqaroYarat({ fish: noyob('Bosh Nom') });
      try {
        await joylashishYozib({ ishsizId: id, korxonaNomi: '   ', boshlanganSana: new Date() });
        return false;
      } catch {
        return (await joylashishTarixi(id)).length === 0;
      }
    },
  },

  /* ────────────────────────────────────────────────────────
   *  3. ЭНГ МУҲИМ НУҚСОН: ЭСКИ ДАЛИЛ ЯНГИ ИШНИ ТАСДИҚЛАРДИ
   * ──────────────────────────────────────────────────────── */
  {
    /*
     * ── ҚАЙТА ҲОСИЛ ҚИЛИШ ──
     *
     * 2024: «Оқ Олтин МЧЖ», шартнома ТАСДИҚЛАНДИ
     * 2025: ишдан чиқди, «Янги Йўл МЧЖ» га кирди
     *
     * Иккинчи иш учун ҳеч қандай далил йўқ. Аввал тизим
     * «тасдиқланган» деб турарди.
     */
    nomi: 'ЭСКИ ишнинг далили ЯНГИ ишни тасдиқламайди',
    tekshir: async () => {
      const id = await fuqaroYarat({ fish: noyob('Eski Dalil') });

      const eskiIsh = await joylashishYozib({
        ishsizId: id,
        korxonaNomi: 'Оқ Олтин МЧЖ',
        boshlanganSana: SANA(2024, 0, 15),
      });
      const d = await dalilQoshish({
        ishsizId: id,
        turi: 'SHARTNOMA',
        joylashishId: eskiIsh.id,
        kiritganId: xodimId,
      });
      await dalilniHalQil({ dalilId: d.id, userId: tekshiruvchiId, tasdiqlandi: true });

      /* Шу ерда ҳамма нарса жойида */
      const oldin = await odamTasdigi(id);
      if (!oldin.joriyIshTasdiqlangan) return false;

      /* Иш алмашди — далил эса эски ишда қолди */
      await joylashishYozib({
        ishsizId: id,
        korxonaNomi: 'Янги Йўл МЧЖ',
        boshlanganSana: SANA(2025, 2, 3),
      });

      const keyin = await odamTasdigi(id);
      return (
        /* ── АСОСИЙ ШАРТ ── ҳозирги иш тасдиқланмаган */
        keyin.joriyIshTasdiqlangan === false &&
        keyin.daraja === 'DALILSIZ' &&
        !keyin.sanaladi &&
        /* Тарих ЙЎҚОЛМАДИ: эски тасдиқ жойида */
        keyin.tasdiqlangan === true &&
        keyin.engKuchli === 'SHARTNOMA'
      );
    },
  },
  {
    nomi: 'Янги ишга ЎЗ далили келса — яна тасдиқланади',
    tekshir: async () => {
      const id = await fuqaroYarat({ fish: noyob('Yangi Dalil') });
      await joylashishYozib({
        ishsizId: id,
        korxonaNomi: 'Оқ Олтин МЧЖ',
        boshlanganSana: SANA(2024, 0, 15),
      });
      const yangiIsh = await joylashishYozib({
        ishsizId: id,
        korxonaNomi: 'Янги Йўл МЧЖ',
        boshlanganSana: SANA(2025, 2, 3),
      });
      const d = await dalilQoshish({
        ishsizId: id,
        turi: 'BUYRUQ',
        joylashishId: yangiIsh.id,
        kiritganId: xodimId,
      });
      await dalilniHalQil({ dalilId: d.id, userId: tekshiruvchiId, tasdiqlandi: true });

      const t = await odamTasdigi(id);
      return t.joriyIshTasdiqlangan && t.daraja === 'QOLDA_TASDIQ' && t.sanaladi;
    },
  },
  {
    nomi: 'Воқеага боғланмаган далил АЛОҲИДА белгиланади',
    tekshir: async () => {
      const id = await fuqaroYarat({ fish: noyob('Bogliqsiz') });
      await joylashishYozib({
        ishsizId: id,
        korxonaNomi: 'Оқ Олтин МЧЖ',
        boshlanganSana: SANA(2024, 0, 15),
      });
      const d = await dalilQoshish({
        ishsizId: id,
        turi: 'SHARTNOMA',
        /* Эски ёзувлардаги ҳол: қайси ишга тегишли — ёзилмаган */
        joylashishId: null,
        kiritganId: xodimId,
      });
      await dalilniHalQil({ dalilId: d.id, userId: tekshiruvchiId, tasdiqlandi: true });

      const t = await odamTasdigi(id);
      return (
        t.tasdiqlangan &&
        t.bogliqsizTasdiq === true &&
        /* Боғланмагани ҳозирги ишни тасдиқламайди */
        t.joriyIshTasdiqlangan === false
      );
    },
  },
  {
    nomi: 'Боғланмаган далил ЎЗИ боғланиб қолмайди',
    tekshir: async () => {
      const id = await fuqaroYarat({ fish: noyob('Ozi Boglanmaydi') });
      await joylashishYozib({
        ishsizId: id,
        korxonaNomi: 'Оқ Олтин МЧЖ',
        boshlanganSana: SANA(2024, 0, 15),
      });
      const d = await dalilQoshish({ ishsizId: id, turi: 'SHARTNOMA', kiritganId: xodimId });

      const royxat = await bogliqsizDalillar(500);
      const meniki = royxat.find((r) => r.dalilId === d.id);

      const hozir = await prisma.joylashuvDalili.findUnique({
        where: { id: d.id },
        select: { joylashishId: true },
      });

      return (
        /* Рўйхатда кўринади ва ТАКЛИФ бор */
        meniki !== undefined &&
        meniki.taklif !== null &&
        meniki.ishlarSoni === 1 &&
        /* Аммо базада ҲАМОН боғланмаган — тахмин қилинмади */
        hozir?.joylashishId === null
      );
    },
  },
  {
    nomi: 'Қўлда боғлаш ишлайди ва изини қолдиради',
    tekshir: async () => {
      const id = await fuqaroYarat({ fish: noyob('Qolda Boglash') });
      const ish = await joylashishYozib({
        ishsizId: id,
        korxonaNomi: 'Оқ Олтин МЧЖ',
        boshlanganSana: SANA(2024, 0, 15),
      });
      const d = await dalilQoshish({ ishsizId: id, turi: 'SHARTNOMA', kiritganId: xodimId });

      const n = await dalilniBoglash({ dalilId: d.id, joylashishId: ish.id });
      const keyin = await prisma.joylashuvDalili.findUnique({
        where: { id: d.id },
        select: { joylashishId: true, izoh: true },
      });

      return (
        n.ok &&
        keyin?.joylashishId === ish.id &&
        (keyin.izoh ?? '').includes('Оқ Олтин МЧЖ')
      );
    },
  },
  {
    /*
     * БОШҚА одамнинг ишига боғланган далил — энг ёмон хато:
     * у иккита рақамни бирданига бузади.
     */
    nomi: 'БОШҚА одамнинг ишига боғлаб бўлмайди',
    tekshir: async () => {
      const a = await fuqaroYarat({ fish: noyob('Egasi A') });
      const b = await fuqaroYarat({ fish: noyob('Egasi B') });
      const ishB = await joylashishYozib({
        ishsizId: b,
        korxonaNomi: 'Бегона Корхона',
        boshlanganSana: new Date(),
      });
      const dalilA = await dalilQoshish({ ishsizId: a, turi: 'SHARTNOMA', kiritganId: xodimId });

      const n = await dalilniBoglash({ dalilId: dalilA.id, joylashishId: ishB.id });
      const keyin = await prisma.joylashuvDalili.findUnique({
        where: { id: dalilA.id },
        select: { joylashishId: true },
      });
      return !n.ok && n.sabab === 'boshqa-odam' && keyin?.joylashishId === null;
    },
  },
  {
    /*
     * Икки мутахассис рўйхатни бир вақтда очиб турибди ва
     * ҳар бири БОШҚА ишга боғлайди. Иккинчисига «аллақачон»
     * дейилиши керак, биринчисининг қарори ўчиб кетмаслиги
     * керак.
     */
    nomi: 'Параллел боғлаш — фақат биттаси ўтади',
    tekshir: async () => {
      const id = await fuqaroYarat({ fish: noyob('Parallel Boglash') });
      const bir = await joylashishYozib({
        ishsizId: id,
        korxonaNomi: 'Корхона А',
        boshlanganSana: SANA(2024, 0, 1),
      });
      const ikki = await joylashishYozib({
        ishsizId: id,
        korxonaNomi: 'Корхона Б',
        boshlanganSana: SANA(2025, 0, 1),
      });
      const d = await dalilQoshish({ ishsizId: id, turi: 'SHARTNOMA', kiritganId: xodimId });

      const [x, y] = await Promise.all([
        dalilniBoglash({ dalilId: d.id, joylashishId: bir.id }),
        dalilniBoglash({ dalilId: d.id, joylashishId: ikki.id }),
      ]);

      const otgan = [x, y].filter((r) => r.ok).length;
      const keyin = await prisma.joylashuvDalili.findUnique({
        where: { id: d.id },
        select: { joylashishId: true },
      });

      return (
        otgan === 1 &&
        (keyin?.joylashishId === bir.id || keyin?.joylashishId === ikki.id) &&
        [x, y].some((r) => !r.ok && r.sabab === 'allaqachon')
      );
    },
  },

  {
    /*
     * ── ЭНГ ЯШИРИН ОҚИБАТ ──
     *
     * `tasdiqsizlar` рўйхати айнан шу бўшлиқни ёпиши керак
     * эди, аммо ўзи ҳам «далил ОДАМГА боғланган» деб
     * ҳисоблар эди:
     *
     *     dalillar: { none: { holati: 'TASDIQLANDI' } }
     *
     * Яъни иш алмаштирган одам рўйхатга УМУМАН тушмасди ва
     * янги иши абадий ҳужжатсиз қолаверарди.
     */
    nomi: 'Иш алмаштирган одам ИШ РЎЙХАТИДА қолади',
    tekshir: async () => {
      const id = await fuqaroYarat({ fish: noyob('Royxatda Qolsin') });
      /* Муддат ўтган бўлиши учун эски сана */
      await prisma.unemployedPerson.update({
        where: { id },
        data: { ishgaKirganSana: SANA(2024, 0, 15), ishJoyi: 'Янги Йўл МЧЖ' },
      });

      const eski = await joylashishYozib({
        ishsizId: id,
        korxonaNomi: 'Оқ Олтин МЧЖ',
        boshlanganSana: SANA(2024, 0, 15),
      });
      const d = await dalilQoshish({
        ishsizId: id,
        turi: 'SHARTNOMA',
        joylashishId: eski.id,
        kiritganId: xodimId,
      });
      await dalilniHalQil({ dalilId: d.id, userId: tekshiruvchiId, tasdiqlandi: true });

      /* Эски иш тасдиқланган — рўйхатда бўлмаслиги керак */
      const oldin = await tasdiqsizlar(undefined, 500);
      if (oldin.some((r) => r.id === id)) return false;

      /* Иш алмашди — далил эски ишда қолди */
      await joylashishYozib({
        ishsizId: id,
        korxonaNomi: 'Янги Йўл МЧЖ',
        boshlanganSana: SANA(2024, 6, 1),
      });

      const keyin = await tasdiqsizlar(undefined, 500);
      const meniki = keyin.find((r) => r.id === id);

      const t = await odamTasdigi(id);

      return (
        /* ── АСОСИЙ ШАРТ ── рўйхатга ҚАЙТА тушди */
        meniki !== undefined &&
        /* Сабаби аниқ айтилади */
        meniki.sabab === 'ish-almashdi' &&
        /* Муддат ҳам ҲОЗИРГИ иш бўйича ҳисобланади */
        t.muddatiOtgan === true
      );
    },
  },
  {
    nomi: 'Рад этилган ҳужжат рўйхатда САБАБИ билан кўринади',
    tekshir: async () => {
      const id = await fuqaroYarat({ fish: noyob('Rad Etilgan Royxat') });
      await prisma.unemployedPerson.update({
        where: { id },
        data: { ishgaKirganSana: SANA(2024, 0, 15) },
      });
      const ish = await joylashishYozib({
        ishsizId: id,
        korxonaNomi: 'Корхона А',
        boshlanganSana: SANA(2024, 0, 15),
      });
      const d = await dalilQoshish({
        ishsizId: id,
        turi: 'SHARTNOMA',
        joylashishId: ish.id,
        kiritganId: xodimId,
      });
      await dalilniHalQil({ dalilId: d.id, userId: tekshiruvchiId, tasdiqlandi: false });

      const royxat = await tasdiqsizlar(undefined, 500);
      const meniki = royxat.find((r) => r.id === id);
      return meniki?.sabab === 'rad-etilgan';
    },
  },
  {
    nomi: 'Тасдиқланган ҳозирги иш рўйхатга ТУШМАЙДИ',
    tekshir: async () => {
      const id = await fuqaroYarat({ fish: noyob('Tasdiqlangan Tushmaydi') });
      await prisma.unemployedPerson.update({
        where: { id },
        data: { ishgaKirganSana: SANA(2024, 0, 15) },
      });
      const ish = await joylashishYozib({
        ishsizId: id,
        korxonaNomi: 'Корхона А',
        boshlanganSana: SANA(2024, 0, 15),
      });
      const d = await dalilQoshish({
        ishsizId: id,
        turi: 'SHARTNOMA',
        joylashishId: ish.id,
        kiritganId: xodimId,
      });
      await dalilniHalQil({ dalilId: d.id, userId: tekshiruvchiId, tasdiqlandi: true });

      const royxat = await tasdiqsizlar(undefined, 500);
      return !royxat.some((r) => r.id === id);
    },
  },
  {
    nomi: 'Иш рўйхатида сабаби экранда кўрсатилади',
    tekshir: async () => {
      const p = kodiOl(readFileSync('src/app/(ilova)/reyestr/page.tsx', 'utf8'));
      return (
        p.includes('SABAB_NOMI[r.sabab]') &&
        p.includes("'ish-almashdi'") &&
        p.includes("'rad-etilgan'")
      );
    },
  },

  /* ────────────────────────────────────────────────────────
   *  4. ИШНИ ЁПИШ
   * ──────────────────────────────────────────────────────── */
  {
    nomi: 'Ишни ёпиш САБАБ талаб қилади',
    tekshir: async () => {
      const id = await fuqaroYarat({ fish: noyob('Sababsiz Yopish') });
      const ish = await joylashishYozib({
        ishsizId: id,
        korxonaNomi: 'Корхона А',
        boshlanganSana: SANA(2024, 0, 1),
      });
      const n = await joylashishniTugat({
        joylashishId: ish.id,
        userId: xodimId,
        tugaganSana: SANA(2025, 0, 1),
        sabab: 'йўқ',
      });
      const hozir = await prisma.ishgaJoylashish.findUnique({
        where: { id: ish.id },
        select: { tugaganSana: true },
      });
      return !n.ok && n.sabab === 'sababsiz' && hozir?.tugaganSana === null;
    },
  },
  {
    nomi: 'Сабаб билан ёпилади ва ҳолати ТУГАДИ бўлади',
    tekshir: async () => {
      const id = await fuqaroYarat({ fish: noyob('Sabab Bilan') });
      const ish = await joylashishYozib({
        ishsizId: id,
        korxonaNomi: 'Корхона А',
        boshlanganSana: SANA(2024, 0, 1),
      });
      const n = await joylashishniTugat({
        joylashishId: ish.id,
        userId: xodimId,
        tugaganSana: SANA(2025, 0, 1),
        sabab: 'Корхона қисқартиришга кетди',
      });
      const hozir = await prisma.ishgaJoylashish.findUnique({
        where: { id: ish.id },
        select: { tugaganSana: true, holati: true, tugashSababi: true },
      });
      return (
        n.ok &&
        hozir?.holati === 'TUGADI' &&
        hozir.tugaganSana?.getTime() === SANA(2025, 0, 1).getTime() &&
        (hozir.tugashSababi ?? '').includes('қисқартириш')
      );
    },
  },
  {
    nomi: 'Тугаш санаси бошланишдан ИЛГАРИ бўлмайди',
    tekshir: async () => {
      const id = await fuqaroYarat({ fish: noyob('Sana Teskari Yopish') });
      const ish = await joylashishYozib({
        ishsizId: id,
        korxonaNomi: 'Корхона А',
        boshlanganSana: SANA(2025, 0, 1),
      });
      const n = await joylashishniTugat({
        joylashishId: ish.id,
        userId: xodimId,
        tugaganSana: SANA(2024, 0, 1),
        sabab: 'Кечиккан киритиш',
      });
      return !n.ok && n.sabab === 'sana-teskari';
    },
  },
  {
    nomi: 'Параллел ёпиш — биринчисининг сабаби сақланади',
    tekshir: async () => {
      const id = await fuqaroYarat({ fish: noyob('Parallel Yopish') });
      const ish = await joylashishYozib({
        ishsizId: id,
        korxonaNomi: 'Корхона А',
        boshlanganSana: SANA(2024, 0, 1),
      });

      const [x, y] = await Promise.all([
        joylashishniTugat({
          joylashishId: ish.id,
          userId: xodimId,
          tugaganSana: SANA(2025, 0, 1),
          sabab: 'Биринчи сабаб — қисқартириш',
        }),
        joylashishniTugat({
          joylashishId: ish.id,
          userId: tekshiruvchiId,
          tugaganSana: SANA(2025, 6, 1),
          sabab: 'Иккинчи сабаб — ўз хоҳиши',
        }),
      ]);

      const hozir = await prisma.ishgaJoylashish.findUnique({
        where: { id: ish.id },
        select: { tugashSababi: true },
      });
      const sabab = hozir?.tugashSababi ?? '';

      return (
        [x, y].filter((r) => r.ok).length === 1 &&
        [x, y].some((r) => !r.ok && r.sabab === 'allaqachon') &&
        /* Иккита сабаб аралашиб кетмади */
        (sabab.includes('Биринчи') || sabab.includes('Иккинчи')) &&
        !(sabab.includes('Биринчи') && sabab.includes('Иккинчи'))
      );
    },
  },

  /* ────────────────────────────────────────────────────────
   *  5. «ҲАМОН ИШЛАЯПТИ» — АЛОҲИДА САВОЛ
   * ──────────────────────────────────────────────────────── */
  {
    /*
     * Шартнома нусхаси одам ишга КИРГАНИНИ кўрсатади. У бир
     * ойдан кейин ишдан чиққан бўлиши ҳам мумкин —
     * шартнома буни билмайди.
     */
    nomi: 'Иш бошлагани тасдиқланса, ҳолати ҲАМОН «номаълум»',
    tekshir: async () => {
      const id = await fuqaroYarat({ fish: noyob('Faqat Boshlagani') });
      const ish = await joylashishYozib({
        ishsizId: id,
        korxonaNomi: 'Корхона А',
        boshlanganSana: SANA(2024, 0, 1),
      });
      const d = await dalilQoshish({
        ishsizId: id,
        turi: 'SHARTNOMA',
        joylashishId: ish.id,
        maqsadi: 'ISH_BOSHLAGANI',
        kiritganId: xodimId,
      });
      await dalilniHalQil({ dalilId: d.id, userId: tekshiruvchiId, tasdiqlandi: true });

      const hozir = await prisma.ishgaJoylashish.findUnique({
        where: { id: ish.id },
        select: { holati: true, oxirgiTekshiruv: true },
      });
      return hozir?.holati === 'NOMALUM' && hozir.oxirgiTekshiruv === null;
    },
  },
  {
    nomi: '«Ҳамон ишлаяпти» далили воқеани ИШЛАМОҚДА қилади',
    tekshir: async () => {
      const id = await fuqaroYarat({ fish: noyob('Hamon Ishlaydi') });
      const ish = await joylashishYozib({
        ishsizId: id,
        korxonaNomi: 'Корхона А',
        boshlanganSana: SANA(2024, 0, 1),
      });
      const d = await dalilQoshish({
        ishsizId: id,
        turi: 'ISH_BERUVCHI',
        joylashishId: ish.id,
        maqsadi: 'HOZIR_ISHLAYOTGANI',
        davrBoshi: SANA(2025, 5, 1),
        davrOxiri: SANA(2025, 5, 30),
        kiritganId: xodimId,
      });
      await dalilniHalQil({ dalilId: d.id, userId: tekshiruvchiId, tasdiqlandi: true });

      const hozir = await prisma.ishgaJoylashish.findUnique({
        where: { id: ish.id },
        select: { holati: true, oxirgiTekshiruv: true },
      });
      return (
        hozir?.holati === 'ISHLAMOQDA' &&
        /* Текширув санаси — давр ОХИРИ, бугун эмас */
        hozir.oxirgiTekshiruv?.getTime() === SANA(2025, 5, 30).getTime()
      );
    },
  },
  {
    nomi: 'РАД ЭТИЛГАН «ишлаяпти» далили воқеани ўзгартирмайди',
    tekshir: async () => {
      const id = await fuqaroYarat({ fish: noyob('Rad Etilgan Ishlaydi') });
      const ish = await joylashishYozib({
        ishsizId: id,
        korxonaNomi: 'Корхона А',
        boshlanganSana: SANA(2024, 0, 1),
      });
      const d = await dalilQoshish({
        ishsizId: id,
        turi: 'ISH_BERUVCHI',
        joylashishId: ish.id,
        maqsadi: 'HOZIR_ISHLAYOTGANI',
        kiritganId: xodimId,
      });
      await dalilniHalQil({ dalilId: d.id, userId: tekshiruvchiId, tasdiqlandi: false });

      const hozir = await prisma.ishgaJoylashish.findUnique({
        where: { id: ish.id },
        select: { holati: true },
      });
      return hozir?.holati === 'NOMALUM';
    },
  },

  /* ────────────────────────────────────────────────────────
   *  6. ҲИСОБОТ
   * ──────────────────────────────────────────────────────── */
  {
    nomi: 'Ҳисобот таркиби жамга тўғри келади',
    tekshir: async () => {
      const h = await tasdiqHisobi();
      const taркib =
        h.rasmiyTasdiq + h.qoldaTasdiq + h.tekshiruvKutayotgan + h.faqatXodim + h.radEtilgan;
      return (
        /* Ҳар бир даража ФАҚАТ бир марта саналади */
        taркib <= h.davoQilingan &&
        h.rasmiyTasdiq >= 0 &&
        h.joriyIshTasdiqlangan <= h.davoQilingan &&
        h.bogliqsizTasdiq <= h.davoQilingan &&
        h.voqeasizlar <= h.davoQilingan
      );
    },
  },
  {
    nomi: 'Қўлда тасдиқ РАСМИЙ деб саналмайди',
    tekshir: async () => {
      const oldin = await tasdiqHisobi();
      const id = await fuqaroYarat({ fish: noyob('Qolda Sanaladi') });
      const ish = await joylashishYozib({
        ishsizId: id,
        korxonaNomi: 'Корхона А',
        boshlanganSana: SANA(2024, 0, 1),
      });
      const d = await dalilQoshish({
        ishsizId: id,
        turi: 'REYESTR',
        manbaTuri: 'QOLDA_REYESTR',
        joylashishId: ish.id,
        kiritganId: xodimId,
      });
      await dalilniHalQil({ dalilId: d.id, userId: tekshiruvchiId, tasdiqlandi: true });

      const keyin = await tasdiqHisobi();
      return (
        keyin.qoldaTasdiq === oldin.qoldaTasdiq + 1 &&
        keyin.rasmiyTasdiq === oldin.rasmiyTasdiq &&
        keyin.joriyIshTasdiqlangan === oldin.joriyIshTasdiqlangan + 1
      );
    },
  },
  {
    nomi: 'Расмий интеграция АЛОҲИДА саналади',
    tekshir: async () => {
      const oldin = await tasdiqHisobi();
      const id = await fuqaroYarat({ fish: noyob('Rasmiy Sanaladi') });
      const ish = await joylashishYozib({
        ishsizId: id,
        korxonaNomi: 'Корхона А',
        boshlanganSana: SANA(2024, 0, 1),
      });
      const d = await dalilQoshish({
        ishsizId: id,
        turi: 'REYESTR',
        manbaTuri: 'RASMIY_INTEGRATSIYA',
        joylashishId: ish.id,
        kiritganId: xodimId,
      });

      const keyin = await tasdiqHisobi();
      return (
        /* Расмий манба ҚЎЛДА ТЕКШИРУВСИЗ тасдиқланади */
        d.holati === 'TASDIQLANDI' &&
        keyin.rasmiyTasdiq === oldin.rasmiyTasdiq + 1 &&
        keyin.qoldaTasdiq === oldin.qoldaTasdiq
      );
    },
  },
  {
    /*
     * Расмий манбадан келган ёзувда «ким тасдиқлади» БЎШ
     * бўлиши керак: ҳеч ким тасдиқламаган, интеграция
     * келтирган. Аввал у ерга киритган одамнинг номи
     * ёзиларди — журналда у файлни ТЕКШИРГАН бўлиб
     * кўринарди.
     */
    nomi: 'Автоматик тасдиқда «ким тасдиқлади» бўш қолади',
    tekshir: async () => {
      const id = await fuqaroYarat({ fish: noyob('Kim Tasdiqladi') });
      const d = await dalilQoshish({
        ishsizId: id,
        turi: 'REYESTR',
        manbaTuri: 'RASMIY_INTEGRATSIYA',
        kiritganId: xodimId,
      });
      const y = await prisma.joylashuvDalili.findUnique({
        where: { id: d.id },
        select: { holati: true, tasdiqlaganId: true, tasdiqlanganSana: true, kiritganId: true },
      });
      return (
        y?.holati === 'TASDIQLANDI' &&
        y.tasdiqlaganId === null &&
        y.tasdiqlanganSana !== null &&
        /* Киритган одам эса ёзилади — ким юборганини билиш керак */
        y.kiritganId === xodimId
      );
    },
  },

  /* ────────────────────────────────────────────────────────
   *  7. ҚОИДА БИТТА ЖОЙДА — КОД ТЕКШИРУВИ
   * ──────────────────────────────────────────────────────── */
  {
    /*
     * Эски имзо чақирувчига «тасдиқла» деб айтиш имконини
     * берарди. У БУТУНЛАЙ олиб ташланиши керак, акс ҳолда
     * қоида ўз тешигини ясайди.
     */
    nomi: '`tasdiqlangan` параметри кодда УМУМАН қолмади',
    tekshir: async () => {
      const kod = kodiOl(readFileSync('src/lib/joylashuv-dalili.ts', 'utf8'));
      const yol = kodiOl(readFileSync('src/app/api/ishsizlar/[id]/dalil/route.ts', 'utf8'));
      const reyestr = kodiOl(readFileSync('src/lib/reyestr-import.ts', 'utf8'));
      return (
        !kod.includes('tasdiqlangan?:') &&
        !kod.includes('p.tasdiqlangan') &&
        !yol.includes('tasdiqlangan:') &&
        !reyestr.includes('tasdiqlangan:')
      );
    },
  },
  {
    nomi: 'Тасдиқлаш қарори ФАҚАТ манбадан ҳисобланади',
    tekshir: async () => {
      const kod = kodiOl(readFileSync('src/lib/joylashuv-dalili.ts', 'utf8'));
      return kod.includes('ozidanTasdiqmi(manba)') && kod.includes("ozidan ? 'TASDIQLANDI'");
    },
  },
  {
    nomi: 'Реестр юклаш ҚЎЛДА манба деб ёзади',
    tekshir: async () => {
      const kod = kodiOl(readFileSync('src/lib/reyestr-import.ts', 'utf8'));
      return (
        kod.includes("manbaTuri: 'QOLDA_REYESTR'") && !kod.includes('RASMIY_INTEGRATSIYA')
      );
    },
  },
  {
    nomi: 'Воқеа жойлаштириш ТРАНЗАКЦИЯСИ ичида ёзилади',
    tekshir: async () => {
      const kod = kodiOl(readFileSync('src/lib/joylashtirish.ts', 'utf8'));
      /* Охирги аргумент — `tx`, яъни транзакция мижози */
      return /joylashishYozib\(\s*\{[\s\S]*?\},\s*tx\s*\)/.test(kod);
    },
  },
  {
    /*
     * Ҳоким брифингни ҲАР КУНИ ЭРТАЛАБ ўқийди ва ўша
     * рақамни юқорига ҳисобот қилади. «Тасдиқланган» сўзи
     * нимага таянганини АЙНАН ШУ ЕРДА айтиш керак.
     */
    nomi: 'Брифинг расмий манба сонини АЛОҲИДА айтади',
    tekshir: async () => {
      const b = kodiOl(readFileSync('src/lib/hokim-brifingi.ts', 'utf8'));
      return b.includes('rasmiyTasdiqlangan') && b.includes('расмий манба билан');
    },
  },
  {
    nomi: 'Ботда ҳам манба ажратилади',
    tekshir: async () => {
      const menyu = kodiOl(readFileSync('src/lib/bot-menyu.ts', 'utf8'));
      const savol = kodiOl(readFileSync('src/lib/bot-savol.ts', 'utf8'));
      return menyu.includes('rasmiyTasdiqlangan') && savol.includes('rasmiyTasdiqlangan');
    },
  },
  {
    /*
     * Фуқаро саҳифасида нишон ҲОЗИРГИ иш бўйича чиқиши
     * керак. Аввал `dalillar.some(...)` эди — яъни эски
     * ишнинг далили ҳам «Тасдиқланган» дерди.
     */
    nomi: 'Экрандаги нишон ҲОЗИРГИ иш даражасидан келади',
    tekshir: async () => {
      const blok = kodiOl(readFileSync('src/components/dalil/dalil-blogi.tsx', 'utf8'));
      const sahifa = kodiOl(readFileSync('src/app/(ilova)/ishsizlar/[id]/page.tsx', 'utf8'));
      return (
        /* Эски, адаштирадиган ҳисоб қолмади */
        !blok.includes("dalillar.some((d) => d.holati === 'TASDIQLANDI')") &&
        blok.includes("daraja === 'RASMIY' || daraja === 'QOLDA_TASDIQ'") &&
        /* Манба ҳар далилда кўринади */
        blok.includes('DALIL_MANBASI_NOMI[d.manbaTuri]') &&
        /* Саҳифа даражани ва ишлар тарихини узатади */
        sahifa.includes('daraja={tasdiq.daraja}') &&
        sahifa.includes('joylashishTarixi')
      );
    },
  },
  {
    nomi: 'Реестр саҳифасида тасдиқнинг ТАРКИБИ кўринади',
    tekshir: async () => {
      const p = kodiOl(readFileSync('src/app/(ilova)/reyestr/page.tsx', 'utf8'));
      return (
        p.includes('hisob.rasmiyTasdiq') &&
        p.includes('hisob.qoldaTasdiq') &&
        p.includes('hisob.radEtilgan') &&
        p.includes('hisob.joriyIshTasdiqlangan') &&
        p.includes('bogliqsizDalillar')
      );
    },
  },
  {
    nomi: 'Миграция ҲЕЧ НАРСА ЎЧИРМАЙДИ — хатлов кетмоқда',
    tekshir: async () => {
      const m = readFileSync(
        'prisma/migrations/20260930160000_joylashish_voqeasi/migration.sql',
        'utf8'
      );
      return (
        !/\bDROP\s+(TABLE|COLUMN|TYPE)\b/i.test(m) &&
        !/\bDELETE\s+FROM\b/i.test(m) &&
        !/\bTRUNCATE\b/i.test(m) &&
        !/\bRENAME\b/i.test(m) &&
        /* Такрор юргизилса ҳам хато бермайди */
        m.includes('IF NOT EXISTS') &&
        m.includes('duplicate_object')
      );
    },
  },
];

async function main() {
  await tayyorla();

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

  await tozala();
  console.log(`\n${SINOVLAR.length - xato}/${SINOVLAR.length} o'tdi`);
  await prisma.$disconnect();
  process.exit(xato ? 1 : 0);
}

main();
