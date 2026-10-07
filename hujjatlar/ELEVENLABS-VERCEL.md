# Hamroh ovozini ElevenLabs bilan ulash

Bu yo'riqnoma mavjud Hamroh, uning buyruqlari va Excel yuklash tugmalari
uchun. API kaliti serverda qoladi. ElevenLabs ovozni chiqaradi; suhbatni
tushunish va platforma buyruqlari mavjud AI orqali ishlaydi.

## 1. ElevenLabs'da ovozni tanlang

1. [ElevenLabs](https://elevenlabs.io/app) hisobingizda **Voices** bo'limini oching.
2. O'zbekcha namunasi yaxshi eshitiladigan ovozni tanlang va hisobingizga qo'shing.
   Voice Library'da o'zbekcha ovoz mavjud bo'lsa, shu namunadan boshlang.
   Inglizcha namunani eshitish o'zbekcha talaffuz sifatini tasdiqlamaydi.
3. Tanlangan ovoz menyusidan **Copy Voice ID** ni bosing yoki ovoz tafsilotidan
   Voice ID ni nusxalang. Interfeys ko'rinishi hisobga qarab farq qilishi mumkin.
   Voice ID — ovoz identifikatori; API kaliti bilan bir xil emas.
4. Text to Speech sahifasida **Eleven v3** modelini tanlab quyidagini sinang:

   > Assalomu alaykum! Men Hamrohman. Xatirchi tumani bo'yicha Excel hisobot
   > kerakmi yoki Qorabuloq mahallasi bo'yichami? O'qish, g'oya va xushxabar.

`o'`, `g'`, `q`, `x`, `h` tovushlari va mahalla nomlarini eshiting. Ovoz yoqmasa,
boshqa ovoz ID sini tanlash kifoya; kodni qayta yozish kerak emas. Hech bir
modelga xatosiz talaffuz kafolati berilmaydi.

Kod `language_code=uz` va `stability=0.5` bilan o'qiydi. Model sozlamani rad etsa,
o'zbek tili olib tashlanib qayta urinilmaydi. OpenAI zaxirasi ishlasa, bu haqda
Hamroh xabar beradi; butun javob bitta ovozda o'qiladi. Haqiqiy talaffuz uchun
aynan tanlangan Voice ID ning o'zbekcha namunasini eshitish kerak.

## 2. API kaliti ruxsatlarini tekshiring

ElevenLabs hisobidagi API Keys sozlamalarida ilova foydalanadigan kalitda
**Text to Speech** va **Models: Read** ruxsatlari bo'lsin. Models ro'yxati
o'zbek tilini qo'llashni tekshirish uchun ishlatiladi. Tarifingiz/kreditingiz
tanlangan model va ovozga mos bo'lishi kerak.

Kalitni chatga yoki GitHub'ga joylamang. Uni Vercel'dagi server environment
variable sifatida saqlang.

## 3. Vercel'ga environment variables kiriting

1. [Vercel Dashboard](https://vercel.com/dashboard) -> shu saytning loyihasi.
2. **Settings -> Environment Variables** bo'limini oching.
3. Har bir qatorni alohida Name va Value maydonlariga kiriting. Value'ga
   qo'shimcha qo'shtirnoq yozmang. Sayt uchun **Production**, test deploy uchun
   **Preview** muhitini belgilang; Development mahalliy ish uchun ixtiyoriy.

| Name | Value |
|---|---|
| `AGENT_TTS` | `1` |
| `AGENT_TTS_PROVIDER` | `elevenlabs` |
| `ELEVENLABS_API_KEY` | O'zingiz olgan maxfiy API kaliti |
| `ELEVENLABS_VOICE_ID` | 1-qadamdagi tanlangan ovoz ID si |
| `ELEVENLABS_MODEL_ID` | `eleven_v3` |

Kalit qatori uchun Sensitive sozlamasi mavjud bo'lsa, uni yoqing. Bu nomlarda
`NEXT_PUBLIC_` prefiksi bo'lmasin: kalit brauzerga chiqmasligi kerak.

Mavjud `OPENAI_API_KEY` yoki `GROQ_API_KEY` ni saqlang — ElevenLabs TTS
suhbat modelining o'rnini egallamaydi. Groq suhbat + ElevenLabs ovoz ham ishlaydi.
Oldingi `AGENT_TTS_MODEL`/`AGENT_TTS_VOICE` faqat OpenAI TTS uchun;
ElevenLabs model/ovozini yuqoridagi `ELEVENLABS_*` nomlar bilan boshqaring.

## 4. Yangi kodni deploy qiling

**Deployments** bo'limida ElevenLabs ulanishi qo'shilgan yangi Git commitdan
deployment qiling. Environment variables o'zgargach **Redeploy** kerak;
allaqachon ishlab turgan eski deployment yangi qiymatlarni olmaydi.
Deployment **Ready** bo'lgach saytni yangilang. Siz tekshirayotgan domen shu
deployment'ga bog'langanini va loyiha Git sozlamasi kerakli branchni
deploy qilishini tekshiring.

## 5. Hamroh'da ovozni sinang

1. Hokim, bandlik rahbari yoki admin hisobida Hamroh oynasini oching.
2. Oyna **Ovoz: ElevenLabs** deb ko'rsatishi kerak. Bu konfiguratsiya holati;
   haqiqiy ulanishni keyingi tugma tekshiradi.
3. **Ovozni sinash** ni bosing va eshiting. Og'iz eshitilayotgan audio
   balandligiga qarab harakatlanadi.
4. Keyin savol yozib yoki oddiy mikrofon orqali aytib tekshiring. Ovozli
   javob tugmasi yoqilgan bo'lsin.

## 6. Jonli suhbat

> **Yangi:** jonli suhbatni OpenAI o'rniga **Gemini Live** yuritishi mumkin (ElevenLabs ovozi o'sha-o'sha).
> Sozlash va tekshirish: [GEMINI-JONLI.md](GEMINI-JONLI.md). `GEMINI_API_KEY` qo'yilsa Gemini ishlatiladi.

Jonli rejim uchun serverda `OPENAI_API_KEY` va `AGENT_REALTIME=1` bo'lsin.
Mavjud `AGENT_TTS=1` ham jonli rejimni ochadi, agar `AGENT_REALTIME=0` bilan
ataylab o'chirilmagan bo'lsa.

ElevenLabs tanlanganida OpenAI Realtime mikrofonni tinglaydi, matn javobi va
buyruqlarni tayyorlaydi. **Javobni ElevenLabs o'qiydi**; OpenAI'ning `cedar`
ovozi ishlatilmaydi. Hamroh qisqa javobning matni tayyor bo'lgach ovoz yaratadi,
shu sababli native audio rejimiga nisbatan qo'shimcha kutish bor.
Ovozni bo'lsangiz, oldingi audio/so'rov bekor qilinadi. Telefon yoki xonadagi
aks-sado ovozning o'zini yangi savol deb eshitishga sabab bo'lsa, quloqchin
bilan tekshiring. Haqiqiy qurilmada baribir sinash kerak.

ElevenLabs va OpenAI xizmatlari alohida hisoblanadi. OpenAI kalitisiz ham
mavjud Groq/matnli Hamroh + ElevenLabs ovoz ishlaydi, lekin OpenAI Realtime
jonli rejimi ishlamaydi. ElevenLabs TTS kaliti ElevenLabs Agents hisobidagi
alohida agent yaratmaydi; bu ilova mavjud Hamroh asboblaridan foydalanadi.

Avval **Ovozni sinash**, keyin **Jonli suhbat** ni sinang. Gapni bo'lishni,
"Qoraboloq mahallasi" kabi noaniq nomga aniqlashtirishni va "Xatirchi bo'yicha
Excel" buyrug'ini tekshiring. Hisobot mavjud panel eksporti orqali yuklanadi.

## Xato chiqsa

| Holat | Amal |
|---|---|
| Ovoz ID tanlanmagan | `ELEVENLABS_VOICE_ID` ni kiriting va Redeploy qiling. |
| API kaliti qabul qilinmadi | Kalit to'liq nusxalanganini, Production uchun saqlanganini tekshiring. |
| Ruxsat yetishmaydi | Text to Speech va Models Read ruxsatlarini tekshiring. |
| Ovoz/model topilmadi | Ovoz hisobga qo'shilganini, Voice ID to'g'riligini tekshiring. |
| Model o'zbek tilini qo'llamaydi | API model katalogida `uz` tili bor modelni tanlang. Kod boshqa tilga indamay o'tmaydi. |
| Kredit/chegara/xizmat xatosi | ElevenLabs Usage/tarifni tekshiring; kerak bo'lsa biroz kuting. |
| Jonli tugma ishlamaydi | OpenAI Realtime ruxsati, balans, kalit va `AGENT_REALTIME` qiymatini tekshiring. |
| Hali eski ovoz | Yangi commit va environment qiymatlari deploy qilinganini tekshiring, saytni yangilang. |

TTS bir xodimga daqiqada 6 ta, kuniga 80 ta so'rov bilan cheklangan.
Matn uchun mavjud 2200 belgilik, audio uchun 3 MB chegara amal qiladi.
Modelning o'zbekcha qo'llashi bir soat xotirada keshlanadi; serverless yangi
instansiya uni qayta tekshiradi. Ilova ovoz yoki suhbat matnini server bazasiga
saqlamaydi; provider hisobidagi retention/history sozlamalari alohida.

Kod tekshiruvi: `npm run sinov:elevenlabs` va `npm run sinov:jonli`.
Ular soxta provider bilan API sharti va bekor qilishni tekshiradi;
haqiqiy talaffuz sifati ElevenLabs ovozingizda alohida eshitib baholanadi.

API shartining manbasi: [ElevenLabs rasmiy TypeScript SDK](https://github.com/elevenlabs/elevenlabs-js).

## Ovoz almashishi va yangi jonli zaxira

ElevenLabs xato bersa OpenAI TTS bitta to‘liq javobni o‘qiydi. Endi shu ochiq suhbatdagi keyingi javoblar ham zaxira ovozda qoladi: har gapda ElevenLabs’ga qaytilmaydi. Hamroh oynasi yopilib qayta ochilganda asosiy ovoz yana sinab ko‘riladi.

Gemini uchun ElevenLabs shart emas: tashqi TTS sozlanmagan bo‘lsa Gemini o‘z native ovozida gapiradi. Ikkala tashqi TTS ishlamasa jonli suhbat native ovoz bilan tiklanadi; oxirgi savolni qayta ayting. Besh daqiqalik server ruxsati suhbatni uzmasdan avtomatik yangilanadi. Asosiy/zaxira provayder va kunlik limitlar uchun [GEMINI-JONLI.md](GEMINI-JONLI.md)ga qarang.
