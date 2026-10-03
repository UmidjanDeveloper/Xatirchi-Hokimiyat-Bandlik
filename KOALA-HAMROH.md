# Koala: hamroh, suhbat va ovoz

Asos: upstream `199425a5b7924dd9dcc5d3052b101bea2275687f`.
Bu o‘zgarishlar alohida nusxada tayyorlandi. GitHub va production yangilanmagan.

## O‘zgargan xatti-harakat

- Koalani sichqoncha yoki barmoq bilan surish mumkin; surish suhbatni tasodifan ochmaydi.
- Joylashuv eslab qolinadi va ekran kichrayganda chegarada saqlanadi. Klaviatura yo‘nalish tugmalari suradi, Home odatiy joyga qaytaradi.
- Kutish, salomlashish, dam olish va sudrash harakatlari mavjud koala rasmlariga CSS orqali qo‘shildi. Mavjud tinglash/o‘ylash/gapirish pozalari saqlandi. Yangi kadrli sprite yoki lab sinxronizatsiyasi yaratilmagan.
- Kamaytirilgan harakat va zaif qurilma sozlamalari hurmat qilinadi.
- Oddiy suhbat, oldingi mavzuni davom ettirish, so‘zlashuv tilini tushunish va batafsil javobga ruxsat beruvchi ko‘rsatmalar qo‘shildi. Platforma raqamlari manbadan olinishi va yozish amallari tasdiqlanishi shartligi saqlandi.
- Server orqali ovozli javob, qayta tinglash, to‘xtatish qo‘shildi. Gapirish holati audio haqiqatan boshlanganda yoqiladi.
- Bekor qilingan ovozning kechikkan javobi qayta yangramaydi. Oyna yopilishi, ilova fonga o‘tishi yoki mikrofon boshlanishi ovozni to‘xtatadi.
- STT uchun umumiy vaqt chegarasi javob tanasini o‘qishni ham qamrab oladi. Groq zaxirasi OpenAI modeliga almashtirilmaydi.
- Xatlov, sxema va migratsiyalar o‘zgarmadi. Yangi npm bog‘liqlik qo‘shilmadi.

## Server ovozini yoqish

Deployment secret sozlamasida `OPENAI_API_KEY` kerak. Uni kodga yoki suhbatga yozmang.
`AGENT_TTS=1` bilan server ovozi yoqiladi; bu belgi yo‘q bo‘lsa mavjud qurilma ovozi saqlanadi.
Model: `gpt-4o-mini-tts`; ovoz: `marin`; format MP3. AI suhbat uchun mavjud AGENT_PROVAYDER/AGENT_MODEL sozlamalari alohida ishlaydi. Groq orqali suhbat ishlatilsa ham ushbu TTS uchun OpenAI kaliti zarur.

Bir javob 900 belgigacha; har hisob uchun daqiqada 6, 24 soatlik oynada 80 ta ovoz so‘rovi. Bu limitlar maxsus TTS kalitlari bilan mavjud baza limit xizmatidan foydalanadi. Xizmat so‘rovlari API xarajatini keltirib chiqaradi. Uzoq javob jim kesilmaydi: foydalanuvchiga qisqa variant so‘rash aytiladi.

Rasmiy asos: https://developers.openai.com/api/docs/guides/text-to-speech
Ovozlar ingliz tiliga optimallashtirilgan; o‘zbekcha talaffuz sifati bu ishda haqiqiy provayder bilan tasdiqlanmagan. TTS yo‘li pilot rejimida: uni mukammal o‘zbekcha ovoz deb taqdim etmang.

## Tekshiruv

`npm run sinov:koala`:
- Ovoz/yozuv: 43/43.
- STT: 17/17.
- Yangi hamroh va ovoz hayot sikli: 10/10.
- Haqiqiy API marshruti, sun’iy auth/limit/provayder bilan: 7/7.
- O‘zgargan asosiy TypeScript fayllarda ESLint: xato va ogohlantirish yo‘q.

Baza yoki tashqi model bu sinovlarda chaqirilmaydi. To‘liq typecheck eski mahalliy Prisma klienti sabab o‘tmadi; o‘zgargan ishlab chiqarish fayllarida shu tekshiruvda TS xatosi ko‘rsatilmagan. To‘liq build va DB integratsiya sinovi bajarilmadi. Mahalliy snapshotda maskot binar rasmlari bo‘lmagani uchun vizual/brauzer tekshiruvi bajarilmadi; patch upstreamdagi mavjud rasmlardan foydalanadi.

## Chiqarishdan oldin

1. Patchni eng so‘nggi toza branchda `git apply --check Koala-yangilanish.patch` orqali tekshiring. Konflikt bo‘lsa majburan qo‘llamang.
2. Qo‘llang, lock fayl bo‘yicha bog‘liqliklarni o‘rnating, Prisma klientini yarating va stagingdagi odatiy CI tekshiruvlarini bajaring. Build production migratsiyasini ishga tushirishi mumkin: production muhit o‘zgaruvchilari bilan mahalliy build qilmang.
3. iPhone Safari va Android Chrome’da haqiqiy mavjud rasmlar bilan yorug‘/qorong‘i mavzu, klaviatura, surish, resize, reduced-motion holatlarini ko‘ring.
4. O‘zbekcha sinov: “Assalomu alaykum”, “Koala, nima qila olasan?”, “Xatlov qanday ketyapti?”, “Qaysi mahalla haqida gapiryapsan?”, “O‘shani batafsil tushuntir”, “Qisqacha ayt”, “G‘alaba mahallasini och”. Raqamlar uchun bazadagi qiymatlar bilan solishtiring.
5. Shovqinli joy, ruxsat rad etilishi, internet uzilishi, ovoz paytida mikrofon, oyna yopish, sahifa almashishi va brauzer audio ijrosini bloklashini tekshiring. Mobil brauzer ovozni bloklasa matn qoladi va qayta tinglash tugmasi bor; haqiqiy iOS tekshiruvi zarur.
6. Vakolatsiz foydalanuvchi API’ga kira olmasligini va rol bo‘yicha mavjud huquqlar saqlanganini tekshiring.

Qaytarish: yangi feature commitini revert qilish; faqat server ovozini o‘chirish uchun AGENT_TTS belgisini olib tashlash. Bazada migratsiya talab qilinmaydi.
