# Joylashtirish tartibi

Ishlab turgan tizimni buzmasdan yangilash.

## Nega tartib muhim

`prisma migrate deploy` avval `build` ichida edi. Ya'ni Vercel
build'ining boshida migratsiya bajarilardi, `next build` esa
undan keyin 2–5 daqiqa davom etardi.

O'sha daqiqalarda **yangi baza va eski kod yonma-yon** yashaydi:
eski deploy hali xizmat ko'rsatib turadi, baza esa allaqachon
o'zgargan. Agar migratsiya biror narsani o'chirgan yoki
qayta nomlagan bo'lsa, eski kod o'sha daqiqalarda ishlamay
qoladi — 70 ta mahalla xodimi uchun, dalada, yarim to'ldirilgan
anketa bilan.

Shuning uchun migratsiya build'dan **chiqarildi** va endi
alohida, qo'lda bajariladi.

## Ikki qoida

**1. Migratsiya faqat qo'shadi.**
Ustun o'chirish, qayta nomlash, tur o'zgartirish, `NOT NULL`
qo'shish — hech biri mumkin emas. `scripts/migratsiya-sinov.ts`
buni tekshiradi va yiqiladi.

Nimadir o'chirish kerak bo'lsa, ikki bosqichda:
- Bugun: kod o'sha ustunni ishlatishni to'xtatadi → push
- Ertaga (kod o'tib bo'lgach): alohida migratsiya bilan o'chiriladi

**2. Migratsiya koddan OLDIN bajariladi.**
Yangi kod yangi ustunni so'rashi mumkin. Agar ustun hali
yo'q bo'lsa, sahifa 500 qaytaradi.

## Qadamlar

```bash
# 1. Sinov va qurish — mahalliy
npm run sinov
npm run build

# 2. Migratsiya bormi?
git status prisma/migrations

# 3. Bor bo'lsa — PRODUCTION bazaga qo'llash (koddan OLDIN)
DATABASE_URL="<production ulanishi>" npm run db:deploy

# 4. Natijani tekshirish
DATABASE_URL="<production ulanishi>" npx prisma migrate status

# 5. Endi kodni jo'natish
git push
```

Migratsiya yo'q bo'lsa 3–4 qadamlar tashlab ketiladi.

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
| `DATABASE_URL` | ha | Supabase ulanishi |
| `SESSION_SECRET` | ha | Kamida 32 belgi. O'zgartirilsa hamma chiqib ketadi |
| `OPENAI_API_KEY` | yo'q | Bo'lmasa AI tahlili o'chadi, qolgani ishlaydi |
| `TELEGRAM_BOT_TOKEN` | yo'q | Bo'lmasa xabarnoma yuborilmaydi |
| `TELEGRAM_WEBHOOK_SIRI` | ha (bot bo'lsa) | Webhook'ni himoyalaydi |
