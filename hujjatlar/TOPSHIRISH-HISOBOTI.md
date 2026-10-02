# Topshirish hisoboti (2026-10-01; 2026-10-02 yangilandi)

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
| §16 (qolgan) | `/panel` (9 ta) va `/bandlik` (7 ta) asosiy raqamlarida «Qanday hisoblangan»: usul, manba, ogohlik, ruxsat doirasidagi yozuvlar havolasi (hokimga havola ko'rsatilmaydi: u ro'yxatlarni ocha olmaydi). Ta'riflar koddagi filtrlardan olingan, 5 ta raqam SQL bilan solishtirildi | `0ee14a4` |
| §20 (lint) | `npm run lint` CI'ga va `ci-taqlid` ga qo'shildi (avval zanjirda yo'q edi; 0 ogohlantirish) | `0ee14a4` |
| Laziz repo'sidan | `/api/health*`, murojaat muddati Telegram xabari, `zaxira-nusxa.sh`, xlsx prototip qo'riqchisi, Dependabot | `a7cfad5`, `8859af9` |
| §18 | **Hudhud** — hokim, bandlik, rahbar va administrator uchun ovozli AI agent (hoopoe maskoti): sahifani ochadi, ko'rsatkichlarni aytadi, hisobot yuklaydi; yozish amali faqat taklif + egasi tasdig'i; AI yo'q bo'lsa qoidali rejim. `hujjatlar/HUDHUD-AGENT.md` | `f4bc377` (GitHub CI «Tekshiruv» #66 — muvaffaqiyatli) |
| §1–§21 audit | Prompt 21 bo'limi **dalil bilan** tekshirildi: 186 band (151 to'liq, 20 qisman, 15 hujjat); xarita mashina bilan tekshiriladi (`npm run sinov` ichida). **Haqiqiy kamchiliklar topilib tuzatildi**: reyestr ko'rish/yozish bog'lanmagan edi; 401/403 «yaroqsiz anketa» bo'lardi; Telegram kodida urinish chegarasi yo'q edi; ish beruvchiga «xabar ketdi» yolg'oni; login'da muvaffaqiyat IP hisobini nolga tushirardi; `v`siz cookie o'tardi; moderatsiya auditi tranzaksiyadan tashqarida (Telegram yo'lida umuman yo'q). `hujjatlar/GPT-TALABLARI-AUDITI.md` | shu commit |
| Qasddan qilinmadi | Fuqaro kabineti; OneID/E-imzo/ERP (kalitlar yo'q — `INTEGRATSIYALAR-REJA.md`) | — |

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
- Hokim/bandlik/rahbar/administrator: pastki o'ngda Hudhud (qush) — ovozda yoki yozib so'raysiz; hokimga ismi bilan, sof o'zbekcha murojaat qiladi. Sarlavhada «Сунъий интеллект · бугун яна N та сўров» (kalit ishlasa) yoki «Оддий режим» (kalitsiz/limit tugagan) ko'rinadi. Mahalla xodimida (YETTILIK) va faqat ko'rish rejimida YO'Q.
- Administrator/rahbar: reyestr ko'chirmasini yuklashda fayl izi (SHA-256) ko'rinadi, «Ёзиш» faqat ko'rilgan fayl va sana bilan ishlaydi; «Охирги юклашлар» jadvali (holat, ёзилган/такрор, узилган бўлса сабаби).
- Mahalla xodimi: sessiya tugasa yoki server band bo'lsa tayyor anketa **navbatga tushadi** (yo'qolmaydi); 403 da aniq matn.
- Hamma: login chegarasi — idoradagi ko'p xodimning kirishi bloklanmaydi, lekin muvaffaqiyatli kirish boshqa hisoblardagi xato urinishlarni "yuvmaydi".
- Hech narsa o'chirilmadi, bazaga faqat qo'shiladi (migratsiyalar `IF NOT EXISTS`).

## 4. Nima tekshirildi (mahalliy)

| Tekshiruv | Natija |
|---|---|
| **CI simulyatsiyasi** (`CI_TAQLID_TOLIQ=1 npm run ci-taqlid`, 2026-10-02): toza klon + TOZA baza | barcha migratsiyalar noldan qo'llandi, seed, `tsc` 0 xato, `lint` 0, `npm run sinov` — 61 to'plam, **XATO qatori yo'q**, build, sahifa hajmi byudjeti **31/31**, HTTP regressiya **39/39** |
| Yangi/kengaytirilgan sinovlar | `reyestr-yuklash-sinov` 24, `navbat-sinov` 47, `webhook-sinov` 17, `moderatsiya-sinov` 14, `sessiya-sinov` 33, HTTP 14a–14f, 15a–15c, `gpt-talablari-sinov` (xarita) |
| Mutatsiya sinovi (kodni ataylab buzib, sinov ushlashini tekshirish) | navbat 8/8, Telegram kodi 6/6 va 5/5, reyestr 19/19 (3 ta o'tib ketgani sinov kuchaytirilib yopildi), login chegarasi 4/4, moderatsiya audit 4/4, audit xaritasi 3/3. Bitta mutant «ekvivalent» (kodni buzmaydi: ortiqcha himoya qatori) — shunday qoldi |
| GitHub CI (`Tekshiruv` #66, `f4bc377`) | muvaffaqiyatli |
| Oldingi tekshiruvlar (2026-10-01) | 5 rol bo'yicha brauzer (Playwright) ~440 sahifa: 5xx/konsol xatosi yo'q; Hudhud brauzer sinovi (ovoz soxta) |

Bu sessiyadagi o'zgarishlardan KEYIN: GitHub CI hali **ishga tushmagan** (push qilingach tekshiriladi — natijani shu yerga yozmayman, ko'rmagunimcha).

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
- **Hudhud:** haqiqiy OpenAI bilan suhbat sifati va o'zbekcha ravonlik; haqiqiy mikrofon va Chrome `uz-UZ`; server STT; qurilmada o'zbekcha ovozda o'qish (ko'pida yo'q — javob yoziladi). `AGENT_MODEL` ni yaxshiroq modelga qo'yish tavsiya etiladi.
- Oflayn navbat va PWA: haqiqiy telefonda «o'rnatish» va oflayn ochilish qo'lda ko'rilmagan; qurilma xotirasi (localStorage) shifrlanmagan (muddat/hajm/chiqishda tozalash bilan cheklangan).
- Reyestr: juda katta mos kelishda (minglab) Vercel funksiya vaqt chegarasi oshishi mumkin — ma'lumot buzilmaydi, xavfsiz davom ettiriladi (audit 5.6).
- To'liq ro'yxat: `hujjatlar/GPT-TALABLARI-AUDITI.md` → «Tekshirilmagan narsalar».

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
- **Baza:** qaytarish kerak emas — migratsiyalar faqat qo'shadi, eski kod yangi ustun/enum qiymatlarini ko'rmaydi. Oxirgilari: `20261002100000_agent` (2 jadval), `20261002120000_reyestr_import` (1 jadval + 1 tur). Ikkalasi yangi jadval — eski kod ularga tegmaydi.
- **Migratsiya yiqilsa:** build to'xtaydi, sayt eski kod bilan ishlayveradi (`JOYLASHTIRISH.md`).
- Tafsilot: `ZAXIRA-VA-TIKLASH.md`.

## 8. Keyingi ustuvorlik (tartib bilan)

1. Yangi OpenAI kaliti Vercel'da (`OPENAI_API_KEY`) — Hudhud ni haqiqiy savollar bilan sinab ko'ring; eski (chatga yozilgan) kalit bekor qilinganini tasdiqlang.
2. Production'da `/api/health/readiness` ni oching; UptimeRobot'ni ulang (`JOYLASHTIRISH.md`).
3. Supabase → Database → Backups: tarif va PITR'ni tekshirib `ZAXIRA-VA-TIKLASH.md` ga yozing; keyin **bir marta tiklashni sinang**.
4. Vercel'da `DIRECT_URL` borligini tekshiring.
5. Xatlov tugagach: Next 14 → 16 yangilash (alohida shoxda, `ci-taqlid` TOLIQ bilan), xlsx 0.20.3.
6. CSP'ni Report-Only'dan majburiy rejimga o'tkazish (xabarlar jurnalini ko'rib chiqib).
7. Shoxdagi `stash` da `MAHALLA_RAIS` roli va `scripts/rais-yukla.ts` bor (push qilinmagan) — kerak bo'lsa ko'rib chiqing.
8. 2FA — faqat administrator mavjud bo'lganda (qulflanib qolmaslik uchun).
9. OneID / E-imzo / ERP (murojaatlar tizimi): kalitlar va operator hujjatlari hali yo'q; **arizalarni boshlang** — `INTEGRATSIYALAR-REJA.md` (so'rovlar ro'yxati, xavfsizlik qoidalari). Laziz repo'sidagi bu integratsiyalar soxta (`token.length > 10` = «tasdiqlangan»): olinmadi.
10. Ish beruvchini vaqtincha cheklash siyosatini belgilang (audit 10.8 — baho tayyor, kod siyosat kelgach).
11. Ko'p tumanga chiqishdan oldin `tumanId` ko'chirishi (audit 19.8, `KOP-TUMAN.md`).
