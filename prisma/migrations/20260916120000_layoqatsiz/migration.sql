-- MEHNATGA LAYOQATSIZLAR
--
-- Dalada chiqqan holat: fuqaroning ilgari nogironligi bor edi,
-- hozir rasman yo'q, lekin o'zini mehnatga layoqatsiz deb
-- hisoblaydi va ishlamaydi.
--
-- Xodim uni "mehnatga layoqatlilar" dan chiqarib tashladi va
-- "ishsizlar" ga qo'shdi. Anketa esa rad etdi: "ishlaydigan (1)
-- va ishsiz (1) jami 2 — bu mehnatga layoqatlilar sonidan (1)
-- ko'p". Odam bor edi, uni yozadigan katak yo'q edi.
--
-- Bu ustun o'sha katak. U bandlik tenglamasiga KIRMAYDI:
-- layoqatsiz odam ishsiz emas, chunki ish qidirmaydi.

ALTER TABLE "Household" ADD COLUMN "mehnatgaLayoqatsiz" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "HouseholdKesma" ADD COLUMN "mehnatgaLayoqatsiz" INTEGER NOT NULL DEFAULT 0;
