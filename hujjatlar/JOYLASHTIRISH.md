# Joylashtirish tartibi

Ishlab turgan tizimni buzmasdan yangilash.

## Qisqa javob: qo'lda migratsiya KERAK EMAS

`git push` ning o'zi yetarli. Migratsiya Vercel production
qurilishining ichida, `next build` dan **oldin** avtomatik
bajariladi.

```
prisma generate → scripts/migratsiya-yoy.mjs → next build → deploy
                  ↑ migratsiya shu yerda
```

Qo'riqchi skript `VERCEL_ENV` ni tekshiradi:

| Qayerda | `VERCEL_ENV` | Nima qiladi |
|---|---|---|
| Mahalliy qurish | yo'q | o'tkazib yuboradi |
| CI (GitHub Actions) | yo'q | o'tkazib yuboradi |
| Vercel preview | `preview` | o'tkazib yuboradi |
| **Vercel production** | `production` | migratsiyani yoyadi |

Ya'ni preview deploy ham, mahalliy qurish ham production
bazasiga tega olmaydi.

## Ikki qoida

**1. Migratsiya faqat qo'shadi.**
Ustun o'chirish, qayta nomlash, tur o'zgartirish, `NOT NULL`
qo'shish — hech biri mumkin emas. `scripts/migratsiya-sinov.ts`
buni tekshiradi va yiqiladi, ya'ni bunday kod CI dan o'tmaydi.

Nimadir o'chirish kerak bo'lsa, ikki bosqichda:
- Bugun: kod o'sha ustunni ishlatishni to'xtatadi → push
- Ertaga (kod o'tib bo'lgach): alohida migratsiya bilan o'chiriladi

**2. Migratsiya koddan OLDIN bajariladi.**
Yangi kod yangi ustunni so'rashi mumkin; ustun hali yo'q bo'lsa
sahifa 500 qaytaradi. Shuning uchun qo'riqchi skript `next build`
dan oldin turadi — bu tartibni buzib bo'lmaydi.

### Nega «baza yangi, kod eski» oralig'i xavfsiz

Migratsiya tugagach `next build` yana 2–5 daqiqa davom etadi.
O'sha daqiqalarda baza YANGI, sayt esa hali ESKI kod bilan
ishlaydi.

Bu oraliq faqat migratsiya o'chirsa yoki nom almashtirsa xavfli
bo'lardi — eski kod yo'qolgan ustunni so'rab qolardi. 1-qoida
aynan shuning uchun bor: faqat qo'shadigan migratsiya uchun eski
kod yangi jadval haqida bilmaydi va uni so'ramaydi.

### Migratsiya yiqilsa

Skript yiqiladi → `next build` boshlanmaydi → deploy bo'lmaydi
→ saytda eski kod ishlayveradi, bazaga tegilmagan.

Ataylab shunday: yarim qo'llangan baza ustida ishlagan saytdan
ko'ra, eski-yu butun sayt yaxshi.

Demak **yiqilgan deploy ma'lumotni buzmaydi** — u shunchaki
yangilanishni to'xtatadi.

## Qadamlar

```bash
# 1. Sinov va qurish — mahalliy
npm run ci-taqlid      # toza papka, toza baza
npm run build

# 2. Jo'natish — migratsiya o'zi qo'llanadi
git push -u origin <shox>
```

Keyin Vercel'dagi deploy logini bir ko'rib qo'yish kifoya:
`[migratsiya]` bilan boshlangan qatorlarni qidiring.

| Logda ko'ringan | Ma'nosi |
|---|---|
| `production bazasiga qo'llanmoqda…` + `tayyor — endi next build` | migratsiya o'tdi |
| `o'tkazib yuborildi — VERCEL_ENV=preview` | bu preview, production emas |
| `ЙИҚИЛДИ — деплой тўхтатилди` | deploy bo'lmadi, sayt eski kodda |

## Qo'lda tekshirish (faqat o'qiydi, hech narsani o'zgartirmaydi)

```bash
DATABASE_URL="<production direct ulanishi>" \
DIRECT_URL="<production direct ulanishi>" \
npx prisma migrate status
```

`Database schema is up to date!` — hammasi joyida.

`following migrations have not yet been applied` — deploy
yiqilgan yoki hali chiqmagan. Shu holda qo'lda yoyish mumkin:

```bash
DATABASE_URL="<production direct ulanishi>" \
DIRECT_URL="<production direct ulanishi>" \
npm run db:deploy
```

> **Direct ulanish shart.** Supabase'da ikki manzil bor: pooler
> (6543-port) va bazaning o'zi (5432). `prisma migrate` pooler
> orqali **ishlamaydi** — u sessiya darajasidagi ulanish talab
> qiladi. Migratsiya uchun har doim 5432.

## Orqaga qaytarish

Migratsiya faqat qo'shgani uchun **kodni qaytarish yetarli**:
eski kod yangi ustunni so'ramaydi, ular bo'sh turaveradi.

```bash
git revert <commit>
git push
```

Bazani orqaga qaytarish kerak emas va tavsiya etilmaydi —
qo'shilgan ustunni o'chirish ma'lumot yo'qotishi mumkin.

## Zaxira nusxa

To'liq tartib, maqsadlar (RPO/RTO) va tiklash sinovi:
**[ZAXIRA-VA-TIKLASH.md](ZAXIRA-VA-TIKLASH.md)**.

Nusxa olish: `NUSXA_MANBA_URL='postgresql://…' scripts/zaxira-nusxa.sh`
(`pg_dump`, faqat o'qiydi; fayl faqat egasiga ochiq; butunligi va SHA-256
tekshiriladi; eski nusxalar aylantiriladi, eng yangi 3 tasi o'chirilmaydi;
papka repo ichida bo'lishi mumkin emas — fuqaro ma'lumotlari git'ga
tushmasin). Avtomatik jadval **yo'q**: nusxani qayerda saqlash fuqaro
ma'lumotlari siyosatiga bog'liq (ZAXIRA-VA-TIKLASH.md, 6-bo'lim).

Bog'liqliklardagi ochiq xavfsizlik ogohlantirishlari va ularning bizga
tegishliligi: **[XAVFSIZLIK-QARAMLIKLAR.md](XAVFSIZLIK-QARAMLIKLAR.md)**.

Qisqacha: kodni qaytarish va migratsiya himoyasi bor; Supabase zaxirasidan
tiklash **hali sinalmagan** — tizim buni «Tizim holati» sahifasida va
vazifalar taxtasida shoshilinch deb ko'rsatadi. Mantiqiy nusxadan tiklash
sinovi `scripts/zaxira-tiklash.sh` bilan alohida bazada o'tkaziladi.

## Monitoring (avtomatik ishlar, xatolar, navbat)

Administrator uchun **«Tizim holati»** sahifasi (`/tizim`):

- har bir avtomatik ish (brifing, xabarlar navbati) **oxirgi MUVAFFAQIYATLI
  qachon ishlagani**, kechikishi va xatosi; qo'lda bosilgan tugma jadvalni
  ishlagan deb ko'rsatmaydi;
- xabar navbati: kutilayotgan, qayta urinish kutayotgan, xato bilan
  tugagan, 6 soatdan ortiq ushlanib qolgan; xatolilarni navbatga qaytarish;
- xatolar jurnali (maxfiy ma'lumotsiz; takrorlar yig'iladi; «ko'rildi»);
- zaxira tiklash sinovi sanasi va eskirsa eslatma (92 kun);
- «iz» bo'yicha qidirish: xodim «xato (iz_0123456789)» desa shu yerdan topiladi.

Yangi cron `vercel.json` ga qo'shilsa, `src/lib/tizim-nomlari.ts` dagi
`CRON_ISHLARI` ga ham yoziladi (aks holda sinov yiqiladi).

### Tashqi kuzatuv (UptimeRobot yoki shunga o'xshash)

Administrator 1 oy yo'q bo'lsa ham signal kelishi uchun ikki ochiq manzil bor.
Ular **kirishsiz** ishlaydi (shuning uchun ichida shaxsiy ma'lumot ham,
xato matni ham yo'q — faqat «ok / xato» holati):

| Manzil | Nimani aytadi | Javob kodi |
|---|---|---|
| `/api/health` | Jarayon tirikmi (bazaga tegmaydi) | 200 |
| `/api/health/readiness` | Baza javob beryaptimi va avtomatik ishlar (brifing, xabarlar navbati) o'z vaqtida ishlayaptimi | 200 sog' / **503** nosog' |

Sozlash: UptimeRobot → New monitor → HTTP(s) →
`https://www.xatirchibandlik.uz/api/health/readiness`, har 5 daqiqada,
**503 yoki javob yo'q = ogohlantirish** (e-pochta/Telegram). 503 ikki xil
sababdan bo'ladi: baza javob bermagan (3 soniya chegara) yoki avtomatik ish
muddatidan kechikkan/xato bergan — qaysi biri ekanini `/tizim` sahifasidan
ko'ring. Yangi deploydan keyin avtomatik ish hali ishlamagan bo'lsa, bu
nosozlik hisoblanmaydi (36 soatgacha); eskirgan tizimda hisoblanadi.
Javob 10 soniya keshlanadi (ochiq manzilni tinimsiz so'rash bazani
yuklamasin). Bu halol chegara: monitoring tashqi xizmat, uni **siz** ulaysiz —
men ulanganini ko'rolmayman.

### Murojaat muddati xabarlari

Muddati yaqinlashgan yoki o'tgan murojaatlar uchun mas'ul xodimga (o'tib
ketgan bo'lsa bandlik rahbarlariga ham) Telegram xabari navbatga qo'yiladi
(`src/lib/murojaat-xabari.ts`, kunlik cron ichida). Bir muddat uchun bir
turdagi xabar **bir marta** (muddat uzaytirilsa yangi muddat — yangi xabar).
Xabarda murojaatchining ismi, telefoni yoki matni **yo'q**. 30 kundan ortiq
kechikkanlar xabarga kirmaydi (toshqin bo'lmasin; «Vazifalarim» da
ko'rinadi), bir ishga tushishda ko'pi bilan 100 ta. Telegram'ga ulanmagan
xodimga xabar yuborilmaydi — navbatda «bekor qilindi» deb yoziladi.
Vercel Hobby'da cron kuniga bir marta ishlaydi, shuning uchun xabar
kechikishi ~1 kungacha bo'lishi mumkin. «15 kun» — **tizimning odatiy
muddati, qonuniy muddat emas**.

## Migratsiyalar (so'nggi bosqichlar)

Hammasi **faqat qo'shadi** (`IF NOT EXISTS`, takror ishga tushirish xavfsiz),
`git push` da Vercel build ichida avtomatik qo'llanadi. Qaytarish: hammasi
uchun **kodni qaytarish yetarli** (yuqoridagi «Orqaga qaytarish»).

| Migratsiya | Nima qo'shadi | Bo'lim |
|---|---|---|
| `20261001100000_oila_rejasi` | Oilaviy rivojlanish rejasi, aloqa yozuvlari | §11 |
| `20261001120000_kuzatuv_30_60_90` | 30/60/90 kunlik kuzatuv tekshiruvi | §12 |
| `20261001140000_yollanma_va_elon_sharti` | Nomzod yo'llanmasi, e'lon shartlari | §13a |
| `20261001160000_kurslar` | Kurslar va kursga yo'llanma | §13b |
| `20261001180000_mahalliy_buyurtmalar` | Xizmat takliflari, mahalliy buyurtmalar | §13c |
| `20261001200000_murojaat_va_yordam` | Murojaatlar, murojaat tarixi, yordam dasturlari katalogi (bo'sh) | §14 |
| `20261001220000_monitoring` | Ish izlari, xato jurnali, kirish urinishlari, zaxira sinovi | §19 |
| `20261001240000_murojaat_xabari` | Xabar turi `MUROJAAT_MUDDATI` (faqat enum qiymati qo'shiladi) | Laziz repo'sidan g'oya |

Tekshirish (faqat o'qiydi): `npx prisma migrate status` — «up to date» bo'lishi kerak.

## Muhit o'zgaruvchilari

| Nomi | Kerak | Izoh |
|---|---|---|
| `DATABASE_URL` | ha | Supabase ulanishi. Productionda pooler (6543) bo'lishi mumkin |
| `DIRECT_URL` | **ha** | Migratsiya uchun bazaning o'zi (5432). Qo'yilmasa `DATABASE_URL` ishlatiladi va pooler bo'lsa migratsiya yiqiladi |
| `SESSION_SECRET` | ha | Kamida 32 belgi. O'zgartirilsa hamma chiqib ketadi |
| `ADMIN_USERNAME` | ha | Birinchi administrator — `db:seed` uchun |
| `ADMIN_PASSWORD` | ha | Birinchi administrator paroli |
| `ADMIN_FISH` | yo'q | Administratorning ism-familiyasi |
| `CRON_SECRET` | ha (cron bo'lsa) | `/api/cron/brifing` va `/api/telegram/navbat` ni himoyalaydi |
| `TELEGRAM_BOT_TOKEN` | yo'q | Bo'lmasa xabarnoma yuborilmaydi, qolgani ishlaydi |
| `TELEGRAM_WEBHOOK_SIRI` | ha (bot bo'lsa) | Kamida 16 belgi. Bo'lmasa webhook 503 qaytaradi |
| `TELEGRAM_BOT_NOMI` | yo'q | Havolalarda ko'rsatiladigan bot nomi |
| `AI_PROVAYDER` | yo'q | `groq` \| `openai` \| `gemini` \| `anthropic`. Yozilmasa kaliti bor birinchisi olinadi |
| `GROQ_API_KEY` va boshqalar | yo'q | Tanlangan provayderning kaliti. Bo'lmasa AI tahlili o'chadi, qolgani ishlaydi |

AI ga **faqat ismsiz, jamlangan** raqamlar yuboriladi — ism,
manzil va telefon hech qachon chiqmaydi.
