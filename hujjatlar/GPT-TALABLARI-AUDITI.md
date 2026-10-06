# GPT promptining 21 bo'limi — dalilga asoslangan audit

> Oxirgi yangilanish: 2026-10-02. Bu hujjatning **jadvallari qo'lda yozilmaydi**: ular
> `scripts/gpt-talablari-xaritasi.ts` dan `npx tsx scripts/gpt-talablari-sinov.ts --md`
> bilan chiqariladi, va `npm run sinov` shu xaritani tekshiradi (dalil sinov nomi o'sha faylda bormi,
> fayl zanjirda bormi, TO'LIQ bandda haqiqiy xulq-atvor sinovi bormi, QISMAN bandda cheklov bormi,
> hujjatda har bir band qatori bormi). Xarita o'zgarsa va hujjat yangilanmasa — sinov yiqiladi.

## Holat belgilari

| Belgi | Ma'nosi |
|---|---|
| **To'liq** | Talab bajarilgan va kamida bitta HAQIQIY xulq-atvor sinovi bor (baza, server yoki sof funksiya; faqat «kodda shu so'z bor» emas). |
| **Qisman** | Bajarilgan, lekin «Cheklov» da aytilgan qism **qilinmagan**. Nima qilinmagani va nega — shu yerda ochiq yozilgan. |
| **Hujjat/baholash** | Talab kod emas, hujjat yoki oldindan baholash; dalil — hujjatdagi aniq ibora. |

Promptning 1-bo'limi bo'yicha dastlabki kuzatuvlar (e1a44295 commitiga tegishli) qayta tekshirildi:

| Kuzatuv | Holat | Izoh |
|---|---|---|
| §2 Reyestr: bitta nomzodda tug'ilgan sana farqi e'tiborsiz qolardi | To'liq tuzatilgan | 2.1–2.4 |
| §3 Dalil shaxsga bog'langan, eski dalil yangi ishni tasdiqlardi | To'liq tuzatilgan | 3.1–3.6; ko'rinish (3.4) qisman |
| §4 Qo'lda yuklangan reyestr «tasdiqlangan» deb saqlanardi | To'liq tuzatilgan | 4.1–4.10; davr mosligi (4.5) qisman |
| §5 Bir fayldagi ikki satr ikki dalil; parallel import; ko'rish/yozish bog'lanmagan | **Bu sessiyada yakunlandi** | 5.x — fayl izi va import ID avval sxemada bor edi, lekin yo'l ularni to'ldirmasdi |
| §6 Qoralama kaliti umumiy; xato turlari ajratilmagan | **Bu sessiyada yakunlandi** | 6.12–6.13 (401/403 «yaroqsiz anketa» bo'lib qolardi) |
| §7 Idempotent kalit amal va mazmunsiz | To'liq tuzatilgan | 7.1–7.6; farq ko'rinishi (7.7) qisman |
| §8 Webhook siri, takror update, kod urinishlari | **Bu sessiyada yakunlandi** | kod urinishlari chegarasi va ish beruvchiga yolg'on xabar yo'q edi |
| §9 /tablo eski sessiya; login cheklovi | **Bu sessiyada yakunlandi** | muvaffaqiyatli kirish IP hisobini nolga tushirardi; `v` yo'q cookie |
| §10 Moderatsiya: qarama-qarshi qarorlar | To'liq tuzatilgan | atomar qaror avval bor edi; audit bu sessiyada tranzaksiyaga kirdi |

## Bu sessiyada topilgan va tuzatilgan HAQIQIY kamchiliklar

Audit paytida «bor deb o'ylangan» narsalar kodda va sinovda qayta tekshirildi. Quyidagilar **haqiqatan
yetishmagan** edi va tuzatildi (har biri sinov bilan, sinov esa mutatsiya bilan: buzilgan kod sinovni yiqitadi):

| # | Kamchilik | Tuzatish | Sinov |
|---|---|---|---|
| 1 | Reyestr: «ko'rish» va «yozish» serverda **bog'lanmagan** edi — administrator bir faylni ko'rib, boshqasini yozib yuborishi mumkin edi; SHA-256 izi va import ID sxemada bor-u, yo'l ularni **hech qachon to'ldirmasdi**; import holati hech qayerda saqlanmasdi; satr/ustun cheklari yo'q edi; sana `new Date(xom)` bilan o'qilardi (31.02 siljishi va kelajak sana rad etilmasdi) | `ReyestrImport` jadvali (additiv migratsiya), SHA-256, «ko'rish→yozish» faqat shu yozuv + fayl izi + sana bilan; atomar boshlash; to'xtab qolganini davom ettirish; 20 000 xom satr / 100 ustun / 10 000 ma'lumot satri; qat'iy sana | `reyestr-yuklash-sinov.ts` (24), `http-regressiya` 14a–14f |
| 2 | Oflayn navbat: 401 (sessiya tugagan) va 403 (ruxsat yo'q) **«yaroqsiz anketa»** bo'lib qolardi; besh urinishdan keyin ishlaydigan anketa «e'tibor talab qiladi»ga aylanardi | `xato-toifasi.ts`: 5 tur; 401 — urinish hisoblanmaydi va halqa to'xtaydi; 403 — navbatda qoladi; forma 401/5xx da tayyor anketani navbatga qo'yadi | `navbat-sinov.ts` (+9) |
| 3 | Telegram kodini terish **urinishlar chegarasiz** edi (har javob kod bor-yo'qligini ham bildirardi) | chat bo'yicha, bazada, 15 daqiqada 8 urinish; baza xatosida rad (fail-closed); ulangan xodim savoli buzilmaydi | `webhook-sinov.ts` (+9: chegara, guruh, muddat, bir martalik) |
| 4 | Ish beruvchiga tasdiq xabarida **«xodimlarga xabar ketdi»** deyilardi — yetkazilishi qaror vaqtida noma'lum | matn faqat tasdiq va navbatga qo'yilishini aytadi, «kafolatlanmaydi» deb yozadi | `beruvchi-sinov.ts` |
| 5 | **Login: muvaffaqiyatli kirish IP hisobini nolga tushirardi** — o'z hisobi bor kishi 59 ta xato urinishdan keyin o'zi kirib, parol terishni cheksiz davom ettira olardi | muvaffaqiyat faqat o'z urinishini qaytaradi (xotirada ham, bazada ham); idoradagi 70 ta kirish chegarani to'ldirmaydi | `sessiya-sinov.ts`, `monitoring-sinov.ts`, `http-regressiya` 15a–15b |
| 6 | `v` (avlod) maydoni yo'q eski cookie **o'tkazib yuborilardi** (parol almashganda ham ishlayverardi) | `avlodYaroqlimi`: avlodi yo'q cookie tugagan; uch cookie yaratuvchisi avlodni yozadi | `sessiya-sinov.ts`, `http-regressiya` 15c |
| 7 | Moderatsiya qarori va audit **alohida** yozilardi; Telegram orqali berilgan qaror auditga **umuman tushmasdi**; audit xatosi jim yutilardi | qaror + audit bitta tranzaksiyada (ish beruvchi, e'lon, dalil); audit faqat qaror ro'yxatga o'tganda | `moderatsiya-sinov.ts` (+2) |
| 8 | Dalil qatorida **tekshirish sanasi** va ko'chirma sanasi ko'rinmasdi | ko'rsatildi (davr bor bo'lsa u ham) | `joylashish-sinov.ts` |

## Tasdiqlangan ish beruvchini vaqtincha cheklash va qayta tekshirish (10.8) — baholash

**Holat: kodda YO'Q, baholandi.** Hozir ish beruvchi `KUTILMOQDA → TASDIQLANDI | RAD_ETILDI`; tasdiqlangandan keyin
uni to'xtatib turish yo'li yo'q (faqat har bir e'lon alohida moderatsiyadan o'tadi, shubhali e'lonlar
«tekshiring» belgisi oladi). Tavsiya (kichik, additiv):

1. `IshBeruvchiHolati` ga `CHEKLANGAN` qiymati (`ADD VALUE IF NOT EXISTS`) + `cheklanganSababi`, `cheklanganSana`, `cheklaganId`.
2. Faqat administrator va bandlik rahbari cheklaydi; sabab majburiy; qaror auditga bitta tranzaksiyada (yangi `elonniHalQil` namunasida).
3. Cheklanganda: yangi e'lon qo'ya olmaydi, mavjud e'lonlari xodimlarga ko'rinmaydi (`FAOL_ELON` sharti), ish beruvchiga matn «Bandlik markazi bilan bog'laning» (sabab ochiq aytilmaydi).
4. Qayta tekshiruvdan o'tsa `TASDIQLANDI` ga qaytariladi, ikkala qaror tarixda.

Nega hozir qilinmadi: bu **siyosat qarori** — kim, qaysi asosda, qancha muddatga cheklaydi. Egasi belgilamaguncha kod yozish noto'g'ri qoida qotirib qo'yardi.

## Oilalar bo'yicha reyting YO'Q (15.6)

Tizimda **mahalla** solishtirishi bor (nisbiy ko'rsatkichlar bilan, «reyting emas» izohi bilan). **Oilalar/fuqarolar
bo'yicha ochiq reyting, ball yoki tartiblash yo'q**: ro'yxatlar holat va muddat bo'yicha filtrlanadi, oilaviy
ko'rsatkich («farovonlik balli») faqat xonadon sahifasida, shu xonadonning o'z tarixini solishtirish uchun
(`tarix-sinov.ts`) — oilalar bir-biriga qarshi qo'yilmaydi. AI agent shaxsiy ma'lumotni ko'rmaydi (18.8).

## Tekshirilmagan narsalar (halol ro'yxat)

Quyidagilar **bu muhitda tekshirib bo'lmadi** va "o'tdi" deb yozilmaydi:

- **Real OpenAI**: yangi kalit bilan haqiqiy javob sifati va o'zbek tili ravonligi (kalit va tarmoq yo'q); `AGENT_MODEL` ni yaxshiroq modelga qo'yish tavsiya etiladi.
- **Haqiqiy mikrofon / Chrome `uz-UZ`** va server STT aniqligi: brauzer testida ovoz soxta (stub) bilan sinalgan.
- **Telefonda o'rnatish (PWA)** va haqiqiy oflayn ochilish: service worker mantig'i sinov muhitida sinalgan.
- **Ekran o'quvchi** (NVDA/TalkBack) va butun UI uchun avtomatik kontrast hisobi.
- **Production (Supabase) zaxirasidan tiklash** — egasi qilishi kerak (19.5).
- **Vercel ko'p nusxada** ishlash va juda katta import vaqt chegarasi (5.6).
- **Production deploy** — sandbox'dan `www.xatirchibandlik.uz` ga chiqib bo'lmaydi; deploydan keyin `/api/health/readiness` va `/tizim` ni ko'ring.
- **Sust internet / oddiy telefonda real tezlik** o'lchanmagan (17.12) — shuning uchun «tezlashdi» deb da'vo qilinmaydi.

## Keyingi ustuvor ish

1. **Siz (egasi):** Supabase zaxirasidan tiklashni sinab, `/tizim` da natijani yozing (19.5); `DIRECT_URL` ni Vercel da tekshiring; UptimeRobot ni `/api/health/readiness` ga ulang.
2. Yangi OpenAI kaliti bilan Hudhud ni haqiqiy savollar bilan sinab ko'ring; kerak bo'lsa `AGENT_MODEL` ni almashtiring.
3. 10.8 (ish beruvchini cheklash) siyosatini belgilang — keyin kod yoziladi.
4. Ko'p tumanga chiqishdan OLDIN `tumanId` ko'chirishi (19.8, `KOP-TUMAN.md`).
5. Mahalla reytingiga boshlang'ich holat va xizmat natijasini qo'shish (15.5) — avval qaysi og'irliklar adolatli ekanini hokimlik bilan kelishib.
6. OneID / E-imzo / ERP — kalit va hujjatlar kelgach (`INTEGRATSIYALAR-REJA.md`).

## Jadvallar (talab → dalil)

Dalil formati: `fayl` — **sinov**: «sinov nomining bir qismi» (haqiqiy xulq-atvor) yoki **ibora**: «hujjat/koddagi ibora».

### §1. Boshlang‘ich audit

| Band | Talab | Holat | Dalil |
|---|---|---|---|
| 1.1 | Har bir kuzatuv joriy kodda qayta tekshirilib, holati belgilanadi (tasdiqlandi / qisman / to‘liq / qo‘shimcha tekshiruv) | Hujjat/baholash | `hujjatlar/GPT-TALABLARI-AUDITI.md` — ibora: «Holat belgilari»<br>`scripts/regressiya-xaritasi-sinov.ts` — sinov: «Hech bir holat FAQAT kod-grep bilan qoplanmagan» |
| 1.2 | Mavjud ishlaydigan funksiyalar saqlanadi; migratsiyalar ma‘lumotni o‘chirmaydi, production bazasi reset qilinmaydi | To‘liq | `scripts/migratsiya-sinov.ts` — sinov: «Янги миграциялар ФАҚАТ ҚЎШАДИ»<br>`scripts/migratsiya-sinov.ts` — sinov: «Янги миграциялар такрор юргизилса ҳам хато бермайди»<br>`scripts/migratsiya-sinov.ts` — sinov: «Миграция йиқилса деплой тўхтайди»<br>`scripts/dalil-sinov.ts` — sinov: «Миграция ҲЕЧ НАРСА ЎЧИРМАЙДИ» |

### §2. Reyestrdagi shaxsni moslashtirish

| Band | Talab | Holat | Dalil |
|---|---|---|---|
| 2.1 | Tug‘ilgan sana ikki tomonda bo‘lsa HAR DOIM solishtiriladi; qarama-qarshi bo‘lsa avtomatik tasdiqlanmaydi | To‘liq | `scripts/dalil-sinov.ts` — sinov: «Бошқа туғилган санали одам «мос» деб ОЛИНМАЙДИ»<br>`scripts/dalil-sinov.ts` — sinov: «Бир хил туғилган сана — мос деб топилади» |
| 2.2 | Faqat ism bo‘yicha moslik "tekshiruv talab qiladi" holati; yetishmagan ma‘lumot qarama-qarshi ma‘lumotdan ajratiladi | To‘liq | `scripts/dalil-sinov.ts` — sinov: «Сана ЕТИШМАСА — алоҳида гуруҳ, автоматик тасдиқланмайди»<br>`scripts/dalil-sinov.ts` — sinov: «Бошқа туғилган санали одам «мос» деб ОЛИНМАЙДИ» |
| 2.3 | Bir xil ismli shaxslar avtomatik birlashtirilmaydi | To‘liq | `scripts/dalil-sinov.ts` — sinov: «Бир хил исмли иккита фуқаро — ҳеч бири танланмайди» |
| 2.4 | Moslik sababi va ziddiyat foydalanuvchiga ko‘rsatiladi | To‘liq | `scripts/dalil-sinov.ts` — sinov: «Бошқа туғилган санали одам «мос» деб ОЛИНМАЙДИ»<br>`src/components/dalil/reyestr-yuklash.tsx` — ibora: «Туғилган санаси МОС КЕЛМАДИ» |
| 2.5 | Shaxsiy identifikator (JSHSHIR/PINFL) kerak bo‘lsa — yig‘ish zarurati, ruxsat va saqlash himoyasi OLDINDAN baholanadi | Hujjat/baholash | `hujjatlar/INTEGRATSIYALAR-REJA.md` — ibora: «PINFL saqlanadimi»<br>`hujjatlar/INTEGRATSIYALAR-REJA.md` — ibora: «HMAC-SHA256»<br>`scripts/monitoring-sinov.ts` — sinov: «Tozalash: telefon (har xil yozuv), JSHSHIR» |

### §3. Dalilni aniq ishga joylashish voqeasiga bog‘lash

| Band | Talab | Holat | Dalil |
|---|---|---|---|
| 3.1 | Ishga joylashish tarixi alohida voqealar sifatida saqlanadi (ish beruvchi, lavozim, boshlanish/tugash, holat, vakansiya) | To‘liq | `scripts/joylashish-sinov.ts` — sinov: «Биринчи сақлашда воқеа яратилади»<br>`scripts/joylashish-sinov.ts` — sinov: «Корхона АЛМАШСА — эскиси ёпилади, янгиси яратилади»<br>`scripts/joylashish-sinov.ts` — sinov: «Бир вақтда ФАҚАТ БИТТА очиқ воқеа қолади»<br>`prisma/schema.prisma` — ibora: «model IshgaJoylashish» |
| 3.2 | Dalil aniq voqeaga bog‘lanadi; eski ish dalili yangi ishga avtomatik ko‘chmaydi | To‘liq | `scripts/joylashish-sinov.ts` — sinov: «ЭСКИ ишнинг далили ЯНГИ ишни тасдиқламайди»<br>`scripts/joylashish-sinov.ts` — sinov: «Янги ишга ЎЗ далили келса — яна тасдиқланади»<br>`scripts/joylashish-sinov.ts` — sinov: «БОШҚА одамнинг ишига боғлаб бўлмайди»<br>`scripts/joylashish-sinov.ts` — sinov: «Параллел боғлаш — фақат биттаси ўтади» |
| 3.3 | "Ish boshlagani tasdiqlangan" va "hozir ham ishlayotgani tekshirilgan" alohida holatlar | To‘liq | `scripts/joylashish-sinov.ts` — sinov: «Иш бошлагани тасдиқланса, ҳолати ҲАМОН «номаълум»»<br>`scripts/joylashish-sinov.ts` — sinov: ««Ҳамон ишлаяпти» далили воқеани ИШЛАМОҚДА қилади»<br>`scripts/joylashish-sinov.ts` — sinov: «РАД ЭТИЛГАН «ишлаяпти» далили воқеани ўзгартирмайди» |
| 3.4 | Dalilning tegishli davri, manbasi va tekshirish sanasi ko‘rinadi | Qisman<br><sub>Cheklov: Manba, hujjat sanasi, ko‘chirma sanasi va tekshirish sanasi har dalil qatorida ko‘rinadi. Dalil qamrab olgan DAVR (boshi–oxiri) maydonlari sxemada bor va bor bo‘lsa ko‘rsatiladi, lekin qo‘lda kiritish formasida va reyestr yuklashda to‘ldirilmaydi; davr mosligi avtomatik tekshirilmaydi. Ekran matni brauzerda avtomatik sinalmagan (kod darajasida).</sub> | `scripts/joylashish-sinov.ts` — sinov: «Далил қаторида манба ташкилот, ҳужжат санаси, кўчирма санаси, давр ва ТЕКШИРИЛГАН САНА»<br>`src/components/dalil/dalil-blogi.tsx` — ibora: «текширилган сана» |
| 3.5 | Ish o‘zgarganda yoki tugaganda tarix saqlanadi | To‘liq | `scripts/joylashish-sinov.ts` — sinov: «Иш алмаштирган одам ИШ РЎЙХАТИДА қолади»<br>`scripts/joylashish-sinov.ts` — sinov: «Сабаб билан ёпилади ва ҳолати ТУГАДИ бўлади»<br>`scripts/joylashish-sinov.ts` — sinov: «Тугаш санаси бошланишдан ИЛГАРИ бўлмайди» |
| 3.6 | Mavjud dalillarni migratsiya qilishda noma‘lum bog‘lanish o‘ylab topilmaydi — tekshiruv talab qiladigan holatga ajratiladi | To‘liq | `scripts/joylashish-sinov.ts` — sinov: «Воқеага боғланмаган далил АЛОҲИДА белгиланади»<br>`scripts/joylashish-sinov.ts` — sinov: «Боғланмаган далил ЎЗИ боғланиб қолмайди» |

### §4. "Tasdiqlangan" natijaning ishonchliligi

| Band | Talab | Holat | Dalil |
|---|---|---|---|
| 4.1 | Qo‘lda yuklangan fayl rasmiy integratsiya natijasi bilan tenglashtirilmaydi | To‘liq | `scripts/dalil-sinov.ts` — sinov: «Қўлда юкланган кўчирма АВТОМАТИК тасдиқланмайди»<br>`scripts/joylashish-sinov.ts` — sinov: «Қўлда тасдиқ РАСМИЙ деб саналмайди»<br>`scripts/joylashish-sinov.ts` — sinov: «Реестр юклаш ҚЎЛДА манба деб ёзади» |
| 4.2 | Manba tashkilot, hujjat sanasi, yuklovchi, import ID va faylning kriptografik izi (SHA-256) saqlanadi | To‘liq | `scripts/dalil-sinov.ts` — sinov: «Қўлда юкланган кўчирма АВТОМАТИК тасдиқланмайди»<br>`scripts/reyestr-yuklash-sinov.ts` — sinov: «Dalillar shu yuklash yozuvining id si va fayl izi bilan saqlanadi»<br>`scripts/http-regressiya.ts` — sinov: «14d. Yozish: to'g'ri fayl bilan 200» |
| 4.3 | Fayl izi uning haqiqiyligini o‘zi tasdiqlamasligi hisobga olinadi | To‘liq | `scripts/dalil-sinov.ts` — sinov: «Қўлда юкланган кўчирма АВТОМАТИК тасдиқланмайди»<br>`scripts/reyestr-yuklash-sinov.ts` — sinov: «Interfeys: "Yozish" tugmasi serverdan kelgan»<br>`prisma/schema.prisma` — ibora: «ҲАҚИҚИЙ» |
| 4.4 | Shaxs yoki ish beruvchi mos kelmasa — tekshiruv navbatiga yuboriladi | To‘liq | `scripts/dalil-sinov.ts` — sinov: «Киритилган ҳужжат ТЕКШИРИШ навбатига тушади»<br>`scripts/dalil-sinov.ts` — sinov: «Иш жойи фарқи далилда ЁЗИБ қўйилади»<br>`scripts/dalil-sinov.ts` — sinov: «Бошқа туғилган санали одам «мос» деб ОЛИНМАЙДИ» |
| 4.5 | Davr mos kelmasa — tekshiruv navbatiga yuboriladi | Qisman<br><sub>Cheklov: Reyestr ko‘chirmasi bitta sanaga tegishli (`reyestrSanasi`) va u dalilda saqlanadi; hujjat DAVRI (boshi–oxiri) bilan ishga kirish davrini avtomatik solishtirish yo‘q. Har qanday qo‘lda yuklangan dalil baribir tekshiruv navbatiga tushadi va odam ko‘radi.</sub> | `scripts/dalil-sinov.ts` — sinov: «Киритилган ҳужжат ТЕКШИРИШ навбатига тушади»<br>`scripts/dalil-sinov.ts` — sinov: «Муддат ишга кирган санадан ҳисобланади» |
| 4.6 | Qo‘lda kiritilgan dalilni kiritgan xodim o‘zi tasdiqlamaydi | To‘liq | `scripts/dalil-sinov.ts` — sinov: «Ўзи киритган далилни ўзи тасдиқлай олмаслиги ЙЎЛДА текширилади»<br>`scripts/dalil-sinov.ts` — sinov: «Бошқа одам тасдиқласа — ҳисобга ўтади» |
| 4.7 | Rasmiy avtomatik tasdiq faqat tekshirilgan integratsiya orqali beriladi | To‘liq | `scripts/joylashish-sinov.ts` — sinov: «ФАҚАТ расмий интеграция ЎЗИ тасдиқ»<br>`scripts/joylashish-sinov.ts` — sinov: «Тахмин ҲЕЧ ҚАЧОН «расмий» деб чиқмайди» |
| 4.8 | Qaror o‘zgartirilganda oldingi qaror, sabab va tekshiruvchi tarixi saqlanadi | To‘liq | `scripts/moderatsiya-sinov.ts` — sinov: «Қарор ўзгарса, ОЛДИНГИСИ изоҳда сақланади»<br>`scripts/moderatsiya-sinov.ts` — sinov: «Қарорни ЎЗГАРТИРИШ сабабсиз бўлмайди»<br>`scripts/moderatsiya-sinov.ts` — sinov: «Тасдиқланган далилни оддий йўл билан ЎЗГАРТИРИБ бўлмайди» |
| 4.9 | "Xodim bildirgan", "dalil kiritilgan", "tekshirilgan", "rad etilgan" holatlari farqlanadi | To‘liq | `scripts/joylashish-sinov.ts` — sinov: «Реестр — қўлда кўчирма, маҳалла — ходимнинг гапи»<br>`scripts/joylashish-sinov.ts` — sinov: «Киритилган-у текширилмаган — «кутилмоқда»»<br>`scripts/joylashish-sinov.ts` — sinov: «РАД ЭТИЛГАН далил «далилсиз» деб кўрсатилмайди»<br>`scripts/joylashish-sinov.ts` — sinov: «Фақат ходимнинг гапи — далил эмас, хабар» |
| 4.10 | Hisobotdagi tasdiqlangan sonlar aynan shu qoidalarga tayanadi | To‘liq | `scripts/joylashish-sinov.ts` — sinov: «Ҳисобга ФАҚАТ тасдиқланган икки даража киради»<br>`scripts/joylashish-sinov.ts` — sinov: «Ҳисобот таркиби жамга тўғри келади»<br>`scripts/dalil-sinov.ts` — sinov: «Жамланма туман ҳолати билан бир хил»<br>`scripts/joylashish-sinov.ts` — sinov: «Брифинг расмий манба сонини АЛОҲИДА айтади» |

### §5. Importni takrorlanish va yarim bajarilishdan himoya qilish

| Band | Talab | Holat | Dalil |
|---|---|---|---|
| 5.1 | Fayl ichidagi takrorlar oldindan aniqlanadi | To‘liq | `scripts/dalil-sinov.ts` — sinov: «Файл ичидаги ТАКРОР сатр иккита далил ясамайди»<br>`scripts/reyestr-yuklash-sinov.ts` — sinov: «Dalillar shu yuklash yozuvining id si va fayl izi bilan saqlanadi; takror (davom ettirish)» |
| 5.2 | Bazada biznes mazmuniga mos unique cheklov bor | To‘liq | `scripts/dalil-sinov.ts` — sinov: «Базада ҳам ягоналик чегараси бор»<br>`prisma/schema.prisma` — ibora: «@@unique([ishsizId, turi, reyestrSanasi], name: "dalil_takrori")» |
| 5.3 | Bir fayl qayta yoki parallel yuklanganda takror dalil yaratilmaydi | To‘liq | `scripts/dalil-sinov.ts` — sinov: «ПАРАЛЛЕЛ юклаш: бир вақтда 5 та бир хил кўчирма — БИТТА далил»<br>`scripts/dalil-sinov.ts` — sinov: «Ўша сана билан такрор юклаш нусха ясамайди»<br>`scripts/http-regressiya.ts` — sinov: «14d. Yozish: to'g'ri fayl bilan 200» |
| 5.4 | Import jarayonining holati, sanog‘i va xatolari saqlanadi | To‘liq | `scripts/reyestr-yuklash-sinov.ts` — sinov: «XATO: yozish uzilsa holat XATO»<br>`scripts/reyestr-yuklash-sinov.ts` — sinov: «Jarayon sanog'i faqat YOZILMOQDA holatida yangilanadi»<br>`scripts/http-regressiya.ts` — sinov: «14b. Reyestr "ko'rish"» |
| 5.5 | Qisman bajarilgan import davom ettirilishi yoki xavfsiz qaytarilishi mumkin | To‘liq | `scripts/reyestr-yuklash-sinov.ts` — sinov: «TO'XTAB QOLGAN yozish»<br>`scripts/reyestr-yuklash-sinov.ts` — sinov: «XATO: yozish uzilsa holat XATO»<br>`scripts/reyestr-yuklash-sinov.ts` — sinov: «TAKROR YOZISH: tugagan yuklashni qayta yozish takror yozmaydi» |
| 5.6 | Katta importlar cheklangan bo‘laklarda bajariladi | Qisman<br><sub>Cheklov: Fayl 10 000 ma‘lumot satrigacha cheklangan, yozish har 200 satrda holatni yangilab turadi va uzilsa xavfsiz davom etadi. Lekin yozish BITTA so‘rovda ketma-ket bajariladi (fonli navbat/worker yo‘q): juda katta mos kelishlarda Vercel funksiyasi vaqt chegarasi (maxDuration) oshib uzilishi mumkin — u holda ma‘lumot buzilmaydi, 10 daqiqadan keyin yoki "xato" holatidan qayta bosib davom ettiriladi.</sub> | `scripts/reyestr-yuklash-sinov.ts` — sinov: «sanoq bo'laklarda yangilanadi»<br>`scripts/reyestr-yuklash-sinov.ts` — sinov: «Satr chegarasi: xom satr 20 001 - rad» |
| 5.7 | Fayl hajmidan tashqari satr, ustun va qayta ishlash resurslari ham cheklanadi | To‘liq | `scripts/reyestr-yuklash-sinov.ts` — sinov: «Satr chegarasi: xom satr 20 001 - rad»<br>`scripts/reyestr-yuklash-sinov.ts` — sinov: «Ustun chegarasi: 101 ustunli satr - rad»<br>`scripts/reyestr-yuklash-sinov.ts` — sinov: «HAQIQIY xlsx: juda keng diapazon»<br>`scripts/prototip-qoriqchi-sinov.ts` — sinov: «reyestrniOqi: reader prototipni buzsa - fayl RAD»<br>`scripts/http-regressiya.ts` — sinov: «14f. Reyestr resurs chegarasi» |
| 5.8 | "Avval ko‘rish, keyin tasdiqlash" serverda import ID va fayl izi bilan bog‘lanadi; ko‘rilgan fayl o‘rniga boshqa fayl yozilmaydi | To‘liq | `scripts/reyestr-yuklash-sinov.ts` — sinov: «BOSHQA FAYL yozilmaydi»<br>`scripts/reyestr-yuklash-sinov.ts` — sinov: «Boshqa sana bilan yozilmaydi»<br>`scripts/reyestr-yuklash-sinov.ts` — sinov: «PARALLEL: bir yozuvga 8 ta bir vaqtdagi "yozish"»<br>`scripts/http-regressiya.ts` — sinov: «14c. BOSHQA FAYL yozilmaydi» |
| 5.9 | Import sanasining kelajakda bo‘lishi kabi holatlar tekshiriladi | To‘liq | `scripts/reyestr-yuklash-sinov.ts` — sinov: «Sana: kelajak rad, juda eski (2020 dan oldin) rad»<br>`scripts/http-regressiya.ts` — sinov: «14e. Reyestr sanasi qat'iy» |
| 5.10 | Sana tekshiruvi: 31.02 mart oyiga o‘zgartirilmaydi; Excel va matnli sanalar, kabisa yili, vaqt mintaqasi sinalgan | To‘liq | `scripts/dalil-sinov.ts` — sinov: «31.02.2000 РАД ЭТИЛАДИ — мартга сурилмайди»<br>`scripts/dalil-sinov.ts` — sinov: «29.02.2000 қабул қилинади — кабиса йили»<br>`scripts/dalil-sinov.ts` — sinov: «29.02.2001 рад этилади — кабиса йили ЭМАС»<br>`scripts/dalil-sinov.ts` — sinov: «Маъносиз Excel рақами рад этилади»<br>`scripts/dalil-sinov.ts` — sinov: «Сана UTC да ясалади — вақт минтақаси силжитмайди»<br>`scripts/reyestr-yuklash-sinov.ts` — sinov: «Sana: 31.02 martga SURILMAYDI» |

### §6. Qoralamalar va oflayn navbat

| Band | Talab | Holat | Dalil |
|---|---|---|---|
| 6.1 | Har qoralama xodimning o‘zgarmas ID si va alohida qoralama ID si bilan saqlanadi | To‘liq | `scripts/navbat-sinov.ts` — sinov: «Икки ходимнинг қораламаси бир-бирини БОСМАЙДИ»<br>`scripts/navbat-sinov.ts` — sinov: «Навбат ёзуви эгаси билан сақланади» |
| 6.2 | Bir xodimning bir nechta anketasi parallel saqlana oladi | To‘liq | `scripts/navbat-sinov.ts` — sinov: «Битта ходим ИККИТА анкетани параллел сақлай олади» |
| 6.3 | O‘qish, o‘chirish, tiklash va yuborish egasi doirasida ishlaydi | To‘liq | `scripts/navbat-sinov.ts` — sinov: «ФАҚАТ ўзиники юборилади — ҳамкасбники тегилмайди»<br>`scripts/navbat-sinov.ts` — sinov: «Ҳамкасбнинг қораламаси очилмайди»<br>`scripts/navbat-sinov.ts` — sinov: «Чиқишда ФАҚАТ ўзининг қораламаси ўчади» |
| 6.4 | Bir nechta brauzer oynasidagi yozuvlar bir-birini buzmaydi | To‘liq | `scripts/navbat-sinov.ts` — sinov: «Битта ходим ИККИТА анкетани параллел сақлай олади»<br>`scripts/idempotent-sinov.ts` — sinov: «Параллел таҳрир: версия билан» |
| 6.5 | Hisob almashganda boshqa foydalanuvchi navbati yuborilmaydi | To‘liq | `scripts/navbat-sinov.ts` — sinov: «ФАҚАТ ўзиники юборилади — ҳамкасбники тегилмайди»<br>`scripts/navbat-sinov.ts` — sinov: «Эгасиз эски ёзув ҳеч кимнинг номидан жўнамайди» |
| 6.6 | Yuborish paytida hisob almashishi ham tekshiriladi | To‘liq | `scripts/idempotent-sinov.ts` — sinov: «Бошқа ходимнинг калити — бегона» |
| 6.7 | Egasiz eski yozuvlar boshqa hisobga jim biriktirilmaydi | To‘liq | `scripts/navbat-sinov.ts` — sinov: «Ходим тасдиқласа, эгасиз ёзув уники бўлади»<br>`scripts/navbat-sinov.ts` — sinov: «Эгасиз эски ёзув ҳеч кимнинг номидан жўнамайди» |
| 6.8 | Saqlash muvaffaqiyatsiz bo‘lsa "saqlandi" deb yozilmaydi | To‘liq | `scripts/navbat-sinov.ts` — sinov: «Saqlash MUVAFFAQIYATSIZ bo‘lsa "saqlandi" deb yozilmaydi» |
| 6.9 | Qoralamalarni ko‘rish, davom ettirish va boshqarish oynasi bor | Qisman<br><sub>Cheklov: Ro‘yxatni tuzish, tartiblash, egalik va chekov mantig‘i kutubxona darajasida sinalgan; oynaning o‘zi (ko‘rinish, tugmalar) haqiqiy brauzerda avtomatik sinalmagan — kod darajasida ulangan.</sub> | `scripts/navbat-sinov.ts` — sinov: «Рўйхатда ФАҚАТ ўзининг қораламалари кўринади»<br>`scripts/navbat-sinov.ts` — sinov: «Рўйхат ЯНГИСИДАН эскисига тартибланади»<br>`src/components/xatlov/xatlov-formasi.tsx` — ibora: «qoralamaniDavomEttir» |
| 6.10 | Shaxsiy ma‘lumotning qurilmada saqlanish muddati va hajmi cheklanadi | To‘liq | `scripts/navbat-sinov.ts` — sinov: «Эскирган қоралама ЎҚИШДА тушиб қолади»<br>`scripts/navbat-sinov.ts` — sinov: «Чегарадан ошган ЭНГ ЭСКИ қоралама тушиб қолади»<br>`scripts/navbat-sinov.ts` — sinov: «Чиқишда телефон хотираси тозаланади» |
| 6.11 | Saqlash texnologiyasini almashtirishning o‘zi xavfsizlik hisoblanmaydi | Qisman<br><sub>Cheklov: Qoralama va navbat localStorage da OCHIQ matnda turadi (shifrlash yo‘q). Himoya: egasi bo‘yicha ajratish, 7 kunlik muddat, 20 ta chegarasi, chiqishda tozalash, yuborilmaganini o‘chirmaslik. Qurilma o‘g‘irlansa va qulf bo‘lmasa, kutilgan muddat ichidagi matn o‘qilishi mumkin.</sub> | `scripts/navbat-sinov.ts` — sinov: «Чиқишда телефон хотираси тозаланади»<br>`scripts/navbat-sinov.ts` — sinov: «Эскирган қоралама ЎҚИШДА тушиб қолади»<br>`scripts/navbat-sinov.ts` — sinov: «Чегарадан ошган ЭНГ ЭСКИ қоралама тушиб қолади» |
| 6.12 | Xatolar ajratiladi: 401 qayta kirish, 403 huquq/hisob, 400/422 tuzatish, 409 ziddiyat, tarmoq/5xx keyinroq | To‘liq | `scripts/navbat-sinov.ts` — sinov: «HTTP kodi beshta turga ajraladi»<br>`scripts/navbat-sinov.ts` — sinov: «Har tur uchun alohida matn bor»<br>`scripts/navbat-sinov.ts` — sinov: «403: anketa navbatda QOLADI»<br>`scripts/navbat-sinov.ts` — sinov: «400/422 "yaroqsiz" bo‘lib qoladi» |
| 6.13 | Qayta kirish talab qiladigan yozuv oddiy "yaroqsiz anketa"ga aylanmaydi | To‘liq | `scripts/navbat-sinov.ts` — sinov: «401: sessiya tugagan - anketa YAROQSIZ EMAS»<br>`scripts/navbat-sinov.ts` — sinov: «401 o‘n marta ketma-ket kelsa ham anketa» |

### §7. Idempotentlik va parallel tahrir

| Band | Talab | Holat | Dalil |
|---|---|---|---|
| 7.1 | Takror so‘rov kaliti aniq amal, foydalanuvchi va mazmun bilan bog‘lanadi | To‘liq | `scripts/idempotent-sinov.ts` — sinov: «Калит АМАЛ, ЭГАСИ ва ИЗ билан сақланади»<br>`scripts/idempotent-sinov.ts` — sinov: «Майдонлар тартиби изни ЎЗГАРТИРМАЙДИ»<br>`scripts/idempotent-sinov.ts` — sinov: «Мазмун ўзгарса — из ҳам ўзгаради» |
| 7.2 | Bir xil kalit va boshqa mazmun kelganda ziddiyat qaytadi | To‘liq | `scripts/idempotent-sinov.ts` — sinov: «Якуний икки марта, БОШҚА мазмун билан — ЗИДДИЯТ» |
| 7.3 | Qoralama → yakuniy o‘tish alohida tekshiriladigan holat o‘zgarishi; majburiy nazorat holati (4 qadam) | To‘liq | `scripts/idempotent-sinov.ts` — sinov: «ҚОРАЛАМА → ЯКУНИЙ: такрор ЭМАС, ёзув янгиланади»<br>`scripts/idempotent-sinov.ts` — sinov: «ЯКУНИЙ → ҚОРАЛАМА тескари йўл йўқ — зиддият»<br>`scripts/idempotent-sinov.ts` — sinov: «Қоралама → якуний, мазмун ЎЗГАРМАГАН бўлса ҳам — давом» |
| 7.4 | Kalit orqali topilgan yozuvning egasi va hududi tekshiriladi | To‘liq | `scripts/idempotent-sinov.ts` — sinov: «Бошқа ходимнинг калити — бегона»<br>`scripts/http-regressiya.ts` — sinov: «9a. O'z mahallasining xonadonini API orqali OCHADI» |
| 7.5 | Mavjud yozuv yangilanishi avtomatik ravishda xavfsiz idempotent amal deb hisoblanmaydi | To‘liq | `scripts/idempotent-sinov.ts` — sinov: «Йўл эрта қайтишни ТАШЛАГАН — қарор модулидан фойдаланади»<br>`scripts/idempotent-sinov.ts` — sinov: «Калит топилмаса — янги ёзув» |
| 7.6 | Ikki xodim bir yozuvni tahrirlaganda keyingi saqlash oldingi o‘zgarishni jim o‘chirmaydi (versiya asosida ziddiyat) | To‘liq | `scripts/idempotent-sinov.ts` — sinov: «Параллел таҳрир: версия билан `updateMany` ва 409»<br>`scripts/idempotent-sinov.ts` — sinov: «Форма версияни юборади ва жавобдан янгилайди» |
| 7.7 | Ziddiyatda ikkala versiya saqlanib, farqlarni ko‘rish imkoniyati bo‘ladi | Qisman<br><sub>Cheklov: Ikkala versiya saqlanadi (xodimning anketasi telefonda, serverdagi yozuv bazada) va mavjud yozuvga havola beriladi, lekin ikki versiyani YONMA-YON FARQ (diff) ko‘rinishida ko‘rsatadigan ekran yo‘q — xodim ikkala yozuvni ochib qo‘lda solishtiradi.</sub> | `scripts/navbat-sinov.ts` — sinov: «ЗИДДИЯТ (409) ёзувни ЎЧИРМАЙДИ — иш йўқолмайди»<br>`scripts/navbat-sinov.ts` — sinov: «Зиддиятли ёзув автоматик қайта юборилмайди» |

### §8. Telegram webhook va xabarlar

| Band | Talab | Holat | Dalil |
|---|---|---|---|
| 8.1 | Webhook siri yo‘q bo‘lsa xizmat so‘rovni rad etadi | To‘liq | `scripts/webhook-sinov.ts` — sinov: «SIR YO'Q: yo'l 503 beradi» |
| 8.2 | Noto‘g‘ri sir bilan hech qanday biznes amali bajarilmaydi | To‘liq | `scripts/webhook-sinov.ts` — sinov: «SIR NOTO'G'RI yoki YO'Q»<br>`scripts/webhook-sinov.ts` — sinov: «SIR TO'G'RI: kod ulanadi» |
| 8.3 | Ishga tushishda konfiguratsiya tekshiriladi | Qisman<br><sub>Cheklov: Tekshiruv ilova ishga tushishida emas, HAR SO‘ROVDA (sir yoki token yo‘q bo‘lsa 503) va administrator /tizim va /vazifalar sahifasida "shoshilinch" belgisi bilan bajariladi. Ilovaning o‘zi ishga tushishda to‘xtatilmaydi — aks holda Telegram sozlanmagani butun saytni yiqitgan bo‘lardi.</sub> | `scripts/webhook-sinov.ts` — sinov: «TELEGRAM_BOT_TOKEN yo'q: yo'l 503 beradi»<br>`scripts/vazifa-sinov.ts` — sinov: «Вебхук сири йўқ бўлса — ШОШИЛИНЧ деб белгиланади» |
| 8.4 | Telegram update_id bo‘yicha takror yangilanishlar aniqlanadi | To‘liq | `scripts/webhook-sinov.ts` — sinov: «TAKROR YANGILANISH»<br>`scripts/webhook-sinov.ts` — sinov: «TAKROR "BOSHQA" update_id»<br>`scripts/webhook-sinov.ts` — sinov: «BIR VAQTDA 8 TA bir xil update» |
| 8.5 | Takror yuborilgan callback bir amalni ikki marta bajarmaydi | To‘liq | `scripts/webhook-sinov.ts` — sinov: «TAKROR YANGILANISH»<br>`scripts/joylashuv-sinov.ts` — sinov: «2. Такрор босиш иккинчи хабар ярамайди» |
| 8.6 | Shaxsiy suhbat va guruh suhbati aniq ajratiladi | To‘liq | `scripts/webhook-sinov.ts` — sinov: «GURUH suhbati»<br>`scripts/webhook-sinov.ts` — sinov: «GURUHDAGI TUGMA jim qoldiriladi» |
| 8.7 | Xodim hisobini bog‘lash va maxfiy amallar faqat shaxsiy suhbatda bajariladi | To‘liq | `scripts/webhook-sinov.ts` — sinov: «GURUH suhbati»<br>`scripts/webhook-sinov.ts` — sinov: «GURUHDAGI TUGMA jim qoldiriladi» |
| 8.8 | Kodni hisobga bog‘lashda amal muddati, bir martalik foydalanish va urinishlar cheklovi bor | To‘liq | `scripts/webhook-sinov.ts` — sinov: «KOD MUDDATI»<br>`scripts/webhook-sinov.ts` — sinov: «KOD BIR MARTALIK»<br>`scripts/webhook-sinov.ts` — sinov: «KOD TERISH CHEGARASI: sakkiz noto'g'ri urinishdan keyin»<br>`scripts/webhook-sinov.ts` — sinov: «KOD TERISH CHEGARASI faqat O'SHA chatga tegadi» |
| 8.9 | Foydalanuvchi yuborgan nom, izoh va boshqa dinamik matn HTML uchun xavfsizlantiriladi | To‘liq | `scripts/xabarnoma-sinov.ts` — sinov: «HTML белгилари хавфсизлантирилади»<br>`scripts/murojaat-xabari-sinov.ts` — sinov: «HTML xavfsizlantiriladi (masul ismida <b>/<a>)» |
| 8.10 | Loglarga bot tokeni, webhook siri yoki ortiqcha shaxsiy ma‘lumot chiqarilmaydi | To‘liq | `scripts/monitoring-sinov.ts` — sinov: «Tozalash: baza ulanish satri, bot tokeni (URL ichida)»<br>`scripts/monitoring-sinov.ts` — sinov: «Telegram yuborilmasa: xabar navbatda QOLADI»<br>`scripts/monitoring-sinov.ts` — sinov: «Xato jurnali: bazaga SIR TUSHMAYDI» |
| 8.11 | Qaror va bildirishnomalar doimiy navbat orqali yuboriladi | To‘liq | `scripts/xabarnoma-sinov.ts` — sinov: «Хабар навбатга тушади»<br>`scripts/xabarnoma-sinov.ts` — sinov: «Муваффақиятли юборилса — ЮБОРИЛДИ, сана ёзилади» |
| 8.12 | Telegram ishlamasa xabar yo‘qolmaydi | To‘liq | `scripts/xabarnoma-sinov.ts` — sinov: «Хато бўлса хабар ЙЎҚОЛМАЙДИ — навбатда қолади»<br>`scripts/xabarnoma-sinov.ts` — sinov: «Уч мартадан кейин ХАТО бўлади» |
| 8.13 | Qayta urinish, oxirgi xato va yetkazilish holati ko‘rinadi | To‘liq | `scripts/monitoring-sinov.ts` — sinov: «Navbat ko'rinishi»<br>`scripts/monitoring-sinov.ts` — sinov: «Qayta urinish: faqat so'nggi 3 kundagi XATO xabarlar» |
| 8.14 | "Navbatga qo‘yildi" va "yuborildi" farqlanadi | To‘liq | `scripts/xabarnoma-sinov.ts` — sinov: «Муваффақиятли юборилса — ЮБОРИЛДИ, сана ёзилади»<br>`scripts/xabarnoma-sinov.ts` — sinov: «БЕКОР қилинган хабар «юборилган» деб ҳисобланмайди» |
| 8.15 | Yuborish muvaffaqiyatsiz bo‘lsa, ish beruvchiga "barcha xodimlarga xabar ketdi" deb yozilmaydi | To‘liq | `scripts/beruvchi-sinov.ts` — sinov: «Ish beruvchiga YETKAZILISH haqida yolg'on aytilmaydi»<br>`scripts/yollanma-sinov.ts` — sinov: «Telegramga yuborib bo‘lmasa — "yuborildi" yozilmaydi» |

### §9. Sessiya va barcha sahifalar huquqi, login chegarasi

| Band | Talab | Holat | Dalil |
|---|---|---|---|
| 9.1 | /tablo ham joriy bazaviy huquq va sessiya versiyasini tekshiradi | To‘liq | `scripts/http-regressiya.ts` — sinov: «10a. Nazorat: HOKIM /tablo ni ochadi»<br>`scripts/http-regressiya.ts` — sinov: «10b. ROL TUSHIRILSA»<br>`scripts/sessiya-sinov.ts` — sinov: «Ҳеч бир саҳифа `joriySessiya()` ни чақирмайди» |
| 9.2 | Faqat (ilova) ichidagi emas, barcha himoyalangan sahifa va API yo‘llari auditdan o‘tkazilgan | To‘liq | `scripts/huquq-sinov.ts` — sinov: «Ҳар саҳифада рол қўриқчиси бор»<br>`scripts/huquq-sinov.ts` — sinov: «Ҳар рол ва ҳар йўл: меню билан қўриқчи БИР ХИЛ жавоб беради»<br>`scripts/http-regressiya.ts` — sinov: «9g. Mahalla xodimi bandlik markazi» |
| 9.3 | Rol pasaytirilganda eski ko‘rish huquqi qolmaydi | To‘liq | `scripts/http-regressiya.ts` — sinov: «10b. ROL TUSHIRILSA»<br>`scripts/http-regressiya.ts` — sinov: «10c. HISOB O'CHIRILSA» |
| 9.4 | Mahalla almashganda eski hudud ochilmaydi | To‘liq | `scripts/sessiya-sinov.ts` — sinov: «`joriyXodim` рол ва маҳаллани БАЗАДАН олади»<br>`scripts/http-regressiya.ts` — sinov: «9f. Mahallasiz YETTILIK»<br>`scripts/http-regressiya.ts` — sinov: «9e. Simmetriya» |
| 9.5 | Parol o‘zgarganda barcha tegishli eski sessiyalar bekor qilinadi | To‘liq | `scripts/sessiya-sinov.ts` — sinov: «Парол алмашганда авлод ошади — ҳар икки йўлда»<br>`scripts/http-regressiya.ts` — sinov: «10d. SESSIYA AVLODI O'ZGARSA» |
| 9.6 | v maydoni yo‘q eski formatdagi sessiyalar uchun aniq tugash siyosati bor | To‘liq | `scripts/sessiya-sinov.ts` — sinov: «Avlodi (v) YO'Q eski cookie TUGAGAN»<br>`scripts/http-regressiya.ts` — sinov: «15c. Avlodi (v) YO'Q eski formatdagi cookie TUGAGAN» |
| 9.7 | "Ko‘rish rejimi"da o‘zgartirish amallari bajarilmaydi | To‘liq | `scripts/sessiya-sinov.ts` — sinov: «Миддлевар кўриш режимида ёзишни тўсади»<br>`scripts/sessiya-sinov.ts` — sinov: «`talabQil` ҳам тўсади — иккинчи қават» |
| 9.8 | Haqiqiy foydalanuvchi va ko‘rilayotgan foydalanuvchi auditda chalkashmaydi | To‘liq | `scripts/sessiya-sinov.ts` — sinov: «Режим ёқилгани ҳам, ўчирилгани ҳам журналга тушади»<br>`scripts/sessiya-sinov.ts` — sinov: «Қобиқ ҳам чиқишда ҲАҚИҚИЙ ҳисобни ишлатади» |
| 9.9 | Muhim yozish amallarining haqiqiy bajaruvchisi serverda tekshiriladi | To‘liq | `scripts/sessiya-sinov.ts` — sinov: «Режим йўли ҳуқуқни ҲАҚИҚИЙ ҳисоб бўйича текширади»<br>`scripts/sessiya-sinov.ts` — sinov: «Кўз фақат ADMIN учун ишлайди — рол БАЗАДАН текширилади» |
| 9.10 | Login rate limit server nusxalari o‘rtasida umumiy saqlashda (xotiradagi Map o‘rniga/ustiga) | To‘liq | `scripts/monitoring-sinov.ts` — sinov: «Baza chegarasi: limit, qolgan, kutish vaqti»<br>`scripts/monitoring-sinov.ts` — sinov: «Baza chegarasi: XOTIRA tozalansa ham BAZA ushlab turadi»<br>`scripts/monitoring-sinov.ts` — sinov: «Baza chegarasi: 12 ta PARALLEL urinish» |
| 9.11 | IP va hisob cheklovlari uyg‘unlashtirilgan | To‘liq | `scripts/sessiya-sinov.ts` — sinov: «Чегара икки ўлчовда: ҳисоб ва IP»<br>`scripts/sessiya-sinov.ts` — sinov: «Ҳисоб чегараси БАЗАГА мурожаатдан ОЛДИН» |
| 9.12 | Umumiy internetdagi barcha xodimlar asossiz bloklanmaydi | To‘liq | `scripts/sessiya-sinov.ts` — sinov: «Idora: 100 ta muvaffaqiyatli kirish»<br>`scripts/http-regressiya.ts` — sinov: «15b. Idora: bir IP dan 70 ta muvaffaqiyatli kirish» |
| 9.13 | Cheklov xizmatidagi xatoda qanday ishlashi aniq belgilangan | Hujjat/baholash | `src/lib/kirish-chegarasi.ts` — ibora: «FAIL-OPEN emas»<br>`src/lib/xabarnoma.ts` — ibora: «fail-closed»<br>`scripts/webhook-sinov.ts` — sinov: «baza xatosida RAD etiladi (fail-closed)» |
| 9.14 | Muvaffaqiyatli login boshqa hisoblar uchun himoyani asossiz tozalamaydi | To‘liq | `scripts/sessiya-sinov.ts` — sinov: «IP hisobi: muvaffaqiyat o'z urinishini QAYTARADI»<br>`scripts/monitoring-sinov.ts` — sinov: «Baza chegarasi: QAYTARISH faqat ENG OXIRGI urinishni»<br>`scripts/http-regressiya.ts` — sinov: «15a. Login IP chegarasi: 59 ta xato urinishdan keyin» |

### §10. Moderatsiyada qarama-qarshi qarorlarni to‘sish

| Band | Talab | Holat | Dalil |
|---|---|---|---|
| 10.1 | Qaror KUTILMOQDA holatidan atomar o‘tadi | To‘liq | `scripts/moderatsiya-sinov.ts` — sinov: «Иккита раҳбар бир вақтда: фақат БИТТА қарор ўтади»<br>`scripts/moderatsiya-sinov.ts` — sinov: «Учала йўлда ҳам `updateMany` билан шартли ёзиш» |
| 10.2 | Birinchi qarordan keyin ikkinchisiga 409 yoki mos ziddiyat javobi beriladi | To‘liq | `scripts/moderatsiya-sinov.ts` — sinov: «Иккинчи қарорга КИМ ҳал қилгани айтилади»<br>`scripts/moderatsiya-sinov.ts` — sinov: «Йўллар 409 ва тушунтириш қайтаради» |
| 10.3 | Qaror, audit hodisasi va xabar navbati imkon qadar bitta tranzaksiyada yoziladi | Qisman<br><sub>Cheklov: Qaror va audit yozuvi BITTA tranzaksiyada (ish beruvchi, e‘lon, dalil) — avval Telegram orqali berilgan qaror auditga umuman tushmasdi. Ish beruvchiga xabar tranzaksiyaga KIRMAYDI: ish beruvchi User emas va Xabarnoma navbati uni tashimaydi, xabar to‘g‘ridan-to‘g‘ri yuboriladi (yuborilmasa qaror kuchda qoladi). Dalil tasdiqlangach ish voqeasi holatini yangilash ham qasddan alohida: qaror yo‘qolmasin.</sub> | `scripts/moderatsiya-sinov.ts` — sinov: «Қарор ва АУДИТ БИР транзакцияда»<br>`scripts/moderatsiya-sinov.ts` — sinov: «Telegram orqali berilgan» |
| 10.4 | Qarorni o‘zgartirish alohida huquq va izoh bilan bajariladi | To‘liq | `scripts/moderatsiya-sinov.ts` — sinov: «Қарорни ЎЗГАРТИРИШ сабабсиз бўлмайди»<br>`scripts/moderatsiya-sinov.ts` — sinov: «Тасдиқланган далилни оддий йўл билан ЎЗГАРТИРИБ бўлмайди» |
| 10.5 | Kim, qachon, nima sababdan qaror bergani saqlanadi | To‘liq | `scripts/moderatsiya-sinov.ts` — sinov: «Рад этилганда САБАБ сақланади»<br>`scripts/moderatsiya-sinov.ts` — sinov: «Эълон рад этилганда САБАБ ва ким рад этгани сақланади»<br>`scripts/moderatsiya-sinov.ts` — sinov: «Қарор ва АУДИТ БИР транзакцияда» |
| 10.6 | Dalillarni tasdiqlashda ham shu qoidalar ishlaydi | To‘liq | `scripts/moderatsiya-sinov.ts` — sinov: «Далил: иккита мутахассис бир вақтда — биттаси ўтади»<br>`scripts/moderatsiya-sinov.ts` — sinov: «Қарор ва АУДИТ БИР транзакцияда» |
| 10.7 | Ish beruvchi va e‘lon moderatsiyasi alohida boshqariladi | To‘liq | `scripts/moderatsiya-sinov.ts` — sinov: «Эълон: иккита раҳбар бир вақтда — биттаси ўтади»<br>`scripts/moderatsiya-sinov.ts` — sinov: «Иккита раҳбар бир вақтда: фақат БИТТА қарор ўтади»<br>`scripts/beruvchi-sinov.ts` — sinov: «Иш берувчи қўйган эълон МОДЕРАЦИЯ кутади» |
| 10.8 | Tasdiqlangan ish beruvchini keyinchalik vaqtincha cheklash va qayta tekshirish imkoniyati baholanadi | Hujjat/baholash | `hujjatlar/GPT-TALABLARI-AUDITI.md` — ibora: «Tasdiqlangan ish beruvchini vaqtincha cheklash» |

### §11. Xodimlar uchun oilaviy rivojlanish rejasi

| Band | Talab | Holat | Dalil |
|---|---|---|---|
| 11.1 | Reja: boshlang‘ich holat va sana, oila bilan kelishilgan maqsad, resurslar, to‘siqlar, mas‘ul, muddat, keyingi aloqa sanasi | To‘liq | `scripts/reja-sinov.ts` — sinov: «Boshlang‘ich holat yozilmasa reja ochilmaydi»<br>`scripts/reja-sinov.ts` — sinov: «Boshlang‘ich holat manbasi va sanasi matn bilan birga beriladi»<br>`scripts/reja-sinov.ts` — sinov: «Maqsad yozilgan-u oila bilan KELISHILMAGAN»<br>`scripts/reja-sinov.ts` — sinov: «Aloqa muddati: o‘tgan / bugun / yaqin» |
| 11.2 | Fuqaro fikri telefon/uchrashuv/tashrif orqali xodim tomonidan qayd etiladi; aloqa usuli, vaqt, kim yozgani ko‘rinadi | To‘liq | `scripts/reja-sinov.ts` — sinov: «Aloqa yoziladi: usul, vaqt, kim yozgani saqlanadi»<br>`scripts/reja-sinov.ts` — sinov: «Aloqa usuli faqat telefon / uchrashuv / tashrif» |
| 11.3 | Xodim qaydi fuqaroning mustaqil elektron tasdig‘i deb ko‘rsatilmaydi | To‘liq | `scripts/reja-sinov.ts` — sinov: «Aloqa jadvalida "tasdiqlangan" turidagi maydon YO‘Q» |
| 11.4 | Transport, bolaga qarash, ish jadvali, ko‘nikma, mos ish sharoiti, asbob-uskuna va buyurtma yetishmasligi alohida to‘siqlar | To‘liq | `prisma/schema.prisma` — ibora: «BUYURTMA_YETISHMASLIGI»<br>`prisma/schema.prisma` — ibora: «BOLAGA_QARASH»<br>`scripts/reja-sinov.ts` — sinov: «Reja ochilganda tizim o‘zidan hech qanday qadam» |
| 11.5 | Har oilaga bir xil kurs yoki kredit tavsiya qilinmaydi | To‘liq | `scripts/reja-sinov.ts` — sinov: «Reja ochilganda tizim o‘zidan hech qanday qadam (kurs, kredit) yaratmaydi»<br>`scripts/kurs-sinov.ts` — sinov: «Tavsiya FAQAT boshlanmagan kursga» |
| 11.6 | Mas‘ul xodim, tashkilot va muddat belgilanadi; reja mahalla chegarasida | To‘liq | `scripts/reja-sinov.ts` — sinov: «Mas‘ul xodim: faol bo‘lmagan, hokim va boshqa mahalla xodimi yaroqsiz»<br>`scripts/reja-sinov.ts` — sinov: «Mahalla xodimi BOSHQA mahalla oilasining rejasiga KIRA OLMAYDI» |

### §12. Bandlik va daromad natijalarini kuzatish (30/60/90)

| Band | Talab | Holat | Dalil |
|---|---|---|---|
| 12.1 | Uch oylik nazorat 30/60/90 kunlik kuzatuvga kengaytirilgan | To‘liq | `scripts/kuzatuv-sinov.ts` — sinov: «Muddat = ishga kirgan sana + 30/60/90 kun»<br>`scripts/kuzatuv-sinov.ts` — sinov: «Bosqich holati: kutilmoqda / bugun / kechikdi / bajarildi» |
| 12.2 | Savollar: ish boshladimi, qolayaptimi, kelishilgan haq, sharoit, daromad, tugash sababi, qo‘shimcha yordam | To‘liq | `scripts/kuzatuv-sinov.ts` — sinov: «"Ishdan ketgan" bo‘lsa SABAB va TUGASH SANASI shart»<br>`prisma/schema.prisma` — ibora: «qoshimchaYordam KuzatuvJavobi»<br>`prisma/schema.prisma` — ibora: «sharoitMos» |
| 12.3 | "Noma‘lum", "xodim qayd etgan", "fuqaro bildirgan" va "tekshirilgan" ma‘lumotlar farqlanadi | To‘liq | `scripts/kuzatuv-sinov.ts` — sinov: «Javob manbasiz bo‘lmaydi»<br>`scripts/kuzatuv-sinov.ts` — sinov: «"Tekshirilgan" dalilsiz tanlanmaydi»<br>`scripts/kuzatuv-sinov.ts` — sinov: «Tekshirilgan (dalilli) yozuvni pastroq daraja bilan QAYTA YOZIB bo‘lmaydi» |
| 12.4 | Noma‘lum daromad nolga aylantirilmaydi | To‘liq | `scripts/kuzatuv-sinov.ts` — sinov: «So‘m maydoni: bo‘sh = null»<br>`scripts/kuzatuv-sinov.ts` — sinov: «Daromad rostdan 0 so‘m bo‘lsa»<br>`scripts/kuzatuv-sinov.ts` — sinov: «Daromad ma’lumoti yo‘q bo‘lsa mediana NULL» |
| 12.5 | Ishga kirish sanasi, tasdiqlash sanasi va ma‘lumot kiritish sanasi ajratiladi | To‘liq | `scripts/kuzatuv-sinov.ts` — sinov: «Tekshiruv yoziladi: muddat, ma’lumot sanasi, kiritilgan sana» |
| 12.6 | Bir fuqaroning ish joyini almashtirishi yangi fuqaro sifatida sanalmaydi | To‘liq | `scripts/kuzatuv-sinov.ts` — sinov: «Ish almashtirgan fuqaro BIR marta sanaladi» |
| 12.7 | Ko‘rsatkichlarda hisoblash usuli, davr va ma‘lumot manbasi ko‘rinadi | To‘liq | `scripts/kuzatuv-sinov.ts` — sinov: «Kuzatuv bloki hisoblash usulini ko‘rsatadi»<br>`scripts/kuzatuv-sinov.ts` — sinov: «Ko‘rsatkich bloki hisoblash usuli, davr, manba» |

### §13. Ish beruvchi, kurslar va mahalliy buyurtmalar

| Band | Talab | Holat | Dalil |
|---|---|---|---|
| 13.1 | Botda ish beruvchi o‘z e‘lonlarini ko‘radi | To‘liq | `scripts/yollanma-sinov.ts` — sinov: «"Eʼlonlarim" faqat O‘Z e‘lonlarini ko‘rsatadi»<br>`scripts/yollanma-sinov.ts` — sinov: «Begona e‘lonni ko‘rib bo‘lmaydi» |
| 13.2 | E‘lonni yopish va muddati tugaganini bilish | To‘liq | `scripts/yollanma-sinov.ts` — sinov: «Ish beruvchi FAQAT o‘z e‘lonini yopadi»<br>`scripts/yollanma-sinov.ts` — sinov: «Muddati tugab yopilgan e‘lon haqida xabar» |
| 13.3 | Muhim tahrirlar qayta moderatsiyaga yuboriladi | To‘liq | `scripts/yollanma-sinov.ts` — sinov: «Maosh tahriri: qiymat qo‘llanadi VA e‘lon MODERATSIYAGA qaytadi» |
| 13.4 | Moderatsiya holati va sababi ko‘rinadi | To‘liq | `scripts/yollanma-sinov.ts` — sinov: «Rad etilgan e‘londa SABAB ko‘rinadi»<br>`scripts/beruvchi-sinov.ts` — sinov: «Рад этиш сабаби сақланади ва иш берувчига кўринади» |
| 13.5 | Zarur huquqlar doirasida suhbat va ishga qabul natijasi bildiriladi | To‘liq | `scripts/yollanma-sinov.ts` — sinov: «Ish beruvchi "ishga qabul" desa»<br>`scripts/yollanma-sinov.ts` — sinov: «Suhbat ketma-ketligi» |
| 13.6 | Xodimlar panelida vakansiya sifati va yangiligi nazorat qilinadi | To‘liq | `scripts/yollanma-sinov.ts` — sinov: «21 kundan beri tegilmagan e‘lon "yangilanmagan"»<br>`scripts/yollanma-sinov.ts` — sinov: «Maosh medianadan 4 baravar katta yoki kichik bo‘lsa "gumonli"» |
| 13.7 | Maosh, jadval, hudud, ko‘nikma va sharoit bo‘yicha moslikni tushuntirish | To‘liq | `scripts/moslik-sinov.ts` — sinov: «Кутган маоши таклифдан паст бўлса балл ошади»<br>`scripts/moslik-sinov.ts` — sinov: «Маош фарқи катта бўлса огоҳлантириш ёзилади»<br>`scripts/moslik-sinov.ts` — sinov: «Шу маҳалладаги номзод бошқа маҳалладагидан юқори» |
| 13.8 | Fuqaro ma‘lumoti ish beruvchiga zarur minimumda va tegishli ruxsat bilan beriladi | To‘liq | `scripts/yollanma-sinov.ts` — sinov: «ROZILIKSIZ ma‘lumot yuborilmaydi»<br>`scripts/yollanma-sinov.ts` — sinov: «Ish beruvchi xabari FAQAT tanlangan maydonlarni oladi» |
| 13.9 | Shubhali yoki chalg‘ituvchi e‘lonlar tekshiriladi | To‘liq | `scripts/yollanma-sinov.ts` — sinov: «Pul so‘raydigan ibora lotinda ham»<br>`scripts/yollanma-sinov.ts` — sinov: «Bir telefon ikki XIL korxona nomida» |
| 13.10 | Mavjud IT vaucher jarayonini buzmasdan kurs katalogi va yo‘llanmalar tartibga solinadi | To‘liq | `scripts/kurs-sinov.ts` — sinov: «IT-shaharcha vaucheri: faqat shu fuqaroning vaucheriga bog‘lanadi» |
| 13.11 | Qatnashish, tugatish, ko‘nikma, suhbat va ishga joylashish natijasi bog‘lanadi | To‘liq | `scripts/kurs-sinov.ts` — sinov: «Tamomladi: sana, davomat, sertifikat, olingan ko‘nikmalar saqlanadi»<br>`scripts/kurs-sinov.ts` — sinov: «Ishga bog‘lash: kursdan KEYIN boshlangan ish bog‘lanadi»<br>`scripts/kurs-sinov.ts` — sinov: «To‘ldirish: faqat tamomlaganlarga; suhbat» |
| 13.12 | Ish beruvchining haqiqiy talabiga mos kurslar ko‘rsatiladi | To‘liq | `scripts/kurs-sinov.ts` — sinov: «E‘longa mos kurslar: faqat boshlanmagan»<br>`scripts/kurs-sinov.ts` — sinov: «Moslik: ko‘nikma e‘lon talabida uchrasa» |
| 13.13 | Ishga joylashish kafolati bo‘lmasa, kafolat deb yozilmaydi | To‘liq | `scripts/kurs-sinov.ts` — sinov: «"kafolat" faqat inkor ogohlantirishida» |
| 13.14 | Kurs samaradorligi faqat o‘qiganlar soni bilan baholanmaydi | To‘liq | `scripts/kurs-sinov.ts` — sinov: «Ko‘rsatkich: tamomlash maxraji»<br>`scripts/kurs-sinov.ts` — sinov: «Ko‘rsatkich: ish natijasi uch xil»<br>`scripts/kurs-sinov.ts` — sinov: «Ko‘rsatkich: tamomlaganiga 60 kundan kam» |
| 13.15 | Mahalliy buyurtmalar: xodimlar boshqaradigan kichik pilot; ommaviy marketplace, fuqaro akkaunti va to‘lov tizimi qo‘shilmagan | To‘liq | `scripts/buyurtma-sinov.ts` — sinov: «to‘lov ustunlari yo‘q»<br>`scripts/buyurtma-sinov.ts` — sinov: «Bajarilganda ikkala tasdiq NOMA‘LUM»<br>`scripts/buyurtma-sinov.ts` — sinov: «Tasdiq darajasi: ikki tomonlama / nizo / bir tomonlama» |

### §14. Murojaatlar va yordamlar katalogi

| Band | Talab | Holat | Dalil |
|---|---|---|---|
| 14.1 | Xodim telefon yoki tashrif orqali kelgan murojaatni qayd eta oladi (muammo, vaqt va kanal, mas‘ul, javob muddati, holat va tarix, natija, qayta ko‘rib chiqish sababi) | To‘liq | `scripts/murojaat-sinov.ts` — sinov: «Yaratish: raqam M-YYYY-NNNN»<br>`scripts/murojaat-sinov.ts` — sinov: «Tarix to‘liq»<br>`scripts/murojaat-sinov.ts` — sinov: «Javob: natija turi va matni saqlanadi»<br>`scripts/murojaat-sinov.ts` — sinov: «Qayta ochish: sabab va yangi muddat majburiy» |
| 14.2 | Javobsiz va muddati o‘tgan murojaatlar ko‘rinadi va ogohlantiriladi | To‘liq | `scripts/murojaat-sinov.ts` — sinov: «Muddat holati: kechikkan»<br>`scripts/murojaat-xabari-sinov.ts` — sinov: «Reja: KECHIKKAN - masulga VA faol rahbarlarga» |
| 14.3 | Yordamlar katalogi: dastur nomi, kimga mo‘ljallangani, talablar, hujjatlar, mas‘ul tashkilot, rasmiy manba, amal qilish muddati, oxirgi tekshirilgan sana | To‘liq | `scripts/yordam-sinov.ts` — sinov: «Sxema: rasmiy manba, nom, talab, masul tashkilot majburiy»<br>`scripts/yordam-sinov.ts` — sinov: «Yaratish: manba va tekshirilgan sana saqlanadi»<br>`prisma/schema.prisma` — ibora: «nishonGuruh»<br>`prisma/schema.prisma` — ibora: «hujjatlar      String?» |
| 14.4 | Noma‘lum talab, subsidiya miqdori yoki integratsiya o‘ylab topilmaydi | To‘liq | `scripts/yordam-sinov.ts` — sinov: «Katalog BO‘SH boshlanadi: migratsiya, seed va kod hech qayerda tayyor dastur yozmaydi» |
| 14.5 | Eskirgan dastur faol tavsiya sifatida chiqmaydi | To‘liq | `scripts/yordam-sinov.ts` — sinov: «Dastur holati ustuvorligi»<br>`scripts/yordam-sinov.ts` — sinov: «Tavsiya FAQAT "amalda"»<br>`scripts/yordam-sinov.ts` — sinov: «Amaldagi dasturlar ro‘yxati: yopiq, muddati tugagan, eskirgan» |
| 14.6 | Amaldagi shartlar rasmiy manbadan tekshiriladi | Qisman<br><sub>Cheklov: Katalog BO‘SH boshlanadi: dasturlarni va ularning shartlarini mas‘ul xodim rasmiy manbadan o‘zi kiritadi va "tekshirildi" sanasini belgilaydi; tizim eskirgan dasturni belgilaydi. Bu muhitda internetdagi rasmiy manbalarni tekshirib bo‘lmadi, shuning uchun hech qanday dastur sharti yoki subsidiya miqdori oldindan yozilmadi.</sub> | `scripts/yordam-sinov.ts` — sinov: «Tekshirish kerak: eskirgan / muddati tugagan-u yopilmagan»<br>`scripts/yordam-sinov.ts` — sinov: «"Manbadan tekshirildi" sanani va tekshirganni yangilaydi» |

### §15. Har bir dashboardni qayta tartiblash

| Band | Talab | Holat | Dalil |
|---|---|---|---|
| 15.1 | Har bir rol (mahalla xodimi, bandlik mutaxassisi, bandlik rahbari, hokim, administrator) uchun alohida vazifalar taxtasi | Qisman<br><sub>Cheklov: Beshta rol uchun alohida taxta bor va mahalla chegarasi sinalgan. Lekin promptdagi ba‘zi aniq bloklar (mahalla xodimi uchun "bugungi tashriflar" va "oflayn navbat holati", bandlik mutaxassisi uchun "rejalashtirilgan suhbatlar") alohida blok sifatida yo‘q: oflayn navbat holati xatlov sahifasida alohida chiziq bo‘lib ko‘rinadi, suhbat/yo‘llanma holatlari ro‘yxatda.</sub> | `scripts/vazifa-sinov.ts` — sinov: «Барча бешта рол учун тахта тузилади»<br>`scripts/vazifa-sinov.ts` — sinov: «Ҳар ролнинг сарлавҳаси ҲАР ХИЛ — панел нусхаси эмас»<br>`scripts/vazifa-sinov.ts` — sinov: «МФЙ ходими БОШҚА маҳалланинг ишини КЎРМАЙДИ» |
| 15.2 | Bandlik markazi: kuzatuv 30/60/90, javobsiz yo‘llanmalar, dalil navbati, e‘lon sifati; rahbar: moderatsiya, kechikayotgan xizmatlar | To‘liq | `scripts/kuzatuv-sinov.ts` — sinov: «Vazifalar taxtasida kuzatuv bloki»<br>`scripts/yollanma-sinov.ts` — sinov: «Vazifalar taxtasida "javobsiz yo‘llanma" va "e‘lon sifati" bloklari bor»<br>`scripts/murojaat-sinov.ts` — sinov: «Vazifalar taxtasi: "murojaatlar" bloki endi HAQIQIY» |
| 15.3 | Hokim: tasdiqlangan va xodim bildirgan natijalar, barqaror bandlik, daromad o‘zgarishi, resurs ehtiyoji — raqamlar izohlanadi | To‘liq | `scripts/http-regressiya.ts` — sinov: «12a. /panel HOKIM uchun: 5 asosiy va xatlov bor»<br>`scripts/joylashish-sinov.ts` — sinov: «Брифинг расмий манба сонини АЛОҲИДА айтади»<br>`scripts/modullar-sinov.ts` — sinov: «Hokim jamlamani ko'radi» |
| 15.4 | Administrator: hisob va huquqlar, audit, integratsiyalar, cron va navbatlar, xatolar, zaxira holati | To‘liq | `scripts/vazifa-sinov.ts` — sinov: «Интеграция блокида КАЛИТНИНГ ўзи ҲЕЧ ҚАЧОН кўрсатилмайди»<br>`scripts/monitoring-sinov.ts` — sinov: «Vazifalar: "cron-holati" blogi»<br>`scripts/monitoring-sinov.ts` — sinov: «Vazifalar: "zaxira" blogi» |
| 15.5 | Mahallalar faqat anketalar soni bo‘yicha reyting qilinmaydi: aholi soni/xonadon, boshlang‘ich holat, ma‘lumot qamrovi, xizmat natijasi hisobga olinadi | Qisman<br><sub>Cheklov: Mahalla solishtirishi NISBIY ko‘rsatkichlar bilan (xonadon soniga nisbatan foiz, 1000 xonadonga) va ma‘lumot qamrovi bilan beriladi; "reyting emas" izohi bilan. Boshlang‘ich holat (masalan, qashshoqlik darajasi) va xizmat natijasi bilan og‘irlangan yagona kompozit indeks YO‘Q — bu bilib turib qilinmadi: noto‘g‘ri og‘irlik adolatsiz reytingga olib keladi.</sub> | `scripts/vazifa-sinov.ts` — sinov: «Маҳалла рейтингида НИСБИЙ кўрсаткичлар бор»<br>`scripts/vazifa-sinov.ts` — sinov: «Минг хонадонга нисбатан кўрсаткич ТЎҒРИ ҳисобланади»<br>`scripts/agent-sinov.ts` — sinov: «"reyting emas" izohi bor» |
| 15.6 | Oilalarni kamsituvchi ochiq reyting yaratilmaydi | Hujjat/baholash | `hujjatlar/GPT-TALABLARI-AUDITI.md` — ibora: «Oilalar bo‘yicha reyting YO‘Q»<br>`scripts/agent-sinov.ts` — sinov: «PII: fuqaro ismi, telefoni, manzili, oila boshlig‘i» |

### §16. Premium, rasmiy va futuristik dizayn

| Band | Talab | Holat | Dalil |
|---|---|---|---|
| 16.1 | Yagona rang/o‘lcham/bo‘shliq tokenlari; yorug‘ va qorong‘i mavzu | To‘liq | `scripts/dizayn-sinov.ts` — sinov: «Yorug‘ va qorong‘i mavzu ikkisi ham belgilangan» |
| 16.2 | Lotin va kirill alifbolari; alifbo aralashmasligi | To‘liq | `scripts/agent-sinov.ts` — sinov: «Matnlarda alifbo aralashmaydi: lotin alifbosida kirill harf YO‘Q»<br>`scripts/alifbo-sinov.ts` — ibora: «ХУЛОСА ВА ТАВСИЯЛАР» |
| 16.3 | Mobilga mos jadvallar va katta bosish maydonlari | To‘liq | `scripts/dizayn-sinov.ts` — sinov: «Sensorli ekranda bosish maydoni kamida 44 piksel»<br>`scripts/dizayn-sinov.ts` — sinov: «Chegara sichqonchali kompyuterga TEGMAYDI» |
| 16.4 | Yuklanish, bo‘sh, xato va muvaffaqiyat holatlari | To‘liq | `scripts/dizayn-sinov.ts` — sinov: «Xatolik sahifasi BOR va o‘zbekcha»<br>`scripts/dizayn-sinov.ts` — sinov: «Yuklanish skeleti bor»<br>`scripts/dizayn-sinov.ts` — sinov: «404 sahifasi ham o‘zbekcha» |
| 16.5 | Formada xato maydoniga tez o‘tish | To‘liq | `scripts/dizayn-sinov.ts` — sinov: «Xato topilganda AYNAN o‘sha katakka o‘tiladi» |
| 16.6 | Ma‘lumot yo‘qolishidan himoya | To‘liq | `scripts/dizayn-sinov.ts` — sinov: «Xatolik ekranida ma‘lumot yo‘qolmagani aytiladi»<br>`scripts/dizayn-sinov.ts` — sinov: «Anketa O‘RTASIDAN to‘ldirilsa ham saqlanadi» |
| 16.7 | Klaviatura va ekran o‘quvchi bilan ishlash; yetarli kontrast | Qisman<br><sub>Cheklov: Klaviatura fokusi, ekran o‘quvchi matnlari va diagramma ranglari kontrasti kod/hisob darajasida tekshirilgan. Haqiqiy ekran o‘quvchi (NVDA/TalkBack) bilan qo‘lda sinov va butun interfeys uchun avtomatik kontrast hisobi OLINMAGAN.</sub> | `scripts/dizayn-sinov.ts` — sinov: «Klaviatura fokusi ko‘rinadi»<br>`scripts/dizayn-sinov.ts` — sinov: «Skelet ekran o‘quvchiga MATN bilan aytiladi» |
| 16.8 | Animatsiyani kamaytirish sozlamasi hurmat qilinadi | To‘liq | `scripts/dizayn-sinov.ts` — sinov: «Skelet HARAKATNI KAMAYTIRISH sozlamasini hurmat qiladi»<br>`src/app/globals.css` — ibora: «prefers-reduced-motion: reduce» |
| 16.9 | Holat rangdan tashqari matn va belgi orqali tushuntiriladi | To‘liq | `scripts/dizayn-sinov.ts` — sinov: «Holat rangdan TASHQARI matn bilan ham aytiladi»<br>`scripts/vazifa-sinov.ts` — sinov: «Ҳолат ФАҚАТ ранг билан айтилмайди — матн ҳам бор» |
| 16.10 | Hisobotdagi raqam bosilganda hisoblash usuli, manbasi va ruxsat doirasidagi yozuvlar ochiladi | To‘liq | `scripts/dizayn-sinov.ts` — sinov: «Raqamning hisoblash usuli ochiladi»<br>`scripts/dizayn-sinov.ts` — sinov: «Yozuvlarga havola RUXSAT doirasidagi sahifaga boradi»<br>`scripts/http-regressiya.ts` — sinov: «12a. /panel HOKIM uchun»<br>`scripts/http-regressiya.ts` — sinov: «12b. /panel BANDLIK RAHBARI uchun»<br>`scripts/http-regressiya.ts` — sinov: «12c. /bandlik» |
| 16.11 | Qidiruv va tushunarli filtrlar; saqlangan filtrlar kerak bo‘lgan joylarda | Qisman<br><sub>Cheklov: Qidiruv va filtrlar manzilda saqlanadi (havola boshqa odamda ham o‘sha holatda ochiladi, sahifalashda filtr yo‘qolmaydi). Foydalanuvchi o‘zi nom berib saqlaydigan "saqlangan filtrlar" ro‘yxati YO‘Q.</sub> | `scripts/qamrov-sinov.ts` — sinov: «Қидирув бор ва иккала алифбода ишлайди»<br>`scripts/qamrov-sinov.ts` — sinov: «Танлов манзилда сақланади — ҳавола бошқа одамда ҳам очилади»<br>`scripts/qamrov-sinov.ts` — sinov: «МФЙ алмашганда давр йўқолмайди» |

### §17. PWA va tezlik

| Band | Talab | Holat | Dalil |
|---|---|---|---|
| 17.1 | Manifest, ikonlar va service worker yakunlangan | To‘liq | `scripts/pwa-sinov.ts` — sinov: «Manifest to‘g‘ri: nom, start_url, scope, display, ranglar»<br>`scripts/pwa-sinov.ts` — sinov: «Manifestda 192 va 512 ikonka + maskable bor»<br>`scripts/pwa-sinov.ts` — sinov: «Ikonka fayllarining HAQIQIY o‘lchami manifestdagiga teng» |
| 17.2 | Ilovani o‘rnatish va oflayn ochilish imkoniyati real tekshiriladi | Qisman<br><sub>Cheklov: Service worker mantig‘i sinov muhitida (soxta fetch/cache bilan) har bir yo‘l uchun sinalgan. Haqiqiy telefon/Chrome da "Ilovani o‘rnatish" va oflayn ochilish QO‘LDA tekshirilmagan (bu muhitda brauzer ilovani o‘rnata olmaydi).</sub> | `scripts/pwa-sinov.ts` — sinov: «Internet YO‘Q bo‘lsa — oflayn sahifa chiqadi»<br>`scripts/pwa-sinov.ts` — sinov: «O‘rnatishda oflayn sahifa keshga olinadi» |
| 17.3 | Shaxsiy sahifa va API javoblari umumiy keshga joylashtirilmaydi | To‘liq | `scripts/pwa-sinov.ts` — sinov: «GET /api/* — worker UMUMAN aralashmaydi»<br>`scripts/pwa-sinov.ts` — sinov: «Sahifa ochish HAR DOIM tarmoqdan, keshga yozilmaydi»<br>`scripts/pwa-sinov.ts` — sinov: «RSC va ma‘lumot so‘rovlari» |
| 17.4 | Hisob almashganda keshlar aralashmaydi | To‘liq | `scripts/pwa-sinov.ts` — sinov: «Oflayn sahifada shaxsiy ma‘lumot YO‘Q»<br>`scripts/pwa-sinov.ts` — sinov: «Worker `localStorage`ga (qoralama, navbat) UMUMAN tegmaydi»<br>`scripts/navbat-sinov.ts` — sinov: «Чиқишда телефон хотираси тозаланади» |
| 17.5 | Yangilanish paytida qoralama yo‘qolmaydi | To‘liq | `scripts/pwa-sinov.ts` — sinov: «Yangilanish sahifani QAYTA YUKLAMAYDI (anketa o‘rtasida)» |
| 17.6 | Oflayn ishlaydigan va ishlamaydigan amallar aniq ko‘rsatiladi | To‘liq | `scripts/pwa-sinov.ts` — sinov: «Oflayn sahifada nima ishlashi VA ishlamasligi yozilgan» |
| 17.7 | Katta ro‘yxatlar uchun server pagination | To‘liq | `scripts/sahifalash-sinov.ts` — sinov: «sahifaChegarasi: skip/take to'g'ri»<br>`scripts/sahifalash-sinov.ts` — sinov: «/xonadonlar: "Keyingi/Oldingi" qidiruv»<br>`scripts/vazifa-sinov.ts` — sinov: «Рўйхатлар ЧЕКЛАНГАН — бутун туман юкланмайди» |
| 17.8 | Zarur indekslar | Hujjat/baholash | `prisma/schema.prisma` — ibora: «@@index([userId, holati])»<br>`prisma/schema.prisma` — ibora: «@@index([kalit, vaqt])» |
| 17.9 | Ortiqcha va takror so‘rovlarni kamaytirish | To‘liq | `scripts/tezlik-sinov.ts` — sinov: «Bazadagi natija: yangi SQL jamlanma = eski findMany usuli»<br>`scripts/vazifa-sinov.ts` — sinov: «Сўровлар ПАРАЛЛЕЛ юборилади» |
| 17.10 | Katta hisobotlar uchun cheklangan yoki fonli qayta ishlash | Qisman<br><sub>Cheklov: Hisobot ma‘lumoti SQL jamlanma va cheklangan ro‘yxatlar bilan olinadi; PDF/Excel faylini esa brauzer o‘zi yaratadi. Fonli (navbat/worker) hisobot yaratish YO‘Q — hozirgi hajmda kerak emas.</sub> | `scripts/vazifa-sinov.ts` — sinov: «Рўйхатлар ЧЕКЛАНГАН — бутун туман юкланмайди»<br>`scripts/tezlik-sinov.ts` — sinov: «Butun tarix sanalarini tortadigan `findMany` QAYTMAGAN» |
| 17.11 | Grafiklar zarur paytda yuklanadi | To‘liq | `scripts/tezlik-sinov.ts` — sinov: «Kechiktirilgan diagramma: faqat TUR import qilinadi, bo‘lak dinamik»<br>`scripts/tezlik-sinov.ts` — sinov: «Hech bir sahifa `grafiklar` ni to‘g‘ridan-to‘g‘ri import qilmaydi» |
| 17.12 | Sust internet va oddiy qurilmada o‘lchash; o‘lchovsiz "tezlashdi" deb hisobot bermaslik | Qisman<br><sub>Cheklov: O‘lchanadigan narsa: sahifalar JavaScript hajmi (hajm byudjeti, CI da). Sust internetda va oddiy telefonda REAL yuklanish vaqti (Lighthouse/RUM) o‘lchanmagan, shuning uchun hech qayerda "tezlashdi" deb da‘vo qilinmaydi.</sub> | `scripts/tezlik-sinov.ts` — sinov: «CI qurishdan keyin hajm byudjetini tekshiradi»<br>`scripts/hajm-byudjeti.ts` — ibora: «byudjet» |

### §18. AI yordamchi (xodimlar va rahbarlar uchun)

| Band | Talab | Holat | Dalil |
|---|---|---|---|
| 18.1 | Fuqaro uchun chatbot yaratilmagan: agent faqat hokim, bandlik, rahbar va administratorga | To‘liq | `scripts/agent-sinov.ts` — sinov: «Agent faqat hokim, bandlik, rahbar, administratorga ochiq»<br>`scripts/http-regressiya.ts` — sinov: «13a. Hudhud API kirishsiz yopiq»<br>`scripts/http-regressiya.ts` — sinov: «13b. Mahalla xodimi (YETTILIK)» |
| 18.2 | Manbali xulosa; tavsiyada qaysi ma‘lumot ishlatilgani ko‘rinadi | To‘liq | `scripts/agent-sinov.ts` — sinov: «korsatkichlar (butun tuman): xatlovdan o‘tgan xonadon soni»<br>`scripts/agent-sinov.ts` — sinov: «Sikl: model asbob chaqiradi → natija modelga qaytadi → yakuniy javob; manbalar» |
| 18.3 | Oilaviy reja takliflari | Qisman<br><sub>Cheklov: AI hokim/rahbar uchun TUMAN va MAHALLA darajasidagi tavsiya beradi (har tavsiyada mas‘ul, muddat, o‘lchov). Alohida OILA uchun reja taklif qiladigan asbob yo‘q: agent oila/fuqaro ma‘lumotini ko‘rmaydi (shaxsiy ma‘lumotsiz qoida) — oilaviy reja xodim tomonidan tuziladi.</sub> | `scripts/ai-sinov.ts` — sinov: «Ҳар бир тавсияда масъул, муддат ва ўлчов талаб қилинади»<br>`scripts/ai-sinov.ts` — sinov: «Хулоса брифдан фойдаланади, эски қатор тўкишдан эмас» |
| 18.4 | Mos vakansiya sabablarini tushuntirish | Qisman<br><sub>Cheklov: Moslik SABABLARI (maosh, hudud, ko‘nikma, tosiq) xodimlar panelida hisoblanadi va ko‘rsatiladi. Agentning o‘zida "nega bu nomzod mos?" asbobi yo‘q: bu fuqaro darajasidagi savol va agent fuqaro ma‘lumotini ko‘rmaydi.</sub> | `scripts/moslik-sinov.ts` — sinov: «Кутган маоши таклифдан паст бўлса балл ошади»<br>`scripts/kurs-sinov.ts` — sinov: «Moslik: ko‘nikma e‘lon talabida uchrasa» |
| 18.5 | Kechikkan jarayonlarni aniqlash | To‘liq | `scripts/agent-sinov.ts` — sinov: «Murojaat bor, lekin murojaatlar_holati faqat sonlar: muddati o‘tgan = 1»<br>`scripts/agent-sinov.ts` — sinov: «Zaxira: "muddati o‘tgan murojaatlar"» |
| 18.6 | Hisobotni sodda tilda izohlash | To‘liq | `scripts/agent-sinov.ts` — sinov: «Zaxira: "xatlov qanday ketyapti?"»<br>`scripts/agent-sinov.ts` — sinov: «Hisobot yuklash asbobi»<br>`scripts/ai-sinov.ts` — sinov: «Хулоса брифдан фойдаланади» |
| 18.7 | Ma‘lumot yetishmasa, bu aytiladi | To‘liq | `scripts/agent-sinov.ts` — sinov: «oila_bolimlari: bo‘lim nomi bo‘yicha jamlama; xatlov bo‘lmagan mahallada "yetishmayotgan"»<br>`scripts/ai-sinov.ts` — sinov: «Қамров паст бўлса ишончлилик ОГОҲЛАНТИРИЛАДИ» |
| 18.8 | Shaxsiy ma‘lumotlar tashqi modelga zaruratsiz yuborilmaydi | To‘liq | `scripts/agent-sinov.ts` — sinov: «PII: fuqaro ismi, telefoni, manzili, oila boshlig‘i»<br>`scripts/agent-sinov.ts` — sinov: «Hisob matn SAQLAMAYDI»<br>`scripts/ai-sinov.ts` — sinov: «Брифга шахсий маълумот тушмайди» |
| 18.9 | AI matni tekshirilgan dalil sifatida hisoblanmaydi | To‘liq | `scripts/agent-sinov.ts` — sinov: «Taklif: asbob "amalni_taklif_qil" hali BAJARMAYDI»<br>`scripts/agent-sinov.ts` — sinov: «Tasdiq: mavjud bo‘lmagan id — "topilmadi"; model YOZISH amalini o‘zi tasdiqlay olmaydi»<br>`scripts/joylashish-sinov.ts` — sinov: «Тахмин ҲЕЧ ҚАЧОН «расмий» деб чиқмайди» |
| 18.10 | Yordamni rad etish yoki fuqaroni imkoniyatdan mahrum qilish qarorini AI chiqarmaydi | To‘liq | `scripts/agent-sinov.ts` — sinov: «Tizim ko‘rsatmasi: ism, rol, Toshkent sanasi»<br>`scripts/agent-sinov.ts` — sinov: «Taklif: administrator ikkala amalni taklif qila oladi»<br>`hujjatlar/HUDHUD-AGENT.md` — ibora: «qaror» |
| 18.11 | Yozish amallari vakolatli xodim tasdig‘ini talab qiladi | To‘liq | `scripts/agent-sinov.ts` — sinov: «Tasdiq BIR MARTA»<br>`scripts/agent-sinov.ts` — sinov: «Tasdiq: BOSHQA xodimning taklifini tasdiqlab bo‘lmaydi»<br>`scripts/http-regressiya.ts` — sinov: «13i. Tasdiq oqimi HTTP orqali» |
| 18.12 | Xarajat limitlari va foydalanish hisobi bor | To‘liq | `scripts/agent-sinov.ts` — sinov: «Limit ATOMAR»<br>`scripts/agent-sinov.ts` — sinov: «Oylik umumiy to‘siq»<br>`scripts/agent-sinov.ts` — sinov: «Server ovoz limiti (soniya)»<br>`scripts/http-regressiya.ts` — sinov: «13h. Daqiqalik chegara» |
| 18.13 | AI ishlamasa asosiy xizmatlar to‘xtamaydi | To‘liq | `scripts/agent-sinov.ts` — sinov: «Xizmat: model yiqilsa — qoidali rejim»<br>`scripts/agent-sinov.ts` — sinov: «Xizmat: kalit yo‘q (model=null)»<br>`scripts/http-regressiya.ts` — sinov: «13d. Hokim "xatlov qanday ketyapti"» |

### §19. Monitoring, zaxira va kengayishga tayyorlik

| Band | Talab | Holat | Dalil |
|---|---|---|---|
| 19.1 | Cron oxirgi muvaffaqiyatli ishlagan vaqtini ko‘rsatadi | To‘liq | `scripts/monitoring-sinov.ts` — sinov: «ishlarHolati (baza): yozuv yo'q»<br>`scripts/monitoring-sinov.ts` — sinov: «ishniBaholash: yozuv yo'q - HECH_QACHON» |
| 19.2 | Navbatdagi, xatodagi va qayta urinishdagi xabarlar ko‘rinadi | To‘liq | `scripts/monitoring-sinov.ts` — sinov: «Navbat ko'rinishi: kutilmoqda / qayta urinish / xato» |
| 19.3 | Importlar va muhim amallar uchun kuzatiladigan identifikatorlar bor | To‘liq | `scripts/monitoring-sinov.ts` — sinov: «Kuzatiladigan iz: serverXatosi iz_ identifikator beradi»<br>`scripts/reyestr-yuklash-sinov.ts` — sinov: «Ko'rish: server yozuv yaratadi»<br>`scripts/http-regressiya.ts` — sinov: «14b. Reyestr "ko'rish"» |
| 19.4 | Xatolar maxfiy ma‘lumotlarsiz yig‘iladi | To‘liq | `scripts/monitoring-sinov.ts` — sinov: «Xato jurnali: bazaga SIR TUSHMAYDI»<br>`scripts/monitoring-sinov.ts` — sinov: «Tozalash: baza ulanish satri, bot tokeni (URL ichida)» |
| 19.5 | Zaxira nusxadan tiklash alohida sinov muhitida tekshiriladi | Qisman<br><sub>Cheklov: Mahalliy pg_dump → alohida bazaga pg_restore → qatorlar soni solishtirildi (haqiqiy tiklash sinaldi). PRODUCTION (Supabase) zaxirasidan tiklash hali SINALMAGAN: bu faqat egasi qiladigan ish va juda muhim — natijasi tizimdagi "zaxira" blokida yozib qo‘yiladi.</sub> | `scripts/zaxira-nusxa-sinov.ts` — sinov: «HAQIQIY TIKLASH: olingan nusxa alohida bazaga tiklanadi»<br>`scripts/zaxira-nusxa-sinov.ts` — sinov: «BO'SH / KESILGAN nusxa» |
| 19.6 | Ma‘lumot yo‘qotish (RPO) va xizmatni tiklash (RTO) maqsadlari hujjatlashtirilgan | Hujjat/baholash | `hujjatlar/ZAXIRA-VA-TIKLASH.md` — ibora: «RPO»<br>`hujjatlar/ZAXIRA-VA-TIKLASH.md` — ibora: «RTO» |
| 19.7 | Boshqa tumanlarga chiqish: hudud bo‘yicha huquq chegarasi loyihalangan | To‘liq | `scripts/hudud-sinov.ts` — sinov: «Hozirgi izolyatsiya o'zgarmagan»<br>`scripts/hudud-sinov.ts` — sinov: «"MAHALLA" jadvallarida haqiqatan»<br>`hujjatlar/KOP-TUMAN.md` — ibora: «tumanId» |
| 19.8 | Yangi tuman qo‘shilganda mavjud ma‘lumotlar ochilib qolmaydi | Qisman<br><sub>Cheklov: Hozir tizim bitta tuman uchun; sxemada `tumanId` YO‘Q. Har bir jadval hudud xaritasida tasniflangan (yangi jadval qo‘shilsa sinov yiqiladi) va ko‘chish rejasi hujjatda (KOP-TUMAN.md), lekin yangi tuman qo‘shishdan oldin `tumanId` ko‘chirishi bajarilishi SHART — bajarilmaguncha yangi tuman qo‘shilmasin.</sub> | `scripts/hudud-sinov.ts` — sinov: «Har bir jadval hudud xaritasida TASNIFLANGAN»<br>`hujjatlar/KOP-TUMAN.md` — ibora: «Muhim» |
| 19.9 | Bir tumanga tegishli sozlama va kataloglar aniqlangan | To‘liq | `scripts/hudud-sinov.ts` — sinov: «Tuman sozlamalari ro'yxatidagi fayl/kataloglar mavjud» |
| 19.10 | Hozir zarur bo‘lmagan mikroservis yoki murakkab infratuzilma joriy qilinmagan | Hujjat/baholash | `hujjatlar/KOP-TUMAN.md` — ibora: «Mikroservislar, xabar brokerlari, alohida API shlyuzlari — kerak emas» |

### §20. Test va qabul qilish mezonlari

| Band | Talab | Holat | Dalil |
|---|---|---|---|
| 20.1 | Muhim jarayonlar haqiqiy xatti-harakat orqali tekshiriladi (faqat kodda so‘z borligi emas) | To‘liq | `scripts/regressiya-xaritasi-sinov.ts` — sinov: «Hech bir holat FAQAT kod-grep bilan qoplanmagan»<br>`scripts/http-regressiya.ts` — sinov: «14d. Yozish: to'g'ri fayl bilan 200» |
| 20.2 | 15 majburiy regressiya holati xaritalangan va himoyalangan | To‘liq | `scripts/regressiya-xaritasi-sinov.ts` — sinov: «Hech bir holat FAQAT kod-grep bilan qoplanmagan»<br>`scripts/regressiya-xaritasi-sinov.ts` — ibora: «Parallel moderatorlardan faqat bittasining qarori» |
| 20.3 | Testlar production bazasida ishlatilmaydi; sinov ma‘lumotlari sun‘iy | Hujjat/baholash | `scripts/reyestr-yuklash-sinov.ts` — ibora: «Bu sinov FAQAT mahalliy bazada ishlaydi»<br>`scripts/webhook-sinov.ts` — ibora: «Bu sinov FAQAT mahalliy bazada ishlaydi»<br>`scripts/http-regressiya.ts` — ibora: «Sinov FAQAT mahalliy bazada ishlaydi» |
| 20.4 | Tashqi foydalanuvchilarga sinov xabari yuborilmaydi | Hujjat/baholash | `scripts/webhook-sinov.ts` — ibora: «Tashqi dunyo: sinov ichidan Telegram'ga HECH NIMA chiqmaydi»<br>`scripts/http-regressiya.ts` — ibora: «AI kalitlari BO'SH» |
| 20.5 | TypeScript, lint, mavjud testlar, integratsion testlar va build natijalari ko‘rsatiladi | Hujjat/baholash | `scripts/ci-taqlid.sh` — ibora: «npx tsc --noEmit»<br>`scripts/ci-taqlid.sh` — ibora: «npm run lint»<br>`hujjatlar/TOPSHIRISH-HISOBOTI.md` — ibora: «tekshirildi» |
| 20.6 | Bajarilmagan sinov "o‘tdi" deb yozilmaydi | Hujjat/baholash | `hujjatlar/TOPSHIRISH-HISOBOTI.md` — ibora: «TEKSHIRILMAGAN»<br>`hujjatlar/GPT-TALABLARI-AUDITI.md` — ibora: «Tekshirilmagan narsalar» |

### §21. Ishni topshirish tartibi

| Band | Talab | Holat | Dalil |
|---|---|---|---|
| 21.1 | Har bosqich oxirida: nima topildi, tuzatildi, foydalanuvchi uchun nima o‘zgardi, qanday tekshirildi, qaysi cheklovlar qoldi, keyingi ustuvor ish | Hujjat/baholash | `hujjatlar/TOPSHIRISH-HISOBOTI.md` — ibora: «Keyingi ustuvorlik»<br>`hujjatlar/TOPSHIRISH-HISOBOTI.md` — ibora: «Nima TEKSHIRILMAGAN»<br>`hujjatlar/GPT-TALABLARI-AUDITI.md` — ibora: «Keyingi ustuvor ish» |
| 21.2 | Migratsiyalar mavjud ma‘lumotni saqlaydi; production bazasi reset qilinmaydi | To‘liq | `scripts/migratsiya-sinov.ts` — sinov: «Янги миграциялар ФАҚАТ ҚЎШАДИ»<br>`scripts/migratsiya-sinov.ts` — sinov: «Қўриқчи фақат VERCEL_ENV=production да ишлайди»<br>`scripts/dalil-sinov.ts` — sinov: «Миграция ҲЕЧ НАРСА ЎЧИРМАЙДИ» |
| 21.3 | Production migratsiyasi va deploydan oldin tayyor o‘zgarishlar, tekshiruv natijalari hamda qaytarish rejasi taqdim etiladi | Hujjat/baholash | `hujjatlar/TOPSHIRISH-HISOBOTI.md` — ibora: «Orqaga qaytarish»<br>`hujjatlar/JOYLASHTIRISH.md` — ibora: «qaytarish» |
| 21.4 | Integratsiya kaliti yoki ruxsat yetishmasa, soxta integratsiya yozilmaydi — aniq aytiladi | Hujjat/baholash | `hujjatlar/INTEGRATSIYALAR-REJA.md` — ibora: «OneID»<br>`hujjatlar/INTEGRATSIYALAR-REJA.md` — ibora: «kalit» |
