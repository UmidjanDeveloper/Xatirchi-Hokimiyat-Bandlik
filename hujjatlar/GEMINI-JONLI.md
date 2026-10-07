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
| `ELEVENLABS_MODEL_ID` | `eleven_v3`; `eleven_v4` tasdiqlangan model emas |
| `GEMINI_LIVE_MODEL` | Odatiy `gemini-3.1-flash-live-preview` |
| `GEMINI_LIVE_CHIQISH` | Native Live uchun `transkript` yoki qiymatni olib tashlang; `matn` faqat TEXT qo‘llaydigan modelda |
| `AGENT_REALTIME_DAILY_LIMIT` | Odatiy 120 yangi suhbat / xodim / Toshkent kalendar kuni; 1–1000 |
| `AGENT_REALTIME_GLOBAL_DAILY_LIMIT` | Odatiy 2400 yangi suhbat / butun sayt / Toshkent kalendar kuni; 1–10000 |

Agar Vercel’da eski `AGENT_REALTIME_DAILY_LIMIT=6` saqlangan bo‘lsa, kod uni hurmat qiladi: qiymatni yangilang yoki olib tashlang. Provayderning balans/kvotasi sayt limitidan alohida.

## Ovoz va ulanish

- Gemini faqat o‘z kaliti bilan ham ishlaydi: tashqi TTS sozlanmagan bo‘lsa native PCM ovozi ijro etiladi. OpenAI ham o‘z native ovozini qo‘llaydi.
- Tashqi TTS yoqilganida Gemini’ning native ovozi tashlanadi; tayyor javob **bitta** ovoz so‘rovida o‘qiladi. Matn oqim bilan ko‘rinadi. Tashqi TTS 24 kHz PCM oqimini yuboradi: birinchi audio kelishi bilan ijro boshlanadi, butun fayl yuklanishi kutilmaydi. Model/tarif oqimni rad etsa shu ovozning MP3 yo‘li saqlanadi. Bir javob gaplarga bo‘linib turli ovozlarda o‘qilmaydi.
- ElevenLabs ishlamasa OpenAI TTS o‘sha javobni o‘qiydi va ogohlantirish chiqadi. Shu ochiq suhbatdagi keyingi javoblar OpenAI ovozida qoladi; har javobda ElevenLabs’ga qaytib ovoz almashtirilmaydi.
- Ikkala tashqi TTS ishlamasa jonli ulanish shu provayderning native ovozi bilan qayta ochiladi. Oxirgi savolni qayta ayting; buyruq avtomatik qayta bajarilmaydi.
- OpenAI asosiy bo‘lsa Gemini zaxira, Gemini asosiy bo‘lsa OpenAI zaxira bo‘la oladi. Ikkala xizmat sozlangan bo‘lishi kerak. Bitta xizmat bo‘lsa shu xizmatga cheklangan qayta urinish qilinadi.
- Uzilishda ikki marta qayta urinish; ishlamasa aniq xabar va qayta boshlash tugmasi. Qo‘lda yopilgach ulanish/ovoz tiklanmaydi. Mikrofon oqimi zaxiraga o‘tishda qayta ishlatiladi.
- Besh daqiqa — server ruxsatnomasining muddati. U tugashidan oldin avtomatik yangilanadi: ishlayotgan WebSocket/WebRTC, suhbat konteksti va buyruq IDlari saqlanadi. Provayder o‘z sessiyasini yopsa qayta ulanish bo‘ladi; oldingi suhbat tarixi yangi provayderga avtomatik ko‘chirilmaydi.
- Token/SDP yaratish muvaffaqiyatsiz bo‘lsa aynan shu urinishning kunlik bandi qaytariladi. Ishlagan suhbatni tiklash imzolangan bir martalik `davom` ruxsati bilan yangi kunlik boshlash hisobini sarflamaydi. Ruxsat, sayt kvotasi yoki mikrofon rad etilganda cheksiz zaxira urinishlari qilinmaydi.

## O‘zbekcha eshitish va buyruqlar

OpenAI transkripsiyada `gpt-4o-transcribe`, `language=uz` va Xatirchi shevalari / mavjud mahallalar kontekstini ishlatadi. Oddiy ovoz yozuvining zaxira modeli `whisper-1`; zaxiraga o‘tganda ham o‘zbek tili saqlanadi. Gemini kirish transkripsiyasiga `uz-UZ` til ko‘rsatmasi va bazadagi mahalla nomlari beriladi. Chiqish ko‘rsatmasi ham o‘zbekcha.

Bu ko‘rsatmalar nutq modeliga yordam beradi; shovqin, sheva yoki har bir gapni xatosiz tanish kafolati emas. Noaniq mahalla nomi mavjud katalogdan qidiriladi, o‘xshashlari taklif qilinadi. Buyruqlar rol, mahalla chegarasi, ko‘rish rejimi va takroriy call ID tekshiruvidan o‘tadi. Excel mavjud eksport yo‘li orqali yuklanadi. Tasdiq talab qiladigan amallar ovozli taxmin asosida avtomatik bajarilmaydi.

## Administrator tekshiruvi

Hamroh → «Жонли уланишни текшириш» → «Уланишни текшириш». Asosiy provayder, token/model, javob va sozlangan ovoz tekshiriladi; provider xatosi kalitsiz ko‘rsatiladi. Native Gemini ovozi uchun sozlama tekshiruvi haqiqiy talaffuz bahosi emas. Keyin «Жонли суҳбат»ni bosing va o‘z shevangizda mahalla / Excel so‘rovi ayting.

ElevenLabs asosiy so‘roviga zaxira borligida 10 soniya, butun TTS zanjiriga 22 soniya ajratilgan (Vercel route 25 soniya). Jonli TTS alohida limit: daqiqada 30, 24 soatda 400 javob; oddiy «Тинглаш» uchun daqiqada 6, 24 soatda 80. Native ovoz tashqi TTS limitini sarflamaydi, provider o‘z hisobiga yozadi.

## Tekshiruv chegaralari

`npm run sinov:jonli`, `npm run sinov:gemini`, `npm run sinov:elevenlabs` server shartnomalari, ruxsat, kvota, tiklash, bekor qilish va ovoz oqimini tekshiradi. `npm run sinov:gemini-brauzer` mahalliy bazada haqiqiy Chromium / AudioWorklet / AudioContext bilan soxta providerlarni tekshiradi; D bo‘limi native PCM va suhbatni uzmasdan ruxsat yangilanishini qoplaydi.

Haqiqiy API kalitlari bo‘lmasa bular provider hisobidagi balans, model ruxsati yoki o‘zbekcha talaffuzni tasdiqlamaydi. Haqiqiy Gemini/OpenAI/ElevenLabs, Xatirchi shevalari va iPhone/Android audiosi saytning administrator tekshiruvi hamda real ovozli suhbat bilan alohida sinalishi kerak. API kalitini suhbatga yubormang.

## Ovoz boshlanishidagi kechikish

`/api/agent/gapir`ning `oqim: true` rejimi ElevenLabs HTTP `/stream?output_format=pcm_24000` va OpenAI `response_format=pcm`dan foydalanadi. Birinchi audio baytidan oldin zaxira tanlanishi mumkin; audio boshlanganidan keyin provider o‘sha javob ichida almashtirilmaydi. Brauzer 24 kHz PCM16 bo‘laklarini ketma-ket audio vaqtiga qo‘yadi va og‘iz amplitudasini oqimdan oladi. Qo‘lda to‘xtatish tarmoq o‘qishini va barcha rejalangan ovozlarni bekor qiladi.

Model javobi tugashi hanuz kutiladi — bu o‘zgarish audio faylining to‘liq tayyorlanishi/yuklanishini kutishni olib tashlaydi. Voice ID, Eleven v3, `language_code=uz` va bir javobga bitta TTS so‘rovi saqlanadi. Haqiqiy tezlik provider modelining birinchi audio tayyorlash vaqtiga bog‘liq; oqimni qo‘llamaydigan model/tarif MP3 bilan ishlaydi va uning kutishi qoladi. Birinchi audio uchun ElevenLabs’ga zaxira borligida 6 soniya, butun generatsiya zanjiriga 22 soniya ajratiladi. PCM ko‘pi bilan 9.6 MB (200 soniya); yuklash tugagach bu deadline ovoz ijrosini kesmaydi.

`npm run sinov:elevenlabs` oqim va bekor qilish regressiyalarini qoplaydi. `GEMINI_BRAUZER_BOLIM=F npm run sinov:gemini-brauzer` soxta HTTP PCM provider bilan jonli va oddiy ovoz tugmasining fayl tugashidan oldin gapirishini tekshiradi. Bu haqiqiy ElevenLabs tezligi o‘lchovi emas.
