# Koala → Microsoft JARVIS ulanishi

Holat: ulanish kodi tayyor, haqiqiy JARVIS serveriga ulanmagan, production o‘zgarmagan.
Platforma asosi: 199425a. Ushbu qo‘shimcha oldingi Koala 70f6244 o‘zgarishidan keyin qo‘llanadi.

## Nima qo‘shildi

Koala oynasida ikki rejim: Koala (platforma va umumiy suhbat) hamda JARVIS. JARVIS server sozlamalari bo‘lmasa uning tugmasi o‘chiq. Bu sozlanganlik belgisi, server ishlayotganini kafolatlaydigan health-check emas.

Ikki rejim tarixi alohida filtrlanadi. Koala rejimidagi suhbat JARVISga avtomatik yuborilmaydi. JARVIS rejimidagi foydalanuvchi kiritgan matn va shu rejimning oxirgi sakkiz xabari serverga ketadi. JARVISga platforma bazasi, sessiya, fuqaro kartasi yoki platforma amallarini bajarish huquqi berilmaydi. Foydalanuvchi o‘zi yozgan shaxsiy ma’lumotni to‘liq aniqlaydigan DLP filtri yo‘q; UI’da ogohlantirish bor.

Server API: POST /api/agent/jarvis → faqat sozlangan gateway’dagi POST /hugginggpt. Contract: { messages: [{role, content}] } → { message: string }. Brauzerdan api_key/api_endpoint/system role yuborish rad etiladi. Microsoft/OpenAI/Hugging Face kalitlari Next.js’dan JARVISga yuborilmaydi; ular JARVIS serverida sozlanadi.

Rollar mavjud Koala rollari bilan bir xil. Daqiqada 3 so‘rov va mavjud kunlik/oylik AI so‘rov hisobi ishlaydi. Bitta JARVIS so‘rovi ichida bir nechta model chaqirilishi mumkin: so‘rov limiti xarajatning qat’iy pul chegarasi emas. Provayder hisobida alohida sarf chegarasi qo‘ying.

40 soniyalik umumiy kutish, cheklangan body hajmi, redirect taqiqi, maxfiy upstream xatolarini yashirish qo‘shildi. Avtomatik qayta urinish yo‘q. Timeout JARVIS ichidagi boshlangan vazifani bekor qilishni kafolatlamaydi; shu sabab limit avtomatik qaytarilmaydi.

## Repo haqida tekshirilgan faktlar

O‘rganilgan Microsoft commit: 7624cf388b47334ff8a0868e7d862dde18cfda86.
- https://github.com/microsoft/JARVIS/blob/7624cf388b47334ff8a0868e7d862dde18cfda86/README.md
- https://github.com/microsoft/JARVIS/blob/7624cf388b47334ff8a0868e7d862dde18cfda86/hugginggpt/server/awesome_chat.py
- https://github.com/microsoft/JARVIS/blob/7624cf388b47334ff8a0868e7d862dde18cfda86/hugginggpt/server/configs/config.lite.yaml

README eski server/ yo‘llarini ko‘rsatadi; hozir kod hugginggpt/server/ ichida. Bu tadqiqot loyihasi: ko‘rsatilgan konfiguratsiya va kutubxona pinlari eski avlodga tegishli. Lite konfiguratsiya masofaviy Hugging Face modellariga tayanadi; endpointlarning hozirgi mavjudligi bu ishda tekshirilmagan. README’dagi buyruqlarni production’da tekshirmasdan bajarmang.

/hugginggpt marshrutida gateway token tekshiruvi yo‘q; u so‘rovdan api_key va api_endpoint ham qabul qiladi. Uni ommaga to‘g‘ridan-to‘g‘ri ochmang. Namunaviy HTTPS gateway konfiguratsiyasi integrations/jarvis/ ichida. U alohida HTTPS server blokiga kiritiladi, sertifikat va haqiqiy tasodifiy tokenni administrator o‘rnatadi.

Upstream kod foydalanuvchi so‘rovi/natijalarini logger va record_case orqali qayd etadi. Mahalliy debug=false bunga to‘liq maxfiylik kafolati emas. Ishga tushirishdan oldin matnlarni loglash/saqlashni o‘chirish yoki tasdiqlangan saqlash siyosatini joriy qilish kerak. Workerda platforma DB kalitlari bo‘lmasin. Tashqi URL’lar bilan ishlaydigan model vazifalari sabab worker tarmog‘idan ichki tizimlar/metadata xizmatlariga kirishni cheklang. Model allowlisti, vazifa soni/parallelizm limiti va provider byudjeti upstream muhitida o‘rnatilishi kerak; bu patch ularni JARVIS ichiga joriy qilmaydi.

## Kerakli sozlamalar

Next.js serverida:
- JARVIS_ENABLED=1
- JARVIS_BASE_URL=https://sizning-jarvis-gateway-domeningiz
- JARVIS_GATEWAY_TOKEN=<uzun-tasodifiy-maxfiy-token>

JARVIS_BASE_URL faqat origin: path/query/userinfo bo‘lmaydi. Production’da HTTPS talab qilinadi. Kalitlarni NEXT_PUBLIC o‘zgaruvchilariga yozmang va chatga yubormang.
JARVIS Python xizmati alohida server/containerda ishlashi kerak; Next.js/Vercel funksiyasiga model serverini joylashtirish ko‘zda tutilmagan. OpenAI va Hugging Face hisoblari/model ruxsatlari JARVIS serverida sozlanadi va real so‘rov bilan tekshiriladi. Hozir server domeni va konfiguratsiyasi berilmaganligi uchun real ulanish bajarilmagan.

## Nimalar kafolatlanmaydi

JARVIS barcha savolga to‘g‘ri javob berishni, o‘zbekchani mukammal bilishni yoki yangiliklarni internetdan tekshirishni o‘z-o‘zidan ta’minlamaydi. Ushbu adapterda mustaqil web-search yo‘q. O‘zbekcha javob talabi promptga qo‘shilgan va alifbo moslashtiriladi, lekin semantik til sifati real model bilan baholanishi kerak.

Bu birinchi ulanish matnli savol/javob uchun. Rasm/audio yuklash, generatsiya natijalarini xavfsiz fayl proksisi orqali chiqarish, uzoq ishlar uchun job queue/polling bu patchga kirmaydi. Matnda kelgan tashqi natijalar avtomatik yuklanmaydi yoki bajarilmaydi. Murakkab uzoq vazifalar uchun keyingi bosqichda ish navbati kerak.

## Patchni qo‘llash

ZIP ichidagi:
1. 01-Koala-yangilanish.patch — oldingi Koala o‘zgarishlari hali qo‘llanmagan bo‘lsa.
2. 02-JARVIS-ulash.patch — JARVIS qo‘shimchasi.

Alohida branchda har bir kerakli patch uchun avval git apply --check, so‘ng git apply bajaring. Oldingi Koala allaqachon qo‘llangan bo‘lsa 01 ni qayta qo‘llamang. Konfliktlarni majburan bosib yubormang. npm ci va Prisma generate’dan keyin stagingdagi mavjud lint/typecheck/test/build jarayonini bajaring. Production DB’dan test bazasi sifatida foydalanmang.

## Sinov holati

- 8 adapter testi: config, origin, request schema, upstream contract, noto‘g‘ri javob, body hajmi, bekor qilish, sekin body timeout.
- 8 API ssenariysi: auth, rol, o‘chiq xizmat, noqonuniy parametr, tezlik limiti, byudjet, muvaffaqiyat, maxfiy xato.
- Tashqi server/auth/baza sinovlarda sun’iy almashtirilgan. Bu Microsoft JARVIS bilan end-to-end sinov emas.
- Oldingi Koala ovoz testlari regressiya uchun qayta bajariladi.
- To‘liq typecheck/build, haqiqiy server va vizual brauzer QA hali tasdiqlanmagan.

### Koala va JARVIS qaysi panellarda ko'rinadi

- **Rollar:** hokim, bandlik markazi (mutaxassis va rahbar) va administrator (`AGENT_ROLLARI`, `src/lib/agent/ruxsat.ts`). Mahalla xodimi (YETTILIK) uchun Koala ATAYLAB yo'q.
- **Sahifalar:** menyudagi HAR bir bo'lim, kompyuterda ham, telefonda ham. Kirish, parolni almashtirish va devor ekrani (`/tablo`) sahifalarida yo'q.
- **Ko'rish rejimi:** administrator hokim yoki bandlik rahbari "ko'zi bilan" qaraganda ham Koala ko'rinadi, ya'ni hokimga qanday ko'rinsa, shunday. Lekin u FAQAT O'QIYDI: salom va hisob administratorning haqiqiy hisobiga tegishli, yozish amali taklif qilinmaydi, tasdiqlash yo'li (`/api/agent/tasdiq`) yopiq turadi. Savol-javob yo'llari (`suhbat`, `ovoz`, `gapir`, `jarvis`) `korish-rejimi.ts` dagi tor ro'yxat va yo'lning o'zidagi `korishdaOqish: true` kaliti bilan ochilgan: ikkalasi kelishmasa yozish to'siladi.
- **JARVIS:** Koala oynasidagi ikkinchi tab. Server sozlanmagan bo'lsa tab "JARVIS · уланмаган" deb o'chiq turadi; Koala bundan ta'sirlanmaydi.
- **Tekshirish:** `npm run sinov:brauzer-panellar` — har bir rol uchun menyudagi barcha sahifalarda (kompyuter va telefon) Koala tugmasi bor, ekran ichida, boshqa element bilan yopilmagan va rasmi yuklanganini, ko'rish rejimida esa oyna ishlashini tekshiradi.
- **Koala ko'rinmasa:** (1) hisob roli hokim/bandlik/administrator ekani; (2) sayt oxirgi versiyada ekani (Vercel → Deployments, oxirgi commit `Ready`); (3) brauzer keshi (qattiq yangilash). Yana ko'rinmasa, qaysi hisob va qurilmada ekanini ko'rsatuvchi skrinshot kerak.

### Brauzer sinovi (o'rnatishda qo'shildi)

`npm run sinov:brauzer-jarvis` (qo'lda, Chromium, faqat mahalliy baza): skript ichidagi SOXTA shlyuz bilan 10 ta tekshiruv (JARVIS yoqilgan) va 3 ta (o'chiq). Tekshiriladi: ikki rejim tugmasi, JARVIS sozlanmagan bo'lsa tugma o'chiq va API 503; shlyuzga faqat `{ messages }`, `Bearer` token, cookie yo'q, birinchi xabar `system`; Koala matni JARVISga ketmaydi; rejimlar tarixi aralashmaydi; daqiqada 3 so'rovdan keyin "band"; shlyuz 500 qaytarsa matn sizmaydi va Koala ishlayveradi; telefon/qorong'i mavzu. Bu haqiqiy Microsoft JARVIS bilan sinov EMAS.

Pilotda o‘zbekcha oddiy savol, kontekstli davom, model xatosi, bo‘sh HF endpoint, gateway token xatosi, timeout va xizmat o‘chirilgan holat tekshirilsin. JARVIS ishlamasa Koala/xatlov ishlashda davom etishi shart.
Qaytarish: JARVIS_ENABLED ni o‘chirish; zarur bo‘lsa JARVIS feature commitini revert qilish. DB migratsiyasi yo‘q.
