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
  begona,
  egasiz,
  egasizlarniOlish,
  etiborTalabQiladi,
  kalitYasa,
  meniki,
  navbatdanOchir,
  navbatgaQosh,
  navbatniOqi,
  navbatniYubor,
  qoralamaOqi,
  qoralamaSaqla,
  qoralamaKaliti,
  qoralamaIdYasa,
  qoralamalarim,
  qoralamalarniChekla,
  MAX_QORALAMA,
  urinishBelgila,
  chiqishdaTozala,
  ruxsatBelgisiniOl,
  type YuborishNatijasi,
} from '../src/lib/offline';
import { XATO_MATNI, navbatgaQoyiladimi, xatoToifasi } from '../src/lib/xato-toifasi';

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
        k.includes('export function chiqishdaTozala(egasi?: string)') &&
        k.includes('window.localStorage.removeItem(QORALAMA_KEY)') &&
        /* Қобиқ уни ҲАҚИҚАТАН чақирсин — ёзиб қўйиб унутилмасин */
        q.includes('const qoldiq = chiqishdaTozala(username);')
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
        k.includes('if (hammasi.length === 0) window.localStorage.removeItem(NAVBAT_KEY);') &&
        q.includes('if (qoldiq.navbat > 0)') &&
        q.includes('window.confirm')
      );
    },
  },

  // ═══════════════════════════════════════════════════════════
  //  C — НАВБАТНИНГ ЭГАСИ
  //
  //  Телефон битта, ходим иккита бўлиши мумкин. Бировнинг иши
  //  бошқанинг номидан жўнаб кетмаслиги керак.
  // ═══════════════════════════════════════════════════════════
  {
    nomi: 'Навбат ёзуви эгаси билан сақланади',
    tekshir: () => {
      tozala();
      navbatgaQosh({ a: 1 }, 'mfy_baxshijar', 'k-1');
      const y = navbatniOqi()[0];
      return y.egasi === 'mfy_baxshijar' && y.kalit === 'k-1';
    },
  },
  {
    nomi: 'ФАҚАТ ўзиники юборилади — ҳамкасбники тегилмайди',
    tekshir: async () => {
      tozala();
      navbatgaQosh({ kim: 'a' }, 'xodim_a');
      navbatgaQosh({ kim: 'b' }, 'xodim_b');

      const yuborilganlar: unknown[] = [];
      const n = await navbatniYubor(async (m) => {
        yuborilganlar.push(m);
        return 'saqlandi';
      }, 'xodim_a');

      const qolgan = navbatniOqi();
      return (
        n.yuborildi === 1 &&
        yuborilganlar.length === 1 &&
        (yuborilganlar[0] as { kim: string }).kim === 'a' &&
        qolgan.length === 1 &&
        qolgan[0].egasi === 'xodim_b'
      );
    },
  },
  {
    nomi: 'Эгасиз эски ёзув ҳеч кимнинг номидан жўнамайди',
    tekshir: async () => {
      tozala();
      navbatgaQosh({ a: 1 }); /* эски шакл — эгаси йўқ */
      const n = await navbatniYubor(async () => 'saqlandi', 'xodim_a');
      return n.yuborildi === 0 && navbatniOqi().length === 1 && egasiz(navbatniOqi()).length === 1;
    },
  },
  {
    nomi: 'Ходим тасдиқласа, эгасиз ёзув уники бўлади',
    tekshir: async () => {
      tozala();
      navbatgaQosh({ a: 1 });
      const olindi = egasizlarniOlish('xodim_a');
      const n = await navbatniYubor(async () => 'saqlandi', 'xodim_a');
      return olindi === 1 && n.yuborildi === 1 && navbatniOqi().length === 0;
    },
  },
  {
    nomi: 'meniki / begona / egasiz — учаласи ажратилади',
    tekshir: () => {
      tozala();
      navbatgaQosh({ a: 1 }, 'xodim_a');
      navbatgaQosh({ b: 1 }, 'xodim_b');
      navbatgaQosh({ c: 1 });
      const n = navbatniOqi();
      return meniki(n, 'xodim_a').length === 1 && begona(n, 'xodim_a').length === 1 && egasiz(n).length === 1;
    },
  },
  {
    nomi: 'Чиқишда ФАҚАТ ўзининг қораламаси ўчади',
    tekshir: () => {
      tozala();
      qoralamaSaqla('bir', { x: 1 }, 'xodim_a');
      qoralamaSaqla('ikki', { x: 2 }, 'xodim_b');
      const q = chiqishdaTozala('xodim_a');
      return (
        q.qoralama === 1 &&
        qoralamaOqi('bir', 'xodim_a') === null &&
        (qoralamaOqi('ikki', 'xodim_b') as { x: number }).x === 2
      );
    },
  },
  {
    nomi: 'Ҳамкасбнинг қораламаси очилмайди',
    tekshir: () => {
      tozala();
      qoralamaSaqla('bir', { x: 1 }, 'xodim_a');
      return qoralamaOqi('bir', 'xodim_b') === null && (qoralamaOqi('bir', 'xodim_a') as { x: number }).x === 1;
    },
  },
  {
    nomi: 'Чиқишда навбат сони ФАҚАТ ўзиники бўйича саналади',
    tekshir: () => {
      tozala();
      navbatgaQosh({ a: 1 }, 'xodim_a');
      navbatgaQosh({ b: 1 }, 'xodim_b');
      navbatgaQosh({ b2: 1 }, 'xodim_b');
      return chiqishdaTozala('xodim_a').navbat === 1 && navbatniOqi().length === 3;
    },
  },

  // ═══════════════════════════════════════════════════════════
  //  D — ИДЕМПОТЕНТЛИК: ТАКРОР ва ЗИДДИЯТ АЖРАТИЛАДИ
  // ═══════════════════════════════════════════════════════════
  {
    nomi: 'ЗИДДИЯТ (409) ёзувни ЎЧИРМАЙДИ — иш йўқолмайди',
    tekshir: async () => {
      tozala();
      navbatgaQosh({ a: 1 }, 'xodim_a', 'k-1');
      const n = await navbatniYubor(
        async () => ({ holat: 'ziddiyat' as const, mavjudId: 'xon-7' }),
        'xodim_a'
      );
      const qolgan = navbatniOqi();
      return (
        n.ziddiyat === 1 &&
        n.yuborildi === 0 &&
        n.takror === 0 &&
        qolgan.length === 1 &&
        qolgan[0].ziddiyat === 'xon-7'
      );
    },
  },
  {
    nomi: 'Зиддиятли ёзув автоматик қайта юборилмайди',
    tekshir: async () => {
      tozala();
      navbatgaQosh({ a: 1 }, 'xodim_a', 'k-1');
      await navbatniYubor(async () => ({ holat: 'ziddiyat' as const, mavjudId: 'x' }), 'xodim_a');
      let urinish = 0;
      const n = await navbatniYubor(async () => { urinish++; return 'saqlandi'; }, 'xodim_a');
      return urinish === 0 && n.etibor === 1 && etiborTalabQiladi(navbatniOqi()[0]);
    },
  },
  {
    nomi: 'Зиддиятли ёзув қолганларини тўсиб қўймайди',
    tekshir: async () => {
      tozala();
      navbatgaQosh({ a: 'yomon' }, 'xodim_a');
      navbatgaQosh({ a: 'yaxshi' }, 'xodim_a');
      const n = await navbatniYubor(async (m) => {
        const x = m as { a: string };
        return x.a === 'yomon' ? { holat: 'ziddiyat' as const, mavjudId: 'x' } : 'saqlandi';
      }, 'xodim_a');
      return n.yuborildi === 1 && n.ziddiyat === 1 && navbatniOqi().length === 1;
    },
  },
  {
    nomi: 'ТАКРОР (ўз калитимиз) — ёзув навбатдан чиқади',
    tekshir: async () => {
      tozala();
      navbatgaQosh({ a: 1 }, 'xodim_a', 'k-1');
      const n = await navbatniYubor(async () => ({ holat: 'takror' as const }), 'xodim_a');
      return n.takror === 1 && navbatniOqi().length === 0;
    },
  },
  {
    nomi: 'Идемпотентлик калити ҳар сафар янги бўлади',
    tekshir: () => {
      const a = kalitYasa();
      const b = kalitYasa();
      return a.length >= 8 && a.length <= 64 && a !== b;
    },
  },
  {
    nomi: 'Сервер калитни ҚАЙТА ЮБОРИШДА ҳам бир хил олади',
    tekshir: async () => {
      tozala();
      const k = kalitYasa();
      navbatgaQosh({ a: 1 }, 'xodim_a', k);
      const korilgan: (string | undefined)[] = [];
      await navbatniYubor(async (_m, y) => { korilgan.push(y.kalit); return 'aloqa-yoq'; }, 'xodim_a');
      await navbatniYubor(async (_m, y) => { korilgan.push(y.kalit); return 'saqlandi'; }, 'xodim_a');
      return korilgan.length === 2 && korilgan[0] === k && korilgan[1] === k;
    },
  },
  // ═══════════════════════════════════════════════════════════
  //  ҚОРАЛАМАЛАР: ҲАР ХОДИМГА, ҲАР АНКЕТАГА АЛОҲИДА
  //
  //  Аввал бутун илова БИТТА `joriy-xatlov` калитидан
  //  фойдаланарди. Эгаси ЎҚИШДА текширилар эди-ю, ЁЗИШДА
  //  эмас: иккинчи ходимнинг автосақлаши биринчисининг
  //  қораламасини босиб ўтарди.
  // ═══════════════════════════════════════════════════════════
  {
    nomi: 'Икки ходимнинг қораламаси бир-бирини БОСМАЙДИ',
    tekshir: () => {
      tozala();
      const aKalit = qoralamaKaliti('xodim_a', 'q1');
      const bKalit = qoralamaKaliti('xodim_b', 'q1');

      qoralamaSaqla(aKalit, { manzil: 'A ning uyi' }, 'xodim_a');
      qoralamaSaqla(bKalit, { manzil: 'B ning uyi' }, 'xodim_b');

      const a = qoralamaOqi<{ manzil: string }>(aKalit, 'xodim_a');
      const b = qoralamaOqi<{ manzil: string }>(bKalit, 'xodim_b');
      return a?.manzil === 'A ning uyi' && b?.manzil === 'B ning uyi';
    },
  },
  {
    nomi: 'Битта ходим ИККИТА анкетани параллел сақлай олади',
    tekshir: () => {
      tozala();
      const bir = qoralamaKaliti('xodim_a', qoralamaIdYasa());
      const ikki = qoralamaKaliti('xodim_a', qoralamaIdYasa());
      qoralamaSaqla(bir, { manzil: 'Birinchi uy' }, 'xodim_a');
      qoralamaSaqla(ikki, { manzil: 'Ikkinchi uy' }, 'xodim_a');

      const meniki = qoralamalarim('xodim_a');
      return (
        meniki.length === 2 &&
        bir !== ikki &&
        (qoralamaOqi<{ manzil: string }>(bir, 'xodim_a')?.manzil === 'Birinchi uy')
      );
    },
  },
  {
    nomi: 'Рўйхатда ФАҚАТ ўзининг қораламалари кўринади',
    tekshir: () => {
      tozala();
      qoralamaSaqla(qoralamaKaliti('xodim_a', 'q1'), { x: 1 }, 'xodim_a');
      qoralamaSaqla(qoralamaKaliti('xodim_a', 'q2'), { x: 2 }, 'xodim_a');
      qoralamaSaqla(qoralamaKaliti('xodim_b', 'q3'), { x: 3 }, 'xodim_b');
      return qoralamalarim('xodim_a').length === 2 && qoralamalarim('xodim_b').length === 1;
    },
  },
  {
    /*
     * Хатлов ҲОЗИР кетмоқда: дала телефонларида эски
     * `joriy-xatlov` калити остида тўлдирилаётган анкета
     * бор. Уни йўқотиб бўлмайди.
     */
    nomi: 'Эски УМУМИЙ калитдаги қоралама рўйхатда ҚОЛАДИ',
    tekshir: () => {
      tozala();
      /* Эгасиз — ўзгаришдан олдин ёзилган */
      qoralamaSaqla('joriy-xatlov', { manzil: 'Eski uy' });
      const meniki = qoralamalarim('xodim_a');
      return meniki.length === 1 && meniki[0].eskimi === true;
    },
  },
  {
    nomi: 'Рўйхат ЯНГИСИДАН эскисига тартибланади',
    tekshir: () => {
      tozala();
      qoralamaSaqla(qoralamaKaliti('xodim_a', 'eski'), { x: 'eski' }, 'xodim_a');
      /* Вақтни орқага сурамиз */
      const xom = JSON.parse(xotira.getItem('bandlik_qoralama') as string);
      /* Бир соат орқага — етти кунлик муддатдан ичкарида қолсин */
      xom[qoralamaKaliti('xodim_a', 'eski')].vaqt = new Date(Date.now() - 3600_000).toISOString();
      xotira.setItem('bandlik_qoralama', JSON.stringify(xom));

      qoralamaSaqla(qoralamaKaliti('xodim_a', 'yangi'), { x: 'yangi' }, 'xodim_a');
      const meniki = qoralamalarim('xodim_a');
      return meniki.length === 2 && (meniki[0].malumot as { x: string }).x === 'yangi';
    },
  },
  {
    nomi: 'Чегарадан ошган ЭНГ ЭСКИ қоралама тушиб қолади',
    tekshir: () => {
      tozala();
      for (let i = 0; i < MAX_QORALAMA + 3; i++) {
        qoralamaSaqla(qoralamaKaliti('xodim_a', `q${i}`), { i }, 'xodim_a');
      }
      const ochirildi = qoralamalarniChekla('xodim_a');
      return ochirildi === 3 && qoralamalarim('xodim_a').length === MAX_QORALAMA;
    },
  },
  {
    nomi: 'Чеклов БОШҚА ходимнинг қораламасига тегмайди',
    tekshir: () => {
      tozala();
      for (let i = 0; i < MAX_QORALAMA + 2; i++) {
        qoralamaSaqla(qoralamaKaliti('xodim_a', `q${i}`), { i }, 'xodim_a');
      }
      qoralamaSaqla(qoralamaKaliti('xodim_b', 'meniki'), { b: 1 }, 'xodim_b');
      qoralamalarniChekla('xodim_a');
      return qoralamalarim('xodim_b').length === 1;
    },
  },
  {
    nomi: 'Форма умумий калитни ТАШЛАГАН',
    tekshir: () => {
      const k = kodiOl(readFileSync('src/components/xatlov/xatlov-formasi.tsx', 'utf8'));
      return (
        !k.includes("'joriy-xatlov'") &&
        k.includes('qoralamaKaliti(egasi ?? ') &&
        k.includes('qoralamalarim(egasi ?? ')
      );
    },
  },
  /* ── §6: XATO TURLARI — 401 / 403 / 400-422 / 409 / 5xx ── */
  {
    nomi: 'HTTP kodi beshta turga ajraladi: 401 qayta kirish, 403 ruxsat, 400/422 tuzatish, 409 ziddiyat, 5xx keyinroq',
    tekshir: () =>
      xatoToifasi(401) === 'qayta-kirish' &&
      xatoToifasi(403) === 'ruxsat' &&
      xatoToifasi(400) === 'tuzatish' &&
      xatoToifasi(422) === 'tuzatish' &&
      xatoToifasi(404) === 'tuzatish' &&
      xatoToifasi(409) === 'ziddiyat' &&
      xatoToifasi(429) === 'keyinroq' &&
      xatoToifasi(500) === 'keyinroq' &&
      xatoToifasi(503) === 'keyinroq' &&
      // noaniq kod ma'lumotni jimgina "yaroqsiz" qilmaydi
      xatoToifasi(0) === 'keyinroq' &&
      xatoToifasi(Number.NaN) === 'keyinroq',
  },
  {
    nomi: 'Har tur uchun alohida matn bor va ular bir-biriga o‘xshamaydi; navbatga faqat qayta-kirish va keyinroq tushadi',
    tekshir: () => {
      const matnlar = Object.values(XATO_MATNI);
      return (
        matnlar.length === 5 &&
        new Set(matnlar).size === 5 &&
        matnlar.every((m) => m.length > 20) &&
        navbatgaQoyiladimi('qayta-kirish') &&
        navbatgaQoyiladimi('keyinroq') &&
        !navbatgaQoyiladimi('ruxsat') &&
        !navbatgaQoyiladimi('tuzatish') &&
        !navbatgaQoyiladimi('ziddiyat')
      );
    },
  },
  {
    nomi: '401: sessiya tugagan - anketa YAROQSIZ EMAS: urinish hisoblanmaydi, halqa to‘xtaydi, ro‘yxat o‘zi yuborishga yaroqli qoladi',
    tekshir: async () => {
      tozala();
      for (let i = 0; i < 3; i++) navbatgaQosh({ a: i });
      let urinish = 0;
      const n = await navbatniYubor(async () => { urinish++; return 'qayta-kirish'; });
      const y = navbatniOqi();
      return (
        urinish === 1 &&
        n.qaytaKirish &&
        !n.aloqaYoq &&
        n.qoldi === 3 &&
        n.etibor === 0 &&
        y.every((e) => e.urinishlar === 0 && avtomatikYuboriladimi(e))
      );
    },
  },
  {
    nomi: '401 o‘n marta ketma-ket kelsa ham anketa "e‘tibor talab qiladi"ga AYLANMAYDI (avval besh urinishdan keyin yaroqsiz bo‘lib qolardi)',
    tekshir: async () => {
      tozala();
      navbatgaQosh({ a: 1 });
      for (let i = 0; i < 10; i++) await navbatniYubor(async () => 'qayta-kirish');
      const e = navbatniOqi()[0];
      // qayta kirgach birinchi urinishdayoq o'tadi
      const n = await navbatniYubor(async () => 'saqlandi');
      return e.urinishlar === 0 && n.yuborildi === 1 && n.qoldi === 0 && !n.qaytaKirish;
    },
  },
  {
    nomi: '403: anketa navbatda QOLADI, urinish hisoblanmaydi, qolganlari davom etadi va avtomatik qayta yuborilmaydi',
    tekshir: async () => {
      tozala();
      navbatgaQosh({ a: 'taqiq' }, 'xodim_a');
      navbatgaQosh({ a: 'yaxshi' }, 'xodim_a');
      const n = await navbatniYubor(
        async (m) => ((m as { a: string }).a === 'taqiq' ? 'ruxsat' : 'saqlandi') as YuborishNatijasi,
        'xodim_a'
      );
      const qolgan = navbatniOqi();
      const taqiq = qolgan.find((e) => (e.malumot as { a: string }).a === 'taqiq');
      // keyingi avtomatik yuborishda 403 yozuvga urilmaydi
      let qayta = 0;
      const n2 = await navbatniYubor(async () => { qayta++; return 'saqlandi'; }, 'xodim_a');
      return (
        n.yuborildi === 1 &&
        n.ruxsat === 1 &&
        n.qoldi === 1 &&
        n.etibor === 1 &&
        !n.qaytaKirish &&
        qolgan.length === 1 &&
        taqiq?.ruxsat === true &&
        taqiq.urinishlar === 0 &&
        etiborTalabQiladi(taqiq) &&
        qayta === 0 &&
        n2.yuborildi === 0
      );
    },
  },
  {
    nomi: '403 belgisini FAQAT xodim o‘zi bosganda olinadi va faqat O‘Z yozuvlaridan (hamkasbniki tegilmaydi)',
    tekshir: async () => {
      tozala();
      navbatgaQosh({ a: 1 }, 'xodim_a');
      navbatgaQosh({ a: 2 }, 'xodim_b');
      await navbatniYubor(async () => 'ruxsat', 'xodim_a');
      await navbatniYubor(async () => 'ruxsat', 'xodim_b');
      const olindi = ruxsatBelgisiniOl('xodim_a');
      const a = meniki(navbatniOqi(), 'xodim_a')[0];
      const b = meniki(navbatniOqi(), 'xodim_b')[0];
      // qo'lda qayta urinish endi o'tadi
      const n = await navbatniYubor(async () => 'saqlandi', 'xodim_a');
      return olindi === 1 && !a.ruxsat && b.ruxsat === true && n.yuborildi === 1;
    },
  },
  {
    nomi: '400/422 "yaroqsiz" bo‘lib qoladi (urinish hisoblanadi) - bu tur avvalgidek ishlaydi',
    tekshir: async () => {
      tozala();
      navbatgaQosh({ a: 1 });
      const n = await navbatniYubor(async () => 'yaroqsiz');
      const e = navbatniOqi()[0];
      return e.urinishlar === 1 && !n.qaytaKirish && n.ruxsat === 0 && n.qoldi === 1;
    },
  },
  {
    nomi: 'Navbat yuboruvchisi va forma `xato-toifasi` orqali ajratadi: 401/403 "yaroqsiz"ga tushmaydi; 5xx da tayyor anketa navbatga tushadi',
    tekshir: () => {
      const navbat = kodiOl(readFileSync('src/components/xatlov/xatlov-navbati.tsx', 'utf8'));
      const forma = kodiOl(readFileSync('src/components/xatlov/xatlov-formasi.tsx', 'utf8'));
      return (
        navbat.includes('xatoToifasi(javob.status)') &&
        navbat.includes("holat: 'qayta-kirish'") &&
        navbat.includes("holat: 'ruxsat'") &&
        !/status\s*===\s*40[13]/.test(navbat) &&
        forma.includes('xatoToifasi(javob.status)') &&
        forma.includes('navbatgaQoyiladimi(toifa)') &&
        // bir xil kalit bilan - server aslida qabul qilgan bo'lsa ikkinchi yozuv yaratilmaydi
        /navbatgaQosh\(\s*\{ turi: 'yakuniy', id, kalit, versiya, malumot: yuborishUchun\(h\) \},\s*egasi,\s*kalit\s*\)/.test(forma)
      );
    },
  },

  {
    nomi: 'Saqlash MUVAFFAQIYATSIZ bo‘lsa "saqlandi" deb yozilmaydi: xotira to‘lgan/bloklangan bo‘lsa qoralama ham, navbat ham aniq sabab bilan false/ok:false; forma buni xotira xatosi sifatida ko‘rsatadi',
    tekshir: () => {
      tozala();
      const asl = xotira.setItem.bind(xotira);
      try {
        (xotira as unknown as { setItem: (k: string, v: string) => void }).setItem = () => {
          throw new Error('QuotaExceededError');
        };
        const q = qoralamaSaqla(qoralamaKaliti('xodim_a', 'q1'), { a: 1 }, 'xodim_a');
        const n = navbatgaQosh({ a: 1 }, 'xodim_a');
        const bosh = qoralamalarim('xodim_a').length === 0 && navbatniOqi().length === 0;
        (xotira as unknown as { setItem: (k: string, v: string) => void }).setItem = asl;
        const forma = kodiOl(readFileSync('src/components/xatlov/xatlov-formasi.tsx', 'utf8'));
        return (
          q === false &&
          !n.ok && n.sabab === 'yozib-bolmadi' &&
          bosh &&
          forma.includes('setXotiraXatosi(!ok)') &&
          forma.includes('navbat.ok')
        );
      } finally {
        (xotira as unknown as { setItem: (k: string, v: string) => void }).setItem = asl;
        tozala();
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
  process.exit(xato ? 1 : 0);
}

void main();
