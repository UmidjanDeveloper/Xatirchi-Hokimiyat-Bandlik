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

**HALI SOZLANMAGAN.** Supabase'da avtomatik zaxira bor, lekin
uni tiklash hech qachon sinalmagan. Bazada 40 377 xonadon
ma'lumoti turibdi.

Qilinishi kerak:
- Supabase panelida Point-in-Time Recovery yoqilganini tekshirish
- Sinov loyihasiga tiklab ko'rish va yozuvlar sonini solishtirish
- Buni chorakda bir marta takrorlash

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
