# Bog'liqliklar xavfsizligi (`npm audit`) — halol holat

**Sana: 2026-10-01.** Bu hujjat `npm audit --omit=dev` ning ochiq
ogohlantirishlarini va ular **bu loyihaga haqiqatan tegishli-tegishli
emasligini** yozadi. «Tegishli emas» faqat kodda tekshirilgan joylarda
aytiladi; tekshirilmaganini «tekshirilmagan» deb yozdim.

> Xulosa: ochiq ogohlantirishlar bor (9 ta: 2 critical, 4 high, 3 moderate).
> Ularning ko'pi **major yangilash** (Next 14 → 16, jsPDF 2 → 4) talab qiladi.
> Hozir xatlov (so'rovnoma) ketayotgani uchun bu yangilashlar **ataylab
> keyinga qoldirilgan** va to'liq regressiya bilan alohida bajariladi.
> Bu «xavf yo'q» degani emas.

## Jadval

| Paket | Daraja | Tuzatish | Biz qilgan | Qoldiq xavf |
|---|---|---|---|---|
| `xlsx` 0.18.5 | high (prototype pollution, ReDoS) | npm'da **yo'q** (0.20.3 faqat SheetJS CDN'ida) | `prototipQoriqchisi`: fayl o'qilganda `Object.prototype` va boshqa prototiplar o'zgarsa **tiklanadi, fayl rad etiladi, urinish `/tizim` jurnaliga yoziladi** (`src/lib/prototip-qoriqchi.ts`, 21 sinov, mutatsiya bilan 16/16 ushlandi). Yuklash faqat tizimga kirgan, ruxsatli rollarga; hajm 8 MB | **ReDoS (CPU band qilish) qoladi**: maxsus fayl bitta so'rovni sekinlashtirishi mumkin. Prototip ifloslanishidan himoya faqat 13 ta o'rnatilgan prototipni kuzatadi |
| `next` 14.2.35 | critical (jami 23 ta xabar) | faqat `16.3.8` (major) | Quyida «Next.js: bizga tegishlimi» | **Ochiq.** Rejalashtirilgan yangilash |
| `jspdf` 2.5.2, `jspdf-autotable`, `dompurify` | moderate | `jspdf@4` (major) | PDF **faqat brauzerda** yaratiladi (serverda emas): xavf foydalanuvchining o'z brauzeri bilan cheklangan | DOMPurify xavflari kiritilgan HTML'ni tozalaganda chiqadi; biz jsPDF'ga begona HTML bermaymiz (tekshirilishi kerak: yangilashda qayta ko'rib chiqiladi) |
| `postcss` (Next ichida) | high | Next bilan birga | Faqat **qurish** vaqtida CSS'ni ishlaydi, serverda begona CSS o'qimaydi | Next yangilanganda yopiladi |
| `brace-expansion` | high | `npm audit fix` bor | `eslint`/`eslint-config-next` (faqat ishlab chiqish asboblari) va `exceljs → archiver → readdir-glob` (Excel hisobotini ZIP qilib yozishda) orqali keladi. Kodimiz glob matniga begona kiritma bermaydi; `exceljs` ichki ishlatilishi to'liq **tekshirilmagan** | Dependabot PR'ida yopiladi |
| `uuid` 8.3.2 (`exceljs` ichida) | moderate | major | Ogohlantirish `buf` argumentli `v3/v5/v6` haqida; biz `uuid` ni o'zimiz chaqirmaymiz, `exceljs` ichki ishlatishi **tekshirilmagan** | Dependabot |

## Next.js: bizga tegishlimi

Kodda **tekshirilgan** (qidirilgan va topilmagan):

| Ogohlantirish turi | Tekshiruv natijasi |
|---|---|
| Server Actions (DoS, SSRF, hajmsiz payload) | `'use server'` kodda **yo'q** |
| Edge runtime (hajmsiz Server Action) | `runtime = 'edge'` **yo'q** |
| Rewrites (smuggling, SSRF) | `next.config.js` da `rewrites` **yo'q** |
| i18n (middleware bypass) | `i18n` sozlanmagan |
| CSP nonce / `beforeInteractive` (XSS) | nonce ishlatilmaydi (CSP `'unsafe-inline'`, Report-Only), `beforeInteractive` **yo'q** |
| Windows server RCE | Vercel (Linux) — tegishli emas |
| `next/image` optimizeri | Faqat `src/components/shared/gerb.tsx` (mahalliy gerb rasmi); `remotePatterns` **yo'q**. Optimizer Vercel infratuzilmasida ishlaydi. AVIF xabarining aniq shartlari bu yerda **tekshirilmagan** |

**Tegishli bo'lib qoladi** (App Router umuman, kod bilan yopib bo'lmaydi):
React Server Components so'rovlarini qayta ishlash (DoS), Middleware/Proxy
keshini zaharlash, RSC keshi to'qnashuvi. Bularni faqat Next yangilash yopadi.

**Qaror:** Next 14 → 16 yangilash — alohida, rejalashtirilgan ish:
1. xatlov tugagandan keyin (ish vaqtidan tashqari),
2. alohida shoxda, `npm run ci-taqlid` (TOLIQ rejim) + `sinov:http` +
   brauzer sinovi bilan,
3. Vercel'da preview (migratsiya preview'da bajarilmaydi),
4. orqaga qaytarish: oldingi deployni «Promote» qilish (bazaga tegilmaydi).

Hozir yangilanmagan sababi: major yangilash `middleware`, kesh va `cookies()`
xatti-harakatini o'zgartirishi mumkin; tizimning ruxsat chegaralari (mahalla
izolyatsiyasi, rol tekshiruvi) shu qatlamlarga tayanadi. Xatlov paytida bu
xavf ogohlantirishlarning o'zidan katta deb baholandi. **Bu qaror sizniki:**
agar hozir ochiq ogohlantirishlar siz uchun qabul qilib bo'lmas bo'lsa,
yangilashni xatlov oynasidan tashqarida oldinroq o'tkazish mumkin.

## xlsx: nima uchun almashtirilmadi

Yuklash formasi `.xlsx`, `.xls` va `.csv` ni qabul qiladi. `exceljs` kabi
tuzatilgan muqobillar `.xls` (eski Excel) ni o'qimaydi; ularga o'tish
foydalanuvchilarning amaldagi fayllarini buzadi. Tuzatilgan `xlsx@0.20.3`
npm'da yo'q: SheetJS uni faqat o'z CDN'idan tarqatadi (bu muhitdan CDN
**ochilmadi** — 403). Yo'l:

```bash
# o'z kompyuteringizdan (CDN ochiladigan joyda):
npm install https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz
npx tsx scripts/dalil-sinov.ts      # 41/41 chiqishi kerak
npm run sinov
```

Muhim: tarballni lockfile'ga yozib qo'yish tashqi tarmoqqa har deployda
bog'lanishni **olib tashlamaydi** (lockfile'dagi manzil yana CDN). Shuning
uchun bu qadamni siz qaror qiling.

## Avtomatik kuzatuv

`.github/dependabot.yml`: har dushanba (Toshkent vaqti 06:00) npm uchun,
oyiga bir marta GitHub Actions uchun PR ochadi. Kichik/patch yangilashlar
**bitta** PR'ga yig'iladi (shovqin kam); major yangilashlar (Next, React,
Prisma, TypeScript, Tailwind) avtomatik **taklif qilinmaydi**. PR'lar
o'zi birlashtirilmaydi: `Tekshiruv` oqimidan o'tadi va odam ko'zidan
o'tadi. Xavfsizlik yangilanishlari `ignore` ga qaramay keladi.

Nima TEKSHIRILMAGAN: bu faylning o'zi Dependabot GitHub'da yoqilganida
(Settings → Code security → Dependabot) ishlaydi; yoqilganini men ko'rolmayman.
