# Hudhud — xodimlar uchun ovozli AI agent

**Kimga:** hokim, bandlik markazi mutaxassisi va rahbari, administrator.
Mahalla yettiligi a'zosiga ko'rinmaydi. «Ko'rish rejimi»da ham yo'q.

**Maskot va nom (2026-10-02 dan): Koala.** Egasi tanlagan koala rasmi (`public/maskot/`,
WebP 128/256 + PNG zaxira, shaffof fon; komponent — `src/components/agent/maskot.tsx`).
Foydalanuvchiga ko'rinadigan nom — **Koala (Коала)**: tugma, oyna sarlavhasi, salom
(«Мен Коаламан»), rad matnlari va tizim ko'rsatmasi. Avval maskot supurgichi qush (Hudhud)
edi; **ichki nomlar** (hujjat va fayl nomi `HUDHUD-AGENT`, voqea `hudhud:hisobot`, kalit
`hudhud:suhbat:`/`hudhud:ovozli`, `AgentFoydalanish`/`AgentAmali` jadvallari) saqlandi —
ularni o'zgartirish saqlangan suhbatlarni va hisobot tugmalari bilan aloqani buzardi.
Holat (eshitmoqda / o'ylamoqda / gapirmoqda) burchakdagi **belgi** bilan ko'rinadi (rang va
harakatsiz ham tushunarli); harakat faqat `prefers-reduced-motion: no-preference` va zaif
qurilma bo'lmaganda. Rasmni almashtirish: yangi fayllarni `public/maskot/koala-v2-*` deb
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

## Maxfiylik (halol)

**Modelga ketadi:** xodimning to'liq ismi (salomlashuv va murojaat uchun), uning roli,
bugungi sana, xodim yozgan/aytgan matn, asbob natijalari (**faqat sonlar, foizlar,
mahalla nomlari**).

**Modelga ketmaydi:** fuqaro ismi, telefoni, manzili, oila boshlig'i, murojaatchi nomi,
ro'yxat qatorlari. Testlar buni barcha rol va asboblar uchun tekshiradi
(`scripts/agent-sinov.ts`, «PII»).

**Teshik (yopib bo'lmaydi):** xodim ovozda yoki yozib fuqaro ismini aytsa, bu matn
provayderga ketadi. Oynada ogohlantirish turadi: «ro'yxat kerak bo'lsa `ro'yxatini
och` deng». Ro'yxatning o'zi esa xodimning o'z ekranida, o'z huquqi bilan ochiladi.

**Ovoz:** brauzerning ovoz tanishi (Chrome'da — Google serveri) yoki zaxira yo'l:
mikrofon yozuvi → bizning server → OpenAI/Groq. Yozuv **saqlanmaydi**, bazada faqat
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
| Ovoz | 900 soniya/kun/xodim (`AGENT_OVOZ_LIMIT`), bitta yozuv ≤ 60 soniya, ≤ 1,5 MB |
| Bir suhbat | ≤ 4 aylanish, ≤ 6 asbob chaqiruvi, ≤ 900 token/javob |
| Limit tugasa | Oddiy rejim: sahifani ochish va tuman holati ishlayveradi |
| Model yiqilsa | Band qilingan xabar qaytariladi (xodim zarar ko'rmaydi) |

Hisob: `AgentFoydalanish` jadvali (xodim, kun, so'rovlar, tokenlar). Matn yo'q.

## Sozlash

1. `OPENAI_API_KEY` Vercel'da bor (yoki `GROQ_API_KEY`). **Qo'shimcha hech narsa shart emas.**
2. Ixtiyoriy: `AGENT_MODEL` — o'zbekcha va asbob chaqirish uchun kuchliroq model; odatiy
   `gpt-4o-mini` arzon, lekin o'zbek tilida zaifroq bo'lishi mumkin.
   **Modelning haqiqiy sifati production'da, haqiqiy savollarda tekshirilishi kerak.**
3. Migratsiya `20261002100000_agent` build paytida o'zi qo'llanadi (faqat qo'shadi).
4. Tekshirish: administrator sifatida kiring → pastki o'ngdagi koala tugmasi → oyna tepasida
   «Sunʼiy intellekt · bugun yana N ta so'rov» ko'rinsa kalit ishlayapti; «Oddiy rejim» desa kalit yo'q.

## Nima SINALGAN va nima SINALMAGAN

| Sinalgan (mahalliy) | Qanday |
|---|---|
| Asboblar, ruxsat, URL xavfsizligi, PII, limit (atomar), tasdiq (bir marta), zaxira rejim, til matnlari | `scripts/agent-sinov.ts` + mutatsiya sinovi |
| API: kirishsiz 401, mahalla xodimi 403, tekshiruv 400, chegara 429, tasdiq oqimi | `scripts/http-regressiya.ts` (13a–13i) |
| Brauzer: salom ismi bilan, javob, manba, sahifa ochilishi, tasdiq kartasi, mobil, lotin/kirill | Playwright; ovoz tanish **soxta** (test dublyor) bilan |

| **SINALMAGAN** | Sabab |
|---|---|
| Haqiqiy OpenAI bilan suhbat sifati va o'zbekcha ravonlik | Bu muhitda kalit va tarmoq yo'q; faqat ssenariyli soxta model bilan sinalgan |
| Haqiqiy ovoz: Chrome'ning `uz-UZ` aniqligi, mikrofon, ismlar (mahalla nomlari) | Mikrofon va real ovoz yo'q |
| Server STT (OpenAI/Groq `whisper`) o'zbekcha aniqligi | Idem |
| Qurilmada o'zbekcha ovoz bilan javobni o'qish | Ko'p qurilmalarda o'zbekcha ovoz YO'Q — shunda javob faqat yoziladi (ataylab: rus ovozi o'zbekcha matnni buzib o'qiydi) |
| Vercel'da ko'p nusxali muhit | Mahalliy sinov bitta jarayonda |

## Ma'lum cheklovlar

- Hisobot yuklash (PDF/Excel) ovozli buyruq bilan **ishlamaydi**: hisobot tugmalari brauzerda
  yaratadi. Agent «tahlil paneli»ni ochadi, tugmani siz bosasiz.
- Yozish amallari hozir ikkita (administrator uchun: xabar navbatini qaytarish, xato jurnalini
  belgilash). Yangi amal qo'shish: `lib/agent/amallar.ts` ro'yxatiga bitta yozuv + test.
- «Bo'sh ish o'rni» kabi ba'zi sahifalar hudud filtrini qabul qilmaydi.
- Oylik limit taxminiy (bir necha xabar ortiqcha o'tishi mumkin).
- Agent qaror chiqarmaydi va uning matni tekshirilgan dalil emas — bu ko'rsatmada va ekranda yozilgan.
