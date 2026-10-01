# Boshqa tumanlarga chiqish: hudud chegarasi

Hozir tizim **bitta tuman** (Xatirchi) uchun ishlaydi. Bu hujjat boshqa
tumanlarga chiqilganda **eng xavfli xatoni** — yangi tuman xodimi eski tuman
ma'lumotini ko'rib qolishini (yoki aksincha) — oldindan to'sish rejasi.

> **Muhim:** bu yerda hech narsa *joriy qilinmagan*. Mikroservis, alohida
> infratuzilma yoki yangi jadval **kerak emas** va qo'shilmadi. Faqat
> tasnif, himoya (sinov) va reja bor.

## 1. Hozir hudud chegarasi qanday ishlaydi

| Rol | Nimani ko'radi | Qanday |
|---|---|---|
| YETTILIK (mahalla xodimi) | Faqat **o'z mahallasi** | `mahallagaRuxsat` va `mahallaFiltri` (`src/lib/auth.ts`); mahallasi yo'q xodim hech narsa ko'rmaydi |
| BANDLIK, BANDLIK_RAHBAR, HOKIM, ADMIN | **Butun baza** (= butun tuman) | Hudud filtri yo'q: bazada faqat bitta tuman bor |

Ikkinchi qator — ko'p tumanda xavfli joy: bu rollar uchun «butun baza»
birdan «hamma tumanlar» bo'lib qoladi.

## 2. Har bir jadval qaysi hududga tegishli

Manba: `src/lib/hudud-chegarasi.ts` (`HUDUD_XARITASI`). Qisqacha:

| Tur | Ma'nosi | Jadvallar |
|---|---|---|
| **MAHALLA** | O'zida `mahallaId` bor | User, Household, UnemployedPerson, HouseholdKesma, ItVaucher, Vacancy, IshBeruvchi, MahalliyBuyurtma, Murojaat |
| **BOGLIQ** | Hududga fuqaro/xonadon/reja orqali | ActionPlan, OilaRejasi, OilaAloqasi, JoylashuvXabari, IshgaJoylashish, JoylashuvDalili, KuzatuvTekshiruvi, NomzodYollanmasi, KursYollanmasi, XizmatTaklifi, MurojaatTarixi |
| **XODIM** | Hududga xodim orqali | Xabarnoma, AuditLog, BotSuhbati |
| **KATALOG** | Tuman darajasidagi katalog (hozir yagona) | Kurs, YordamDasturi |
| **ILDIZ** | Mahallalar ro'yxati | Mahalla |
| **TIZIM** | Hududga tegishli emas, shaxsiy ma'lumotsiz | TizimIshi, TizimXatosi, KirishUrinishi, ZaxiraTekshiruvi, TelegramYangilanish |

### Himoya: yangi jadval tasniflanmasdan o'tmaydi

`scripts/hudud-sinov.ts` (`npm run sinov` ichida, CI da ham):

- sxemadagi **har bir jadval** xaritada bo'lishi shart — yangi jadval qo'shgan
  odam «bu qaysi tumanga tegishli?» degan savolga javob berishga majbur;
- «MAHALLA» jadvalida haqiqatan `mahallaId` bo'lishi shart;
- «BOGLIQ/XODIM» jadvalida hududga olib boradigan FK maydoni sxemada mavjud;
- «TIZIM» jadvalida shaxsiy ma'lumot maydoni (telefon, ism, JSHSHIR…) bo'lmasligi;
- hozirgi izolyatsiya (`mahallagaRuxsat`) o'zgarmaganligi.

## 3. Bir tumanga tegishli sozlama va kataloglar

Hozir kod ichida qattiq yozilgan (ro'yxat `TUMANGA_TEGISHLI_SOZLAMALAR`, mavjudligi
sinovda tekshiriladi):

- `TUMAN`, `VILOYAT` nomlari (`src/lib/constants.ts`);
- 70 ta MFY ro'yxati va statistikasi (`prisma/seed.ts`);
- xarita geometriyasi va qishloqlar (`src/lib/xarita/`);
- hisobot sarlavhalari va hokimlik nomi (`src/lib/hisobot/`);
- Telegram matnlaridagi tizim nomi (`bot-menyu.ts`, `xabarnoma.ts`);
- brend: pastki qism, gerb, kirish sahifasi;
- Telegram bot tokeni va webhook siri (**muhit o'zgaruvchilari**: har tuman o'z boti);
- kataloglar: Kurs, YordamDasturi (tuman bo'yicha).

## 4. Yo'l tanlash: qaysi biri avval

### Variant A — har tumanga ALOHIDA joylashtirish (tavsiya: birinchi 2–3 tuman uchun)

Bir xil kod, lekin har tuman uchun **alohida Vercel loyihasi va alohida
Supabase loyihasi**. Tuman o'z bazasida — boshqa tuman ma'lumoti u yerda
**umuman yo'q**. «Ochilib qolish» xavfi nolga teng, kodda hudud mantig'ini
o'zgartirish kerak emas.

- Qo'shimcha ish: tuman sozlamalarini (3-bo'lim) muhit o'zgaruvchisi yoki
  bitta sozlama faylidan o'qish.
- Kamchilik: viloyat bo'yicha **umumiy hisobot** yo'q; yangilash har loyihaga
  alohida push.

### Variant B — bitta baza, ko'p tuman (viloyat umumiy hisoboti kerak bo'lganda)

Bu **ancha xavfliroq** va katta ish. Tartib (har qadam alohida deploy):

1. `Tuman` jadvali; `Mahalla.tumanId`, `User.tumanId`, kataloglarga `tumanId`
   — **faqat qo'shuvchi** migratsiya (ustun NULL bo'lishi mumkin bo'lib
   qo'shiladi, mavjud 70 mahalla va xodimlar Xatirchi tumaniga to'ldiriladi).
2. **Standart — rad etish:** `tumanId` bo'sh xodim (ADMIN'dan tashqari)
   hech narsa ko'rmaydi — xuddi hozir mahallasiz YETTILIK kabi.
3. Yagona tekshiruv nuqtasi: `mahallagaRuxsat` → `hududgaRuxsat`, `mahallaFiltri`
   ichiga tuman sharti. Hozir barcha mahallaga bog'liq so'rovlar shu ikki
   funksiyadan o'tadi; BANDLIK/HOKIM/ADMIN uchun hozir filtr yo'q joylarni
   (`grep "prisma\.\(household\|unemployedPerson\|vacancy\)\.find"`) bittalab
   `mahalla: { tumanId }` bilan to'ldirish kerak — bu ishning asosiy qismi.
4. Har endpoint uchun **ikki tumanli sun'iy ma'lumot bilan** «A tuman xodimi B
   tumanni ko'ra olmaydi / o'zgartira olmaydi» testi (mavjud mahalla
   izolyatsiya testlari shabloni: `scripts/huquq-sinov.ts`).
5. Cron va brifing har tuman uchun alohida (`brifingYasa(tumanId)`); import
   (reyestr) tuman bo'yicha; hisobot sarlavhalari `Tuman.nomi` dan.
6. Faqat shundan keyin ikkinchi tuman yaratiladi.

## 5. «Yangi tuman qo'shilganda mavjud ma'lumot ochilib qolmasin» qoidalari

1. **Standart — rad etish.** Hududi aniq bo'lmagan so'rov ma'lumot qaytarmaydi.
2. **Tasnifsiz jadval yo'q** (sinov bunga majbur qiladi).
3. **Mavjud ma'lumot avval tumanga bog'lanadi, keyin yangi tuman paydo bo'ladi**
   (qadam 1 → 2 → 3 → 4 → 6, teskari tartibda emas).
4. Tuman qo'shgan administrator o'zi ham «hamma tumanni ko'radi» bo'lib qolmasin:
   `ADMIN` ikkiga bo'linadi — platforma admini va tuman admini.
5. Har qadamdan keyin `npm run sinov`, `npm run ci-taqlid`, hamda ikki tumanli
   izolyatsiya testlari yashil bo'lishi shart.

## 6. Nima QILINMAYDI

- Mikroservislar, xabar brokerlari, alohida API shlyuzlari — kerak emas.
- Hudud mantig'ini har sahifada qo'lda yozish — faqat 5-bo'limdagi yagona nuqta orqali.
- Hozirgi ishlab turgan tuman uchun hech narsa o'zgarmaydi.

## 7. Cheklov (halol)

Bu hujjat va sinov **tayyorlik**: ular xatoning oldini olishga yordam beradi,
lekin ko'p tumanli rejim **hali yo'q** va «hudud chegarasi ko'p tumanda
sinalgan» deyish mumkin emas. Variant B boshlanganda 4-bo'limdagi testlar
yoziladi.
