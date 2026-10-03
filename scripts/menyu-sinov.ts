/**
 * ============================================================
 *  MENYU VA PANELLAR TUZILMASI — SINOV
 *
 *  Ishga tushirish:  npx tsx scripts/menyu-sinov.ts
 *
 *  Qaysi nuqsonlarni qo'riqlaydi:
 *
 *   1. TELEFONDA MENYU KESILIB QOLARDI. Ochilgan menyu `fixed` turadi va
 *      balandligi chegaralanmagan, aylantirib bo'lmas edi: administratorda
 *      19 ta band bor, telefon ekraniga 14 tasi sig'adi - "Boshqaruv",
 *      "Tasdiqlash", "Tizim holati" ekrandan PASTDA qolib, ularga yetib
 *      bo'lmasdi. Endi menyu ekran balandligidan oshmaydi va ichida aylanadi.
 *
 *   2. UZUN MENYU CHALKASH EDI. 19-20 ta band tekis ro'yxatda turardi.
 *      Endi uzun menyuda (11 tadan ko'p band) guruh sarlavhalari bor.
 *      Qisqa menyu (mahalla xodimi, hokim) O'ZGARMAGAN: 70 ta xodim shu
 *      tartibga o'rganib qolgan.
 *
 *   3. ODAMLAR TOPILMASDI. 70 ta mahalla xodimining logini va paroli,
 *      hokim va rahbar hisobi "Boshqaruv" sahifasining o'rtasida, 9 000
 *      pikselli ro'yxatda edi. Endi `/xodimlar` sahifasi: rol kartalari,
 *      "ko'zi bilan ko'rish", filtr, 30 tadan ko'rsatish.
 *
 *   4. BIR XIL BLOKLAR. "Tahlil paneli", "Operatsion panel" va
 *      "Boshqaruv" bir xil AI xulosa va dinamika bloklari bilan boshlanardi.
 *      Tahlil paneliga kira oladigan rolda ular ish sahifalarida YOPIQ.
 * ============================================================
 */
import { existsSync, readFileSync } from 'node:fs';
import type { Rol } from '@prisma/client';
import {
  GURUH_CHEGARASI,
  GURUH_NOMI,
  GURUH_TARTIBI,
  MENYU,
  boshSahifa,
  menyuGuruhlari,
  menyuOl,
  yolgaRuxsat,
} from '../src/components/shell/navigatsiya';

type Sinov = { nomi: string; tekshir: () => boolean };

const ROLLAR: Rol[] = ['YETTILIK', 'BANDLIK', 'BANDLIK_RAHBAR', 'HOKIM', 'ADMIN'];

/** Izohlarsiz kod: izohdagi so'z tekshiruvni aldamasin */
const kodiOl = (m: string) => m.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/^\s*\/\/.*$/gm, '');
const oqi = (y: string) => kodiOl(readFileSync(y, 'utf8'));

const SINOVLAR: Sinov[] = [
  /* ══ Guruhlar ══ */
  {
    nomi: 'Har bir menyu bandining guruhi bor va u ma\'lum; "bosh" guruhning sarlavhasi yo\'q',
    tekshir: () =>
      MENYU.every((b) => (GURUH_TARTIBI as readonly string[]).includes(b.guruh)) &&
      GURUH_TARTIBI.every((g) => g in GURUH_NOMI) &&
      GURUH_NOMI.bosh === null &&
      GURUH_TARTIBI[0] === 'bosh',
  },
  {
    nomi: 'Qisqa menyu (mahalla xodimi, hokim) O\'ZGARMAGAN: bitta sarlavhasiz guruh, tartib `MENYU` dagidek',
    tekshir: () =>
      ROLLAR.filter((r) => menyuOl(r).length <= GURUH_CHEGARASI).length >= 2 &&
      ROLLAR.filter((r) => menyuOl(r).length <= GURUH_CHEGARASI).every((r) => {
        const g = menyuGuruhlari(r);
        return g.length === 1 && g[0].nomi === null && g[0].bandlar.map((b) => b.yol).join() === menyuOl(r).map((b) => b.yol).join();
      }) &&
      /* mahalla xodimi tartibi: xatlov hamon vazifalardan keyin, kurslardan oldin */
      menyuOl('YETTILIK').map((b) => b.yol).slice(0, 4).join() === '/vazifalar,/xatlov,/xatlov/yangi,/kurslar',
  },
  {
    nomi: 'Uzun menyu (bandlik, rahbar, administrator): har band aynan BIR marta, bo\'sh guruh yo\'q, tartib `GURUH_TARTIBI`, birinchisi "Vazifalarim"',
    tekshir: () =>
      ROLLAR.filter((r) => menyuOl(r).length > GURUH_CHEGARASI).length === 3 &&
      ROLLAR.filter((r) => menyuOl(r).length > GURUH_CHEGARASI).every((r) => {
        const g = menyuGuruhlari(r);
        const yollar = g.flatMap((x) => x.bandlar.map((b) => b.yol));
        const tartib = g.map((x) => GURUH_TARTIBI.indexOf(x.guruh));
        return (
          g.every((x) => x.bandlar.length > 0) &&
          yollar.length === menyuOl(r).length &&
          new Set(yollar).size === yollar.length &&
          tartib.every((v, i) => i === 0 || v > tartib[i - 1]) &&
          g[0].guruh === 'bosh' && g[0].bandlar[0].yol === '/vazifalar' &&
          g.slice(1).every((x) => typeof x.nomi === 'string' && x.nomi.length > 0)
        );
      }),
  },
  {
    nomi: 'Sarlavhalar kirillda va ichida lotin harfi aralashmagan (butun ilova bitta manbadan o\'giriladi)',
    tekshir: () =>
      Object.values(GURUH_NOMI).every((n) => n === null || (/[Ѐ-ӿ]/.test(n) && !/[A-Za-z]/.test(n))) &&
      MENYU.filter((b) => b.yol === '/xodimlar').every((b) => /[Ѐ-ӿ]/.test(b.nomi) && !/[A-Za-z]/.test(b.nomi)),
  },

  /* ══ Telefonda menyu aylanadi ══ */
  {
    nomi: 'Telefonda ochilgan menyu ekran balandligidan oshmaydi va ichida aylanadi (`max-h` + `overflow-y-auto`), Koaladan yuqorida (z-[45])',
    tekshir: () => {
      const k = oqi('src/components/shell/app-shell.tsx');
      const i = k.indexOf('workspace-sidebar');
      const sinf = k.slice(i, i + 700);
      return (
        sinf.includes('max-h-[calc(100dvh-4rem)]') &&
        sinf.includes('overflow-y-auto') &&
        sinf.includes('overscroll-contain') &&
        sinf.includes('z-[45]') &&
        /* kompyuterda yon menyu o'z joyida qoladi */
        sinf.includes('lg:sticky') && sinf.includes('lg:z-20') &&
        k.includes('menyuGuruhlari(rol)') && k.includes('g.nomi &&')
      );
    },
  },

  /* ══ /xodimlar ══ */
  {
    nomi: '`/xodimlar` — faqat administrator (menyuda ham, qo\'riqchida ham), guruhi "boshqaruv"',
    tekshir: () => {
      const b = MENYU.find((x) => x.yol === '/xodimlar');
      return (
        !!b && b.rollar.join() === 'ADMIN' && b.guruh === 'boshqaruv' &&
        ROLLAR.every((r) => yolgaRuxsat(r, '/xodimlar') === (r === 'ADMIN')) &&
        ROLLAR.every((r) => yolgaRuxsat(r, '/xodimlar/x') === (r === 'ADMIN')) &&
        /* hokim va rahbar hisoblarini ko'rishning o'zi administrator huquqi: boshqalarga menyuda ko'rinmaydi */
        !menyuOl('BANDLIK_RAHBAR').some((x) => x.yol === '/xodimlar')
      );
    },
  },
  {
    nomi: '`/xodimlar` sahifasi mavjud, `yolgaRuxsat` bilan qo\'riqlangan, rol kartalari + ko\'rish tugmasi + filtr + ro\'yxat; ADMIN kartasida "ko\'rish" yo\'q',
    tekshir: () => {
      const f = 'src/app/(ilova)/xodimlar/page.tsx';
      if (!existsSync(f)) return false;
      const k = oqi(f);
      return (
        k.includes("yolgaRuxsat(sessiya.rol, '/xodimlar')") &&
        k.includes('<PanelniKorish hisoblar={hisoblar} />') &&
        k.includes("rol === 'ADMIN' ? [] : faolHisoblar(rol)") &&
        k.includes('<XodimBoshqaruvi') &&
        k.includes("FILTRLAR.find((f) => f === searchParams.rol)") &&
        /* "hisob yaratish" yo'li: hisob bo'lmagan rol kartasi shaklni ochadi */
        k.includes('yangi=1') && k.includes("ochiqBoshlash={searchParams.yangi === '1'}")
      );
    },
  },
  {
    nomi: '"Panelini ko\'rish" mavjud yo\'lni ishlatadi (`POST /api/admin/korish`), administratorning o\'z hisobidan chiqmaydi va `/` ga o\'tadi',
    tekshir: () => {
      const k = oqi('src/components/admin/panelni-korish.tsx');
      return (
        k.includes("fetch('/api/admin/korish'") && k.includes("method: 'POST'") &&
        k.includes("router.push('/')") && k.includes('router.refresh()') &&
        !k.includes('/api/auth/kirish')
      );
    },
  },
  {
    nomi: 'Hamma parolni bir yo\'la ko\'rsatadigan yoki yuklaydigan yo\'l YO\'Q: parol faqat qator tugmasi bilan ochiladi (jurnalga yoziladi)',
    tekshir: () => {
      const sahifa = oqi('src/app/(ilova)/xodimlar/page.tsx');
      const royxat = oqi('src/components/admin/xodim-royxati.tsx');
      return (
        !/berilganParol/.test(sahifa) &&
        !/shifrniOch/.test(sahifa) &&
        royxat.includes('parolniOch(x.id)') &&
        (royxat.match(/\/api\/admin\/xodimlar\/\$\{id\}`\)/g) ?? []).length >= 1
      );
    },
  },
  {
    nomi: 'Xodimlar ro\'yxati 30 tadan ko\'rsatadi va "Yana ko\'rsatish" tugmasi bor; qidiruv butun ro\'yxatdan qidiradi',
    tekshir: () => {
      const k = oqi('src/components/admin/xodim-royxati.tsx');
      return (
        k.includes('const ENG_KOP_QATOR = 30;') &&
        k.includes('royxat.slice(0, korsatish)') &&
        k.includes('royxat.length > korsatish') &&
        /* `royxat` o'zi qidiruv bilan butun `xodimlar` dan filtrlanadi, kesilmaydi */
        /const royxat = useMemo\(\(\) => \{[\s\S]*?return xodimlar\.filter/.test(k)
      );
    },
  },

  /* ══ Bir xil bloklar ══ */
  {
    nomi: '"Operatsion panel": tahlil paneliga kira oladigan rolda AI xulosa va dinamika YOPIQ blokda, bandlik mutaxassisida (tahlil paneli yo\'q) ochiq',
    tekshir: () => {
      const k = oqi('src/app/(ilova)/bandlik/page.tsx');
      return (
        k.includes('const tahlilPanelda = tahlilKoradi(sessiya.rol);') &&
        k.includes('{tahlilPanelda ? (') &&
        (k.match(/<YigmaBlok/g) ?? []).length === 2 &&
        k.includes('{aiXulosa}') && k.includes('{dinamikaBloglari}') &&
        /<AiXulosa\s+mahallaId=\{mahallaId\}/.test(k) &&
        /* bandlik mutaxassisi tahlil paneliga kira olmaydi: unga bloklar ochiq qolishi shart */
        !menyuOl('BANDLIK').some((b) => b.yol === '/panel') &&
        k.includes(') : (\n        aiXulosa\n      )}')
      );
    },
  },
  {
    nomi: '"Boshqaruv": ro\'yxat o\'rniga `/xodimlar` kartasi (sonlar bilan), tahlil bloklari yopiq, sahifa raqamlar va tizim bilan boshlanadi',
    tekshir: () => {
      const k = oqi('src/app/(ilova)/admin/page.tsx');
      const aiOrni = k.indexOf('<AiXulosa');
      const kartaOrni = k.indexOf('href="/xodimlar"');
      const yigmaOrni = k.indexOf('<YigmaBlok');
      return (
        !k.includes('<XodimBoshqaruvi') &&
        k.includes("prisma.user.groupBy({ by: ['rol']") &&
        kartaOrni > 0 && yigmaOrni > kartaOrni && aiOrni > yigmaOrni &&
        k.includes('<DinamikaBloglari')
      );
    },
  },
  {
    nomi: 'Yig\'iladigan blok — brauzerning o\'z `<details>` elementi (JavaScript kerak emas, server komponenti)',
    tekshir: () => {
      const k = readFileSync('src/components/shared/yigma-blok.tsx', 'utf8');
      return k.includes('<details') && k.includes('<summary') && !k.includes("'use client'") && !k.includes('useState');
    },
  },

  /* ══ Hokim va rahbarning o'z menyusi o'zgarmadi ══ */
  {
    nomi: 'Hokim va rahbarning bosh sahifasi va huquqlari o\'zgarmagan: hokim `/panel`, rahbar `/panel`, bandlik `/bandlik`, mahalla `/xatlov`, administrator `/admin`',
    tekshir: () =>
      boshSahifa('HOKIM') === '/panel' && boshSahifa('BANDLIK_RAHBAR') === '/panel' && boshSahifa('BANDLIK') === '/bandlik' &&
      boshSahifa('YETTILIK') === '/xatlov' && boshSahifa('ADMIN') === '/admin' &&
      yolgaRuxsat('HOKIM', '/panel') && !yolgaRuxsat('HOKIM', '/bandlik') && !yolgaRuxsat('HOKIM', '/xodimlar') &&
      !yolgaRuxsat('YETTILIK', '/panel') && yolgaRuxsat('BANDLIK_RAHBAR', '/mahalla-xodimlari'),
  },
];

let xato = 0;
for (const s of SINOVLAR) {
  let ok = false;
  try {
    ok = s.tekshir();
  } catch (e) {
    console.log(`     xatolik: ${(e as Error).message}`);
  }
  if (!ok) xato++;
  console.log(`${ok ? 'OK  ' : 'XATO'} ${s.nomi}`);
}
console.log(`\n${SINOVLAR.length - xato}/${SINOVLAR.length} o'tdi`);
process.exit(xato ? 1 : 0);
