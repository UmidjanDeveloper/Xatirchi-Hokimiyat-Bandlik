/**
 * ============================================================
 *  DIZAYN VA UX — SINOV
 *
 *  Ishga tushirish:  npx tsx scripts/dizayn-sinov.ts
 *
 *  ── Bu yerda xato nimaga olib keladi ──
 *
 *  UX nuqsoni «chiroyli emas» degan gap emas. Dala
 *  sharoitida u ISH YO'QOLISHIGA olib boradi:
 *
 *    · xatolik ekrani inglizcha bo'lsa — xodim «sayt
 *      buzildi» deb ishni to'xtatadi;
 *    · yuklanish ko'rinmasa — qayta bosadi va boshqa
 *      joyga tushadi;
 *    · xato maydoni topilmasa — anketa yuborilmay qoladi;
 *    · avtosaqlash ishlamasa — yarim soatlik ish ketadi.
 *
 *  Shuning uchun bu sinovlar «ko'rinishi» ni emas, XULQni
 *  tekshiradi.
 * ============================================================
 */
import { envYukla } from './env-yukla';
envYukla();

import { existsSync, readFileSync } from 'node:fs';
import { bosHolat } from '../src/components/xatlov/holat';
import { formadaMazmunBormi } from '../src/components/xatlov/xatlov-formasi';

type Sinov = { nomi: string; tekshir: () => boolean };

const oqi = (y: string) => (existsSync(y) ? readFileSync(y, 'utf8') : '');

const kodiOl = (m: string) =>
  m.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const CSS = oqi('src/app/globals.css');
const XATOLIK = oqi('src/app/error.tsx');
const UMUMIY = oqi('src/app/global-error.tsx');
const TOPILMADI = oqi('src/app/not-found.tsx');
const YUKLANISH = oqi('src/app/(ilova)/loading.tsx');
const FORMA = oqi('src/components/xatlov/xatlov-formasi.tsx');
const HISOBLASH = oqi('src/components/shared/hisoblash.tsx');
const REYESTR = oqi('src/app/(ilova)/reyestr/page.tsx');

const SINOVLAR: Sinov[] = [
  /* ── 1. XATOLIK EKRANLARI ── */
  {
    nomi: 'Xatolik sahifasi BOR va o‘zbekcha',
    tekshir: () =>
      XATOLIK.length > 0 &&
      XATOLIK.includes("'use client'") &&
      XATOLIK.includes('Sahifa ochilmadi') &&
      /* Nima qilish kerakligi aytiladi */
      XATOLIK.includes("Qayta urinib ko&apos;rish"),
  },
  {
    /*
     * Xato matnida so'rov tafsilotlari, jadval nomlari yoki
     * ulanish satri bo'lishi mumkin.
     */
    nomi: 'Xatoning O‘ZI ekranga chiqmaydi — faqat `digest`',
    tekshir: () => {
      const k = kodiOl(XATOLIK);
      return (
        k.includes('error.digest') &&
        /* `error.message` va `error.stack` ekranda YO'Q */
        !k.includes('{error.message}') &&
        !k.includes('error.stack')
      );
    },
  },
  {
    /*
     * `error.tsx` ildiz layoutning ICHIDA chiziladi. Xato
     * layoutda bo'lsa — shrift, tema yoki alifbo
     * provayderida — u umuman ko'rsatilmaydi va oq ekran
     * qoladi.
     */
    nomi: 'Eng tashqi xatolik uchun `global-error.tsx` ham bor',
    tekshir: () =>
      UMUMIY.length > 0 &&
      UMUMIY.includes('<html') &&
      UMUMIY.includes('<body') &&
      /* Uslub ICHKARIDA — `globals.css` yuklanmagan bo'lishi mumkin */
      UMUMIY.includes('style={{'),
  },
  {
    nomi: '404 sahifasi ham o‘zbekcha va bosh sahifaga olib boradi',
    tekshir: () =>
      TOPILMADI.length > 0 &&
      TOPILMADI.includes('Sahifa topilmadi') &&
      TOPILMADI.includes('href="/"'),
  },
  {
    nomi: 'Xatolik ekranida ma‘lumot yo‘qolmagani aytiladi',
    tekshir: () =>
      /*
       * Xodim uchun eng muhim savol «ishim ketdimi?».
       * Javob ekranda turishi kerak.
       */
      XATOLIK.includes('yo&apos;qolmadi') && UMUMIY.includes('yo&apos;qolmaydi'),
  },

  /* ── 2. YUKLANISH HOLATI ── */
  {
    nomi: 'Yuklanish skeleti bor',
    tekshir: () => YUKLANISH.length > 0 && YUKLANISH.includes('animate-pulse'),
  },
  {
    nomi: 'Skelet ekran o‘quvchiga MATN bilan aytiladi',
    tekshir: () =>
      YUKLANISH.includes('aria-busy="true"') &&
      YUKLANISH.includes('sr-only') &&
      YUKLANISH.includes('yuklanmoqda'),
  },
  {
    /*
     * Harakatni kamaytirish sozlamasini yoqqan odam uchun
     * miltillash qoladi, ammo harakat yo'qoladi.
     */
    nomi: 'Skelet HARAKATNI KAMAYTIRISH sozlamasini hurmat qiladi',
    tekshir: () => YUKLANISH.includes('motion-reduce:animate-none'),
  },

  /* ── 3. KATTA BOSISH MAYDONI ── */
  {
    nomi: 'Sensorli ekranda bosish maydoni kamida 44 piksel',
    tekshir: () =>
      CSS.includes('@media (pointer: coarse)') && CSS.includes('min-height: 44px'),
  },
  {
    /*
     * Chegara FAQAT sensorli ekranda. Sichqoncha bilan
     * ishlaydigan kompyuterda hokim panelidagi zich
     * jadvallar cho'zilib ketmasin.
     */
    nomi: 'Chegara sichqonchali kompyuterga TEGMAYDI',
    tekshir: () => {
      const bosh = CSS.indexOf('@media (pointer: coarse)');
      if (bosh < 0) return false;
      /* `min-height: 44px` faqat shu blokning ICHIDA */
      const oldin = CSS.slice(0, bosh);
      return !oldin.includes('min-height: 44px');
    },
  },
  {
    nomi: 'Ikkilamchi tugma sinfi bor — ikkita bir xil kuchli tugma qo‘yilmaydi',
    tekshir: () => CSS.includes('.tugma-ikkilamchi'),
  },

  /* ── 4. FORMADA XATO MAYDONIGA O'TISH ── */
  {
    nomi: 'Xato topilganda AYNAN o‘sha katakka o‘tiladi',
    tekshir: () => {
      const k = kodiOl(FORMA);
      return (
        k.includes('xatoKatagigaOt') &&
        k.includes("querySelector<HTMLElement>('.maydon-xato')") &&
        k.includes('scrollIntoView') &&
        k.includes('focus({ preventScroll: true })')
      );
    },
  },
  {
    nomi: 'Katak topilmasa — eski xulq saqlanadi (tepaga surish)',
    tekshir: () => {
      const k = kodiOl(FORMA);
      const bosh = k.indexOf('xatoKatagigaOt');
      const kes = k.slice(bosh, bosh + 900);
      return kes.includes('if (!katak)') && kes.includes('window.scrollTo');
    },
  },
  {
    nomi: 'Yakuniy yuborishda ham, qoralamada ham chaqiriladi',
    tekshir: () => {
      const k = kodiOl(FORMA);
      return (k.match(/xatoKatagigaOt\(\)/g) ?? []).length >= 2;
    },
  },

  /* ── 5. MA'LUMOT YO'QOLISHIDAN HIMOYA ── */
  {
    /*
     * ── ENG QIMMAT TUZATISH ──
     *
     * Avval avtosaqlash sharti `!h.manzil && !h.oilaBoshligi`
     * edi: anketani O'RTASIDAN boshlab to'ldirgan xodimning
     * ishi HECH QACHON saqlanmasdi.
     *
     * Dala sharoitida bu oddiy hol: odam bor ma'lumotini
     * aytib bo'ladi, manzilni esa keyin, darvozaga qarab
     * yozadi.
     */
    nomi: 'Anketa O‘RTASIDAN to‘ldirilsa ham saqlanadi',
    tekshir: () => {
      const k = kodiOl(FORMA);
      return (
        k.includes('formadaMazmunBormi') &&
        /* Eski, tor shart QOLMADI */
        !k.includes('if (!h.manzil && !h.oilaBoshligi) return;')
      );
    },
  },
  {
    /*
     * Maydonlarni birma-bir sanash mo'rt: yangi maydon
     * qo'shilsa, uni ro'yxatga yozish ESDAN chiqadi va
     * nuqson jimgina qaytadi.
     */
    nomi: 'Mazmun tekshiruvi BO‘SH SHAKL bilan solishtiriladi',
    tekshir: () => {
      const k = kodiOl(FORMA);
      const bosh = k.indexOf('function formadaMazmunBormi');
      const kes = k.slice(bosh, bosh + 500);
      return kes.includes('bosHolat(') && kes.includes('JSON.stringify');
    },
  },
  {
    /*
     * Bitta mahallali xodimda mahalla boshlanishdan to'lgan
     * bo'ladi — u «mazmun bor» deb aldardi va bo'sh forma
     * eski qoralamani o'chirib yuborardi.
     */
    nomi: 'Mahalla tanlovi «mazmun» deb HISOBLANMAYDI',
    tekshir: () => {
      const k = kodiOl(FORMA);
      const bosh = k.indexOf('function formadaMazmunBormi');
      const kes = k.slice(bosh, bosh + 500);
      return kes.includes("mahallaId: ''");
    },
  },

  /* ── 5b. AVTOSAQLASH — HAQIQIY XULQ ── */
  {
    nomi: 'BO‘SH forma «mazmun bor» demaydi',
    tekshir: () => !formadaMazmunBormi(bosHolat('')),
  },
  {
    /*
     * Bitta mahallali xodimda mahalla boshlanishdan
     * to'lgan bo'ladi. Avval bu «mazmun bor» deb aldardi
     * va bo'sh forma eski qoralamani o'chirib yuborardi.
     */
    nomi: 'FAQAT mahalla tanlangan bo‘lsa — hamon bo‘sh',
    tekshir: () => !formadaMazmunBormi(bosHolat('mfy-123')),
  },
  {
    /*
     * ── ASOSIY SHART ──
     *
     * Avval saqlash sharti `manzil || oilaBoshligi` edi.
     * Dala sharoitida xodim anketani O'RTASIDAN boshlaydi:
     * oila tarkibi, daromad, yer maydoni — manzilni esa
     * keyin, darvozaga qarab yozadi.
     *
     * Eski kodda bu ishning hammasi saqlanmasdi.
     */
    nomi: 'MANZILSIZ, faqat oila tarkibi to‘ldirilgan bo‘lsa ham MAZMUN BOR',
    tekshir: () => {
      const h = { ...bosHolat(''), jamiAzo: 5, bolalarSoni: 3 };
      return formadaMazmunBormi(h) && !h.manzil && !h.oilaBoshligi;
    },
  },
  {
    nomi: 'Faqat daromad yozilgan bo‘lsa ham MAZMUN BOR',
    tekshir: () => {
      const h = { ...bosHolat(''), oylikDaromad: 2500000 };
      return formadaMazmunBormi(h) && !h.manzil && !h.oilaBoshligi;
    },
  },
  {
    nomi: 'Faqat telefon yozilgan bo‘lsa ham MAZMUN BOR',
    tekshir: () => formadaMazmunBormi({ ...bosHolat(''), telefon: '901234567' }),
  },
  {
    nomi: 'Eski xulq: manzil yozilsa ham, albatta MAZMUN BOR',
    tekshir: () =>
      formadaMazmunBormi({ ...bosHolat(''), manzil: 'Navoiy ko‘chasi 5' }) &&
      formadaMazmunBormi({ ...bosHolat(''), oilaBoshligi: 'Ali Valiyev' }),
  },

  /* ── 6. RAQAM QANDAY HISOBLANGAN ── */
  {
    nomi: 'Raqamning hisoblash usuli ochiladi',
    tekshir: () =>
      HISOBLASH.length > 0 &&
      HISOBLASH.includes('Қандай ҳисобланган') &&
      HISOBLASH.includes('Ҳисоблаш') &&
      HISOBLASH.includes('Манба'),
  },
  {
    /*
     * Tooltip sensorli ekranda umuman ishlamaydi — barmoq
     * «hover» qilmaydi. `<details>` esa JavaScript ham
     * talab qilmaydi.
     */
    nomi: 'Ochilish `details` bilan — JavaScript talab qilmaydi',
    tekshir: () =>
      HISOBLASH.includes('<details') &&
      HISOBLASH.includes('<summary') &&
      !HISOBLASH.includes("'use client'"),
  },
  {
    nomi: 'Hokimlikning TO‘RTTA asosiy raqami izohlangan',
    tekshir: () => {
      const k = kodiOl(REYESTR);
      return (k.match(/hisoblash=\{\{/g) ?? []).length >= 4;
    },
  },
  {
    /*
     * Izohda faqat «qanday» emas, DIQQAT ham bo'lishi kerak:
     * raqamga ishonishda nimani bilish zarur.
     */
    nomi: 'Izohda «diqqat» ham bor — raqamning chegarasi aytiladi',
    tekshir: () => {
      const k = kodiOl(REYESTR);
      return (k.match(/ogohlik:/g) ?? []).length >= 3 && HISOBLASH.includes('Диққат');
    },
  },
  {
    nomi: 'Yozuvlarga havola RUXSAT doirasidagi sahifaga boradi',
    tekshir: () => {
      const k = kodiOl(REYESTR);
      /* `/ishsizlar` va `/reyestr` — ikkovi ham o'z qo'riqchisiga ega */
      return k.includes("yol: '/ishsizlar'") && k.includes("yol: '/reyestr'");
    },
  },

  /* ── 7. HOLAT RANGDAN TASHQARI MATN BILAN ── */
  {
    /*
     * Rangni ajratmaydigan odam ham, qog'ozga bosilgan nusxa
     * ham MATNni o'qiydi.
     */
    nomi: 'Holat rangdan TASHQARI matn bilan ham aytiladi',
    tekshir: () => {
      const v = kodiOl(oqi('src/app/(ilova)/vazifalar/page.tsx'));
      const r = kodiOl(REYESTR);
      return v.includes('OGOHLIK_NOMI[blok.ogohlik]') && r.includes('SABAB_NOMI[r.sabab]');
    },
  },
  {
    nomi: 'Yorug‘ va qorong‘i mavzu ikkisi ham belgilangan',
    tekshir: () =>
      CSS.includes('prefers-color-scheme: dark') &&
      CSS.includes("[data-theme='dark']") &&
      CSS.includes("[data-theme='light']"),
  },
  {
    nomi: 'Klaviatura fokusi ko‘rinadi',
    tekshir: () => CSS.includes(':focus-visible'),
  },

  /* ── 7. KARTOCHKA HAVOLASI BLOK BO‘LISHI SHART ── */
  /*
   * `<a>` standart `inline`. Ichida blok elementlar (div, p) bor inline havolaning fon va
   * chegarasi faqat birinchi va oxirgi qator bo‘laklarida chiziladi: karta "yo‘qolib", faqat
   * burchak yoylari qoladi (Operatsion paneldagi "12 oydan oshib ishsiz", "Mustahkamlash
   * tekshiruvi", "Taklifdan bosh tortgan" kartalari, 2-oktabrdan beri). Karta grid'ning
   * bevosita elementi bo‘lganda grid uni blok qilardi; "Qanday hisoblangan" uchun <div>
   * ichiga o‘ralgach bu to‘xtagan edi.
   */
  {
    nomi: 'Havola-kartochka (`a.karta`) blok: CSS `:where(a).karta { display: block }` bor, ustuvorligi oshmaydi (flex/grid klasslari ustun)',
    tekshir: () => /:where\(a\)\.karta\s*\{[^}]*display:\s*block/.test(CSS),
  },
  {
    nomi: 'Operatsion panel KPI havolasi `block` klassi bilan yozilgan va sababi izohlangan',
    tekshir: () => {
      const b = oqi('src/app/(ilova)/bandlik/page.tsx');
      return /karta-bosiladigan block p-4/.test(kodiOl(b)) && /`block` SHART/.test(b);
    },
  },

  /* ── 8. TELEFONDA SAHIFA GORIZONTAL SILJIMASIN (pet "ko'rinmay qoldi") ── */
  /*
   * Operatsion panelda "Suhbat navbati"/"Taklif navbati" `grid lg:grid-cols-2` ichida edi: telefonda
   * yagona ustun `auto` bo'lib, ichidagi `truncate` (nowrap) qatorlar uni 390 -> 417 px ga kengaytirardi.
   * Butun sahifa o'ngga siljib, `fixed` Hamroh tugmasi ekran chetidan chiqib ketardi. `grid-cols-1`
   * `minmax(0, 1fr)` beradi. Brauzerdagi to'liq audit: `npm run sinov:brauzer-pet`.
   */
  {
    nomi: 'Operatsion panel: navbat kartalari gridi `grid-cols-1` bilan (telefonda sahifa kengaymaydi), kartada `min-w-0`',
    tekshir: () => {
      const b = oqi('src/app/(ilova)/bandlik/page.tsx'); const k = kodiOl(b);
      return /className="grid grid-cols-1 gap-4 lg:grid-cols-2"[^]{0,40}<Navbat/.test(k) && /<section className="karta min-w-0 p-4 sm:p-5">\s*<div className="flex items-baseline justify-between gap-2">/.test(k);
    },
  },
  {
    nomi: 'Hamroh tugmasi: oyna yiqilsa tugma qaytadi (xato chegarasi), joy ekranning haqiqiy o‘lchamidan hisoblanadi',
    tekshir: () => {
      const b = oqi('src/components/agent/agent-tugmasi.tsx');
      return /class OynaChegarasi extends Component/.test(b) && /getDerivedStateFromError/.test(b) && /<OynaChegarasi key=\{yiqilgan\}/.test(b) &&
        /visualViewport/.test(b) && !/petChegarasi\([^)]*window\.innerWidth/.test(b);
    },
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
