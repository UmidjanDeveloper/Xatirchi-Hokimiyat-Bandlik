/**
 * ============================================================
 *  KOALA — ovozli yordamchining maskoti
 *
 *  Maskot — foydalanuvchi tanlagan koala rasmi (`public/maskot/`):
 *  128 va 256 piksel, WebP (shaffof fon) va PNG zaxira. Rasm shaffof,
 *  shuning uchun orqasida och rangli "disk" turadi: qorong'i temada ham
 *  kulrang tanasi aniq ko'rinadi.
 *
 *  Ichki nomlar (`agent`, `hudhud:*` voqea va kalit nomlari) oldingi
 *  nomdan qolgan: ularni o'zgartirish saqlangan suhbatlarni va hisobot
 *  tugmalari bilan aloqani buzardi. Foydalanuvchiga ko'rinadigan nom — Koala.
 *
 *  ── Holatlar RANGDAN va HARAKATDAN tashqari ham ko'rinadi ──
 *  GPT §16: holat matn va belgi orqali tushuntirilsin. Rasm bitta, shuning
 *  uchun holat burchakdagi BELGI bilan ko'rsatiladi:
 *    · eshitmoqda  — ovoz yoylari;
 *    · oylamoqda   — uch nuqta;
 *    · gapirmoqda  — uch ustunli tovush chizig'i;
 *    · tayyor      — belgisiz.
 *  Harakat (nafas olish, quloq qimirlashi) faqat `prefers-reduced-motion`
 *  va `data-fx="lite"` (zaif qurilma) bo'lmaganda ishlaydi; belgilar esa
 *  doim joyida turadi.
 * ============================================================
 */

export type MaskotHolati = 'tayyor' | 'eshitmoqda' | 'oylamoqda' | 'gapirmoqda';

/** Rasm manzillari (nomda versiya: rasm almashsa nom ham o'zgaradi, kesh eskirmaydi) */
export const MASKOT_RASMI = {
  webp1x: '/maskot/koala-v1-128.webp',
  webp2x: '/maskot/koala-v1-256.webp',
  png: '/maskot/koala-v1-128.png',
} as const;

export function Maskot({
  holat = 'tayyor',
  olcham = 40,
  sarlavha,
  className = '',
}: {
  holat?: MaskotHolati;
  olcham?: number;
  /** Ekran o'quvchi uchun nom; berilmasa bezak sifatida yashiriladi */
  sarlavha?: string;
  className?: string;
}) {
  return (
    <span
      className={`maskot maskot-${holat} ${className}`}
      style={{ width: olcham, height: olcham }}
      role={sarlavha ? 'img' : undefined}
      aria-label={sarlavha}
      aria-hidden={sarlavha ? undefined : true}
    >
      <span className="maskot-disk" />
      <picture>
        <source type="image/webp" srcSet={`${MASKOT_RASMI.webp1x} 1x, ${MASKOT_RASMI.webp2x} 2x`} />
        {/* Oldindan optimallashtirilgan statik rasm: `next/image` qayta ishlashi shart emas */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={MASKOT_RASMI.png}
          alt=""
          width={olcham}
          height={olcham}
          decoding="async"
          draggable={false}
          className="maskot-rasm"
        />
      </picture>

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
