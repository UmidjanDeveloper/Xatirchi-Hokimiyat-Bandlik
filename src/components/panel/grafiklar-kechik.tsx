'use client';

import dynamic from 'next/dynamic';
import type { ComponentProps } from 'react';
import { Korinsa } from '@/components/shared/korinsa';
import type * as G from './grafiklar';

/**
 * ============================================================
 *  DIAGRAMMALAR — KECHIKTIRIB YUKLANADI
 *
 *  ── Qanday nuqsonni yopadi ──
 *
 *  `grafiklar.tsx` `recharts` ni (105 KB gzip) import qiladi.
 *  Uni sahifa to'g'ridan-to'g'ri import qilsa, kutubxona
 *  sahifaning birinchi yuklanishiga kirib qoladi — diagramma
 *  ekrandan tashqarida bo'lsa ham.
 *
 *  Eng og'ir oqibati dala xodimining BOSH sahifasida edi:
 *  `/xatlov` shu orqali diagramma kutubxonasini yuklardi,
 *  xodim esa u yerda diagramma ko'rish uchun emas, anketa
 *  to'ldirish uchun keladi.
 *
 *  ── Qanday ishlaydi ──
 *
 *  1. `import type` — faqat TUR, ish vaqtida hech narsa
 *     yuklamaydi;
 *  2. `dynamic(..., { ssr: false })` — alohida bo'lak, kerak
 *     bo'lganda olinadi;
 *  3. `Korinsa` — diagramma ko'rinishga YAQINLASHGUNCHA bo'lak
 *     so'ralmaydi ham.
 *
 *  Sahifalar ENDI shu fayldan import qiladi, `grafiklar.tsx`
 *  dan emas. `scripts/tezlik-sinov.ts` buni tekshiradi: sahifa
 *  to'g'ridan-to'g'ri import qilsa, nuqson jimgina qaytadi.
 *
 *  Nomlar va xususiyatlar `grafiklar.tsx` bilan BIR XIL —
 *  chaqiruvchi kodda o'zgarish faqat import yo'li.
 * ============================================================
 */

const yuk = <T extends keyof typeof G>(nom: T) =>
  dynamic(() => import('./grafiklar').then((m) => m[nom] as never), { ssr: false });

const DinamikaChizigiYuk = yuk('DinamikaChizigi');
const OqimUstunlariYuk = yuk('OqimUstunlari');
const OsishUstunlariYuk = yuk('OsishUstunlari');
const MahallaUstunlariYuk = yuk('MahallaUstunlari');
const ToifaDoirasiYuk = yuk('ToifaDoirasi');
const MahallalarJadvaliYuk = yuk('MahallalarJadvali');

/*
 * Balandliklar — brauzerda O'LCHANGAN (`data-korinsa` orqali,
 * 390 va 1280 px kenglikda), `ResponsiveContainer` balandligi
 * emas: diagrammaning ustida legenda, sarlavha, boshqaruv ham
 * bor. Avval faqat diagramma balandligi olingan edi va
 * Ishsizlar tarkibi 280 ga qarshi 404-422, Barcha mahallalar
 * 200 ga qarshi 628 chiqdi — sahifa shuncha sakrardi.
 *
 * Qiymat — ikki kenglikdagi KICHIGI (pol): haqiqiy blok
 * balandroq bo'lsa kengayadi, bo'sh joy qolmaydi.
 *
 * Ikkitasi ma'lumotga bog'liq (ro'yxat uzunligi), shuning
 * uchun o'lchamdan emas, formuladan hisoblanadi.
 */

/** Diagramma + legenda ro'yxati: 274 + toifa soni × 26 (n=5 da 404–422) */
function toifaBalandligi(t: ComponentProps<typeof G.ToifaDoirasi>['toifalar']) {
  const n = Object.values(t).filter((v) => v > 0).length;
  return n === 0 ? 0 : 274 + 26 * n;
}

/** Sarlavha 45 + har qator 37 (ko'pi bilan 15 ta) + "barchasini ko'rsatish" tugmasi 28 */
function jadvalBalandligi(soni: number) {
  if (soni === 0) return 0;
  return 45 + 37 * Math.min(15, soni) + (soni > 15 ? 28 : 0);
}

export function DinamikaChizigi(p: ComponentProps<typeof G.DinamikaChizigi>) {
  const Y = DinamikaChizigiYuk as unknown as typeof G.DinamikaChizigi;
  return (
    <Korinsa balandlik={240}>
      <Y {...p} />
    </Korinsa>
  );
}

export function OqimUstunlari(p: ComponentProps<typeof G.OqimUstunlari>) {
  const Y = OqimUstunlariYuk as unknown as typeof G.OqimUstunlari;
  return (
    <Korinsa balandlik={276}>
      <Y {...p} />
    </Korinsa>
  );
}

export function OsishUstunlari(p: ComponentProps<typeof G.OsishUstunlari>) {
  const Y = OsishUstunlariYuk as unknown as typeof G.OsishUstunlari;
  return (
    <Korinsa balandlik={336}>
      <Y {...p} />
    </Korinsa>
  );
}

export function MahallaUstunlari(p: ComponentProps<typeof G.MahallaUstunlari>) {
  const Y = MahallaUstunlariYuk as unknown as typeof G.MahallaUstunlari;
  return (
    <Korinsa balandlik={362}>
      <Y {...p} />
    </Korinsa>
  );
}

export function ToifaDoirasi(p: ComponentProps<typeof G.ToifaDoirasi>) {
  const Y = ToifaDoirasiYuk as unknown as typeof G.ToifaDoirasi;
  return (
    <Korinsa balandlik={toifaBalandligi(p.toifalar)}>
      <Y {...p} />
    </Korinsa>
  );
}

export function MahallalarJadvali(p: ComponentProps<typeof G.MahallalarJadvali>) {
  const Y = MahallalarJadvaliYuk as unknown as typeof G.MahallalarJadvali;
  return (
    <Korinsa balandlik={jadvalBalandligi(p.qamrov.length)}>
      <Y {...p} />
    </Korinsa>
  );
}
