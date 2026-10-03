# Hudhud — xodimlar uchun ovozli AI agent

**Davomiy suhbat va server ovozi:** yangilangan xotira, ovozli suhbat boshqaruvlari
va sozlamalar [KOALA-SUHBAT.md](KOALA-SUHBAT.md) da.

**Kimga:** hokim, bandlik markazi mutaxassisi va rahbari, administrator.
Mahalla yettiligi a'zosiga ko'rinmaydi. «Ko'rish rejimi»da ham yo'q.

**Maskot va nom (2026-10-02 dan): Koala.** Egasi tanlagan koala rasmlari — **har bir holat
uchun alohida poza** (`public/maskot/koala-v2-<holat>-{128,256}.webp` + `-128.png` zaxira,
shaffof fon): `tayyor` — tik turibdi; `eshitmoqda` — qulog'iga qo'l tutgan; `oylamoqda` —
iyagiga qo'l qo'ygan; `gapirmoqda` — og'zi ochiq, qo'li bilan ishora qilmoqda.
To'rttasi bir xil kesimda tayyorlangan: poza almashganda koala o'lchami va o'rni sakramaydi.
Tugma (har sahifada) faqat "tayyor" pozani yuklaydi (oddiy ekranda ~8 KB, zich ekranda ~19 KB); suhbat oynasi to'rttasini
oldindan yuklaydi (poza almashganda rasm kutib turmaydi). Komponent —
`src/components/agent/maskot.tsx`.
Foydalanuvchiga ko'rinadigan nom — **Koala (Коала)**: tugma, oyna sarlavhasi, salom
(«Мен Коаламан»), rad matnlari va tizim ko'rsatmasi. Avval maskot supurgichi qush (Hudhud)
edi; **ichki nomlar** (hujjat va fayl nomi `HUDHUD-AGENT`, voqea `hudhud:hisobot`, kalit
`hudhud:suhbat:`/`hudhud:ovozli`, `AgentFoydalanish`/`AgentAmali` jadvallari) saqlandi —
ularni o'zgartirish saqlangan suhbatlarni va hisobot tugmalari bilan aloqani buzardi.
Poza holatni o'zi aytadi, lekin kichik o'lchamda ajralmay qolishi mumkin, shuning uchun
holat (eshitmoqda / o'ylamoqda / gapirmoqda) burchakdagi **belgi** bilan ham ko'rinadi (rang va
harakatsiz ham tushunarli); harakat faqat `prefers-reduced-motion: no-preference` va zaif
qurilma bo'lmaganda. Rasmni almashtirish: yangi fayllarni `public/maskot/koala-v3-*` deb
qo'ying va `MASKOT_RASMI` yo'llarini yangilang (nomda versiya — kesh eskirmaydi). Sinov: `scripts/maskot-sinov.ts`.

## Nima qiladi

| Buyruq / savol (misol) | Natija |
|---|---|
| «Ishsizlar ro'yxatini och», «suhbat kutayotganlarni ko'rsat», «muddati o'tgan murojaatlar» | Sahifa **ochiladi** (rolga ruxsat etilgan, filtr bilan) |
| «Xatlov qanday ketyapti?», «Qorabuloq mahallasi qanday?» | Jamlama raqamlar + manba |
| «Qaysi mahalla orqada?» | Xatlov qamrovi bo'yicha solishtirish (reyting emas) |
| «Chet elda nechta odam ishlayapti?» | Anketa bo'limi bo'yicha jamlama |
| «Bugun nima qilishim kerak?» | Vazifalar taxtasi |
| (admin) «Xatoli xabarlarni qayta yubor» | **Taklif** — tasdiqlash tugmasi bosilgandagina bajariladi |

Hokimga ismi bilan, hurmat bilan, sof o'zbekcha gapiradi (lotin yoki kirill —
foydalanuvchining alifbosida). Salomlashuvni model emas, **kod** yozadi.

## Qanday ishlaydi

```
Brauzer ── ovoz (uz-UZ) ──► matn ──► /api/agent/suhbat ──► [model + asboblar] ──► javob + amallar
                                         │                         │
                                  huquq, hajm, chegara     faqat jamlama ma'lumot,
                                                           rolga bog'langan asboblar
```

- **Asboblar** (`lib/agent/asboblar.ts`) — mavjud, rolga bog'langan funksiyalar
  (panel va tablo ishlatadigan o'sha hisoblar). Model bazaga to'g'ridan-to'g'ri yeta olmaydi.
- **Sahifa ochish** (`lib/agent/sahifalar.ts`) — URLni model emas, ro'yxat yasaydi:
  tashqi sayt, `/api`, boshqa rolning sahifasi, noma'lum filtr — rad.
- **Yozish amali** (`lib/agent/amallar.ts`) — agent faqat **taklif** yaratadi; serverda
  saqlanadi, 5 daqiqa amal qiladi, bir marta bajariladi, faqat egasi tasdiqlaydi, rol
  qayta tekshiriladi, audit jurnaliga yoziladi.
- **Qoidali zaxira** (`lib/agent/zaxira.ts`) — kalit yo'q, limit tugagan yoki model
  yiqilgan bo'lsa ham sahifani ochish va tuman holati ishlaydi (pul turmaydi).
  GPT §18: «AI ishlamasa asosiy xizmatlar to'xtamasin».

## Mikrofon: qaysi qurilmada qanday ishlaydi

| Qurilma | Yo'l |
|---|---|
| **iPhone/iPad** (Safari, Chrome, hammasi) | Server orqali: mikrofon → 16 kHz WAV → `/api/agent/ovoz` → OpenAI/Groq. Apple ovoz tanishi o'zbekchani bilmaydi, Chrome iOS'da esa ruxsat bermaydi |
| Android, kompyuter (Chrome/Edge) | Brauzerning o'z tanishi (`uz-UZ`, bepul). Xato bersa (ruxsat, xizmat, til, tarmoq) — server yo'liga o'tadi |
| Firefox (ovoz tanishi yo'q) | Server orqali |
| Server yo'li o'chiq (kalit yo'q) | Faqat brauzer tanishi; ishlamasa — «Bu qurilmada ovoz ishlamaydi. Yozing.» |

Kafolatlar (har biri `scripts/ovoz-sinov.ts` va brauzer sinovida tekshiriladi):

- **Holat qotib qolmaydi.** Xato, to'xtatish, bekor qilish, kutilmagan uzilish — har holda koala
  «tayyor»ga, mikrofon tugmasi oddiy holatga qaytadi. (iPhone'da brauzer tanishi xatodan keyin
  «tugadi» demaydi: shundan oyna «eshitmoqda»da qotib qolgan edi.)
- **Gapirib bo'lgach o'zi to'xtaydi** (server yo'li): nutqdan keyin 1,4 s jimlik; so'zlar orasidagi
  qisqa tanaffusda to'xtamaydi; 7 s hech narsa aytilmasa — «Овоз эшитилмади» va serverga
  **yuborilmaydi**. Eng uzun yozuv 15 s. Qo'lda to'xtatish ham bor.
- **Nutq atrofi kesiladi** (0,4 s oldin, 0,6 s keyin): jim yozuvga model «o'ylab topilgan» matn
  qaytarmasin, limit soniyalari ham kamroq sarflansin.
- **Mikrofon bo'shatiladi:** oyna yopilsa yoki ilova fonga o'tsa yozuv yuborilmay to'xtaydi.
- Yozish paytida tugma atrofidagi halqa ovozga qarab kengayadi (gapirayotganingiz eshitilayotganini
  ko'rasiz). Zaif qurilmada va «harakatni kamaytirish»da o'chiq.

### Ovoz serverda matnga aylanmasa: sabab oynada aytiladi

Yozuv serverga yetib borib, OpenAI/Groq rad etsa, oynada **sababi** chiqadi (administratorga oxirida
`[openai 429]` kabi belgi ham ko'rinadi; boshqa rollarga belgisiz). Batafsil matn **Tizim → xato jurnali**da
(`api:agent-ovoz`, kalit yashirilgan).

| Oynadagi xabar | Sabab | Nima qilinadi |
|---|---|---|
| «Овоз хизматининг калити ишламаяпти» `[openai 401]` | Kalit noto'g'ri yoki o'chirilgan | Vercel'da `OPENAI_API_KEY` ni yangilang |
| «Овоз хизмати ҳисобида маблағ тугаган» `[openai 429]` | OpenAI hisobida kvota/mablag' yo'q | OpenAI Billing'da hisobni to'ldiring |
| «Овоз хизматига рухсат йўқ» `[openai 403]` | Kalit (cheklangan) yoki loyiha ovoz xizmatiga/`whisper-1` modeliga ruxsat bermaydi | OpenAI'da kalit ruxsatlarini (audio/model) va loyiha modellarini tekshiring |
| «Овоз модели топилмади» `[openai 404]` | Model nomi noto'g'ri (`AGENT_STT_MODEL`) | O'zgaruvchini olib tashlang |
| «Овоз хизмати банд…» `[openai 429]` | Daqiqalik chegara (vaqtincha) | Bir oz kuting |
| «Овоз хизмати кечикди» / «уланмади» / «вақтинча ишламаяпти» | Tarmoq yoki OpenAI uzilishi | Qayta urining |

Server o'zi ham tuzatadi: OpenAI **til, harorat yoki izoh** parametrini rad etsa — shu parametrsiz qayta
uradi; `AGENT_STT_MODEL` modeli topilmasa — `whisper-1` bilan qayta uradi (eng ko'pi 4 urinish).
Matn chiqmagan yozuvning soniyalari kunlik ovoz limitiga **hisoblanmaydi** (qaytariladi).
Sinov: `scripts/stt-sinov.ts` (17, tarmoqsiz) va `scripts/brauzer/stt-brauzer.mjs` (haqiqiy marshrut,
soxta OpenAI bilan). OpenAI'ning haqiqiy javoblari bu yerda sinalmagan.

Yozuv MediaRecorder bilan emas, WebAudio orqali **o'zimiz** yig'iladi va oddiy WAV (16 kHz, 16 bit,
bitta kanal) bo'lib ketadi: iPhone'da MediaRecorder bo'laklangan MP4 beradi, uni serverdagi dekoder
qabul qilishiga kafolat yo'q edi. WAV baytma-bayt tekshiriladi.

## Maxfiylik (halol)

**Modelga ketadi:** xodimning to'liq ismi (salomlashuv va murojaat uchun), uning roli,
bugungi sana, xodim yozgan/aytgan matn, asbob natijalari (**faqat sonlar, foizlar,
mahalla nomlari**).

**Modelga ketmaydi:** fuqaro ismi, telefoni, manzili, oila boshlig'i, murojaatchi nomi,
ro'yxat qatorlari. Testlar buni barcha rol va asboblar uchun tekshiradi
(`scripts/agent-sinov.ts`, «PII»).

**Teshik (yopib bo'lmaydi):** xodim ovozda yoki yozib fuqaro ismini aytsa, bu matn
provayderga ketadi. Oynada qisqa ogohlantirish turadi: «Fuqaro ismi va telefonini
aytmang». Ro'yxatning o'zi esa xodimning o'z ekranida, o'z huquqi bilan ochiladi
(«ishsizlar ro'yxatini och»).

**Ovoz:** brauzerning ovoz tanishi (Chrome'da — Google serveri) yoki zaxira yo'l:
mikrofon yozuvi (WAV) → bizning server → OpenAI/Groq. Yozuv **saqlanmaydi**, bazada faqat
soniyalar hisobi bor. Suhbat matni ham bazada saqlanmaydi (brauzer varag'ida,
`sessionStorage`).

OpenAI hisobingizdagi ma'lumot saqlash sozlamalarini siz tekshirasiz: men ularni
ko'rolmayman.

## Xarajat nazorati

| Nima | Qanday |
|---|---|
| Kunlik limit | Rol bo'yicha: hokim/admin 120, rahbar 80, mutaxassis 40 xabar (`AGENT_KUNLIK_LIMIT`). **Atomar**: parallel so'rovlar limitdan oshirmaydi |
| Oylik umumiy to'siq | 4000 xabar (`AGENT_OYLIK_LIMIT`); tekshiruv taxminiy: bir necha xabar ortiqcha o'tishi mumkin |
| Daqiqalik chegara | 12 xabar |
| Ovoz | 900 soniya/kun/xodim (`AGENT_OVOZ_LIMIT`), bitta yozuv ≤ 60 soniya, ≤ 1,5 MB. Brauzer faqat nutq atrofini yuboradi (odatda 2–4 s), shuning uchun soniyalar kam sarflanadi |
| Bir suhbat | ≤ 4 aylanish, ≤ 6 asbob chaqiruvi, odatda ≤ 2000 token/javob (`AGENT_JAVOB_TOKEN`) |
| Limit tugasa | Oddiy rejim: sahifani ochish va tuman holati ishlayveradi |
| Model yiqilsa | Band qilingan xabar qaytariladi (xodim zarar ko'rmaydi) |

Hisob: `AgentFoydalanish` jadvali (xodim, kun, so'rovlar, tokenlar). Matn yo'q.

## Sozlash

1. `OPENAI_API_KEY` Vercel'da bor (yoki `GROQ_API_KEY`). **Qo'shimcha hech narsa shart emas.**
2. Ixtiyoriy: `AGENT_MODEL` — o'zbekcha va asbob chaqirish uchun kuchliroq model; odatiy
   OpenAI uchun sozlama bo'lmasa `gpt-4.1-mini`; `OPENAI_MODEL` yozilgan bo'lsa u ishlaydi.
   **Modelning haqiqiy sifati production'da, haqiqiy savollarda tekshirilishi kerak.**
3. Migratsiya `20261002100000_agent` build paytida o'zi qo'llanadi (faqat qo'shadi).
4. Tekshirish: administrator sifatida kiring → pastki o'ngdagi koala tugmasi → oyna tepasida
   «Sunʼiy intellekt · N ta qoldi» ko'rinsa kalit ishlayapti; «Oddiy rejim» desa kalit yo'q.
5. Ixtiyoriy: `AGENT_STT_MODEL` — ovozni matnga aylantirish modeli (odatiy `whisper-1`). O'zbekcha aniqligi
   yetarli bo'lmasa, OpenAI'ning yangi transkripsiya modelini sinab ko'rish mumkin; **men uni o'lchay olmadim**,
   shuning uchun odatiy qiymat o'zgarmagan.

## Nima SINALGAN va nima SINALMAGAN

| Sinalgan (mahalliy) | Qanday |
|---|---|
| Asboblar, ruxsat, URL xavfsizligi, PII, limit (atomar), tasdiq (bir marta), zaxira rejim, til matnlari | `scripts/agent-sinov.ts` + mutatsiya sinovi |
| API: kirishsiz 401, mahalla xodimi 403, tekshiruv 400, chegara 429, tasdiq oqimi | `scripts/http-regressiya.ts` (13a–13i) |
| Brauzer: salom ismi bilan, javob, manba, sahifa ochilishi, tasdiq kartasi, mobil, lotin/kirill | Playwright; ovoz tanish **soxta** (test dublyor) bilan |
| Mikrofon: iPhone yo'li, xatodan keyin qotib qolmaslik, zaxiraga o'tish, gap tugagach to'xtash, jimlik, oyna yopilishi, fonga o'tish, serverga ketgan WAV fayl | `scripts/ovoz-sinov.ts` (43 ta, brauzersiz) + `scripts/brauzer/mikrofon-brauzer.mjs` (22 stsenariy, Chromium soxta mikrofon oqimi bilan) + `scripts/stt-sinov.ts` va `stt-brauzer.mjs` (server xatolari); ataylab buzib sinalgan |

| **SINALMAGAN** | Sabab |
|---|---|
| Haqiqiy OpenAI bilan suhbat sifati va o'zbekcha ravonlik | Bu muhitda kalit va tarmoq yo'q; faqat ssenariyli soxta model bilan sinalgan |
| Haqiqiy ovoz: Chrome'ning `uz-UZ` aniqligi, mikrofon, ismlar (mahalla nomlari) | Mikrofon va real ovoz yo'q |
| **Haqiqiy iPhone** (WebKit, Chrome iOS): mikrofon ruxsati, WebAudio, yozuv | Bu muhitda iPhone yo'q: faqat Chromium'da iPhone belgisi bilan sinalgan. Telefonda bir marta sinab ko'rish kerak |
| Server STT (OpenAI/Groq `whisper`) o'zbekcha aniqligi | Idem |
| Haqiqiy o'zbekcha talaffuz | Qurilmada o'zbekcha ovoz bo'lmasa OpenAI nutq xizmati ishlaydi; haqiqiy talaffuz alohida eshitib tekshirilishi kerak |
| Vercel'da ko'p nusxali muhit | Mahalliy sinov bitta jarayonda |

## Ma'lum cheklovlar

- Hisobot yuklash (PDF/Excel) brauzerdagi mavjud hisobot tugmalari bilan ishlaydi:
  agent kerakli sahifani ochib, yuklashni boshlaydi; tayyorlashga bir necha soniya kerak.
- Yozish amallari hozir ikkita (administrator uchun: xabar navbatini qaytarish, xato jurnalini
  belgilash). Yangi amal qo'shish: `lib/agent/amallar.ts` ro'yxatiga bitta yozuv + test.
- «Bo'sh ish o'rni» kabi ba'zi sahifalar hudud filtrini qabul qilmaydi.
- Oylik limit taxminiy (bir necha xabar ortiqcha o'tishi mumkin).
- Agent qaror chiqarmaydi va uning matni tekshirilgan dalil emas — bu ko'rsatmada va ekranda yozilgan.
