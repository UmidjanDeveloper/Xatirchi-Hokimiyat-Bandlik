/**
 * ============================================================
 *  HUDHUD — maskot (SVG)
 *
 *  Nega Hudhud: Alisher Navoiyning «Lison ut-tayr» dostonida qushlarni
 *  Simurg'ga boshlaydigan donishmand yo'lboshchi — Hudhud (supurgichi qush).
 *  Xatirchi — Navoiy viloyatida: yordamchi ham shu yerning o'z qahramoni.
 *
 *  ── Holatlar RANGDAN tashqari ham ko'rinadi ──
 *  GPT §16: holat matn va belgi orqali tushuntirilsin.
 *    · eshitmoqda  — tojdagi patlar ko'tarilgan + ovoz yoylari;
 *    · oylamoqda   — uch nuqta;
 *    · gapirmoqda  — tumshuq ochiq;
 *    · tayyor      — oddiy.
 *  Harakat (nafas olish, patlar) faqat `prefers-reduced-motion` va
 *  `data-fx="lite"` (zaif qurilma) bo'lmaganda ishlaydi; belgilar esa
 *  doim joyida turadi.
 *
 *  Maskot ichida OQ-KREM TUGMA FON bor: qora tojuchi patlar qorong'i
 *  temada ham ko'rinsin (rang faqat temaga bog'lanmagan).
 * ============================================================
 */

export type HudhudHolati = 'tayyor' | 'eshitmoqda' | 'oylamoqda' | 'gapirmoqda';

export function Hudhud({
  holat = 'tayyor',
  olcham = 40,
  sarlavha,
  className = '',
}: {
  holat?: HudhudHolati;
  olcham?: number;
  /** Ekran o'quvchi uchun nom; berilmasa bezak sifatida yashiriladi */
  sarlavha?: string;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 120 120"
      width={olcham}
      height={olcham}
      className={`hudhud hudhud-${holat} ${className}`}
      role={sarlavha ? 'img' : undefined}
      aria-label={sarlavha}
      aria-hidden={sarlavha ? undefined : true}
      focusable="false"
    >
      <circle cx="60" cy="60" r="58" fill="#FFF4E2" stroke="var(--accent)" strokeWidth="3" />

      {/* Toj: besh pat, uchlari qora */}
      <g className="hudhud-toj" style={{ transformOrigin: '56px 42px' }}>
        <path d="M56 40 C40 30 36 18 38 12 C46 16 54 26 56 40Z" fill="#E8964B" />
        <path d="M56 40 C48 26 48 14 52 8 C58 14 60 26 56 40Z" fill="#E8964B" />
        <path d="M56 40 C56 26 60 14 66 8 C68 16 64 28 56 40Z" fill="#E8964B" />
        <path d="M56 40 C64 28 72 18 80 16 C78 26 68 36 56 40Z" fill="#E8964B" />
        <path d="M56 40 C68 36 78 32 86 32 C82 40 70 44 56 40Z" fill="#E8964B" />
        <circle cx="38" cy="12" r="3.4" fill="#1F2937" />
        <circle cx="52" cy="8" r="3.4" fill="#1F2937" />
        <circle cx="66" cy="8" r="3.4" fill="#1F2937" />
        <circle cx="80" cy="16" r="3.4" fill="#1F2937" />
        <circle cx="86" cy="32" r="3.4" fill="#1F2937" />
      </g>

      {/* Dum (qora, oq yo'l) */}
      <path d="M32 86 L20 100 L40 98 Z" fill="#1F2937" />
      <path d="M25 94 L30 99 L35 93Z" fill="#FFFFFF" />

      {/* Tana */}
      <ellipse cx="54" cy="84" rx="26" ry="24" fill="#E9A25D" />
      <ellipse cx="60" cy="92" rx="16" ry="14" fill="#F3C88F" />

      {/* Qanot: qora-oq yo'l-yo'l */}
      <path d="M26 78 C32 66 52 66 62 78 C56 92 36 98 24 90 Z" fill="#1F2937" />
      <path d="M30 76 C38 72 50 72 58 77" stroke="#FFFFFF" strokeWidth="3.2" fill="none" strokeLinecap="round" />
      <path d="M28 83 C37 79 50 79 59 84" stroke="#FFFFFF" strokeWidth="3.2" fill="none" strokeLinecap="round" />

      {/* Bosh */}
      <circle cx="62" cy="52" r="21" fill="#E9A25D" />
      <circle cx="68" cy="49" r="3.2" fill="#1F2937" />
      <circle cx="69" cy="48" r="1" fill="#FFFFFF" />

      {/* Tumshuq: uzun, ozgina egilgan; gapirayotganda pastki qismi tushadi */}
      <path d="M80 54 C94 56 104 62 110 70 C100 66 90 62 80 60Z" fill="#374151" />
      <path
        className="hudhud-pastki-tumshuq"
        d="M80 60 C92 62 100 66 104 72 C96 70 88 66 80 63Z"
        fill="#4B5563"
        style={{ transformOrigin: '80px 60px', transform: holat === 'gapirmoqda' ? 'rotate(10deg)' : undefined }}
      />

      {/* Oyoq */}
      <path d="M48 106 L48 114 M60 106 L60 114" stroke="#374151" strokeWidth="2.6" strokeLinecap="round" />

      {/* Eshitmoqda: ovoz yoylari (belgi sifatida doim ko'rinadi) */}
      {holat === 'eshitmoqda' && (
        <g className="hudhud-tovush" fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round">
          <path d="M96 40 C100 44 100 50 96 54" />
          <path d="M103 34 C110 41 110 53 103 60" />
        </g>
      )}

      {/* O'ylamoqda: uch nuqta */}
      {holat === 'oylamoqda' && (
        <g fill="var(--accent)">
          <circle className="hudhud-nuqta hudhud-nuqta-1" cx="92" cy="30" r="3.4" />
          <circle className="hudhud-nuqta hudhud-nuqta-2" cx="102" cy="30" r="3.4" />
          <circle className="hudhud-nuqta hudhud-nuqta-3" cx="112" cy="30" r="3.4" />
        </g>
      )}
    </svg>
  );
}
