# Jonli suhbat: Gemini Live (tushunish) + ElevenLabs (ovoz)

Hamroh'ning "Jonli suhbat" tugmasi endi **Gemini Live** bilan tinglaydi va fikrlaydi,
javobni esa **ElevenLabs** ovozi o'qiydi. **Ular ishlamasa, avtomatik OpenAI** (eshitadi, javob beradi
va o'z ovozi bilan gapiradi) davom ettiradi; ular ishlasa ishlayveradi. Batafsil: «Zaxira» bo'limi.

## Qanday ishlaydi

```
mikrofon ──16 kHz PCM──▶ Gemini Live ──matn──▶ gaplarga bo'lish ──▶ ElevenLabs ──▶ quloq
(brauzer)               (WebSocket)           (brauzer)            (server orqali)
                            ▲
                            └── asbob chaqiruvi ──▶ /api/agent/jonli (rol, ko'rish rejimi, tezlik tekshiriladi)
```

- **Kalit brauzerga chiqmaydi.** Server Gemini'dan *yakka foydalanishli, qisqa muddatli
  token* oladi (`POST /v1alpha/auth_tokens`). Model, tizim ko'rsatmasi, asboblar va javob
  turi shu tokenga **qulflangan**: brauzer ularni o'zgartira olmaydi.
- **Javob gap-gap o'qiladi.** Gemini matnni oqim bilan yozadi; birinchi gap tugashi bilan
  u ElevenLabs'ga ketadi, qolganlari yozilayotganda ovozi tayyorlanadi. Butun javobni kutish
  yo'q: bu ElevenLabs bilan ishlaganda kechikishning asosiy qismini kamaytiradi.
- **Asboblar** (Excel hisobot, mahalla ko'rsatkichlari, sahifa ochish...) avvalgidek serverdagi
  `/api/agent/jonli` orqali, imzolangan ruxsatnoma bilan bajariladi. Ko'rish rejimida faqat
  o'qish asboblari ishlaydi.
- **Gapni bo'lish.** Hamroh gapirayotganda siz baland ovozda gapirsangiz u to'xtaydi, ovoz
  navbati bekor qilinadi va gapingizning boshi ham Gemini'ga yetib boradi.

## Zaxira: Gemini yoki ElevenLabs ishlamasa OpenAI

Hech narsa qo'lda almashtirilmaydi. `OPENAI_API_KEY` va `AGENT_TTS=1` borligining o'zi kifoya.

| Nima ishlamadi | Nima bo'ladi |
|---|---|
| ElevenLabs sozlanmagan (`ELEVENLABS_VOICE_ID` yo'q va h.k.) | Gemini yoqilmaydi, jonli suhbatni **OpenAI Realtime** (o'z ovozi) yuritadi |
| `GEMINI_API_KEY` yo'q yoki `AGENT_JONLI_PROVAYDER=openai` | xuddi shunday: OpenAI |
| Gemini tokeni olinmadi (kalit, kvota, model: 502) | brauzer **o'zi** OpenAI Realtime'ga o'tadi, mikrofon qayta so'ralmaydi |
| Gemini WebSocket'ni rad etdi / uzdi / 15 soniyada ulanmadi | o'sha: OpenAI |
| Gemini ulandi, lekin ~12 soniyada birinchi javobni bermadi | o'sha: OpenAI |
| ElevenLabs ovozi yiqildi (kredit, ovoz ID, 5xx) | server **o'sha gapni OpenAI ovozi bilan** o'qiydi; bir marta ogohlantirish chiqadi. ElevenLabs ketma-ket 2 marta yiqilsa, 60 soniya unga so'rov yuborilmaydi (suhbat sekinlashmasin) |
| Gemini **ishlab, javob berib bo'lgach** uzildi | zaxiraga o'tilmaydi: suhbat tugaydi (ishlayotgan narsa ishlayveradi) |
| Kunlik chegara (429), ruxsat yo'q (403) | zaxiraga o'tilmaydi: OpenAI ham shu chegaraga uriladi |

- Zaxiraga o'tgach 3 daqiqa Gemini'ga qayta urinilmaydi (har bosishda 10–15 soniya kutmaslik va kunlik hisobni
  yemaslik uchun), keyin **Gemini yana sinab ko'riladi**.
- Ishlamagan Gemini urinishi kunlik hisobga yozilgan: shu urinishning zaxirasi uni **ikkinchi marta yemaydi**
  (imzolangan, bir martalik «qoplash» ruxsatnomasi; boshqa foydalanuvchiniki yoki qayta ishlatilgani o'tmaydi).
- OpenAI zaxirasida OpenAI **o'z ovozi bilan** gapiradi (`AGENT_REALTIME_VOICE`, odatiy `cedar`), ElevenLabs'ga
  tayanmaydi: sababi aynan ElevenLabs buzuq bo'lishi mumkin.
- Oddiy «Тинглаш» tugmasi va jonli ovoz ham shu zanjirdan o'tadi: ElevenLabs → OpenAI ovozi (`gpt-4o-mini-tts`,
  `AGENT_TTS_MODEL`/`AGENT_TTS_VOICE`). Hamma OpenAI so'rovlari kalit bilan **serverdan** ketadi.
- Zaxira ishlayotganini «Уланишни текшириш» oxirgi qatorda («OpenAI zaxirasi») ko'rsatadi.

## Vercel'da nimalar kerak

Barchasi **Settings → Environment Variables** da, `NEXT_PUBLIC_` prefiksisiz. Keyin **Redeploy**.

| Nom | Qiymat | Kerakmi |
|---|---|---|
| `GEMINI_API_KEY` | Google AI Studio'dan olingan kalit | **shart** |
| `AGENT_TTS` | `1` | **shart** |
| `AGENT_TTS_PROVIDER` | `elevenlabs` | tavsiya |
| `ELEVENLABS_API_KEY` | ElevenLabs kaliti (Text to Speech + Models Read ruxsati) | **shart** |
| `ELEVENLABS_VOICE_ID` | tanlangan ovoz ID si | **shart** |
| `ELEVENLABS_MODEL_ID` | odatiy `eleven_v3` (o'zbek tili bor) | ixtiyoriy |
| `GEMINI_LIVE_MODEL` | odatiy `gemini-3.1-flash-live-preview` | ixtiyoriy |
| `GEMINI_LIVE_CHIQISH` | `matn` (odatiy) yoki `transkript` | ixtiyoriy |
| `GEMINI_API_SURUM` | `v1alpha` (odatiy) yoki `v1beta` | ixtiyoriy |
| `OPENAI_API_KEY` | OpenAI kaliti: **zaxira** (eshitish, javob, ovoz) uchun | tavsiya |
| `AGENT_JONLI_PROVAYDER` | `openai` yozilsa Gemini o'chadi, OpenAI Realtime qaytadi | ixtiyoriy |
| `AGENT_REALTIME` | `0` yozilsa jonli suhbat butunlay o'chadi | ixtiyoriy |

ElevenLabs sozlanmagan bo'lsa Gemini jonli rejimi **yoqilmaydi** (ovozsiz yarim holat bo'lmasin): u holda OpenAI o'z ovozi bilan ishlaydi.

## Tekshirish (administrator, telefonda ham)

1. Administrator sifatida Hamroh oynasini oching.
2. **«Жонли уланишни текшириш» → «Уланишни текшириш»** ni bosing (soatiga 8 martagacha).
3. Server haqiqiy so'rovlar bilan tekshiradi va har qadamga ✓ yoki ✗ qo'yadi:

| Qadam | Nimani tekshiradi | ✗ bo'lsa |
|---|---|---|
| Sozlama | Vercel'da yetishmayotgan o'zgaruvchilar **nomlari** (qiymatsiz) | ro'yxatdagi nomlarni kiriting va Redeploy qiling |
| Gemini token | `GEMINI_API_KEY` ishlaydimi, kvota bormi | 401/403: kalit yoki ruxsat; 429: kvota; 400: sozlama |
| Gemini WebSocket + sozlama | model nomi, ko'rsatma, asboblar sxemasi qabul qilinadimi | Google'ning o'z xabari ko'rsatiladi (masalan, "model not found" → `GEMINI_LIVE_MODEL` ni tuzating) |
| Gemini javobi | savolga matn kelyaptimi va **birinchi matngacha necha ms** | "bo'sh javob" → `GEMINI_LIVE_CHIQISH=transkript` ni sinang |
| ElevenLabs ovozi | ovoz tayyorlandimi va **necha ms** | xabar ichida sabab (kalit ruxsati, ovoz ID, kredit) |
| OpenAI zaxirasi | OpenAI kaliti va realtime modeli mavjudmi (pulsiz so'rov); oddiy ovoz zaxirasi tayyormi | ✗ bo'lsa Gemini/ElevenLabs yiqilganda jonli suhbat zaxirasiz qoladi; umumiy natijaga ta'sir qilmaydi |

Millisekundlar tezlikni solishtirish uchun: ElevenLabs modelini (`ELEVENLABS_MODEL_ID`) yoki
Gemini modelini almashtirib, shu tugma bilan farqni ko'rish mumkin.

Muvaffaqiyatli bo'lsa, **«Жонли суҳбат»** ni bosing va gapiring.

## Cheklovlar va xarajat

- Bir xodimga kuniga 6 ta jonli ulanish (`AGENT_REALTIME_DAILY_LIMIT`, 1–24), har biri ko'pi bilan 5 daqiqa;
  butun tuman bo'yicha 30 kunda 240 ta.
- Jonli suhbatdagi ovoz so'rovlari alohida hisobda: daqiqada 30, kuniga 400 (oddiy "Тинглаш" tugmasi
  hisobiga tegmaydi). Bir javob ko'pi bilan 5 ta ovoz so'rovi bo'ladi.
- Gemini va ElevenLabs alohida hisoblanadi; ikkalasining ham o'z kvotasi bor.
- **Muvaffaqiyatsiz ulanish urinishlari ham kunlik hisobga kiradi** (token berilgan paytdan boshlab). Sozlashda
  avval «Уланишни текшириш» ni ishlating (u alohida hisobda, soatiga 8 marta): shunda kunlik 6 ta ulanish bekorga ketmaydi.

## Aks-sado (ovoz o'zini eshitmasin)

ElevenLabs ovozi chiqayotganda mikrofon Gemini'ga **ulanmaydi**; shu paytda faqat kuchli ovoz
(siz gapirsangiz) gapni bo'lish deb qabul qilinadi. Javob tugagach 0,35 soniya aks-sado so'nishi
kutiladi. Telefon dinamigida ovoz mikrofonga qaytib, Hamroh o'zini bo'lib qo'ysa, `src/components/agent/jonli-gemini.ts`
boshidagi `BOLISH_RMS` (odatiy 0,06) ni oshiring yoki quloqchin ishlating. Bu qiymatlar haqiqiy
iPhone/Android'da sinab sozlanishi kerak.

## Hali tekshirilmagan (halol ro'yxat)

- **Haqiqiy Gemini va ElevenLabs bilan end-to-end** bu muhitda sinalmagan (kalitlar va ElevenLabs'ga chiqish yo'q).
  Sinalgani: protokol SDK manbasiga aynan mos yozilgan; soxta Gemini/ElevenLabs bilan haqiqiy Chromium'da
  to'liq oqim; haqiqiy Google serveri soxta token bilan WebSocket manzili va `access_token` parametrini
  tanishi ("malformed auth token" deb javob berdi, ya'ni manzil to'g'ri). Qolgan hammasini yuqoridagi
  "Уланишни текшириш" birinchi marta ishga tushganda ko'rsatadi.
- **Model nomi.** Google "preview" modellarni almashtirib turadi (yarim-kaskad modellar 2025-dekabrda o'chirilgan).
  Odatiy `gemini-3.1-flash-live-preview` — rasmiy ro'yxatdagi joriy nom. Matn javobini (ElevenLabs uchun
  kerak) u qo'llamasa, tekshiruv "bo'sh javob" yoki "rad etdi" ko'rsatadi: `GEMINI_LIVE_CHIQISH=transkript`
  qiling (model gapiradi, ovozi tashlanadi, matni transkripsiyadan olinadi; matn tinish belgilari sifati past bo'lishi mumkin).
- **OpenAI zaxirasi haqiqiy OpenAI bilan** sinalmagan (bu muhitdan OpenAI'ga chiqilmaydi): brauzer so'rovi, qoplash
  ruxsatnomasi, hisob va xavfsizlik soxta serverda tekshirilgan, WebRTC qismi esa avvaldan ishlaydigan OpenAI yo'li.
  **iPhone Safari'da** zaxiraga o'tish foydalanuvchi bosishidan keyin sodir bo'ladi (avtomatik): mikrofon oqimi shu
  uchun qayta ishlatiladi, lekin OpenAI ovozi ba'zan qo'shimcha bosishni talab qilishi mumkin («Ovozni eshitish uchun jonli suhbat tugmasini yana bosing»).
- **O'zbekcha talaffuz va tushunish sifati**, **haqiqiy iPhone'da** mikrofon + ovoz bir vaqtda.
- Efemer token API'si Google'da "preview": versiya/maydon o'zgarsa tekshiruv aniq xabar beradi.

## Sinovlar

| Buyruq | Nima |
|---|---|
| `npm run sinov:gemini` | protokol, gap bo'lgich, token so'rovi shakli, sozlama, xavfsizlik, **OpenAI zaxira zanjiri** (soxta Google/OpenAI), route'lar (32 + 18 tekshiruv) |
| `npm run sinov:gemini-brauzer` | haqiqiy Chromium: mikrofon → soxta Gemini WebSocket → soxta ElevenLabs, asbob, bo'lish, to'xtatish, tekshiruv tugmasi (qo'lda, `next dev` bilan; sarlavhasiga qarang). C bo'limi: Gemini ishlamasa OpenAI'ga o'tish (`GEMINI_BRAUZER_BOLIM=C` faqat shuni yuritadi) |
| `npm run sinov:brauzer-pet` | haqiqiy Chromium: Hamroh tugmasi hamma rol va menyu sahifalarida ko'rinadimi, telefonda sahifa gorizontal siljimaydimi, oyna ochiladi/yopiladi, oyna yiqilsa tugma qaytadimi |
