-- Tomorqadan foydalanish darajasi va qo'shimcha yer maydoni.
--
-- "10 sotix yer bor" degan raqamdan chora chiqmaydi: o'sha yer
-- ekilgan ham, tashlab qo'yilgan ham bo'lishi mumkin. Ikkoviga
-- boshqa-boshqa yordam kerak.
--
-- Baho KESMAGA ham tushadi: keyingi yil o'sha xonadonga
-- borilganda "o'tgan safar yomon edi, hozir qoniqarli" deb
-- ko'rsatish mumkin bo'lsin.
ALTER TABLE "Household" ADD COLUMN IF NOT EXISTS "tomorqaFoydalanish" TEXT;
ALTER TABLE "Household" ADD COLUMN IF NOT EXISTS "qoshimchaYerBor" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Household" ADD COLUMN IF NOT EXISTS "qoshimchaYerMaydoni" DOUBLE PRECISION;

ALTER TABLE "HouseholdKesma" ADD COLUMN IF NOT EXISTS "tomorqaFoydalanish" TEXT;
ALTER TABLE "HouseholdKesma" ADD COLUMN IF NOT EXISTS "ekinMaydoni" DOUBLE PRECISION;
ALTER TABLE "HouseholdKesma" ADD COLUMN IF NOT EXISTS "qoshimchaYerMaydoni" DOUBLE PRECISION;
