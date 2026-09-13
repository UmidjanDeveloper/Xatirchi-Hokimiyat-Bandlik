# Xatirchi tumani — Bandlik platformasi

Navoiy viloyati Xatirchi tumani hokimligi uchun **aholi bandligini
ta'minlash va kambag'allikni qisqartirish** bo'yicha xatlov va tahlil
tizimi.

> **Asosiy g'oya:** hokim «nechta ishsiz bor» degan raqamni allaqachon
> biladi — svod jadvalida 3 345 ta. Unga kerak bo'lgani: **shu 3 345
> tadan nechtasi qaysi bosqichda turgani va qaysi mahalla orqada
> qolayotgani.**

Platforma so'rovnoma emas, **ish yuritish tizimi**: har bir ishsiz
fuqaro aniqlanishdan ishga joylashishgacha bo'lgan yo'lni bosib o'tadi
va har bosqichda kim javobgar ekani yozib boriladi.

---

## Mundarija

- [Nima uchun bu tizim](#nima-uchun-bu-tizim)
- [Ishlash zanjiri](#ishlash-zanjiri)
- [Bo'sh ish o'rni qanday ishlaydi](#bosh-ish-orni-qanday-ishlaydi)
- [Ikki alifbo](#ikki-alifbo)
- [Rollar va huquqlar](#rollar-va-huquqlar)
- [Asosiy imkoniyatlar](#asosiy-imkoniyatlar)
- [Texnologiyalar](#texnologiyalar)
- [O'rnatish](#ornatish)
- [Supabase va Vercel](#supabase-va-vercel)
- [Xavfsizlik](#xavfsizlik)
- [Loyiha tuzilishi](#loyiha-tuzilishi)

---

## Nima uchun bu tizim

Tumanda uchta hujjat bilan ishlanadi:

| Hujjat | Muammosi |
|---|---|
| Kambag'al oilalarni xatlovdan o'tkazish so'rovnomasi (11 bo'lim) | Qog'ozda — jamlash uchun har MFY dan yig'ib, qo'lda hisoblash kerak |
| Ishsizlarni aniqlash so'rovnomasi | Xatlov bilan bog'lanmagan — kim bilan ish qilinayotgani ko'rinmaydi |
| Svod jadvali (70 MFY, 31.08.2026) | Statik — bugungi holatni ko'rsatmaydi |
| Tasdiqlangan MFY raislari ro'yxati | Qog'ozda — tizimga ulanmagan |

> **Eslatma.** Ikki manba xonadon sonida farq qiladi (37 ta MFY da,
> ba'zilarida 200 dan ortiq). Platformada **tasdiqlangan ro'yxat**
> olingan, chunki qamrov foizining maxraji aynan shu raqam va u
> rasmiy hujjatga mos kelishi kerak.

Platforma uchalasini bitta zanjirga bog'laydi va svod jadvalidagi
raqamlarni **maxraj** sifatida ishlatadi.

**Maxrajning ahamiyati.** «38 ta xonadon xatlovdan o'tdi» — bu hokim
uchun ma'nosiz raqam. «506 tadan 38 tasi (7,5%)» — bu ma'noli. Aynan
shu sababli svod jadvali platformaga import qilingan.

---

## Ishlash zanjiri

```
   MAHALLA          XONADON            ISHSIZ FUQARO        CHORA-TADBIR
   (baza)     ──▶   (xatlov)     ──▶   (shaxsiy anketa) ──▶ (topshiriq)

 70 ta MFY         11 bo'lim          Aniqlandi            Muammo
 svod jadvali      yettilik           Suhbat o'tkazildi    Sabab
 raqamlari         a'zosi             Taklif berildi       Yechim
 = MAXRAJ          to'ldiradi         Joylashtirildi  ◀─┐  Mas'ul tashkilot
                                      Tasdiqlandi       │  Muddat
                                                        │
                                   BO'SH ISH O'RNI ─────┘
                                   (e'lon)

                                   Korxona · lavozim
                                   N ta o'rin
                                   band / bo'sh
```

**Bog'lanish nuqtasi.** Xonadon anketasining I bo'limida «3 ta ishsiz»
deb yozilgan bo'lsa, uchalasining ham ismini kiritmaguncha forma
yubormaydi. Ishsizlar soni faqat raqam bo'lib qolsa, bandlik markazi
kim bilan ishlashini bilmaydi va butun xatlov qog'ozbozlikka aylanadi.

---

## Bo'sh ish o'rni qanday ishlaydi

Savol: **bandlik rahbari e'lon qo'ydi — keyin nima bo'ladi?**

```
1. E'LON            rahbar/mutaxassis «Bo'sh ish o'rinlari» ga kiritadi
                    korxona · lavozim · yo'nalish · N ta o'rin · maosh · talablar
        │
        ▼
2. NOMZODLAR        e'lon sahifasi mos fuqarolarni O'ZI topadi va
                    moslik bali bo'yicha tartiblaydi (0–100%)
                    har bal yonida «nega» — sabablari ochiladi
        │
        ▼
3. JOYLASHTIRISH    mutaxassis «Joylashtirish» ni bosadi va sanani tasdiqlaydi
                    ish joyi va lavozim E'LONDAN ko'chiriladi, qo'lda terilmaydi
        │
        ▼
4. O'RIN BAND       fuqaro «Joylashtirildi» holatiga o'tadi
                    e'londa bo'sh o'rin bittaga kamayadi
                    oxirgi o'rin to'lsa — e'lon AVTOMATIK yopiladi
        │
        ▼
5. BEKOR QILISH     ishga chiqmasa — «Joylashtirishni bekor qilish»
                    o'rin bo'shaydi, e'lon to'lgani uchun yopilgan bo'lsa
                    qayta ochiladi; sabab yozilsa fuqaro «Rad etdi» bo'ladi
```

**Moslik nimaga qarab hisoblanadi.** Faqat TEGISHLI mezonlar
sanaladi — e'lon haydovchilik guvohnomasini talab qilmasa,
guvohnomasi yo'qligi uchun hech kim jazolanmaydi:

| Mezon | Nimaga qaraladi |
|---|---|
| Kasb | mutaxassisligi, xohlagan ishi, avvalgi ish joyi, o'rganmoqchi kasbi |
| Yo'nalish | e'londagi yo'nalish fuqaro istagiga to'g'ri keladimi |
| Maosh | kutgan maoshi taklifdan oshadimi |
| Guvohnoma | faqat e'lon talab qilsa — va aynan qaysi toifa (CE ≠ C + E) |
| Ma'lumoti | faqat e'londa «oliy ma'lumot» yozilgan bo'lsa |
| Tayyorligi | to'liq / qisman / uy sharoitida |
| Mahalla | shu mahalladanmi (qatnov masalasi) |
| Bandlik istagi | yollanma ishni xohlaydimi yoki YaTT ochmoqchimi |

Taqqoslash **fonetik kalit** orqali: «пайвандчи», `payvandchi` va
`Payvandchi (2-razryad)` bitta kalitga tushadi.

**To'siq** alohida ko'rsatiladi va nomzodni ro'yxat oxiriga tushiradi,
lekin uni yashirmaydi: nafaqa yoshi, mehnatga layoqatli yoshdan
kichiklik, allaqachon boshqa e'longa joylashganlik. Qaror odamniki.

**Ikki mutaxassis bir vaqtda bir o'ringa ikki odam joylashtira
olmaydi.** Joylashtirish `SERIALIZABLE` tranzaksiyada bajariladi:
ikkinchisi rad etiladi va «qayta urinib ko'ring» xabarini oladi.

Band o'rinlar soni **alohida hisoblagichda saqlanmaydi** — har safar
bog'lanishlardan sanaladi. Hisoblagich ertami-kechami haqiqatdan
chetga chiqadi; sanash bir oz qimmatroq, lekin har doim to'g'ri.

---

## Ikki alifbo

Butun sayt **lotin va kirill** yozuvida ishlaydi. Yuqori o'ng
burchakdagi tugma bilan bir bosishda almashtiriladi — anketa
savollaridan tortib diagramma yorliqlarigacha hammasi o'giriladi.

Tanlov **cookie**da saqlanadi, ya'ni sahifa serverdayoq to'g'ri
alifboda chiziladi. Bu muhim: aks holda sahifa avval kirillda
ko'rinib, keyin lotinga sakrardi.

**Nega ikkita matn ro'yxati emas?** Chunki ikkita ro'yxat muqarrar
bir-biridan uzoqlashadi: kimdir kirill matnni tuzatadi, lotinini
unutadi va bir oydan keyin ikki alifboda ikki xil savol turadi.
Shuning uchun matn faqat kirillda yoziladi, lotin ko'rinishi esa
**o'girish (transliteratsiya)** orqali hosil qilinadi — bitta
manba, bitta haqiqat.

Qo'shimcha foyda: o'girish **dinamik matnga ham** ishlaydi. Mahalla
nomi, raisning familiyasi, xodim kiritgan kasb nomi — hammasi
tanlangan alifboda ko'rinadi.

O'girish o'zbek imlosining nozik joylarini biladi:

| Kirill | Lotin | Qoida |
|---|---|---|
| Ерма | Yerma | «е» so'z boshida — «ye» |
| Бек | Bek | «е» undoshdan keyin — «e» |
| субъект | subyekt | «ъ» yumshoq unlidan oldin tushadi |
| маънавият | ma'naviyat | «ъ» qolgan holatda — tutuq belgisi |
| Хўжақўрғон | Xo'jaqo'rg'on | ў → o', қ → q, ғ → g' |

---

## Rollar va huquqlar

Har xodimga **alohida login va parol** beriladi. Umumiy parol bu yerda
yaramaydi: har yozuvning ostida «suhbatni kim o'tkazdi», «xatlovni kim
qildi» degan javob turishi kerak.

**Har fuqaroga login kerak emas.** Mahalla darajasida bitta hisob
bo'ladi — **MFY raisi**. Tuman hokimligi tasdiqlagan ro'yxatdagi 70
ta rais tizimga avtomatik kiritilgan: login `mfy_<mahalla nomi>`
(masalan `mfy_chechakota`), boshlang'ich parolni administrator
beradi va u birinchi kirishda majburiy almashtiriladi.

Parol yo'qolsa, administrator boshqaruv panelidan yangisini
tayinlaydi — eski parolni bilish shart emas.

Yettilikning qolgan a'zolariga alohida hisob berish ham mumkin edi,
lekin bu 490 ta login degani va ularni boshqarish hokimiyat
xodimining butun kunini olardi. Rais esa rasmiy ro'yxatda turadi —
javobgarligi hujjat bilan belgilangan.

| Rol | Ko'radi | Qiladi |
|---|---|---|
| **Mahalla yettiligi a'zosi** | Faqat **o'z mahallasi** | Xonadonlarni xatlovdan o'tkazadi |
| **Bandlik markazi mutaxassisi** | Butun tuman | Suhbat, taklif, joylashtirish |
| **Bandlik markazi rahbari** | Butun tuman | + operatsion panel va tahlil |
| **Tuman rahbariyati (hokim)** | Butun tuman | Faqat tahlil paneli — o'zgartirmaydi |
| **Administrator** | Hammasi | Xodimlar, loginlar, audit jurnali |

Yettilik a'zosi uchun mahalla **majburiy**: u bo'sh bo'lsa, xodim butun
tumandagi oilalar ma'lumotini ko'rib qolardi. Shuning uchun tekshiruv
foydalanuvchi yaratish paytida turadi.

---

## Asosiy imkoniyatlar

### Xatlov anketasi (mahalla yettiligi uchun)

- **11 bo'lim, 7 qadam** — mehnat va bandlik, tadbirkorlik va kredit,
  daromad, bolalar ta'limi, sog'liq, uy-joy, ijtimoiy himoya,
  hujjatlar, tomorqa-chorva, tadbirkorlik subyektlari, xulosa
- **Arifmetika tekshiruvi** — bu eng muhim farq. Kun oxirida
  yigirmanchi xonadonda shoshib «5 ta bola, 9 ta mehnatga layoqatli,
  jami 12 kishi» deb yozilsa, forma yubormaydi va qaysi ikki raqam
  to'g'ri kelmayotganini aniq ko'rsatadi:

  ```
  Bolalar (5) va mehnatga layoqatlilar (9) jami 14 —
  bu xonadondagi 12 kishidan ko'p
  ```

  Xato ikki darajaga bo'lingan: **XATO** yuborishni to'xtatadi (qism
  butundan katta bo'lgan holatlar), **OGOHLANTIRISH** faqat ko'rsatadi
  (nol daromad, maktabga bormaydigan bola). Har g'alati raqamni
  bloklasak, xodim haqiqiy holatni kirita olmay soxta raqam yozib
  qutulardi.

- **Qoralama** — har o'zgarish brauzer xotirasiga yoziladi. Telefon
  o'chsa yoki xonadon egasi band bo'lsa, xodim to'ldirgan joyidan
  davom etadi
- **Oflayn rejim** — hovlida aloqa yo'q bo'lsa, ma'lumot yo'qolmaydi.
  Xotira to'lgan bo'lsa **rost xabar** chiqadi: soxta «saqlandi»
  ko'rsatsak, xodim xonadondan ketib, yo'qotishni kechqurun bilib
  qolardi
- **Takror xatlov tekshiruvi** — bir xonadonni ikki marta kiritib
  bo'lmaydi. Manzil turlicha yozilsa ham aniqlanadi:
  `Navoiy ko'chasi 12-uy` = `navoiy kochasi 12 uy`
- **Kirill yorliqlar** — xodim qo'lidagi rasmiy qog'oz kirillda va
  ikkisini yonma-yon qo'yib to'ldiradi

### Ishsiz fuqaro anketasi (bandlik markazi uchun)

- Docx anketasining to'liq raqamli ko'rinishi: 18 shaxsiy maydon,
  6 ta bandlik taklifi, xulosa
- **Holat amaldan kelib chiqadi**, formadan emas: suhbat anketasi
  to'ldirilsa → «suhbat o'tkazildi», taklif belgilansa → «taklif
  berildi», ish joyi yozilsa → «joylashtirildi». Holatni qo'lda
  tanlaydigan qilsak, xodim anketani to'ldirmasdan «joylashtirildi»
  deb belgilab qo'yishi va hokim panelidagi eng muhim raqam yolg'on
  chiqishi mumkin edi

### Aloqa uzilganda — oflayn navbat

Xatlov **hovlida, xonadon eshigi oldida** to'ldiriladi. Xatirchi
tumanining chekka mahallalarida aloqa uzilib turadi.

Ikkita alohida himoya:

1. **Qoralama** — har o'zgarishda brauzer xotirasiga yoziladi.
   Telefon o'chsa yoki sahifa yopilsa, xodim to'ldirgan joyidan
   davom etadi.
2. **Navbat** — tayyor xatlov yuborilayotganda aloqa uzilsa,
   u navbatga tushadi va **aloqa tiklanishi bilan o'zi ketadi**.
   `/xatlov` sahifasining tepasida «N ta xatlov hali yuborilmagan»
   degan chiziq turadi; navbat bo'sh bo'lsa — chiziq ko'rinmaydi.

Ilgari xodimga «keyin qayta yuboring» deb yozilardi va qayta
yuborishni **u eslab qolishi** kerak edi: anketani qayta ochib,
oxirigacha o'tib, yana tugmani bosish. Kun oxirida, o'nta
xonadondan keyin, buni hech kim eslamaydi.

**Takror yuborishdan qo'rqmaydi.** Server javobi kelishidan oldin
aloqa uzilsa, yozuv aslida saqlangan bo'lishi mumkin. Qayta
yuborilganda server `409` qaytaradi («bu xonadon allaqachon
xatlovdan o'tgan») — chunki mahalla + manzil + oila boshlig'i
bo'yicha yagonalik chegarasi bor. Navbat buni **muvaffaqiyat**
deb hisoblaydi va yozuvni chiqaradi.

Ma'lumotida xato bo'lgan yozuv **o'chirilmaydi** — bu xodimning
bir soatlik ishi. U navbatda qoladi, besh urinishdan keyin
«e'tibor talab qiladi» deb belgilanadi va qolganlarini to'sib
qo'ymaydi.

### Xonadon bo'yicha xulosa va tavsiyalar

Anketaning 11 bo'limi xodimga «nima bor» deydi. Xulosa bloki
«**nimadan boshlash kerak**» deydi: shoshilinch → muhim →
imkoniyat tartibida, har biri raqamli dalil bilan.

Ikkita manba, bitta shakl:

1. **Qoida** — anketadagi chegaralar. Hujjat to'liqmi, maktab
   yoshidagi bola maktabdami, jon boshiga daromad eng kam
   iste'mol xarajatidan yuqorimi, ishsizlik 12 oydan oshdimi.
   Kalit va internet talab qilmaydi, natijasi takrorlanadi.
2. **AI** — Claude. Qoida ko'rmaydigan bog'lanishni topadi:
   «oilada hunarmand ham, yer ham bor — ikkisi birga ko'proq
   natija beradi».

AI kaliti qo'yilmagan bo'lsa, tizim **to'liq ishlaydi** —
qoida bo'yicha xulosa chiqadi. Matn ostida manba har doim
ko'rsatiladi: o'quvchi uni kim yozganini bilishi shart.

**Qaysi AI ishlatiladi.** Ikkitasi qo'llab-quvvatlanadi va
muhit o'zgaruvchisiga qarab o'zi tanlanadi:

| O'zgaruvchi | Provayder | Kalit qayerdan |
|---|---|---|
| `GEMINI_API_KEY` | Google Gemini | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) — bepul darajasi bor |
| `ANTHROPIC_API_KEY` | Anthropic Claude | [console.anthropic.com](https://console.anthropic.com) — pullik |

Ikkalasi ham qo'yilsa Gemini ishlaydi; aniq tanlash uchun
`AI_PROVAYDER="gemini"` yoki `"anthropic"`. Model nomini
`GEMINI_MODEL` / `ANTHROPIC_MODEL` bilan almashtirish mumkin —
model nomlari vaqt o'tishi bilan o'zgaradi va buning uchun kodga
tegish shart emas.

Ikkala provayder ham **bitta eshikdan** o'tadi (`src/lib/ai.ts`),
shuning uchun yuboriladigan ma'lumot ikkisida ham bir xil:
faqat sonlar va katalog qiymatlari.

Kalitni qo'ygach **albatta tekshiring**. Ikki yo'l bor:

**Brauzerdan** — terminal kerak emas:
`Boshqaruv` → **«Sun'iy intellekt ulanishi»** → **Tekshirish**.
Faqat administrator ko'radi. Kalitning o'zi hech qachon
qaytarilmaydi — sahifa suratga olinishi mumkin, shuning uchun
faqat niqoblangan boshi va oxiri ko'rsatiladi.

**Terminaldan:**

```bash
npm run ai-tekshir
```

Ikkalasi ham bir xil ishni qiladi: qaysi modellar kalitingizga
ochiqligini ro'yxatlaydi, sinov so'rovi yuboradi va xatoni
tushunarli qilib aytadi (kalit noto'g'ri / model topilmadi /
kunlik limit tugadi).

Bu tekshiruv kerak, chunki ilova kalit noto'g'ri bo'lsa ham
**ishlayveradi** — xulosa jimgina qoida bo'yicha hisoblanadi va
xato hech qayerda ko'rinmaydi.

> **Diqqat.** Bepul (AI Studio) darajasidagi Gemini kalitida
> Google yuborilgan ma'lumotdan o'z xizmatlarini yaxshilash
> uchun foydalanishi mumkin — pullik darajada bunday emas.
> Bizda faqat jamlangan sonlar ketadi (ism, manzil, telefon
> yo'q), lekin davlat tizimi uchun bu farqni bilib turish
> kerak. Amaldagi shartlarni Google sahifasidan tasdiqlang.

Xulosa **bir marta tayyorlanib bazaga yoziladi**, har ochilganda
qayta hisoblanmaydi: bir xil anketaga har safar boshqa tavsiya
chiqsa, xodim qaysi biriga amal qilishni bilmay qolardi. Anketa
o'zgarsa — «Yangilash» tugmasi.

**AI ga nima yuboriladi va nima YUBORILMAYDI.** Yuboriladi:
sonlar va ro'yxatdan tanlangan katalog qiymatlari (uy holati, suv
manbai, chorva turi), hamda kasb nomlari. Yuborilmaydi: oila
boshlig'ining ismi, manzil, telefon, ishsizlarning F.I.Sh.si,
nogiron va parvarishga muhtoj shaxslar ro'yxati, **va xodim yozgan
har qanday erkin matn** — izohlar, sabablar, «boshqa muammolar»,
umumiy xulosa.

Erkin matn butunlay chiqarib tashlanganining sababi oddiy: unga
xodim nima yozganini oldindan bilib bo'lmaydi. «Izoh» maydoniga
«qo'shnisi Karimov aytishicha...» deb yozilsa, ism tashqariga
chiqib ketardi. Katalog qiymati esa har doim ro'yxatdan tanlangan.

Yuboriladigan matn **bitta funksiyada** — `dalilnomaYasa()` —
tuziladi, shuning uchun «nima yuborildi» degan savolga javob
berish uchun shu funksiyani o'qish kifoya. `npm run sinov` buni
har safar tekshiradi.

### Hokim paneli

- **Voronka** — 5 bosqichning har birida nechta odam turgani, svod
  jadvalidagi 3 345 taga nisbatan foizda
- **70 MFY qamrov reytingi** — kim orqada qolgan
- **Kechikkan topshiriqlar mas'ul tashkilot kesimida** — eng kuchli
  hisobdorlik quroli
- **Byudjet talabi** — kredit-subsidiya so'rovi yo'nalishlar bo'yicha,
  keyingi yil rejasiga to'g'ridan-to'g'ri kiradi
- **Tavsiyalar** — har biri **raqamli dalil bilan**:

  ```
  Uyshun MFY — xatlov orqada
  Ro'yxatdagi 51 ta ishsizdan 12 tasi xatlovdan o'tgan (24%).
  Qolgan 39 tasi hali ko'rilmagan.
  ```

  Tavsiya yo'q bo'lsa — bo'sh ro'yxat qaytadi. Sun'iy tavsiya o'ylab
  topilmaydi: bir marta «shunchaki to'ldirish uchun» yozilgan tavsiya
  butun panelga bo'lgan ishonchni yo'qotadi

### Bandlik markazi operatsion paneli

- **Navbat** — suhbat kutayotganlar va taklif kutayotganlar
- **Moslashtirish taxtasi** — bo'sh ish o'rni ↔ shu kasbda ishlashni
  istagan fuqarolar. Taqqoslash fonetik kalit orqali: «пайвандчи» va
  `payvandchi` bitta kalitga tushadi. Nomzodlar e'lon sahifasidagi
  bilan **bir xil** moslik hisobidan tartiblanadi — ikki joyda ikki
  xil tartib chiqsa, mutaxassis qay biriga ishonishni bilmay qolardi
- **Kurs ochish taklifi** — talab 15 tadan oshgan kasblar

### Chora-tadbirlar

Muammo → sabab → yechim → mas'ul tashkilot → muddat → holat.

Topshiriq **yopiladi ham**: ro'yxatning o'zida holat tugmalari
turadi (Kutilmoqda / Bajarilmoqda / Bajarildi / Bekor qilindi).
«Bajarildi» va «Bekor qilindi» da **natija izohi** so'raladi —
«nima qilindi» degan savolga oldindan javob. Izoh majburiy emas,
lekin yozilsa hokimga ham ko'rinadi. Bajarilgan sanani tizim
**o'zi qo'yadi**: xodim uni orqaga surib, kechikkanini yashira
olmaydi.

Hokim bu yerda **faqat o'qiydi** — topshiriqni u bajarmaydi,
natijasini so'raydi.

«Kechikdi» holati bazada **saqlanmaydi**, har safar sanadan
hisoblanadi. Saqlansa, uni har kecha yangilaydigan vazifa (cron)
kerak bo'lardi; vazifa bir kecha ishlamay qolsa, panel «kechikkan
topshiriq yo'q» deb ko'rsatardi — holbuki bor.

---

## Texnologiyalar

| Qatlam | Vosita |
|---|---|
| Framework | Next.js 14 (App Router) |
| Til | TypeScript |
| Ma'lumotlar bazasi | PostgreSQL + Prisma ORM |
| Uslub | Tailwind CSS + CSS dizayn tokenlari |
| Tekshiruv | Zod (server va brauzerda bir xil sxema) |
| Autentifikatsiya | scrypt + imzolangan sessiya cookie |

Diagrammalar **kutubxonasiz**, oddiy HTML va CSS bilan chizilgan: bu
yerdagi barcha shakllar yotiq ustunlar va har birida qiymat ustun
yonida ochiq yozilgan. Hokim panelni proyektorda ko'radi — sichqoncha
bilan ustun ustiga borib turmaydi, shuning uchun hech bir raqam hover
ortida yashirilmaydi.

---

## O'rnatish

### Talablar

- **Node.js 18+**
- **PostgreSQL 14+** (yoki [Supabase](https://supabase.com) bepul hisobi)

### 1. Kodni olish

```bash
git clone https://github.com/UmidjanDeveloper/Xatirchi-Hokimiyat-Bandlik.git
cd Xatirchi-Hokimiyat-Bandlik
npm install
```

### 2. Muhit o'zgaruvchilari

```bash
cp .env.example .env
```

`.env` faylini oching va to'ldiring:

```bash
# Sessiya kaliti — kamida 32 ta belgi
openssl rand -base64 32

# Birinchi administrator paroli — kamida 12 ta belgi
openssl rand -base64 24
```

> **Diqqat.** `SESSION_SECRET` almashtirilmasa, ilova ishga
> tushmaydi — bu ataylab qilingan himoya.

### 3. Bazani tayyorlash

```bash
npm run db:deploy  # migratsiyalarni qo'llaydi — jadvallar va himoya
npm run db:seed    # 70 ta MFY, 70 ta rais hisobi, administrator
```

`db:seed` quyidagini yozib chiqadi:

```
  Mahallalar: 70 ta yangi, 0 ta yangilandi
  Baza: 200 836 aholi, 3345 ishsiz
  MFY raislari: 70 ta yangi hisob, 0 ta allaqachon bor
  Parollar yozildi: mfy-parollar.txt (70 ta)
  Administrator yaratildi: admin
```

`db:seed` ni qayta ishlatish xavfsiz: u bor narsani buzmaydi,
faqat yetishmayotganini qo'shadi.

#### `mfy-parollar.txt`

Raislarning boshlang'ich parollari **faqat shu faylda** ochiq
ko'rinadi — bazada ular scrypt bilan xeshlangan, ya'ni orqaga
qaytarib bo'lmaydi.

```
mfy_uyshun          Pjcjdfm46   Уйшун — Шоназаров Ахмад Шоназарович
mfy_alisher_navoiy  Vcyaucj24   Алишер Навоий — Тўрақулов Умиджон ...
```

Fayl `.gitignore` da va `600` huquqi bilan yoziladi — git'ga
tushmaydi. **Parollarni raislarga yetkazgach faylni o'chirib
tashlang.** Yo'qolib qolsa, administrator paneldan yangi parol
tayinlash mumkin.

> **Nega telefon raqamidan emas.** Avvalgi variantda parol raisning
> telefonidan hosil qilinardi — og'zaki yetkazishga qulay edi.
> Lekin login mahalla nomidan tuziladi (`mfy_uyshun`), mahalla
> nomlari esa ochiq, rais mansabdor shaxs va uning telefoni
> ko'pincha ma'lum. Ya'ni bitta telefon raqamini bilgan odam o'sha
> mahalladagi barcha xonadonlarning shaxsiy ma'lumotini ochib
> ko'rardi. Majburiy parol almashtirish bu teshikni yopmaydi: rais
> birinchi marta kirgunicha oyna ochiq turadi.

> **`db:push` emas, `db:deploy`.** `db:push` sxemani "tezda" bazaga
> uradi va nima o'zgarganini hech qayerda yozib qo'ymaydi — ishlab
> chiqish paytida qulay, lekin haqiqiy bazada xavfli. `db:deploy`
> esa `prisma/migrations/` dagi SQL fayllarni tartib bilan qo'llaydi
> va qaysi biri o'tganini bazaning o'zida belgilab qo'yadi. Shuning
> uchun serverda faqat `db:deploy` ishlatiladi.

### 4. Ishga tushirish

```bash
npm run dev        # http://localhost:3000
```

`.env` dagi login va parol bilan kiring. **Birinchi kirishda parolni
almashtirish majburiy** — boshlang'ich parol serverning muhit
o'zgaruvchilarida ochiq turadi.

### 5. Xodimlarni qo'shish

Administrator sifatida kiring → **Bошқарув** → **Ходим қўшиш**.

Har xodim uchun tizim parol yaratadi va uni **bir marta** ko'rsatadi.
Parolda chalkashadigan belgilar (`0/O`, `1/l/I`) yo'q — administrator
uni og'zaki uzatishi mumkin.

---

## Supabase va Vercel

Hozircha baza **Supabase** da (sinov va qurish uchun), ilova esa
**Vercel** da turadi. Ikkalasining bepul rejasi bu hajm uchun yetadi.

### 1-qadam. Supabase loyihasi

1. [supabase.com](https://supabase.com) → **New project**
2. **Region**: `Central EU (Frankfurt)` — O'zbekistonga eng yaqin
   variantlardan biri
3. **Database Password** ni yarating va **saqlab qo'ying** — u
   ulanish manzilining ichiga kiradi va keyin qayta ko'rsatilmaydi

### 2-qadam. Ikkita ulanish manzili

**Project Settings → Database → Connection string** bo'limida ikkita
manzil bor va ular **ikkalasi ham** kerak:

| O'zgaruvchi | Port | Nima uchun |
|---|---|---|
| `DATABASE_URL` | **6543** (Transaction pooler) | Ilova shu orqali ishlaydi |
| `DIRECT_URL` | **5432** (Direct connection) | Migratsiya shu orqali qo'llanadi |

```bash
DATABASE_URL="postgresql://postgres.xxxx:PAROL@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres.xxxx:PAROL@aws-0-eu-central-1.pooler.supabase.com:5432/postgres"
```

> **Nega ikkitasi.** Vercel'da har so'rov alohida nusxada ishlaydi va
> o'ziga ulanish ochadi. To'g'ridan-to'g'ri ulansa, bir necha o'nlab
> foydalanuvchi baza chegarasini to'ldirib qo'yadi va sayt
> "too many connections" bilan yiqiladi. Pooler (6543) ulanishlarni
> qayta ishlatib turadi. Lekin pooler migratsiya uchun yaramaydi —
> `CREATE TABLE` kabi buyruqlar bitta uzluksiz ulanishni talab
> qiladi. Shuning uchun migratsiya `DIRECT_URL` (5432) dan boradi.

### 3-qadam. Bazani to'ldirish

```bash
npm run db:deploy   # jadvallar + Supabase himoyasi
npm run db:seed     # 70 MFY, raislar, administrator
npm run tekshir     # hammasi joyidami?
```

`npm run tekshir` shunday javob berishi kerak:

```
  ✓  DATABASE_URL           Supabase pooler
  ✓  Migratsiya             2 ta qo'llangan
  ✓  RLS himoyasi           barcha jadvallarda yoqilgan
  ✓  Anonim kirish          yopilgan
  ✓  Mahallalar             70 ta
  ✓  MFY raislari           70 ta hisob

  Hammasi joyida — joylashtirishga tayyor.
```

### 4-qadam. Vercel

1. [vercel.com](https://vercel.com) → **Import Project** → shu repo
2. **Environment Variables** ga `.env` dagi **barcha** qiymatlarni
   ko'chiring (`DATABASE_URL`, `DIRECT_URL`, `SESSION_SECRET`,
   `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `ADMIN_FISH`,
   `NEXT_PUBLIC_APP_URL`)
3. **Deploy**

Vercel `vercel-build` buyrug'ini topadi va migratsiyani o'zi
qo'llaydi — keyingi safar sxema o'zgarsa, qo'lda hech narsa qilish
kerak emas.

`db:seed` esa **ataylab** avtomatik ishlamaydi: agar administrator
biror MFY hisobini o'chirgan yoki bloklagan bo'lsa, har
joylashtirishda u qaytadan paydo bo'lib qolardi.

> **Eslatma.** Tezlik chegarasi (rate limit) xotirada saqlanadi.
> Vercel'da har funksiya nusxasi o'z xotirasiga ega, shuning uchun
> chegara taxminiy. Amaliy parol terish hujumini bu ham to'xtatadi;
> qat'iy kafolat kerak bo'lsa — Upstash Redis ga o'tish mumkin.

---

## Xavfsizlik

Xatlov ma'lumotlari **oila daromadi va sog'liq holatini** o'z ichiga
oladi. Shuning uchun:

- **Butun sayt login ortida** — ochiq sahifa yo'q
- **Har xodimga alohida hisob**; yettilik a'zosi faqat o'z mahallasini
  ko'radi
- **Audit jurnali** — kim qachon qaysi yozuvni ochgani yoziladi
- **Parol scrypt bilan xeshlanadi**; taqqoslash `timingSafeEqual`
  orqali (oddiy `===` xeshni javob vaqti orqali oshkor qiladi)
- **Login urinishlari cheklangan** — 15 daqiqada 10 ta
- **Sessiya 12 soat** (bir ish kuni) va har so'rovda bazadan
  tekshiriladi: xodim ishdan bo'shatilgan bo'lsa, cookie yaroqli
  bo'lsa ham kira olmaydi
- **Qidiruv tizimlari indekslamaydi** (`robots: noindex`)
- **AI ga shaxsiy ma'lumot yuborilmaydi** — faqat sonlar va katalog
  qiymatlari; erkin matn butunlay chiqarib tashlanadi (`npm run sinov`
  buni har safar tekshiradi)
- **Supabase avtomatik API'si yopilgan** — pastda batafsil

### Supabase avtomatik API'si

Supabase har bir loyihaga so'ralmagan holda REST API qo'shadi: u
`public` sxemasidagi jadvallarni tashqariga ochadi va loyihaning
ochiq "anon key" i bilan o'qishga ruxsat beradi. Bu odatda qulaylik,
lekin bu yerda **jiddiy xavf** — jadvallarda fuqarolarning F.I.Sh.,
tug'ilgan sanasi, manzili, telefoni, daromadi va sog'lig'i turadi.

Ilova bu API'dan umuman foydalanmaydi — u bazaga Prisma orqali
to'g'ridan-to'g'ri ulanadi. Shuning uchun
`20260910130000_supabase_himoyasi` migratsiyasi uni **ikki qavat**
yopadi:

1. `anon` va `authenticated` rollaridan barcha ruxsatlar olinadi —
   ular jadvalni umuman ko'rmaydi (kelajakda yaratiladigan jadvallar
   ham shunday bo'ladi);
2. har jadvalga RLS yoqiladi, lekin birorta siyosat yozilmaydi — bu
   "hech kimga hech narsa" degani.

Ilova ulanadigan `postgres` roli RLS'dan o'tib ketadi, shuning uchun
tizim odatdagidek ishlayveradi.

`npm run tekshir` har ikkala qavatni tekshiradi va biri ochilib
qolsa `✗` bilan ko'rsatadi.

### Hosting to'g'risida

Hozircha Supabase (Yevropa) ishlatilmoqda — **sinov va ishlab chiqish
uchun**. Ishga tushirishdan oldin ma'lumotlarni O'zbekistondagi
serverga ko'chirish rejalashtirilgan.

---

## Loyiha tuzilishi

```
prisma/
  schema.prisma            # 7 ta model: Mahalla, User, Household,
                           # UnemployedPerson, ActionPlan, Vacancy, AuditLog
  seed.ts                  # 70 MFY + raislar + birinchi administrator
  migrations/
    ..._boshlangich/       # Jadvallar, indekslar, bog'lanishlar
    ..._supabase_himoyasi/ # RLS + anonim kirishni yopish

scripts/
  tekshir.ts               # Joylashtirishdan oldingi tekshiruv
  alifbo-sinov.ts          # Transliteratsiya sinovi
  moslik-sinov.ts          # E'lon ↔ fuqaro moslik hisobi sinovi
  pdf-sinov.ts             # PDF matn sig'dirish (jimgina kesilmasin)
  navbat-sinov.ts          # Oflayn navbat: takror, yaroqsiz, aloqa yo'q
  xulosa-sinov.ts          # Xonadon xulosasi: maxfiylik va qoidalar

src/lib/
  alifbo.ts                # Kirill -> lotin o'girish dvigateli
  alifbo-server.ts         # Server komponentlari uchun alifbo
  ishsiz-holati.ts         # Hayot sikli bosqichlari (ma'lumot)
  mahallalar.ts            # 70 MFY, raislar va svod jadvali raqamlari
  constants.ts             # Anketa variantlari — ikki alifboda
  auth.ts                  # scrypt, sessiya, rol huquqlari
  api-auth.ts              # API qo'riqchisi va audit jurnali
  xatlov-tekshiruvi.ts     # ARIFMETIKA TEKSHIRUVI
  xatlov-sxema.ts          # Zod sxemalari (server + brauzer)
  inson-tekshiruvi.ts      # Ism va telefon tekshiruvi
  hudud-qidiruv.ts         # Kirill/lotin fonetik qidiruv
  moslik.ts                # E'lon ↔ fuqaro moslik hisobi (sof funksiya)
  ai.ts                    # AI provayderi: Gemini yoki Claude — bitta eshik
  xonadon-xulosa.ts        # Xonadon tavsiyalari: qoida + AI, ISMSIZ
  moslashtirish.ts         # Moslashtirish taxtasi — server so'rovlari
  joylashtirish.ts         # Band o'rinlar hisobi va holat qaytishi
  tahlil.ts                # Hokim paneli hisob-kitoblari
  tavsiyalar.ts            # Tavsiyalar motori
  chora-tadbir.ts          # Kechikkanlarni hisoblash
  offline.ts               # Qoralama va navbat

src/app/(ilova)/
  xatlov/                  # Xatlov ro'yxati, yangi, tahrir, ko'rish
  ishsizlar/               # Ishsizlar ro'yxati va suhbat anketasi
  xonadonlar/              # Barcha xatlovlar (bandlik uchun)
  bandlik/                 # Operatsion panel
  ish-orinlari/            # Bo'sh ish o'rinlari reestri va e'lon sahifasi
  chora-tadbirlar/         # Topshiriqlar
  panel/                   # Hokim tahlil paneli
  admin/                   # Xodimlar va audit jurnali
```

---

## Buyruqlar

| Buyruq | Vazifasi |
|---|---|
| `npm run dev` | Ishlab chiqish rejimi |
| `npm run build` | Ishga tushirish uchun yig'ish |
| `npm run typecheck` | TypeScript tekshiruvi |
| `npm run lint` | Kod uslubi tekshiruvi |
| `npm run tekshir` | **Joylashtirishdan oldingi tekshiruv** |
| `npm run ai-tekshir` | AI kaliti va modelni tekshirish |
| `npm run sinov` | Transliteratsiya va moslik hisobi sinovlari |
| `npm run db:deploy` | Migratsiyalarni bazaga qo'llash (server) |
| `npm run db:migrate` | Yangi migratsiya yaratish (ishlab chiqish) |
| `npm run db:seed` | 70 MFY, raislar va administratorni yaratish |
| `npm run db:studio` | Bazani brauzerda ko'rish |
| `npm run db:push` | Sxemani migratsiyasiz urish (faqat mahalliy sinov) |

---

**Xatirchi tumani hokimligi** · Navoiy viloyati

Made by **Umidjon Zoxiddinovich**
