'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

/**
 * ============================================================
 *  KO'RINGANDA YUKLASH
 *
 *  Bolasini FAQAT ko'rinish maydoniga yaqinlashganda chizadi.
 *  Shu paytgacha o'rnida shu o'lchamdagi bo'sh joy turadi.
 *
 *  ── Nega kerak ──
 *
 *  Diagramma kutubxonasi (`recharts`) 105 KB (gzip) va u
 *  sahifaning hech qaysi birinchi ko'rinadigan qismida emas —
 *  diagramma pastda, ekrandan tashqarida turibdi.
 *
 *  Avval u HAR SAHIFA ochilishida, boshqa hamma narsa bilan
 *  birga yuklanardi. Sekin 3G da bu o'n soniyaga yaqin kutish:
 *  xodim «Хатловларим» sahifasini ochadi, diagrammani esa
 *  ko'rishga ham ulgurmaydi.
 *
 *  ── Nega o'rin saqlanadi ──
 *
 *  Diagramma kelganda sahifa pastga SAKRAMASLIGI kerak: xodim
 *  tugmani bosmoqchi bo'lib turganda ekran siljib ketsa,
 *  boshqa tugmani bosib qo'yadi. Shuning uchun bo'sh joy
 *  diagramma balandligicha oldindan ajratiladi.
 *
 *  ── IntersectionObserver yo'q bo'lsa ──
 *
 *  Juda eski brauzerda u bo'lmasligi mumkin. Bunda diagramma
 *  DARHOL chiziladi: sekinroq, lekin ko'rinadi. «Hech qachon
 *  chizilmaydi» ancha yomon.
 * ============================================================
 */
export function Korinsa({
  balandlik,
  oldindan = 300,
  children,
}: {
  /**
   * Eng KAMI balandlik, px (pol). Haqiqiy balandlikning kichik
   * chegarasiga teng qo'ying: diagramma undan balandroq bo'lsa
   * kengayadi, past bo'lsa bo'sh joy qoladi.
   */
  balandlik: number;
  /** Ko'rinishdan necha px OLDIN yuklashni boshlash */
  oldindan?: number;
  children: ReactNode;
}) {
  const [korindi, setKorindi] = useState(false);
  const joy = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (korindi) return;
    const el = joy.current;
    if (!el) return;

    if (typeof IntersectionObserver === 'undefined') {
      setKorindi(true);
      return;
    }

    const kuzatuvchi = new IntersectionObserver(
      (yozuvlar) => {
        if (yozuvlar.some((y) => y.isIntersecting)) {
          setKorindi(true);
          kuzatuvchi.disconnect();
        }
      },
      { rootMargin: `${oldindan}px 0px` }
    );
    kuzatuvchi.observe(el);
    return () => kuzatuvchi.disconnect();
  }, [korindi, oldindan]);

  /*
   * O'rash elementi HAR IKKI holatda ham bitta: bo'sh joy ham,
   * diagramma ham shu ichida turadi. Shunda
   *
   *  · `data-korinsa` orqali har joyning balandligini kutilgan
   *    (`balandlik`) va haqiqiy qiymat bilan solishtirib
   *    CALIBRLASH mumkin (brauzerda o'lchanadi);
   *  · element almashmaydi, faqat ichi to'ladi.
   *
   * `minHeight` DOIMO turadi, faqat kutish paytida emas. Avval
   * u ko'ringandan keyin olib tashlanardi — natijada diagramma
   * bo'lagi yuklanguncha (`ssr: false` bo'lagi tarmoqdan keladi)
   * blok nolga qulab, ostidagi hamma narsa tepaga sakrardi,
   * keyin yana pastga. O'lchov: shu ikki sakrash skrolldan
   * keyingi siljishning asosiy qismini tashkil qilgan.
   */
  return (
    <div
      ref={joy}
      data-korinsa={balandlik}
      style={{ minHeight: balandlik }}
      aria-busy={korindi ? undefined : 'true'}
      className={korindi ? undefined : 'flex items-center justify-center text-sm text-ink-faint'}
    >
      {korindi ? (
        children
      ) : (
        /* Ekran o'quvchi uchun matn: bo'sh joy unga ko'rinmaydi */
        <span className="sr-only">Diagramma yuklanmoqda</span>
      )}
    </div>
  );
}
