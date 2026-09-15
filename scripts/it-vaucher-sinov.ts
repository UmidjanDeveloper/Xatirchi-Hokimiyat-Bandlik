/**
 * ============================================================
 *  IT-ШАҲАРЧА ВАУЧЕРИ СИНОВИ
 *
 *  Ишга тушириш:  npx tsx scripts/it-vaucher-sinov.ts
 *
 *  Нега керак: ваучер ҳолатлари УЧ ЖОЙДА ёзилган — Prisma
 *  enum ида, каталогда (`IT_VAUCHER_HOLATI`) ва ранглар
 *  харитасида. Бирига янги ҳолат қўшилиб, қолганига
 *  қўшилмаса, хато КЎРИНМАЙДИ: тугма шунчаки чиқмайди,
 *  ёки нишон рангсиз қолади.
 *
 *  Ҳисоботда бундай хато янада хавфли: ҳолат жадвалдан
 *  тушиб қолади ва «берилган ваучер» билан «ҳолатлар
 *  йиғиндиси» бир-бирига тўғри келмай қолади — ҳоким эса
 *  буни фақат йиғилишда пайқайди.
 * ============================================================
 */
import { ItVaucherHolati } from '@prisma/client';
import {
  IT_VAUCHER_HOLATI,
  IT_VAUCHER_KORINISHI,
  IT_VAUCHER_NATIJASI,
  IT_YONALISHI,
  itYonalishimi,
  kirillcha,
  qiymatlar,
} from '../src/lib/constants';
import { holatSanasi } from '../src/lib/it-vaucher';

const ENUM = Object.values(ItVaucherHolati) as string[];
const KATALOG = qiymatlar(IT_VAUCHER_HOLATI) as string[];

type Sinov = { nomi: string; tekshir: () => boolean };

const SINOVLAR: Sinov[] = [
  /* ── Каталог ва база бир хилми ── */
  {
    nomi: 'Каталогдаги ҳолатлар базадаги enum билан айнан бир хил',
    tekshir: () =>
      ENUM.length === KATALOG.length && ENUM.every((h) => KATALOG.includes(h)),
  },
  {
    nomi: 'Ҳар бир ҳолатнинг ранги бор — нишон рангсиз қолмайди',
    tekshir: () => ENUM.every((h) => IT_VAUCHER_KORINISHI[h] !== undefined),
  },
  {
    nomi: 'Ҳар бир ҳолатнинг кирилл номи бор',
    tekshir: () => ENUM.every((h) => kirillcha(IT_VAUCHER_HOLATI, h).length > 0),
  },
  {
    nomi: 'Натижали ҳолатлар ҳақиқатан мавжуд ҳолатлар',
    tekshir: () => IT_VAUCHER_NATIJASI.every((h) => ENUM.includes(h)),
  },
  {
    /*
     * Натижа = курсни тугатди ЁКИ ишга жойлашди.
     * «Берилди» ва «ўқимоқда» натижа эмас: улар ҳали
     * тугамаган. Ташлаб кетди ва бекор қилинди — умуман эмас.
     */
    nomi: 'Натижага фақат тугатди ва ишга жойлашди киради',
    tekshir: () =>
      IT_VAUCHER_NATIJASI.length === 2 &&
      IT_VAUCHER_NATIJASI.includes('TUGATDI') &&
      IT_VAUCHER_NATIJASI.includes('ISHGA_JOYLASHDI'),
  },
  {
    nomi: 'Ташлаб кетган ва бекор қилинган натижага кирмайди',
    tekshir: () =>
      !(IT_VAUCHER_NATIJASI as readonly string[]).includes('TASHLAB_KETDI') &&
      !(IT_VAUCHER_NATIJASI as readonly string[]).includes('BEKOR_QILINDI'),
  },

  /* ── Ҳолат алмашганда сана ёзиладими ── */
  {
    nomi: '«Ўқимоқда» — бошланган сана ёзилади',
    tekshir: () => 'boshlanganSana' in holatSanasi('OQIMOQDA'),
  },
  {
    nomi: '«Курсни тугатди» — тугатган сана ёзилади',
    tekshir: () => 'tugatganSana' in holatSanasi('TUGATDI'),
  },
  {
    nomi: '«Ишга жойлашди» — ишга кирган сана ёзилади',
    tekshir: () => 'ishgaKirganSana' in holatSanasi('ISHGA_JOYLASHDI'),
  },
  {
    /*
     * Ёмон якунда сана ЁЗИЛМАЙДИ. Сабаби: «тугатган сана»
     * ҳисоботда «курсни муддатида тугатганлар» ҳисобига
     * киради — ташлаб кетган одам у ерга тушиб қолмаслиги
     * керак.
     */
    nomi: 'Ташлаб кетганда тугатган сана ёзилмайди',
    tekshir: () => Object.keys(holatSanasi('TASHLAB_KETDI')).length === 0,
  },
  {
    nomi: 'Бекор қилинганда ҳам сана ёзилмайди',
    tekshir: () => Object.keys(holatSanasi('BEKOR_QILINDI')).length === 0,
  },
  {
    nomi: '«Ваучер берилди» — берилган сана базада ўзи қўйилади',
    tekshir: () => Object.keys(holatSanasi('BERILDI')).length === 0,
  },

  /* ── Йўналишлар ── */
  {
    nomi: 'Йўналишлар рўйхатида «Бошқа» бор — рўйхатдан ташқариси учун',
    tekshir: () => (qiymatlar(IT_YONALISHI) as string[]).includes('Boshqa'),
  },
  {
    nomi: 'Йўналишлар такрорланмайди',
    tekshir: () => {
      const q = qiymatlar(IT_YONALISHI) as string[];
      return new Set(q).size === q.length;
    },
  },
  {
    /*
     * Каталогдаги ҳар бир йўналиш `itYonalishimi` томонидан
     * IT деб танилиши шарт. Акс ҳолда шундай ҳол юзага
     * келарди: ходим анкетада «кибехавфсизлик» деб ёзади,
     * тизим уни IT деб танимайди ва ваучер блоки умуман
     * очилмайди — ходим эса нега очилмаганини билмайди.
     */
    nomi: 'Каталогдаги ҳар бир йўналиш IT деб танилади',
    tekshir: () =>
      IT_YONALISHI.filter((y) => y.qiymat !== 'Boshqa').every(
        (y) => itYonalishimi(y.qiymat) || itYonalishimi(y.kirill)
      ),
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
