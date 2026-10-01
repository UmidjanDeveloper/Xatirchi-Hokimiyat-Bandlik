# Topshirish hisoboti (2026-10-01)

Maqsad: administrator 1 oy yo'q. Bu hujjat nima qilingani, nima
**tekshirilgani** va nima **tekshirilmagani**, nimani siz hal qilishingiz
kerakligini bir joyda aytadi. Raqamlar mahalliy sinovdan; «production'da
o'lchandi» degan gap bu yerda **yo'q**.

## 1. Nima qilindi

| Bo'lim | Natija | Commit |
|---|---|---|
| §11–§13 | Oilaviy reja, 30/60/90 kunlik kuzatuv, ish beruvchi bot, kurslar, mahalliy buyurtmalar | oldingi commitlar (`cccd165`, `4d818a3`, …) |
| §14 | Murojaatlar va yordam dasturlari katalogi (xodim qayd etadi); tarixdagi xom enum va «— —» nuqsonlari tuzatildi | `4a1477f` |
| §15–§17 | Haqiqiy sahifalash (50/30 tadan), **filtr sahifa almashganda yo'qolishi nuqsoni** tuzatildi, tartib barqaror (id tie-breaker), rahbar/hokim uchun modullar natijasi | `00f2dfd` |
| §19 | Monitoring sahifasi `/tizim`, xato jurnali (maxfiy ma'lumotsiz, `iz_…` raqami), bazaga asoslangan kirish chegarasi, zaxira tiklash sinovi, ko'p tuman uchun hudud chegarasi | `b063142` |
| §20 | 15 majburiy regressiya holati: haqiqiy server va baza bilan; xarita sinov nomi yo'qolsa yiqiladi | `a38f366` |
| Laziz repo'sidan | `/api/health*`, murojaat muddati Telegram xabari, `zaxira-nusxa.sh`, xlsx prototip qo'riqchisi, Dependabot | `a7cfad5`, `8859af9` |
| Qasddan qilinmadi | Fuqaro kabineti; xodimlar uchun AI yordamchi (§18) — sizning ko'rsatmangiz | — |

## 2. Laziz repo'sidan nima olindi va nima olinmadi

**Olindi (g'oya; kod ko'chirilmadi, bizning xavfsizlik va isbot qoidalariga moslab qayta yozildi):**
1. Salomatlik/tayyorlik tekshiruvi — lekin xato matni, versiya va sonlarsiz, bazaga 3 soniya chegara bilan, 10 soniya keshlangan.
2. Muddati o'tgan ishlar uchun eskalatsiya — murojaat muddati xabari; atomar (bir muddat = bir xabar), shaxsiy ma'lumotsiz.
3. Zaxira nusxa skripti — faqat o'qiydi, repo ichiga yozishni rad etadi, butunlik tekshiruvi.
4. Dependabot va `npm audit` kuzatuvi.

**Olinmadi (sabab bilan):**
- Xodimlarning doimiy geolokatsiyasi — shaxsni kuzatish, fuqaro ma'lumotlari siyosatiga qarama-qarshi.
- Soxta (mock) integratsiyalar — «ishlayapti» degan yolg'on signal beradi.
- O'zboshimchalik bilan hisoblangan umumiy ball va reyting — asoslanmagan raqam.
- Oylik hisobotlar, tadbirlar, postlar, frontend — bizning modellarimizga mos emas yoki kerak emas.
- 2FA — **taklif** sifatida qoldi: administrator yo'q paytda qulflanib qolish xavfi bor.

## 3. Foydalanuvchilar uchun nima o'zgardi

- Xodim: sahifalar uzun ro'yxatda sahifalanadi, qidiruv va mahalla filtri «Keyingi»ni bosganda saqlanadi; murojaat muddati Telegram'ga xabar bo'lib keladi (ulangan bo'lsa).
- Rahbar/hokim: «Vazifalarim» da modullar natijasi va tizim holati bloklari.
- Administrator: `/tizim` — avtomatik ishlar, xabar navbati, xatolar, zaxira sinovi.
- Hech narsa o'chirilmadi, bazaga faqat qo'shiladi (migratsiyalar `IF NOT EXISTS`).

## 4. Nima tekshirildi (mahalliy)

| Tekshiruv | Natija |
|---|---|
| `npm run sinov` | chiqish kodi 0, `XATO` qatori yo'q (1425/1425 sinov bandi) |
| `CI_TAQLID_TOLIQ=1 npm run ci-taqlid` | build + sahifa hajmi byudjeti 31/31 + HTTP regressiya 17/17 o'tdi |
| 5 rol bo'yicha brauzer (Playwright) | ~440 sahifa ko'rildi (yettilik 16, bandlik 115, rahbar 118, hokim 75, admin 120): 5xx, sahifa xatosi, konsol xatosi yo'q |
| Yangi suitlar | mutatsiya bilan sinaldi: kodni ataylab buzib, sinov buni ushlashi tekshirildi (qo'riqchi 16/16; o'tib ketgan 2 mutant sinov qo'shib yopildi) |
| GitHub CI (`Tekshiruv`, `a7cfad5`) | muvaffaqiyatli |

Brauzer sinovida bitta ogohlantirish turi **filtrlandi**: «Failed to fetch RSC
payload» — bu sinov skripti sahifadan oldinroq chiqib ketganda to'xtatilgan
prefetch; haqiqiy 5xx esa alohida hisoblanadi va topilmadi.

## 5. Nima TEKSHIRILMAGAN (halol)

- **Production.** Bu muhitdan `www.xatirchibandlik.uz` ga ulanib bo'lmaydi (proxy rad etadi): deploy va yangi `/api/health/readiness` ishlayotganini **ko'rmadim**. Birinchi ish: brauzerda ochib 200/503 ekanini ko'ring.
- **Supabase zaxirasidan tiklash hech qachon sinalmagan.** Mahalliy mantiqiy nusxa tiklash sinaldi (32/32 jadval mos), lekin bu Supabase emas va hajm production'dan kichik. `/tizim` buni shoshilinch deb ko'rsatib turadi — to'g'ri.
- Barcha sinovlar bitta jarayonda va mahalliy bazada: Vercel'ning ko'p nusxali (multi-instance) muhitida poyga holatlari o'lchanmagan.
- Telegram yuborish yo'li faqat xato holatida sinalgan (haqiqiy token yo'q).
- UptimeRobot (yoki shunga o'xshash) ulanganini men ko'rolmayman.
- Yuklama/tezlik sinovlari mahalliy; «tezlashdi» deb da'vo qilinmaydi.

## 6. Ochiq xavflar

1. **Next 14.2.35**: `npm audit` da critical ogohlantirishlar; tuzatish faqat Next 16 (major). Qaysilari bizga tegishli ekani kodda tekshirilgan — `hujjatlar/XAVFSIZLIK-QARAMLIKLAR.md`. RSC/Middleware keshi turlari qoladi.
2. **xlsx 0.18.5**: prototip ifloslanishidan qo'riqchi bor; ReDoS qoladi (to'g'ri versiya npm'da yo'q).
3. **CSP hali Report-Only** — bloklamaydi, faqat xabar beradi.
4. **Dependabot** 7 ta PR ochgan (`#1`–`#7`); sozlama qattiqlashtirildi (major yo'q). Guruhlangan PR `#3` ning CI'si **yiqildi** (sababi tekshirilmadi) — uni birlashtirmang. Branch production'ga deploy bo'ladi.
5. «15 kun» murojaat muddati — tizimning odatiy qiymati, **qonuniy muddat emas**.
6. Vercel Hobby'da cron kuniga bir marta: xabarlar ~1 kungacha kechikadi.
7. Ma'lumotlar qo'lda kiritiladi; evristikalar (takror, mos kelish) signal, hukm emas.

## 7. Orqaga qaytarish

- **Kod:** Vercel → Deployments → oxirgi yaxshi deploy → **Promote to Production** (daqiqalar, bazaga tegmaydi).
- **Baza:** qaytarish kerak emas — migratsiyalar faqat qo'shadi, eski kod yangi ustun/enum qiymatlarini ko'rmaydi. Oxirgisi: `20261001240000_murojaat_xabari` (enumga bitta qiymat).
- **Migratsiya yiqilsa:** build to'xtaydi, sayt eski kod bilan ishlayveradi (`JOYLASHTIRISH.md`).
- Tafsilot: `ZAXIRA-VA-TIKLASH.md`.

## 8. Keyingi ustuvorlik (tartib bilan)

1. **Oldin yuborilgan OpenAI kalitini bekor qiling** (chatga yozilgan; men uni hech qayerga ko'chirmadim).
2. Production'da `/api/health/readiness` ni oching; UptimeRobot'ni ulang (`JOYLASHTIRISH.md`).
3. Supabase → Database → Backups: tarif va PITR'ni tekshirib `ZAXIRA-VA-TIKLASH.md` ga yozing; keyin **bir marta tiklashni sinang**.
4. Vercel'da `DIRECT_URL` borligini tekshiring.
5. Xatlov tugagach: Next 14 → 16 yangilash (alohida shoxda, `ci-taqlid` TOLIQ bilan), xlsx 0.20.3.
6. CSP'ni Report-Only'dan majburiy rejimga o'tkazish (xabarlar jurnalini ko'rib chiqib).
7. Shoxdagi `stash` da `MAHALLA_RAIS` roli va `scripts/rais-yukla.ts` bor (push qilinmagan) — kerak bo'lsa ko'rib chiqing.
8. 2FA — faqat administrator mavjud bo'lganda (qulflanib qolmaslik uchun).
