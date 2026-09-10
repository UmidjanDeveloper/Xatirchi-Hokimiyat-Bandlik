# Xatirchi tumani — Bandlik platformasi

Navoiy viloyati Xatirchi tumani hokimligi uchun **aholi bandligini
ta'minlash va kambag'allikni qisqartirish** bo'yicha xatlov va tahlil
tizimi.

> **Asosiy g'oya:** hokim «nechta ishsiz bor» degan raqamni allaqachon
> biladi — svod jadvalida 3 345 ta. Unga kerak bo'lgani: **shu 3 345
> tadan nechtasi qaysi bosqichda turgani va qaysi mahalla orqada
> qolayotgani.**

Platforma so'rovnoma emas, **ish yuritish tizimi**: har bir ishsiz
fuqaro aniqlanishdan ishga joylashishgacha bo'lgan yo'lni bosib o'tadi
va har bosqichda kim javobgar ekani yozib boriladi.

---

## Mundarija

- [Nima uchun bu tizim](#nima-uchun-bu-tizim)
- [Ishlash zanjiri](#ishlash-zanjiri)
- [Rollar va huquqlar](#rollar-va-huquqlar)
- [Asosiy imkoniyatlar](#asosiy-imkoniyatlar)
- [Texnologiyalar](#texnologiyalar)
- [O'rnatish](#ornatish)
- [Supabase va Vercel](#supabase-va-vercel)
- [Xavfsizlik](#xavfsizlik)
- [Loyiha tuzilishi](#loyiha-tuzilishi)

---

## Nima uchun bu tizim

Tumanda uchta hujjat bilan ishlanadi:

| Hujjat | Muammosi |
|---|---|
| Kambag'al oilalarni xatlovdan o'tkazish so'rovnomasi (11 bo'lim) | Qog'ozda — jamlash uchun har MFY dan yig'ib, qo'lda hisoblash kerak |
| Ishsizlarni aniqlash so'rovnomasi | Xatlov bilan bog'lanmagan — kim bilan ish qilinayotgani ko'rinmaydi |
| Svod jadvali (70 MFY, 31.08.2026) | Statik — bugungi holatni ko'rsatmaydi |

Platforma uchalasini bitta zanjirga bog'laydi va svod jadvalidagi
raqamlarni **maxraj** sifatida ishlatadi.

**Maxrajning ahamiyati.** «38 ta xonadon xatlovdan o'tdi» — bu hokim
uchun ma'nosiz raqam. «506 tadan 38 tasi (7,5%)» — bu ma'noli. Aynan
shu sababli svod jadvali platformaga import qilingan.

---

## Ishlash zanjiri

```
   MAHALLA          XONADON            ISHSIZ FUQARO        CHORA-TADBIR
   (baza)     ──▶   (xatlov)     ──▶   (shaxsiy anketa) ──▶ (topshiriq)

 70 ta MFY         11 bo'lim          Aniqlandi            Muammo
 svod jadvali      yettilik           Suhbat o'tkazildi    Sabab
 raqamlari         a'zosi             Taklif berildi       Yechim
 = MAXRAJ          to'ldiradi         Joylashtirildi       Mas'ul tashkilot
                                      Tasdiqlandi          Muddat
```

**Bog'lanish nuqtasi.** Xonadon anketasining I bo'limida «3 ta ishsiz»
deb yozilgan bo'lsa, uchalasining ham ismini kiritmaguncha forma
yubormaydi. Ishsizlar soni faqat raqam bo'lib qolsa, bandlik markazi
kim bilan ishlashini bilmaydi va butun xatlov qog'ozbozlikka aylanadi.

---

## Rollar va huquqlar

Har xodimga **alohida login va parol** beriladi. Umumiy parol bu yerda
yaramaydi: har yozuvning ostida «suhbatni kim o'tkazdi», «xatlovni kim
qildi» degan javob turishi kerak.

| Rol | Ko'radi | Qiladi |
|---|---|---|
| **Mahalla yettiligi a'zosi** | Faqat **o'z mahallasi** | Xonadonlarni xatlovdan o'tkazadi |
| **Bandlik markazi mutaxassisi** | Butun tuman | Suhbat, taklif, joylashtirish |
| **Bandlik markazi rahbari** | Butun tuman | + operatsion panel va tahlil |
| **Tuman rahbariyati (hokim)** | Butun tuman | Faqat tahlil paneli — o'zgartirmaydi |
| **Administrator** | Hammasi | Xodimlar, loginlar, audit jurnali |

Yettilik a'zosi uchun mahalla **majburiy**: u bo'sh bo'lsa, xodim butun
tumandagi oilalar ma'lumotini ko'rib qolardi. Shuning uchun tekshiruv
foydalanuvchi yaratish paytida turadi.

---

## Asosiy imkoniyatlar

### Xatlov anketasi (mahalla yettiligi uchun)

- **11 bo'lim, 7 qadam** — mehnat va bandlik, tadbirkorlik va kredit,
  daromad, bolalar ta'limi, sog'liq, uy-joy, ijtimoiy himoya,
  hujjatlar, tomorqa-chorva, tadbirkorlik subyektlari, xulosa
- **Arifmetika tekshiruvi** — bu eng muhim farq. Kun oxirida
  yigirmanchi xonadonda shoshib «5 ta bola, 9 ta mehnatga layoqatli,
  jami 12 kishi» deb yozilsa, forma yubormaydi va qaysi ikki raqam
  to'g'ri kelmayotganini aniq ko'rsatadi:

  ```
  Bolalar (5) va mehnatga layoqatlilar (9) jami 14 —
  bu xonadondagi 12 kishidan ko'p
  ```

  Xato ikki darajaga bo'lingan: **XATO** yuborishni to'xtatadi (qism
  butundan katta bo'lgan holatlar), **OGOHLANTIRISH** faqat ko'rsatadi
  (nol daromad, maktabga bormaydigan bola). Har g'alati raqamni
  bloklasak, xodim haqiqiy holatni kirita olmay soxta raqam yozib
  qutulardi.

- **Qoralama** — har o'zgarish brauzer xotirasiga yoziladi. Telefon
  o'chsa yoki xonadon egasi band bo'lsa, xodim to'ldirgan joyidan
  davom etadi
- **Oflayn rejim** — hovlida aloqa yo'q bo'lsa, ma'lumot yo'qolmaydi.
  Xotira to'lgan bo'lsa **rost xabar** chiqadi: soxta «saqlandi»
  ko'rsatsak, xodim xonadondan ketib, yo'qotishni kechqurun bilib
  qolardi
- **Takror xatlov tekshiruvi** — bir xonadonni ikki marta kiritib
  bo'lmaydi. Manzil turlicha yozilsa ham aniqlanadi:
  `Navoiy ko'chasi 12-uy` = `navoiy kochasi 12 uy`
- **Kirill yorliqlar** — xodim qo'lidagi rasmiy qog'oz kirillda va
  ikkisini yonma-yon qo'yib to'ldiradi

### Ishsiz fuqaro anketasi (bandlik markazi uchun)

- Docx anketasining to'liq raqamli ko'rinishi: 18 shaxsiy maydon,
  6 ta bandlik taklifi, xulosa
- **Holat amaldan kelib chiqadi**, formadan emas: suhbat anketasi
  to'ldirilsa → «suhbat o'tkazildi», taklif belgilansa → «taklif
  berildi», ish joyi yozilsa → «joylashtirildi». Holatni qo'lda
  tanlaydigan qilsak, xodim anketani to'ldirmasdan «joylashtirildi»
  deb belgilab qo'yishi va hokim panelidagi eng muhim raqam yolg'on
  chiqishi mumkin edi

### Hokim paneli

- **Voronka** — 5 bosqichning har birida nechta odam turgani, svod
  jadvalidagi 3 345 taga nisbatan foizda
- **70 MFY qamrov reytingi** — kim orqada qolgan
- **Kechikkan topshiriqlar mas'ul tashkilot kesimida** — eng kuchli
  hisobdorlik quroli
- **Byudjet talabi** — kredit-subsidiya so'rovi yo'nalishlar bo'yicha,
  keyingi yil rejasiga to'g'ridan-to'g'ri kiradi
- **Tavsiyalar** — har biri **raqamli dalil bilan**:

  ```
  Uyshun MFY — xatlov orqada
  Ro'yxatdagi 51 ta ishsizdan 12 tasi xatlovdan o'tgan (24%).
  Qolgan 39 tasi hali ko'rilmagan.
  ```

  Tavsiya yo'q bo'lsa — bo'sh ro'yxat qaytadi. Sun'iy tavsiya o'ylab
  topilmaydi: bir marta «shunchaki to'ldirish uchun» yozilgan tavsiya
  butun panelga bo'lgan ishonchni yo'qotadi

### Bandlik markazi operatsion paneli

- **Navbat** — suhbat kutayotganlar va taklif kutayotganlar
- **Moslashtirish taxtasi** — bo'sh ish o'rni ↔ shu kasbda ishlashni
  istagan fuqarolar. Taqqoslash fonetik kalit orqali: «пайвандчи» va
  `payvandchi` bitta kalitga tushadi
- **Kurs ochish taklifi** — talab 15 tadan oshgan kasblar

### Chora-tadbirlar

Muammo → sabab → yechim → mas'ul tashkilot → muddat → holat.

«Kechikdi» holati bazada **saqlanmaydi**, har safar sanadan
hisoblanadi. Saqlansa, uni har kecha yangilaydigan vazifa (cron)
kerak bo'lardi; vazifa bir kecha ishlamay qolsa, panel «kechikkan
topshiriq yo'q» deb ko'rsatardi — holbuki bor.

---

## Texnologiyalar

| Qatlam | Vosita |
|---|---|
| Framework | Next.js 14 (App Router) |
| Til | TypeScript |
| Ma'lumotlar bazasi | PostgreSQL + Prisma ORM |
| Uslub | Tailwind CSS + CSS dizayn tokenlari |
| Tekshiruv | Zod (server va brauzerda bir xil sxema) |
| Autentifikatsiya | scrypt + imzolangan sessiya cookie |

Diagrammalar **kutubxonasiz**, oddiy HTML va CSS bilan chizilgan: bu
yerdagi barcha shakllar yotiq ustunlar va har birida qiymat ustun
yonida ochiq yozilgan. Hokim panelni proyektorda ko'radi — sichqoncha
bilan ustun ustiga borib turmaydi, shuning uchun hech bir raqam hover
ortida yashirilmaydi.

---

## O'rnatish

### Talablar

- **Node.js 18+**
- **PostgreSQL 14+** (yoki [Supabase](https://supabase.com) bepul hisobi)

### 1. Kodni olish

```bash
git clone https://github.com/UmidjanDeveloper/Xatirchi-Hokimiyat-Bandlik.git
cd Xatirchi-Hokimiyat-Bandlik
npm install
```

### 2. Muhit o'zgaruvchilari

```bash
cp .env.example .env
```

`.env` faylini oching va to'ldiring:

```bash
# Sessiya kaliti — kamida 32 ta belgi
openssl rand -base64 32

# Birinchi administrator paroli — kamida 12 ta belgi
openssl rand -base64 24
```

> **Diqqat.** `SESSION_SECRET` almashtirilmasa, ilova ishga
> tushmaydi — bu ataylab qilingan himoya.

### 3. Bazani tayyorlash

```bash
npm run db:push    # jadvallarni yaratadi
npm run db:seed    # 70 ta MFY + birinchi administrator
```

`db:seed` quyidagini yozib chiqadi:

```
  Mahallalar: 70 ta yangi, 0 ta yangilandi
  Baza: 200 836 aholi, 3345 ishsiz
  Administrator yaratildi: admin
```

### 4. Ishga tushirish

```bash
npm run dev        # http://localhost:3000
```

`.env` dagi login va parol bilan kiring. **Birinchi kirishda parolni
almashtirish majburiy** — boshlang'ich parol serverning muhit
o'zgaruvchilarida ochiq turadi.

### 5. Xodimlarni qo'shish

Administrator sifatida kiring → **Bошқарув** → **Ходим қўшиш**.

Har xodim uchun tizim parol yaratadi va uni **bir marta** ko'rsatadi.
Parolda chalkashadigan belgilar (`0/O`, `1/l/I`) yo'q — administrator
uni og'zaki uzatishi mumkin.

---

## Supabase va Vercel

### Supabase

1. [supabase.com](https://supabase.com) da yangi loyiha yarating
2. **Project Settings → Database → Connection string** dan ikkita
   manzilni oling:
   - `DATABASE_URL` — **Transaction pooler** (6543-port), oxiriga
     `?pgbouncer=true&connection_limit=1` qo'shing
   - `DIRECT_URL` — to'g'ridan-to'g'ri ulanish (5432-port)
3. `npm run db:push && npm run db:seed`

### Vercel

1. Kodni GitHub'ga yuboring
2. [vercel.com](https://vercel.com) da **Import Project**
3. **Environment Variables** ga `.env` dagi barcha qiymatlarni
   ko'chiring
4. **Deploy**

> **Eslatma.** Tezlik chegarasi (rate limit) xotirada saqlanadi.
> Vercel'da har funksiya nusxasi o'z xotirasiga ega, shuning uchun
> chegara taxminiy. Amaliy parol terish hujumini bu ham to'xtatadi;
> qat'iy kafolat kerak bo'lsa — Upstash Redis ga o'tish mumkin.

---

## Xavfsizlik

Xatlov ma'lumotlari **oila daromadi va sog'liq holatini** o'z ichiga
oladi. Shuning uchun:

- **Butun sayt login ortida** — ochiq sahifa yo'q
- **Har xodimga alohida hisob**; yettilik a'zosi faqat o'z mahallasini
  ko'radi
- **Audit jurnali** — kim qachon qaysi yozuvni ochgani yoziladi
- **Parol scrypt bilan xeshlanadi**; taqqoslash `timingSafeEqual`
  orqali (oddiy `===` xeshni javob vaqti orqali oshkor qiladi)
- **Login urinishlari cheklangan** — 15 daqiqada 10 ta
- **Sessiya 12 soat** (bir ish kuni) va har so'rovda bazadan
  tekshiriladi: xodim ishdan bo'shatilgan bo'lsa, cookie yaroqli
  bo'lsa ham kira olmaydi
- **Qidiruv tizimlari indekslamaydi** (`robots: noindex`)

### Hosting to'g'risida

Hozircha Supabase (Yevropa) ishlatilmoqda — **sinov va ishlab chiqish
uchun**. Ishga tushirishdan oldin ma'lumotlarni O'zbekistondagi
serverga ko'chirish rejalashtirilgan.

---

## Loyiha tuzilishi

```
prisma/
  schema.prisma            # 7 ta model: Mahalla, User, Household,
                           # UnemployedPerson, ActionPlan, Vacancy, AuditLog
  seed.ts                  # 70 MFY + birinchi administrator

src/lib/
  mahallalar.ts            # 70 MFY va svod jadvali raqamlari
  constants.ts             # Anketa variantlari — ikki alifboda
  auth.ts                  # scrypt, sessiya, rol huquqlari
  api-auth.ts              # API qo'riqchisi va audit jurnali
  xatlov-tekshiruvi.ts     # ARIFMETIKA TEKSHIRUVI
  xatlov-sxema.ts          # Zod sxemalari (server + brauzer)
  inson-tekshiruvi.ts      # Ism va telefon tekshiruvi
  hudud-qidiruv.ts         # Kirill/lotin fonetik qidiruv
  tahlil.ts                # Hokim paneli hisob-kitoblari
  tavsiyalar.ts            # Tavsiyalar motori
  chora-tadbir.ts          # Kechikkanlarni hisoblash
  offline.ts               # Qoralama va navbat

src/app/(ilova)/
  xatlov/                  # Xatlov ro'yxati, yangi, tahrir, ko'rish
  ishsizlar/               # Ishsizlar ro'yxati va suhbat anketasi
  xonadonlar/              # Barcha xatlovlar (bandlik uchun)
  bandlik/                 # Operatsion panel
  ish-orinlari/            # Bo'sh ish o'rinlari reestri
  chora-tadbirlar/         # Topshiriqlar
  panel/                   # Hokim tahlil paneli
  admin/                   # Xodimlar va audit jurnali
```

---

## Buyruqlar

| Buyruq | Vazifasi |
|---|---|
| `npm run dev` | Ishlab chiqish rejimi |
| `npm run build` | Ishga tushirish uchun yig'ish |
| `npm run typecheck` | TypeScript tekshiruvi |
| `npm run lint` | Kod uslubi tekshiruvi |
| `npm run db:push` | Sxemani bazaga qo'llash |
| `npm run db:seed` | 70 MFY va administratorni yaratish |
| `npm run db:studio` | Bazani brauzerda ko'rish |

---

**Xatirchi tumani hokimligi** · Navoiy viloyati
