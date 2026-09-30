'use client';

/**
 * ============================================================
 *  ENG TASHQI XATOLIK
 *
 *  ── Nega ALOHIDA fayl ──
 *
 *  `error.tsx` ildiz `layout.tsx` ning ICHIDA chiziladi. Ya'ni
 *  xato aynan layoutda bo'lsa — shrift yuklovchida, tema
 *  provayderida yoki alifbo provayderida — u umuman
 *  ko'rsatilmaydi va brauzerda oq ekran qoladi.
 *
 *  `global-error.tsx` esa o'zining `<html>` va `<body>` sini
 *  yozadi, ya'ni layoutga TAYANMAYDI.
 *
 *  ── Nega uslub ichkarida ──
 *
 *  Bu holda `globals.css` ham yuklanmagan bo'lishi mumkin.
 *  Shuning uchun ranglar va o'lchamlar shu faylning o'zida,
 *  atribut sifatida yozilgan. Chiroyli emas, ammo ISHLAYDI —
 *  va bu ekranning yagona vazifasi shu.
 * ============================================================
 */
export default function UmumiyXatolik({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="uz">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
          background: '#0f172a',
          color: '#e6edf7',
          padding: '1rem',
        }}
      >
        <div style={{ maxWidth: 420, textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.125rem', margin: '0 0 0.5rem' }}>Ilova ishga tushmadi</h1>

          <p style={{ fontSize: '0.875rem', color: '#9fb0c9', margin: '0 0 1.25rem' }}>
            Texnik xatolik yuz berdi. Kiritgan ma&apos;lumotingiz telefon xotirasida
            saqlanadi va yo&apos;qolmaydi.
          </p>

          <button
            type="button"
            onClick={reset}
            style={{
              minHeight: 44,
              padding: '0.625rem 1.25rem',
              borderRadius: 8,
              border: 'none',
              background: '#2f7d6b',
              color: '#ffffff',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Qayta urinib ko&apos;rish
          </button>

          {error.digest && (
            <p style={{ fontSize: '0.75rem', color: '#6f819b', marginTop: '1rem' }}>
              Xatolik belgisi: {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  );
}
