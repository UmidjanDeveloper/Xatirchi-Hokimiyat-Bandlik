# OneID, E-imzo va ERP — xavfsiz joriy qilish rejasi

**Sana: 2026-10-01. Holat: HOZIR HECH NARSA ULANMAGAN.** Bu hujjat reja va
operatorlarga beriladigan so'rovlar ro'yxati. Kodda OneID, E-imzo yoki ERP
bilan bog'liq hech narsa yo'q va production o'zgarmadi.

## 1. Qarorlar (siz bergan javoblar, 2026-10-01)

| Savol | Javob |
|---|---|
| Birinchi navbatda qayerga? | **Xodimlar** (fuqaro kabineti keyin; u avval ham ataylab chetda qoldirilgan) |
| Kalit va hujjatlar bormi? | **Hech biri hali yo'q** |
| ERP nima? | **Murojaatlar tizimi** |

Kalitsiz va operator hujjatisiz kirish (autentifikatsiya) kodini yozmaymiz:
protokol tafsilotlarini taxmin qilib yozilgan kirish tizimi — xavfsizlik
teshigi. Birinchi ish — arizalar (4-bo'lim), ular odatda haftalar oladi.

## 2. Laziz repo'sidan nima olinmadi va nima uchun

`Mahalla_yettiligi_backend/src/integrations/integrations.service.ts`:

- **OneID:** `verified: dto.token.length > 10` — 11 belgidan uzun **istalgan
  matn** «tasdiqlangan». Nusxa ko'chirilsa, kirish tekshiruvini aylanib o'tish
  teshigi bo'lardi.
- **E-imzo:** matnning SHA-1 xeshi va `pending_signature`; imzo ham, tekshiruv ham yo'q.
- **ERP:** har doim `accepted` va o'zi yasagan `ERP-XXXXXXXX` raqami; hech
  qayerga so'rov ketmaydi.
- Sozlamada faqat provayder **nomi** (`mock-*`); URL, client id, sir yo'q.
  Yagona haqiqiy integratsiya — Twilio SMS.

Olingan yagona g'oya: har integratsiya muhit o'zgaruvchisi bilan almashadigan
alohida qatlam orqali ulanadi. Bu quyidagi qoidalar ichida.

## 3. Dizayn qoidalari (kod yozilganda shu bo'yicha)

1. **Sozlanmagan = o'chiq.** Kalit yo'q bo'lsa integratsiya «ulanmagan» deydi, hech qachon «tasdiqlangan» demaydi. Production'da `mock`/`test` provayder nomi **rad etiladi**; soxta server faqat sinovlarda.
2. **Tasdiq faqat haqiqiy manbadan:** operator serverining javobi yoki kriptografik tekshiruv (E-imzo: PKCS#7, sertifikat zanjiri, bekor qilinganlik, vaqt). Token uzunligi yoki shakliga qarab hech qachon.
3. **Hisob avtomatik yaratilmaydi.** OneID/E-imzo faqat **oldindan bog'langan** xodimni tanib, kiritadi. Aks holda OneID'si bor har qanday fuqaro xodim bo'lib qolardi. Noma'lum shaxs umumiy xabar bilan rad etiladi (kim borligi oshkor bo'lmaydi).
4. **Bog'lash:** parol bilan kirgan xodimning o'zi, OneID/E-imzo tasdig'i bilan bog'laydi. Administrator PINFL'ni qo'lda yozmaydi (xato va suiiste'mol xavfi).
5. **Parol zaxira yo'li qoladi.** Operator tizimi to'xtasa yoki sertifikat bekor bo'lsa ham kamida administrator kira olsin (qulflanib qolmaslik).
6. **Huquqni baza belgilaydi.** Tashqi tizim faqat «kim» ekanini aytadi; rol, mahalla va faolligi mavjud mexanizmdan keladi (`sessiyaVersiyasi`, bazadan huquq).
7. **PINFL:** bazada faqat kalitli xesh (HMAC-SHA256, sir alohida muhit o'zgaruvchisida) va ko'rsatish uchun oxirgi raqamlar; jurnalga va xato matniga yozilmaydi (`maxfiyniTozala` ga 14 xonali naqsh qo'shiladi — PINFL oqimi qo'shilishidan **oldin**).
8. **Mavjud himoyalar qayta ishlatiladi:** kirish chegarasi (`kirish-chegarasi.ts`), iz raqami (`iz_…`), xato jurnali, `/tizim` holat sahifasi (integratsiya holati u yerda halol ko'rinadi).
9. **OAuth `state` va nonce:** bir martalik, qisqa muddatli, brauzerga bog'langan; E-imzo challenge — bir martalik, muddatli, sessiyaga bog'langan.
10. **ERP (murojaat) chiqish navbati:** idempotentlik kaliti, 3 urinish, xatolik `/tizim` da ko'rinadi (Telegram navbati namunasi bo'yicha); «yuborildi» faqat ERP **javob raqami** bilan; yuboriladigan ma'lumot minimal.
11. **Sinov:** operatorning sinov muhitida haqiqiy; mahalliyda — faqat testdagi soxta server; har yangi suit mutatsiya bilan tekshiriladi (bizdagi odat).

## 4. Operatorlarga so'rovlar ro'yxati

Nomlar va endpointlarni **operatorning rasmiy hujjatidan tasdiqlang**: quyidagi
ro'yxat savollar, protokol tasviri emas.

**OneID (xodim kirishi):**
- Ariza qaysi tashkilotga va qaysi hujjat bilan; ish va sinov muhiti uchun alohida kalitlarmi;
- `client_id` / `client_secret`, ruxsat etilgan `redirect_uri` ro'yxati (Vercel domeni: `www.xatirchibandlik.uz`; preview'lar uchun alohida);
- qaysi maydonlar qaytadi (PINFL, F.I.Sh., tug'ilgan sana) va PINFL berilishining **huquqiy asosi**;
- token muddati, chiqish (logout), so'rov chegarasi, uzilishda ogohlantirish, SLA.

**E-imzo (xodim kirishi / hujjat imzolash):**
- Server komponentini o'zingiz o'rnatasizmi (alohida server kerak bo'ladi — Vercel'da emas) yoki operator API'simi;
- domen/API kaliti ro'yxati; xodim brauzerida E-IMZO agenti o'rnatilgan bo'lishi kerak;
- sertifikat bekor qilinishi (CRL/OCSP) va vaqt tamg'asi qanday tekshiriladi;
- tashkilot sertifikati va jismoniy shaxs sertifikati farqi (kim kira oladi).

**ERP (murojaatlar tizimi):**
- Aynan qaysi tizim, API hujjati (REST/SOAP), autentifikatsiya turi, sinov muhiti;
- murojaat maydonlari xaritasi (bizdagi `Murojaat` → ularning shakli); fuqaro ma'lumoti yuborilishining huquqiy asosi;
- idempotentlik (bir murojaatni ikki marta yuborsak nima bo'ladi), holat qaytishi (ular → biz): webhook yoki so'rov;
- xato kodlari, so'rov chegarasi, ish vaqti.

## 5. Siz hal qilishingiz kerak bo'lgan maxfiylik qarorlari

1. PINFL saqlanadimi? Qaysi huquqiy asos bilan (Shaxsga doir ma'lumotlar to'g'risidagi qonun)? Saqlash muddati?
2. Kim PINFL xeshini va bog'langan identifikatorni ko'ra oladi (faqat administrator)?
3. ERP'ga fuqaro ma'lumotini yuborish uchun murojaatchining roziligi qanday olinadi (bizda rozilik/imzo mexanizmi bor, lekin murojaat uchun emas)?

## 6. Bosqichlar

| Bosqich | Nima | Shart |
|---|---|---|
| 0 (hozir) | Arizalar, huquqiy savollar | Sizdan |
| 1 | Xodim kirishi: operatorning **sinov** muhitida, o'chiq flag ortida | Sinov kalitlari keldi |
| 2 | Pilot: 1–2 xodim (parol zaxirasi bilan) | 1-bosqich sinovdan o'tdi |
| 3 | Hamma xodim | Pilot tinch o'tdi |
| 4 | Murojaat → ERP bir tomonlama yuborish (navbat, idempotentlik) | ERP hujjati va sinov muhiti |
| 5 | ERP → bizga holat qaytishi | 4-bosqich barqaror |
| 6 | Fuqaro kabineti (OneID bilan) | **Alohida qaror**, ma'lumot siyosati tasdiqlangach |

Kalit kelmaguncha 1-bosqichni boshlamayman: tasdiqlanmagan protokol uchun
yozilgan kirish kodi xavfsizlik teshigi, ertaga yana qayta yozishga to'g'ri keladi.

## 7. Xavflar

- Operator tizimi to'xtasa xodimlar kira olmasligi — parol zaxirasi bilan yopiladi.
- Sertifikat bekor qilingan xodim kirishda davom etishi — tekshiruvda CRL/OCSP **majburiy**.
- ERP bir murojaatni ikki marta qabul qilishi — idempotentlik kaliti bilan.
- Vercel serverless'da E-imzo server komponenti ishlamaydi — alohida joy kerak.
- Bu hujjatdagi har bir tashqi tizim tafsiloti **tasdiqlanmagan taxmin**, to'liq ro'yxat operator hujjati olingach yangilanadi.
