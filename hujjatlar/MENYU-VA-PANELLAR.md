# Menyu va panellar tuzilmasi

Bu hujjat "menyuda juda katta chalkashlik bor" degan e'tirozdan keyin qilingan o'zgarishlarni va kerakli narsa qayerda ekanini yozadi.

## Nima noto'g'ri edi

1. **Telefonda menyu kesilib qolardi.** Ochilgan menyu ekranga mahkamlangan, balandligi chegaralanmagan va aylantirib bo'lmas edi. Administratorda 19 ta band bor, telefon ekraniga 14 tasi sig'adi: "Boshqaruv", "Tasdiqlash", "Tizim holati" va boshqalar ekrandan PASTDA qolib, ularga yetib bo'lmasdi. Shu sababli telefonda "hokim, rahbar panellari va xodimlar yo'q" bo'lib ko'rinardi.
2. **Uzun menyu tekis ro'yxat edi.** 19-20 band guruhsiz turardi.
3. **Xodimlar topilmasdi.** 70 ta mahalla xodimining logini va paroli, hokim va rahbar hisoblari "Boshqaruv" sahifasining o'rtasida, 9 000 pikselli ro'yxatda edi.
4. **Bir xil bloklar.** "Tahlil paneli", "Operatsion panel" va "Boshqaruv" bir xil AI xulosa va o'sish/oylik oqim bloklari bilan boshlanardi.

## Hozir qanday

### Menyu
- **Telefonda menyu ekran balandligidan oshmaydi va ichida aylanadi.** U Koaladan ham yuqorida turadi.
- **Uzun menyuda (11 tadan ko'p band) guruh sarlavhalari:** Panellar va hisobot, Kundalik ish, Fuqaro va xonadon, Bandlik va xizmatlar, Boshqaruv. Bandlik mutaxassisi, rahbar va administratorda ko'rinadi.
- **Qisqa menyu o'zgarmagan** (mahalla xodimi 10 band, hokim 5 band): 70 ta xodim shu tartibga o'rganib qolgan.

### Ходимлар ва панеллар (`/xodimlar`, faqat administrator)
- **Rol kartalari:** Hokim, Bandlik rahbari, Bandlik mutaxassisi, Mahalla xodimi, Administrator. Har birida hisoblar soni, bosh sahifasi va **"Panelini ko'rish"** tugmasi.
- **"Panelini ko'rish"** administrator o'z hisobidan chiqmaydi: sayt tanlangan hisobning roli bilan chiziladi, yozish amallari o'chirilgan, tepada doimiy lenta turadi (`korish-rejimi.ts`). Koala ham ko'rinadi, lekin faqat o'qiydi.
- **Rol uchun hisob yo'q bo'lsa**, karta shuni aytadi va "Hisob yaratish" tugmasi shaklni shu rol bilan ochadi. Hokim va rahbar hisoblari o'z-o'zidan yaratilmaydi: ularni administrator yaratadi.
- **Login va parol ro'yxati** rol bo'yicha filtr bilan (standart: mahalla xodimlari), 30 tadan ko'rsatiladi, "Yana ko'rsatish" tugmasi bor, qidiruv butun ro'yxatdan qidiradi.
- **Parol** faqat qatordagi "Парол" tugmasi bilan ochiladi va har ochilishi audit jurnaliga yoziladi. Parol bazada shifrlangan nusxada turadi; xodim uni o'zi almashtirgan bo'lsa, nusxa eskiradi va ro'yxat buni yozadi. Hamma parolni bir yo'la ko'rsatadigan yoki yuklaydigan tugma ATAYLAB yo'q.

### "Operatsion panel" va "Boshqaruv"
- **Operatsion panel:** tahlil paneliga kira oladigan rolda (rahbar, administrator) "Tahlil xulosasi va tavsiyalar" va "O'sish va kamayish, oylik oqim" bloklari yopiq turadi (sarlavhasi ko'rinadi, bosilsa ochiladi). Bandlik mutaxassisi tahlil paneliga kira olmaydi, unda ular ochiq.
- **Boshqaruv:** to'rtta raqam, `/xodimlar` kartasi (sonlar bilan), takror fuqarolar, vaucher navbati, Telegram, AI ulanishi, brifing, tezlik, audit. Tahlil bloklari pastda, yopiq.
- Hech bir blok o'chirilmagan, faqat joyi va ochiq/yopiq holati o'zgargan.

## Tekshirish
- `npm run sinov:menyu` — menyu guruhlari, telefon aylanishi, `/xodimlar` huquqi va tuzilmasi (14 ta tekshiruv, `npm run sinov` ichida).
- `npm run sinov:brauzer-menyu` — haqiqiy Chromium (qo'lda): telefonda har bir rol uchun menyu oxirigacha aylanadi va oxirgi band ochiladi; operatsion panel ochilishi; `/xodimlar`; hokim panelini ko'rish; boshqa rollar `/xodimlar` ga kira olmaydi va serverdan ro'yxat chiqmaydi.
- HTTP regressiya 13m — `/xodimlar` faqat administratorga, ko'rish rejimida hokim ko'zi bilan ham yopiq.

## Hali qilinmagan
- "Boshqaruv" va "Tizim holati" sahifalari ma'lum darajada bir-birini takrorlaydi (Telegram, AI, zaxira); ularni birlashtirish alohida qaror.
- Mahalla xodimlari login va parollarini bir yo'la Excel/PDF qilib yuklash yo'q: bu ko'plab parolni bir faylga yig'ish demak. Kerak bo'lsa, faqat administratorga, audit jurnali bilan va faqat xodim hali almashtirmagan parollar uchun qo'shish mumkin.
