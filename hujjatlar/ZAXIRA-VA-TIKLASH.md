# Zaxira, tiklash va maqsadlar (RPO / RTO)

Bu hujjat ikki savolga javob beradi:

1. **Ma'lumot yo'qolsa, ko'pi bilan qancha yo'qoladi?** (RPO)
2. **Tizim ishdan chiqsa, qancha vaqtda qayta ishlaydi?** (RTO)

Va uchinchisiga, eng muhimiga: **zaxira haqiqatan tiklanadimi?** Sinalmagan
zaxira — zaxira emas.

> **Halol holat (2026-10-01).** Quyidagi raqamlar *maqsad*, o'lchangan
> kafolat emas. Supabase zaxirasidan tiklash bu yerda **hali bir marta ham
> sinalmagan** va tizimning o'zi buni «Tizim holati» sahifasida shoshilinch
> deb ko'rsatib turadi. Mahalliy nusxadan tiklash sinovi
> (`scripts/zaxira-tiklash.sh`) o'tkazilgan; uning natijasi pastda.

## 1. Nima bor

| Qatlam | Nima | Holat |
|---|---|---|
| Kod | Git (GitHub) | Har commit saqlanadi |
| Kodni qaytarish | Vercel: oldingi deployni «Promote» qilish | Daqiqalar; bazaga tegmaydi |
| Migratsiya | Faqat qo'shadi (jadval/ustun o'chirmaydi) | Kod rollbacki baza rollbacksiz ishlaydi |
| Tasodifan o'chirilgan yozuv | Arxiv (`arxivSanasi`) + `/arxiv` sahifasi | Haqiqiy o'chirish yo'q; qaytariladi |
| Baza zaxirasi | **Supabase** | **Tarifga bog'liq — pastdagi tekshiruvga qarang** |
| Mustaqil mantiqiy nusxa (`pg_dump`) | Qo'lda: `scripts/zaxira-tiklash.sh` | Avtomatik jadval **yo'q** |

### Supabase zaxirasini tekshiring (1 daqiqa)

Supabase Dashboard → loyiha → **Database → Backups**:

- Qaysi tarif va nechta kunlik nusxa saqlanadi?
- **Point-in-Time Recovery (PITR)** yoqilganmi?

Bu javoblarni shu hujjatga yozib qo'ying. Men ularni ko'rolmayman va
taxmin qilmayman: ba'zi tariflarda yuklab olinadigan kunlik nusxa umuman
bo'lmaydi — u holda RPO «noma'lum» emas, **cheksiz** (zaxira yo'q) deb
hisoblang va 4-bo'limdagi mustaqil nusxani joriy qiling.

## 2. Maqsadlar

| Ko'rsatkich | Maqsad | Nimaga bog'liq | Tasdiqlanganmi |
|---|---|---|---|
| **RPO** — baza | ≤ 24 soat (kunlik nusxa), PITR bo'lsa ≤ bir necha daqiqa | Supabase tarifi | **Yo'q** — tarif tekshirilmagan |
| **RPO** — kod | 0 (har commit GitHub'da) | — | Ha |
| **RTO** — noto'g'ri kod chiqdi | ≤ 30 daqiqa (Vercel'da oldingi deployni qaytarish) | Vercel kirishi | Tartib aniq, sinalmagan |
| **RTO** — migratsiya yiqildi | 0 (build to'xtaydi, eski kod ishlayveradi) | `migratsiya-yoy.mjs` | Ha (kod bilan sinalgan) |
| **RTO** — baza buzildi/yo'qoldi | ≤ 4 soat ish vaqti | Nusxa hajmi, Supabase | **Qisman**: mahalliy tiklash vaqti o'lchangan (pastda), Supabase'da emas |

«Maqsad» — biz intiladigan raqam. U **kafolat emas**. Haqiqiy raqamni
tiklash sinovi beradi: har sinovdan keyin shu jadvalni yangilang.

## 3. Stsenariylar

### A. Noto'g'ri kod chiqdi, sayt buzildi
1. Vercel → Deployments → oxirgi **yaxshi** deploy → **Promote to Production**.
2. Baza bilan hech narsa qilmang: migratsiyalar faqat qo'shadi, eski kod yangi
   jadval/ustunlarni shunchaki ko'rmaydi.
3. Keyin kodni tuzating va qayta push qiling.

### B. Migratsiya yiqildi
Hech narsa qilmang: build boshlanmaydi, sayt eski kod bilan ishlaydi
(`JOYLASHTIRISH.md`). Sababini Vercel build logidan o'qing.

### C. Yozuv tasodifan o'chirildi
Tizimda haqiqiy o'chirish yo'q — yozuv arxivga tushadi. «Arxiv» sahifasidan
(`/arxiv`) qaytaring.

### D. Baza buzildi yoki yo'qoldi
1. **Yangi bo'sh baza** yarating (Supabase'da yangi loyiha yoki tiklash).
2. Eng yangi nusxani tiklang:
   - Supabase zaxirasi bo'lsa — Dashboard → Backups → Restore.
   - Mustaqil nusxa bo'lsa: `pg_restore --no-owner --no-privileges -d <YANGI_BAZA> nusxa.dump`
3. Vercel'da `DATABASE_URL` va `DIRECT_URL` ni yangi bazaga o'zgartiring →
   qayta deploy.
4. Kiring, «Tizim holati» sahifasini oching, xatlovdan bir yozuvni tekshiring.
5. Yo'qolgan davr (RPO) uchun: shu vaqt ichida kiritilgan xatlovlar xodimlardan
   qayta so'raladi. Telefonlardagi **oflayn navbat** ham bu yerda yordam beradi:
   yuborilmagan anketalar telefonda turadi.

## 4. Tiklashni sinash tartibi (alohida muhitda)

**Qoida:** sinov production bazasiga YOZMAYDI. Nusxa olinadigan baza faqat
o'qiladi, tiklash esa nomi `_tiklash_sinov` bilan tugaydigan ALOHIDA bo'sh
bazaga qilinadi (skript boshqa nomni rad etadi).

```bash
# 1) Bo'sh sinov bazasini yarating (alohida Supabase loyihasi yoki mahalliy Postgres)
createdb bandlik_tiklash_sinov

# 2) Sinovni ishga tushiring (manba faqat o'qiladi)
MANBA_URL='postgresql://…'   TIKLASH_URL='postgresql://…/bandlik_tiklash_sinov' \
  scripts/zaxira-tiklash.sh
```

Skript:
1. Manbadan **bitta surat** (REPEATABLE READ) olib `pg_dump` qiladi;
2. nusxani alohida bazaga `pg_restore` qiladi;
3. **har bir jadval** uchun qatorlar soni va tarkib nazorat yig'indisi (md5)
   ni manba surati bilan solishtiradi — faqat «qatorlar soni teng» emas,
   «mazmuni teng»;
4. nusxa hajmi va **sekundlarini** o'lchaydi (RTO uchun haqiqiy raqam).

Chiqish kodi 0 — hamma jadval mos. Muvaffaqiyatli sinovdan keyin natijani
**Tizim holati** sahifasidagi «Zaxiradan tiklash sinovi» bo'limiga qayd eting
(sana, qaysi nusxa, qayerga tiklandi). Sahifa sinov sanasini ko'rsatadi va
**92 kundan** (chorak) eski bo'lsa eslatadi.

Sinov tugagach sinov bazasini o'chiring: unda haqiqiy fuqaro ma'lumotlari bor.

### Kafolatlamaydigan narsalar
- Sinov **mantiqiy** nusxani tekshiradi (jadvallar va qatorlar). Supabase'ning
  o'z (fizik) zaxirasidan tiklash — Dashboard orqali alohida sinovdan o'tkazilishi
  kerak va u hali o'tkazilmagan.
- Fayllar (agar kelajakda saqlansa) bazada emas, shu sinovga kirmaydi. Hozir
  tizim fayl saqlamaydi.

## 5. Mahalliy tiklash sinovi natijasi (2026-10-01)

Mahalliy PostgreSQL 16 da, **sun'iy sinov ma'lumotlari bilan** (production
emas; 14 MB, 32 jadval, 157 xonadon, 91 xodim):

| Ko'rsatkich | Natija |
|---|---|
| Natija | **MUVAFFAQIYATLI**: 32 jadvalning hammasida qatorlar soni va tarkib md5 mos |
| Nusxa hajmi | 228 KB (siqilgan) |
| Nusxa olish | 1 soniya |
| Tiklash | < 1 soniya |
| Solishtirish | 1 soniya |

**Skriptning o'zi ham sinaldi** (sinov o'tib ketishi uchun yozilmagan):
- tiklangan nusxaga ataylab zarar yetkazildi (bitta jadvalda qiymat o'zgartirildi —
  qatorlar soni teng; boshqasidan qator o'chirildi) — skript **3 ta jadvalda
  farqni topdi** va chiqish kodi 1 bilan yiqildi (qiymat o'zgarishini ham tutdi:
  faqat «qatorlar soni teng» tekshiruvi buni o'tkazib yuborardi);
- manba va tiklash bazasi bir xil bo'lsa — rad etdi (kod 2);
- tiklash bazasi nomi `_tiklash_sinov` bilan tugamasa — rad etdi (kod 2);
- tiklash bazasi bo'sh bo'lmasa va `TOZALASH=1` berilmasa — rad etdi (kod 2).

**Bu nimani ISBOTLAMAYDI.** Mahalliy baza production'dan juda kichik, shuning
uchun sekundlar production RTO'sini **bashorat qilmaydi**: ular faqat skript
to'g'ri ishlashini ko'rsatadi. Supabase production zaxirasidan tiklash **hali
o'tkazilmagan** — shuning uchun «Tizim holati» sahifasida u hali ham
«sinalmagan» deb turadi va shunday turishi **to'g'ri**.

## 6. Qaror talab qiladigan narsa (foydalanuvchi uchun)

**Avtomatik mustaqil nusxa yo'q.** `scripts/zaxira-tiklash.sh` qo'lda ishga
tushiriladi. Haftalik avtomatik nusxa uchun saqlash joyi kerak, bu esa
**fuqaro ma'lumotlari** qayerda saqlanishi haqida qaror: Supabase Pro kunlik
zaxirasi, yoki shifrlangan tashqi saqlash. Men bu qarorni o'zim qabul
qilmadim — fuqaro shaxsiy ma'lumotini GitHub Actions artefaktlariga yoki
begona xizmatga qo'yish sizning ma'lumot siyosatingizga bog'liq.

## Natijalar jurnali

| Sana | Muhit | Natija | Nusxa hajmi | Nusxa olish | Tiklash | Izoh |
|---|---|---|---|---|---|---|
| 2026-10-01 | Mahalliy PG 16, sun'iy ma'lumot (14 MB) | Muvaffaqiyatli, 32/32 jadval mos | 228 KB | 1 s | < 1 s | Skript tekshiruvi; Supabase emas |
