/**
 * ============================================================
 *  KOALA — ovozli yordamchining maskoti
 *
 *  Maskot — foydalanuvchi tanlagan koala rasmlari (`public/maskot/`):
 *  HAR BIR HOLAT UCHUN ALOHIDA POZA (tayyor, eshitmoqda, oylamoqda,
 *  gapirmoqda). Hammasi bir xil kesimda: poza almashganda koala o'lchami
 *  va o'rni sakramaydi. 128 va 256 piksel, WebP (shaffof fon) va PNG zaxira.
 *  Rasm shaffof, shuning uchun orqasida och rangli "disk" turadi:
 *  qorong'i temada ham kulrang tanasi aniq ko'rinadi.
 *
 *  Ichki nomlar (`agent`, `hudhud:*` voqea va kalit nomlari) oldingi
 *  nomdan qolgan: ularni o'zgartirish saqlangan suhbatlarni va hisobot
 *  tugmalari bilan aloqani buzardi. Foydalanuvchiga ko'rinadigan nom — Koala.
 *
 *  ── Holatlar RANGDAN va HARAKATDAN tashqari ham ko'rinadi ──
 *  GPT §16: holat matn va belgi orqali tushuntirilsin. Poza o'zi ham
 *  holatni aytadi (qulog'iga qo'l — eshitmoqda, iyagiga qo'l — oylamoqda,
 *  ochiq og'iz — gapirmoqda), lekin poza kichik o'lchamda (40 px) ajralmay
 *  qolishi mumkin, shuning uchun burchakdagi BELGI ham saqlangan:
 *    · eshitmoqda  — ovoz yoylari;
 *    · oylamoqda   — uch nuqta;
 *    · gapirmoqda  — uch ustunli tovush chizig'i;
 *    · tayyor      — belgisiz.
 *  Harakat (nafas olish va hokazo) faqat `prefers-reduced-motion` va
 *  `data-fx="lite"` (zaif qurilma) bo'lmaganda ishlaydi; poza va belgilar
 *  esa doim joyida turadi.
 *
 *  Yuklash: tugma (har sahifada) faqat "tayyor" pozani yuklaydi. Suhbat
 *  oynasi `hammasi` bilan to'rttasini birdan yuklaydi — poza almashganda
 *  rasm kutib turmaydi va miltillamaydi.
 * ============================================================
 */

export type MaskotHolati = 'tayyor' | 'eshitmoqda' | 'oylamoqda' | 'gapirmoqda';

export const MASKOT_HOLATLARI: readonly MaskotHolati[] = ['tayyor', 'eshitmoqda', 'oylamoqda', 'gapirmoqda'];

/** Rasm manzillari (nomda versiya: rasm almashsa nom ham o'zgaradi, kesh eskirmaydi) */
export const MASKOT_RASMI: Record<MaskotHolati, { webp1x: string; webp2x: string; png: string }> = {
  tayyor: {
    webp1x: '/maskot/koala-v2-tayyor-128.webp',
    webp2x: '/maskot/koala-v2-tayyor-256.webp',
    png: '/maskot/koala-v2-tayyor-128.png',
  },
  eshitmoqda: {
    webp1x: '/maskot/koala-v2-eshitmoqda-128.webp',
    webp2x: '/maskot/koala-v2-eshitmoqda-256.webp',
    png: '/maskot/koala-v2-eshitmoqda-128.png',
  },
  oylamoqda: {
    webp1x: '/maskot/koala-v2-oylamoqda-128.webp',
    webp2x: '/maskot/koala-v2-oylamoqda-256.webp',
    png: '/maskot/koala-v2-oylamoqda-128.png',
  },
  gapirmoqda: {
    webp1x: '/maskot/koala-v2-gapirmoqda-128.webp',
    webp2x: '/maskot/koala-v2-gapirmoqda-256.webp',
    png: '/maskot/koala-v2-gapirmoqda-128.png',
  },
};

export function Maskot({
  holat = 'tayyor',
  olcham = 40,
  sarlavha,
  hammasi = false,
  className = '',
}: {
  holat?: MaskotHolati;
  olcham?: number;
  /** Ekran o'quvchi uchun nom; berilmasa bezak sifatida yashiriladi */
  sarlavha?: string;
  /** To'rtta pozani ham oldindan yuklaydi (suhbat oynasi); aks holda faqat joriy poza */
  hammasi?: boolean;
  className?: string;
}) {
  const pozalar = hammasi ? MASKOT_HOLATLARI : [holat];
  return (
    <span
      className={`maskot maskot-${holat} ${className}`}
      style={{ width: olcham, height: olcham }}
      role={sarlavha ? 'img' : undefined}
      aria-label={sarlavha}
      aria-hidden={sarlavha ? undefined : true}
    >
      <span className="maskot-disk" />
      {pozalar.map((h) => (
        <picture key={h} className={`maskot-poza${h === holat ? ' maskot-poza-faol' : ''}`}>
          <source type="image/webp" srcSet={`${MASKOT_RASMI[h].webp1x} 1x, ${MASKOT_RASMI[h].webp2x} 2x`} />
          {/* Oldindan optimallashtirilgan statik rasm: `next/image` qayta ishlashi shart emas */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={MASKOT_RASMI[h].png}
            alt=""
            width={olcham}
            height={olcham}
            decoding="async"
            draggable={false}
            className="maskot-rasm"
          />
        </picture>
      ))}

      {holat !== 'tayyor' && (
        <svg className="maskot-belgi" viewBox="0 0 40 40" focusable="false" aria-hidden="true">
          <circle cx="20" cy="20" r="18.5" fill="#FFFFFF" stroke="var(--accent)" strokeWidth="2.5" />
          {holat === 'eshitmoqda' && (
            <g className="maskot-tovush" fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round">
              <path d="M15 14 C19 18 19 22 15 26" />
              <path d="M22 10 C29 17 29 23 22 30" />
            </g>
          )}
          {holat === 'oylamoqda' && (
            <g fill="var(--accent)">
              <circle className="maskot-nuqta maskot-nuqta-1" cx="10.5" cy="20" r="3" />
              <circle className="maskot-nuqta maskot-nuqta-2" cx="20" cy="20" r="3" />
              <circle className="maskot-nuqta maskot-nuqta-3" cx="29.5" cy="20" r="3" />
            </g>
          )}
          {holat === 'gapirmoqda' && (
            <g fill="var(--accent)">
              <rect className="maskot-ustun maskot-ustun-1" x="10.5" y="14" width="4.5" height="12" rx="2.2" />
              <rect className="maskot-ustun maskot-ustun-2" x="17.8" y="10" width="4.5" height="20" rx="2.2" />
              <rect className="maskot-ustun maskot-ustun-3" x="25" y="14" width="4.5" height="12" rx="2.2" />
            </g>
          )}
        </svg>
      )}
    </span>
  );
}
