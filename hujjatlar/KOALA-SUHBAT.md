# Koala: davomiy o‘zbekcha suhbat va ovozli javob

Koala savolga mos uzunlikda javob beradi: oddiy buyruq qisqa, sabab yoki reja
so‘ralganda yetarli izoh. «Shu mahalla-chi?», «Nega?», «Davom et» va hisobot turi
haqidagi javob oldingi mavzu bilan bog‘lanadi. Umumiy suhbat va ishni rejalashga
ham o‘zbekcha javob berishga sozlangan; tizim raqamlarini asboblardan oladi.

## Suhbat xotirasi

- Brauzer serverga oxirgi 16 ta matn xabarini yuboradi; bitta savol 1200 belgigacha.
- Serverdan olingan oxirgi 4 ta jamlama natijasi alohida imzolangan xotirada
  saqlanadi. Mahalla, raqamlar, manba va olingan vaqt keyingi savolda mavjud.
- Xotira faqat shu xodim va shu rolga tegishli, 30 daqiqada eskiradi.
  Mijoz o‘zgartirgan, boshqa xodimning yoki eski token ishlatilmaydi.
- Sahifa ochish, fuqaro qidiruvi va tasdiq amallari xotiraga kirmaydi.
  Oldingi amallar keyingi savolda qayta bajarilmaydi.
- Matn va xotira brauzer varag‘idagi `sessionStorage` da; bazaga suhbat matni
  yozilmaydi. «Suhbatni tozalash» ikkalasini ham o‘chiradi.
- Eski raqamni tushuntirishda xotira ishlatiladi; hozirgi holat yoki yangi mahalla
  so‘ralganda modelga asbobni qayta chaqirish buyurilgan. Bu model ko‘rsatmasi;
  haqiqiy savollar bilan sifatini tekshirish kerak.

## Ovozli suhbat

Qurilmada o‘zbekcha ovoz bo‘lsa avval shu ishlaydi. Bo‘lmasa va `OPENAI_API_KEY`
sozlangan bo‘lsa, `/api/agent/gapir` orqali ovoz olinadi. Kalit brauzerga berilmaydi.
Kirill matni lotinga o‘tadi, foiz va PDF kabi belgilar talaffuzga moslanadi;
modelga o‘zbekcha talaffuz va vazmin yordamchi ovozi haqida ko‘rsatma beriladi.

Oyna boshidagi quloqchin tugmasi ketma-ket ovozli suhbatni boshlaydi: Koala
javobini tugatgach yana tinglaydi. Jimlik yoki xato, oynani yopish, ilovaning
fonga o‘tishi va to‘xtatish bu rejimni tugatadi. Javob davomida mikrofonni bosib
gapni bo‘lish mumkin. Javob yonidagi «Qayta eshitish» tugmasi uni qayta o‘qiydi.

«Javobni to‘xtatish» kutilayotgan suhbat so‘rovini va ovozni bekor qiladi.
Kechikib kelgan javob va ovoz chiqarilmaydi. Mobil qurilmada sahifa ochish
buyrug‘i bajariladi; ovozli javob tugagach suhbat oynasi yopiladi. Ketma-ket
suhbat rejimida oyna ochiq qoladi.

Ovozli qism 2200 belgigacha: uzun javob tugallangan gapda to‘xtaydi va yozma
davomiga ishora qiladi. To‘liq javob ekranda qoladi. Audio bizning disk yoki
bazaga saqlanmaydi; ovoz yaratish uchun javob matni OpenAI’ga uzatiladi.

## Sozlamalar

| O‘zgaruvchi | Odatiy qiymat / ta’siri |
|---|---|
| `AGENT_MODEL` | `OPENAI_MODEL`/`GROQ_MODEL`, aks holda OpenAI uchun `gpt-4.1-mini` |
| `AGENT_JAVOB_TOKEN` | `2000`; ruxsat etilgan oraliq 256–4096 |
| `AGENT_TTS` | `1` ovoz xizmatini yoqadi; `OPENAI_API_KEY` ham kerak |
| `AGENT_TTS_MODEL` | `gpt-4o-mini-tts`; model topilmasa `tts-1` zaxirasi |
| `AGENT_TTS_VOICE` | `marin`; `.env.example` da boshqa ovozlar bor |

Suhbat modelini kuchaytirish uchun hisobda ochiq modelni `AGENT_MODEL` orqali
tanlash mumkin, masalan `gpt-4.1`. Kuchliroq model va server ovozi alohida
xarajat qiladi. Nutq uchun daqiqada 12 ta so‘rov va kunlik chegara mavjud.
Yangi baza migratsiyasi kerak emas. Asbob ruxsatlari va yozish amallari uchun
tasdiqlash tartibi saqlangan.

## Tekshirish

`npm run sinov:koala` xotira, davomiy savol, modelning moslashuvi, bekor qilish,
tarmoq/vaqt xatolari va nutq so‘rovini soxta provayder bilan tekshiradi.
Bu sinov `npm run sinov` ichiga ham kiritilgan. Agent sinovlari ikki xabarlik
haqiqiy xizmat oqimini va bekor qilinganda hisobning qaytarilishini tekshiradi;
HTTP sinovlari nutq uchun 401/403/400/503 holatlarini tekshiradi.

Haqiqiy OpenAI suhbat sifati, o‘zbekcha talaffuz va haqiqiy iPhone’da ovoz hali
shu muhitda sinalmagan. Deploydan keyin administrator Koalaga «Qorabuloq
mahallasida xatlov qanday?», «Nega?», «Endi nima qilamiz?» deb ketma-ket so‘rab,
javobni eshitishi va ekrandagi raqamlar bilan solishtirishi kerak.

Ovozli javobning mavjud chegarasi: har xodimga daqiqada 6, oxirgi 24 soatda 80 so‘rov. Koala va JARVIS suhbatlari alohida; JARVIS sozlamalari [JARVIS-ULASH.md](../JARVIS-ULASH.md) da. Ko‘rish rejimida yangi xotira va ovoz ishlaydi, yozish amali taklif qilinmaydi.
