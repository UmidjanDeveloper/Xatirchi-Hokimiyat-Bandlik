/**
 * ============================================================
 *  ОФЛАЙН НАВБАТ СИНОВИ
 *
 *  Ишга тушириш:  npx tsx scripts/navbat-sinov.ts
 *
 *  Бу код ДАЛАДА, алоқа йўқ жойда ишлайди — у ерда хатони
 *  кўрадиган ҳеч ким йўқ. Хато содир бўлса, ходимнинг бир
 *  соатлик иши жимгина йўқолади ва буни фақат кечқурун,
 *  ҳисобот пайтида билиб қолинади.
 *
 *  Шунинг учун ҳар бир йўл алоҳида текширилади: муваффақият,
 *  такрор (409), яроқсиз маълумот ва алоқанинг узилиши.
 * ============================================================
 */
import { readFileSync } from 'node:fs';

/** Изоҳларсиз код — изоҳдаги сўз текширувни алдамасин */
const kodiOl = (m: string) =>
  m.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const KOD_OFFLINE = kodiOl(readFileSync('src/lib/offline.ts', 'utf8'));
const KOD_QOBIQ = kodiOl(readFileSync('src/components/shell/app-shell.tsx', 'utf8'));

import {
  MAX_URINISH,
  avtomatikYuboriladimi,
  navbatdanOchir,
  navbatgaQosh,
  navbatniOqi,
  navbatniYubor,
  urinishBelgila,
  type YuborishNatijasi,
} from '../src/lib/offline';

/* ── Браузер хотирасининг ўрнини босувчи ── */
class SoxtaXotira {
  private d = new Map<string, string>();
  getItem(k: string) { return this.d.get(k) ?? null; }
  setItem(k: string, v: string) { this.d.set(k, v); }
  removeItem(k: string) { this.d.delete(k); }
  clear() { this.d.clear(); }
  get length() { return this.d.size; }
  key(i: number) { return [...this.d.keys()][i] ?? null; }
}

const xotira = new SoxtaXotira();
(globalThis as unknown as { window: unknown }).window = { localStorage: xotira };

const tozala = () => xotira.clear();

type Sinov = { nomi: string; tekshir: () => Promise<boolean> | boolean };

const SINOVLAR: Sinov[] = [
  {
    nomi: 'Навбатга қўшилган ёзув ўқилади',
    tekshir: () => {
      tozala();
      const n = navbatgaQosh({ turi: 'yakuniy', id: 'abc', malumot: { a: 1 } });
      return n.ok && navbatniOqi().length === 1;
    },
  },
  {
    nomi: 'Қоралама id си ёзув билан бирга сақланади',
    tekshir: () => {
      tozala();
      navbatgaQosh({ turi: 'yakuniy', id: 'qoralama-1', malumot: { a: 1 } });
      const y = navbatniOqi()[0].malumot as { id: string };
      return y.id === 'qoralama-1';
    },
  },
  {
    nomi: 'Муваффақиятли юборилган ёзув навбатдан чиқади',
    tekshir: async () => {
      tozala();
      navbatgaQosh({ a: 1 });
      navbatgaQosh({ a: 2 });
      const n = await navbatniYubor(async () => 'saqlandi');
      return n.yuborildi === 2 && n.qoldi === 0;
    },
  },
  {
    nomi: 'ТАКРОР (409) ҳам муваффақият — ёзув навбатда қолмайди',
    tekshir: async () => {
      tozala();
      navbatgaQosh({ a: 1 });
      const n = await navbatniYubor(async () => 'takror');
      return n.takror === 1 && n.qoldi === 0 && n.yuborildi === 0;
    },
  },
  {
    nomi: 'Алоқа йўқ бўлса — ёзув сақланади ва ҳалқа ТЎХТАЙДИ',
    tekshir: async () => {
      tozala();
      for (let i = 0; i < 3; i++) navbatgaQosh({ a: i });
      let urinish = 0;
      const n = await navbatniYubor(async () => { urinish++; return 'aloqa-yoq'; });
      // Фақат биттасига уриниб кўрилади, қолгани бекорга кетмайди
      return urinish === 1 && n.qoldi === 3 && n.aloqaYoq;
    },
  },
  {
    nomi: 'Яроқсиз ёзув навбатда ҚОЛАДИ — ходимнинг иши йўқолмайди',
    tekshir: async () => {
      tozala();
      navbatgaQosh({ a: 1 });
      const n = await navbatniYubor(async () => 'yaroqsiz');
      return n.qoldi === 1 && n.yuborildi === 0;
    },
  },
  {
    nomi: 'Яроқсиз ёзув қолганларини тўсиб қўймайди',
    tekshir: async () => {
      tozala();
      navbatgaQosh({ a: 'yomon' });
      navbatgaQosh({ a: 'yaxshi' });
      const n = await navbatniYubor(async (m) =>
        ((m as { a: string }).a === 'yomon' ? 'yaroqsiz' : 'saqlandi') as YuborishNatijasi
      );
      return n.yuborildi === 1 && n.qoldi === 1;
    },
  },
  {
    nomi: 'Ташланган хатолик ҳам «алоқа йўқ» деб қаралади',
    tekshir: async () => {
      tozala();
      navbatgaQosh({ a: 1 });
      const n = await navbatniYubor(async () => { throw new Error('tarmoq'); });
      return n.aloqaYoq && n.qoldi === 1;
    },
  },
  {
    nomi: `${MAX_URINISH} мартадан кейин ёзув «эътибор талаб қилади» бўлади`,
    tekshir: async () => {
      tozala();
      navbatgaQosh({ a: 1 });
      const id = navbatniOqi()[0].localId;
      for (let i = 0; i < MAX_URINISH; i++) urinishBelgila(id);
      const y = navbatniOqi()[0];
      const n = await navbatniYubor(async () => 'saqlandi');
      // Автоматик юборишга қўшилмайди, лекин ЎЧИРИЛМАЙДИ
      return !avtomatikYuboriladimi(y) && n.yuborildi === 0 && n.etibor === 1;
    },
  },
  {
    nomi: 'Тўсилган ёзув қолганларини тўхтатмайди',
    tekshir: async () => {
      tozala();
      navbatgaQosh({ a: 'eski' });
      const id = navbatniOqi()[0].localId;
      for (let i = 0; i < MAX_URINISH; i++) urinishBelgila(id);
      navbatgaQosh({ a: 'yangi' });
      const n = await navbatniYubor(async () => 'saqlandi');
      return n.yuborildi === 1 && n.etibor === 1;
    },
  },
  {
    nomi: 'Навбатдан ўчириш ишлайди',
    tekshir: () => {
      tozala();
      navbatgaQosh({ a: 1 });
      navbatdanOchir(navbatniOqi()[0].localId);
      return navbatniOqi().length === 0;
    },
  },
  {
    nomi: 'Бузуқ хотира мазмуни хатога олиб келмайди',
    tekshir: () => {
      tozala();
      xotira.setItem('bandlik_navbat', 'bu JSON emas');
      return navbatniOqi().length === 0;
    },
  },
  {
    nomi: 'Бўш навбатни юборишга уриниш хато бермайди',
    tekshir: async () => {
      tozala();
      const n = await navbatniYubor(async () => 'saqlandi');
      return n.yuborildi === 0 && n.qoldi === 0 && !n.aloqaYoq;
    },
  },
  /* ══ ТЕЛЕФОНДАГИ МАЪЛУМОТНИНГ УМРИ ══ */
  {
    /*
     * Қораламада очиқ матнда исм, манзил, телефон,
     * ногиронлик ва даромад ётади. Илгари у МУДДАТСИЗ
     * сақланарди: `vaqt` ёзиларди-ю, ҳеч қачон
     * ишлатилмасди.
     *
     * Телефон сотилса, йўқолса ёки бошқага берилса —
     * хонадонлар маълумоти у билан кетарди.
     */
    nomi: 'Эскирган қоралама ЎҚИШДА тушиб қолади',
    tekshir: () => {
      const k = KOD_OFFLINE;
      return (
        k.includes('export const QORALAMA_KUNI = 7') &&
        k.includes('function eskirganmi(vaqt: string)') &&
        k.includes('if (y && typeof y === \'object\' && !eskirganmi(y.vaqt)) toza[id] = y;') &&
        /* Сана ўқилмаса — ишончсиз, ташланади */
        k.includes('if (Number.isNaN(t)) return true;')
      );
    },
  },
  {
    /*
     * Сессия 12 соат, `localStorage` эса муддатсиз. Чиқиб
     * кетган ходимнинг телефонида маълумот қолмаслиги керак.
     */
    nomi: 'Чиқишда телефон хотираси тозаланади',
    tekshir: () => {
      const k = KOD_OFFLINE;
      const q = KOD_QOBIQ;
      return (
        k.includes('export function chiqishdaTozala()') &&
        k.includes('window.localStorage.removeItem(QORALAMA_KEY)') &&
        /* Қобиқ уни ҲАҚИҚАТАН чақирсин — ёзиб қўйиб унутилмасин */
        q.includes('const qoldiq = chiqishdaTozala();')
      );
    },
  },
  {
    /*
     * ЮБОРИЛМАГАН навбат ўчирилмайди: у тайёр хатлов ва
     * уни йўқотиш ходимнинг бир соатлик ишини йўқотиш
     * дегани. Аввал сўралади.
     */
    nomi: 'Юборилмаган навбат ўчирилмайди — аввал сўралади',
    tekshir: () => {
      const k = KOD_OFFLINE;
      const q = KOD_QOBIQ;
      return (
        k.includes('if (navbat === 0) window.localStorage.removeItem(NAVBAT_KEY);') &&
        q.includes('if (qoldiq.navbat > 0)') &&
        q.includes('window.confirm')
      );
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
  process.exit(xato ? 1 : 0);
}

void main();
