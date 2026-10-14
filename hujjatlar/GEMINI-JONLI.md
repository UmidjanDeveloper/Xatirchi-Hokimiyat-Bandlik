# Hamroh: Gemini va OpenAI jonli suhbat

## Vercel sozlamalari

Settings → Environment Variables’da quyidagi nomlarni kiriting, keyin yangi kodni **Redeploy** qiling. Kalitlarni `NEXT_PUBLIC_` bilan saqlamang yoki Git’ga qo‘shmang.

| Nom | Qiymat / vazifa |
|---|---|
| `GEMINI_API_KEY` | Google AI Studio kaliti; Gemini uchun kerak |
| `OPENAI_API_KEY` | OpenAI kaliti; OpenAI jonli suhbat va zaxira uchun kerak |
| `AGENT_REALTIME` | `1`; `0` barcha jonli suhbatni o‘chiradi |
| `AGENT_JONLI_PROVAYDER` | `openai` yoki `gemini`; bo‘sh bo‘lsa sozlangan Gemini ustuvor |
| `AGENT_TTS` | `1` — alohida matnni ovozga o‘qish; native jonli ovoz uchun shart emas |
| `AGENT_TTS_PROVIDER` | `elevenlabs` yoki `openai` |
| `ELEVENLABS_API_KEY` | ElevenLabs Text to Speech + Models Read ruxsatli kaliti |
| `ELEVENLABS_VOICE_ID` | Masalan, tanlangan `jxZfc7gW7v5VBNzQzdyo` |
| `ELEVENLABS_MODEL_ID` | Odatiy `eleven_v4_turbo` (jonli suhbat uchun tez, hujjatlarida o‘zbek tili bor). Bo‘sh qoldirish tavsiya etiladi. Hisobingiz katalogida o‘zbekchasi yo‘q model (masalan `eleven_v3`) yozilsa, o‘zbekchasi bor model (avval `eleven_v4_turbo`) **avtomatik tanlanadi**; o‘zbekchasi bor model umuman bo‘lmasa aniq xato chiqadi |
| `ELEVENLABS_KATALOG_TEKSHIRUVI` | Odatiy yoqilgan. `0` — o‘zbek tili model katalogidan tekshirilmaydi, model to‘g‘ridan-to‘g‘ri ishlatiladi (ElevenLabs hujjatida model o‘zbekchani qo‘llashi aytilgan, lekin hisob katalogi hali ko‘rsatmasa). Bunda o‘zbekcha qo‘llanishi oldindan tekshirilmaydi; ayrim modellar qo‘llanmaydigan til parametrini e’tiborsiz qoldirishi mumkin. Tekshiruvni yoqilgan qoldirish tavsiya etiladi |
| `GEMINI_LIVE_MODEL` | Odatiy `gemini-3.1-flash-live-preview`. **Bo‘sh qoldiring**: standart model kalitingiz uchun mavjud bo‘lmasa, kalitning Live modellari ro‘yxatidan (`models.list`, `bidiGenerateContent`) mosi o‘zi tanlanadi. Yozilgan model hech qachon almashtirilmaydi (kalitda yo‘q bo‘lsa «Уланишни текшириш» ro‘yxatni ko‘rsatadi) |
| `GEMINI_LIVE_OVOZ` | `gemini` — jonli suhbatda **Gemini’ning o‘z ovozi** (javob tugashini ham, ElevenLabs so‘rovini ham kutmaydi: eng tez). Bo‘sh — ElevenLabs. Oddiy «Тинглаш» tugmasi ElevenLabs’da qoladi |
| `GEMINI_LIVE_CHIQISH` | Native Live uchun `transkript` yoki qiymatni olib tashlang; `matn` faqat TEXT qo‘llaydigan modelda |
| `AGENT_REALTIME_DAILY_LIMIT` | Odatiy 120 yangi suhbat / xodim / Toshkent kalendar kuni; 1–1000 |
| `AGENT_REALTIME_GLOBAL_DAILY_LIMIT` | Odatiy 2400 yangi suhbat / butun sayt / Toshkent kalendar kuni; 1–10000 |

Agar Vercel’da eski `AGENT_REALTIME_DAILY_LIMIT=6` saqlangan bo‘lsa, kod uni hurmat qiladi: qiymatni yangilang yoki olib tashlang. Provayderning balans/kvotasi sayt limitidan alohida.

## Ovoz va ulanish

- Gemini faqat o‘z kaliti bilan ham ishlaydi: tashqi TTS sozlanmagan bo‘lsa native PCM ovozi ijro etiladi. OpenAI ham o‘z native ovozini qo‘llaydi.
- Tashqi TTS yoqilganida Gemini’ning native ovozi tashlanadi; Gemini yozgan matn **gap-gap** ElevenLabs’ga beriladi: birinchi gap tugashi bilan ovoz so‘rovi ketadi, butun javob yozilishi kutilmaydi (javob boshlanishigacha vaqt butun javobga emas, birinchi gapga bog‘liq). Gaplar navbat bilan, bitta ovozda o‘ynaydi; keyingi gap oldingisi o‘ynayotganda tayyorlanadi. Matn ekranda oqim bilan ko‘rinadi. Tashqi TTS 24 kHz PCM oqimini yuboradi: birinchi audio kelishi bilan ijro boshlanadi. Model/tarif oqimni rad etsa shu ovozning MP3 yo‘li saqlanadi. Bir javobda ko‘pi bilan 5 ta ovoz so‘rovi: oxirgisi qolgan matnni oladi; tinish belgisiz transkriptda birinchi bo‘lak ~150 belgida so‘z chegarasida beriladi.
- ElevenLabs ishlamasa OpenAI TTS shu gapni o‘qiydi va ogohlantirish chiqadi. Zaxira ovozi bir marta tanlangach shu suhbatdagi **keyingi gaplar ham** OpenAI ovozida so‘raladi; ElevenLabs’ga qaytib ovoz almashtirilmaydi. Birinchi bo‘lak javob bergunicha faqat bitta so‘rov ketadi (ovoz javob o‘rtasida almashib qolmasin).
- Ikkala tashqi TTS ishlamasa jonli ulanish shu provayderning native ovozi bilan qayta ochiladi. Oxirgi savolni qayta ayting; buyruq avtomatik qayta bajarilmaydi.
- OpenAI asosiy bo‘lsa Gemini zaxira, Gemini asosiy bo‘lsa OpenAI zaxira bo‘la oladi. Ikkala xizmat sozlangan bo‘lishi kerak. Bitta xizmat bo‘lsa shu xizmatga cheklangan qayta urinish qilinadi.
- Uzilishda ikki marta qayta urinish; ishlamasa aniq xabar va qayta boshlash tugmasi. Qo‘lda yopilgach ulanish/ovoz tiklanmaydi. Mikrofon oqimi zaxiraga o‘tishda qayta ishlatiladi.
- Besh daqiqa — server ruxsatnomasining muddati. U tugashidan oldin avtomatik yangilanadi: ishlayotgan WebSocket/WebRTC, suhbat konteksti va buyruq IDlari saqlanadi. Provayder o‘z sessiyasini yopsa qayta ulanish bo‘ladi; oldingi suhbat tarixi yangi provayderga avtomatik ko‘chirilmaydi.
- Token/SDP yaratish muvaffaqiyatsiz bo‘lsa aynan shu urinishning kunlik bandi qaytariladi. Ishlagan suhbatni tiklash imzolangan bir martalik `davom` ruxsati bilan yangi kunlik boshlash hisobini sarflamaydi. Ruxsat, sayt kvotasi yoki mikrofon rad etilganda cheksiz zaxira urinishlari qilinmaydi.

## O‘zbekcha eshitish va buyruqlar

OpenAI transkripsiyada `gpt-4o-transcribe`, `language=uz` va Xatirchi shevalari / mavjud mahallalar kontekstini ishlatadi. Oddiy ovoz yozuvining zaxira modeli `whisper-1`; zaxiraga o‘tganda ham o‘zbek tili saqlanadi. Gemini kirish transkripsiyasiga `uz-UZ` til ko‘rsatmasi va bazadagi mahalla nomlari beriladi. Chiqish ko‘rsatmasi ham o‘zbekcha.

Bu ko‘rsatmalar nutq modeliga yordam beradi; shovqin, sheva yoki har bir gapni xatosiz tanish kafolati emas. Noaniq mahalla nomi mavjud katalogdan qidiriladi, o‘xshashlari taklif qilinadi. Buyruqlar rol, mahalla chegarasi, ko‘rish rejimi va takroriy call ID tekshiruvidan o‘tadi. Excel mavjud eksport yo‘li orqali yuklanadi. Tasdiq talab qiladigan amallar ovozli taxmin asosida avtomatik bajarilmaydi.

## Administrator tekshiruvi

Hamroh → «Жонли уланишни текшириш» → «Уланишни текшириш» (soatiga 20 marta). Qadamlar:

1. **Sozlama** — qaysi Gemini modeli, API versiyasi, ovoz (tashqi TTS yoki Gemini ovozi) ishlatilishi.
2. **Gemini modellari** — kalitingiz uchun mavjud Live modellar ro‘yxati. Ro‘yxat bo‘sh bo‘lsa kalit/loyiha/Billing muammosi; sozlangan `GEMINI_LIVE_MODEL` ro‘yxatda bo‘lmasa shu ko‘rsatiladi.
3. **Gemini token** va **WebSocket + sozlama**, **Gemini javobi** — haqiqiy ishlatiladigan modelda. Javob vaqti ikki ko‘rsatkich bilan: «savoldan birinchi matngacha» va «javob tugashigacha» (tashqi TTS javob tugashini kutmasdan gap-gap boshlanadi, lekin birinchi gapni berish uchun model ovoz yaratishi kerak).
4. **ElevenLabs modeli** — hisob katalogida o‘zbek tili bor modelmi; kerak bo‘lsa qaysi model tanlangani.
5. **ElevenLabs tezligi** — jonli suhbatdagi yo‘l bilan (OpenAI zaxirasisiz) birinchi audio necha ms da kelgani. 1500 ms dan oshsa maslahat chiqadi.
6. **OpenAI zaxirasi** — alohida: u yiqilsa ham asosiy natija o‘zgarmaydi (faqat zaxira tayyor emasligi ko‘rinadi).
7. **Nima qilish kerak** — yiqilgan qadamlar uchun aniq amal (Billing, kalit, model nomi, `ELEVENLABS_MODEL_ID`...).

Provider xatosi kalitsiz ko‘rsatiladi. Native Gemini ovozi uchun sozlama tekshiruvi haqiqiy talaffuz bahosi emas. Keyin «Жонли суҳбат»ni bosing va o‘z shevangizda mahalla / Excel so‘rovi ayting.

**Gemini yiqilsa jimgina OpenAI’ga o‘tmaydi:** administrator uchun Hamroh oynasidagi xabarda Google aytgan sabab ko‘rinadi (masalan `… yopildi (kod 1011)`, `… 429 …`, `models/… is not found`). Boshqa rollarga faqat umumiy xabar chiqadi; kalit hech kimga ko‘rsatilmaydi. Hamroh oynasidagi «Овоз:» yorlig‘i ham ovoz manbasini (ElevenLabs / OpenAI / Gemini) ko‘rsatadi.

ElevenLabs asosiy so‘roviga zaxira borligida 6 soniya (birinchi audio uchun), butun TTS zanjiriga 22 soniya ajratilgan (Vercel route 25 soniya). Jonli TTS alohida limit: daqiqada 45, 24 soatda 1000 ovoz so‘rovi (bir javob ko‘pi bilan 5 ta so‘rov); oddiy «Тинглаш» uchun daqiqada 6, 24 soatda 80. Native ovoz tashqi TTS limitini sarflamaydi, provider o‘z hisobiga yozadi.

## Gemini hisobi: Billing va Free tier

Google AI Studio → API keys sahifasida kalit «Free tier» / «Account inactive» deb ko‘rsatilsa, kalit bog‘langan loyihada to‘lov (Billing) faollashtirilmagan: Live API uchun amaldagi kvotani «Уланишни текшириш» orqali tekshiring. HTTP 429 yoki `RESOURCE_EXHAUSTED` kvota muammosiga dalil; WebSocket 1011 kodi o‘zi Billing muammosini tasdiqlamaydi. Billing kerak bo‘lsa aynan kalit bog‘langan loyihada faollashtiring; kalitni faqat Billing qo‘shilgani uchun almashtirish shart emas. Bundan tashqari Google shartlariga ko‘ra bepul darajadagi so‘rovlar mahsulotlarni yaxshilashga ishlatilishi mumkin; jonli suhbatda xodimlarning savollari Google’ga yuborilishini hisobga olib, rasmiy foydalanish uchun pullik darajani tanlang va shartlarni tekshiring.

## Tekshiruv chegaralari

`npm run sinov:jonli`, `npm run sinov:gemini`, `npm run sinov:elevenlabs` server shartnomalari, ruxsat, kvota, tiklash, bekor qilish va ovoz oqimini tekshiradi. `npm run sinov:gemini-brauzer` mahalliy bazada haqiqiy Chromium / AudioWorklet / AudioContext bilan soxta providerlarni tekshiradi; D bo‘limi native PCM va suhbatni uzmasdan ruxsat yangilanishini qoplaydi.

Haqiqiy API kalitlari bo‘lmasa bular provider hisobidagi balans, model ruxsati yoki o‘zbekcha talaffuzni tasdiqlamaydi. Haqiqiy Gemini/OpenAI/ElevenLabs, Xatirchi shevalari va iPhone/Android audiosi saytning administrator tekshiruvi hamda real ovozli suhbat bilan alohida sinalishi kerak. API kalitini suhbatga yubormang.

## Ovoz boshlanishidagi kechikish

`/api/agent/gapir`ning `oqim: true` rejimi ElevenLabs HTTP `/stream?output_format=pcm_24000` va OpenAI `response_format=pcm`dan foydalanadi. Birinchi audio baytidan oldin zaxira tanlanishi mumkin; audio boshlanganidan keyin provider o‘sha javob ichida almashtirilmaydi. Brauzer 24 kHz PCM16 bo‘laklarini ketma-ket audio vaqtiga qo‘yadi va og‘iz amplitudasini oqimdan oladi. Qo‘lda to‘xtatish tarmoq o‘qishini va barcha rejalangan ovozlarni bekor qiladi.

Kechikishning uchta qismi bor va uchalasi ham qisqartirilgan:

1. **Model javobini yozib bo‘lishini kutish** — endi kutilmaydi: Gemini matni gap-gap ElevenLabs’ga beriladi, ovoz birinchi gap tayyor bo‘lishi bilan boshlanadi (avval butun javob `turnComplete` kelgunicha kutilardi: uzun javobda bu bir necha soniya edi).
2. **ElevenLabs modeli** — `eleven_v3` ifodali, lekin sekin va jonli suhbat uchun mo‘ljallanmagan; standart `eleven_v4_turbo` model katalogida o‘zbekcha mavjudligi tekshiriladi. Haqiqiy tezlik hisob, ovoz va tarmoqqa bog‘liq; shu loyihada provayder tezligi hali o‘lchanmagan. Model aniqlash natijasi bir soat eslab qolinadi.
3. **Audio faylining to‘liq tayyorlanishi** — PCM oqimi bilan birinchi baytda boshlanadi.

Eng tez variant: `GEMINI_LIVE_OVOZ=gemini` (Gemini o‘z ovozi bilan gapiradi, tashqi TTS umuman yo‘q); ElevenLabs ovozi/talaffuzi shart bo‘lsa — standart rejim.

Voice ID, `language_code=uz` saqlanadi. Haqiqiy tezlik provider modelining birinchi audio tayyorlash vaqtiga bog‘liq; oqimni qo‘llamaydigan model/tarif MP3 bilan ishlaydi va uning kutishi qoladi. Birinchi audio uchun ElevenLabs’ga zaxira borligida 6 soniya, butun generatsiya zanjiriga 22 soniya ajratiladi. PCM ko‘pi bilan 9.6 MB (200 soniya) har so‘rovga; yuklash tugagach bu deadline ovoz ijrosini kesmaydi.

Gap-gap o‘qishda gaplar orasida ohang biroz farq qilishi mumkin (har gap alohida so‘rov, Voice ID va model bir xil). Bu tezlik uchun to‘lov; ovoz sifati bir xil bo‘lishi shart bo‘lgan joyda `GEMINI_LIVE_OVOZ=gemini` yoki qisqa javob ko‘rsatmasi (2–4 jumla) ishlating.

`npm run sinov:elevenlabs` oqim, model aniqlash va bekor qilish regressiyalarini qoplaydi. `GEMINI_BRAUZER_BOLIM=F npm run sinov:gemini-brauzer` soxta HTTP PCM provider bilan jonli va oddiy ovoz tugmasining fayl tugashidan oldin gapirishini, `GEMINI_BRAUZER_BOLIM=I` esa gap-gap o‘qishni (birinchi gap model javobi tugashidan oldin, zaxira ovozi javob ichida almashmasligi, tartib) tekshiradi. Bu haqiqiy ElevenLabs tezligi o‘lchovi emas: haqiqiy raqamni administrator tekshiruvidagi «ElevenLabs tezligi» qatori beradi.

### Oqim ishlamasa ovozni tiklash

Oqim endpointi formatni yoki metodni rad etsa (400/404/405/406/415/422/501), PCM o‘rniga boshqa MIME qaytsa yoki audio bo‘sh kelsa server aynan shu Voice ID, model va tilning MP3 yo‘liga qaytadi. Bu urinishlar mavjud 22 soniyalik server muddatiga kiradi; PCM ijrosi boshlanganidan keyin server boshqa ovozga o‘tmaydi.

Brauzer oqim so‘rovidagi 502 yoki birinchi audio ijrosidan oldingi PCM xatosida ko‘pi bilan **bir marta** `oqim: false` bilan qayta so‘raydi. Oddiy tugma va jonli suhbat bu yo‘lni bir xil qo‘llaydi; keyingi javoblar o‘sha ochiq oyna/suhbatda MP3 bilan o‘qiladi. Odatiy holda har gap uchun bitta so‘rov ketadi, tiklashda ikkita bo‘lishi mumkin va ikkalasi mavjud ruxsat/kvota tekshiruvidan o‘tadi. Har bir urinish brauzerda 25 soniyadan oshmaydi. Server model/kalit/kvota xatosi yoki tiklash allaqachon sinalganini `X-Nutq-Qayta: 0` bilan bildirsa 502 ham qayta so‘ralmaydi. 401/403/429 qayta sinalmaydi; bekor qilingan yoki eshittirish boshlangan javob qayta o‘qilmaydi.

`GEMINI_BRAUZER_BOLIM=G npm run sinov:gemini-brauzer` haqiqiy Chromium’da bo‘sh PCM va 502dan keyin jonli hamda oddiy ovoz ijrosi va mimika tiklanishini soxta provider bilan tekshiradi. `scripts/nutq-tiklash-sinov.ts` ruxsat/kvota, bekor qilish, ikkinchi xato va ijro boshlanganidan keyin takrorlanmaslikni qoplaydi. Haqiqiy provider hisobidagi kalit, balans va qurilmaning ovoz ruxsati alohida tekshiriladi.

### iPhone jim rejimi va audio sessiyasi

Web Audio konteksti sukutda `ambient` turiga kiradi ([Audio Session spetsifikatsiyasi](https://github.com/w3c/audio-session/blob/main/index.bs#audiocontext-sink)). iOS jim rejimida bu ovoz eshitilmasligi mumkin. `audio-seans.ts` API mavjud bo‘lsa oddiy javob uchun `navigator.audioSession.type = 'playback'`, mikrofon/jonli suhbat uchun `play-and-record` tanlaydi. Mikrofon egasi playbackdan ustuvor: tashqi TTS uni yopmaydi. Oxirgi egasi tugaganda avvalgi rejim tiklanadi; API mavjud bo‘lmasa yoki sozlashni rad etsa eski ijro yo‘li ishlaydi.

Safari qo‘ng‘iroq yoki fondan qaytgach kontekst `interrupted` bo‘lishi mumkin; PCM va MP3 ijrosi buni ham `resume()` bilan tiklaydi. Ruxsat kutayotgan `resume()` 3 soniyada tugaydi yoki bekor qilinadi: kechikkan ruxsat eski ovozni ishga tushirmaydi. Qurilma ruxsat bermaganida yangi TTS so‘rovi bilan pul sarflanmaydi; qayta bosish kerakligi ko‘rsatiladi. Qo‘lda gapni bo‘lish keyingi javoblar uchun oqimni o‘chirmaydi. OpenAI zaxirasi sarlavhada kelganda tanlov keyingi javoblar uchun saqlanadi, lekin xabar faqat audio manbasi ishga tushgach chiqadi. Matn “OpenAI ovozi tanlandi” deydi; oddiy ovoz yorlig‘i ham OpenAIga yangilanadi. Brauzer karnay ovozi yoki telefonning media ovozi darajasini tasdiqlay olmaydi.

`scripts/audio-seans-sinov.ts` sessiya egaligi, mikrofon ustuvorligi, bekor qilish, `interrupted` va ijrodan oldin xabar chiqmasligini taqlid bilan tekshiradi. `GEMINI_BRAUZER_BOLIM=H npm run sinov:gemini-brauzer` haqiqiy Chromium AudioContext bilan shu holatlar va ovoz yorlig‘ini tekshiradi; telefon siyosati taqlid qilinadi. Bu haqiqiy iPhone jim rejimi sinovi emas. Safari/iOS’da ham jim rejim yoqilgan/o‘chirilgan, media ovozi, quloqchin, fondan qaytish va mikrofon bilan alohida sinov kerak.

### Production va provider tekshiruvini ajratish

Review branch’dagi o‘zgarishlar production branch’ga qo‘shilmaguncha Vercel env qiymatini o‘zgartirish yangi model tanlash yoki gap-gap o‘qish kodini ishga tushirmaydi. Deployment’dagi Git commitni tekshiring. Administrator «Ovozni sinash»da ElevenLabs o‘rniga OpenAI ishlasa qisqa, tozalangan sababni ham ko‘radi; boshqa rollarga provider tafsiloti berilmaydi.

Gaplar ovozi tartib bilan tayyorlanadi: oldingi bo‘lak o‘ynayotganda keyingisi yuklanishi mumkin, lekin keyingi provider tanlovi avvalgisidan o‘tib ketmaydi. Zaxira xabari aynan zaxira bo‘lak ijrosi boshlanganida chiqadi. Gemini token, WebSocket va javob tekshiruvi muvaffaqiyatli o‘tsa brauzerning uch daqiqalik eski xato eslatmasi o‘chiriladi.

`GEMINI_LIVE_OVOZ=gemini` native AUDIO rejimini majburiy ishlatadi, eski `GEMINI_LIVE_CHIQISH=matn` uni o‘chirmaydi. ElevenLabs katalog tekshiruvini o‘chirish sozlamasi PCM va MP3 yo‘llarida bir xil saqlanadi. Bunda o‘zbek tilini qo‘llash oldindan tekshirilmaydi: rasmiy SDK hujjatiga ko‘ra qo‘llanmaydigan `language_code` ayrim modellarda e’tiborsiz qoldirilishi mumkin. Shu sabab katalog tekshiruvini yoqilgan qoldirish tavsiya etiladi.

Model va protokol manbalari: [ElevenLabs rasmiy model turlari](https://github.com/elevenlabs/elevenlabs-js/blob/main/src/api/types/TtsConversationalModel.ts), [Google rasmiy Live API sinovi](https://github.com/googleapis/js-genai/blob/main/test/system/api/live_api_test.ts). Katalogda qaytmagan yangi model nomi bor deb taxmin qilinmaydi.
