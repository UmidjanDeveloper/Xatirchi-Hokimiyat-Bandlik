/**
 * ============================================================
 *  YUKLANISH HOLATI
 *
 *  ── Qanday nuqsonni yopadi ──
 *
 *  Sahifalarning deyarli hammasi `force-dynamic`: ular har
 *  ochilishda serverda quriladi. Panel esa o'nlab so'rov
 *  yuboradi.
 *
 *  `loading.tsx` bo'lmaganda Next.js hech narsa ko'rsatmaydi:
 *  xodim menyuda bosadi va EKRAN O'ZGARMAYDI. Sust
 *  internetda bu ikki-uch soniya davom etadi.
 *
 *  Xodim esa «bosilmadi» deb o'ylab, yana bosadi. Ba'zan
 *  boshqa bandni bosadi va butunlay boshqa joyga tushadi.
 *
 *  ── Nega skelet, oddiy «Yuklanmoqda» emas ──
 *
 *  Skelet sahifaning SHAKLINI ko'rsatadi: qancha katak,
 *  qancha qator bo'lishini. Ko'z shu shaklga moslashib
 *  turadi va sahifa kelganda «sakrash» sezilmaydi.
 *
 *  ── Harakat kamaytirilgan bo'lsa ──
 *
 *  `animate-pulse` ni `motion-reduce:animate-none` to'xtatadi:
 *  harakatni kamaytirish sozlamasini yoqqan odam uchun
 *  miltillash qoladi, ammo harakat yo'qoladi.
 * ============================================================
 */
export default function Yuklanmoqda() {
  return (
    <div className="space-y-5" aria-busy="true" aria-live="polite">
      {/*
        Ekran o'quvchi uchun MATN kerak: skelet unga ko'rinmaydi.
        Ko'zga ko'rinmaydigan, ammo o'qiladigan qator.
      */}
      <span className="sr-only">Sahifa yuklanmoqda</span>

      <div className="space-y-2">
        <div className="h-7 w-52 animate-pulse rounded bg-surface-muted motion-reduce:animate-none" />
        <div className="h-4 w-72 animate-pulse rounded bg-surface-muted motion-reduce:animate-none" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="karta p-4">
            <div className="h-3 w-24 animate-pulse rounded bg-surface-muted motion-reduce:animate-none" />
            <div className="mt-2 h-8 w-16 animate-pulse rounded bg-surface-muted motion-reduce:animate-none" />
            <div className="mt-1 h-3 w-20 animate-pulse rounded bg-surface-muted motion-reduce:animate-none" />
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="karta space-y-2 p-4 sm:p-5">
            <div className="h-4 w-40 animate-pulse rounded bg-surface-muted motion-reduce:animate-none" />
            <div className="h-3 w-full animate-pulse rounded bg-surface-muted motion-reduce:animate-none" />
            {[0, 1, 2, 3].map((j) => (
              <div
                key={j}
                className="h-3 w-full animate-pulse rounded bg-surface-muted motion-reduce:animate-none"
                style={{ width: `${92 - j * 11}%` }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
