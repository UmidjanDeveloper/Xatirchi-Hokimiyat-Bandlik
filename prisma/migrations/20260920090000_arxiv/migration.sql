-- Xatlov va fuqaro ARXIVGA olinadi, o'chirilmaydi.
--
-- Haqiqiy o'chirish xonadon bilan birga uning topshiriqlarini
-- (ActionPlan) va butun tarixini (HouseholdKesma) ham yo'q
-- qilardi - ikkovida ham `onDelete: Cascade` turibdi. Uni hech
-- narsa qaytara olmasdi.
ALTER TABLE "Household" ADD COLUMN IF NOT EXISTS "arxivSanasi" TIMESTAMP(3);
ALTER TABLE "Household" ADD COLUMN IF NOT EXISTS "arxivchiId" TEXT;
ALTER TABLE "Household" ADD COLUMN IF NOT EXISTS "arxivSababi" TEXT;

ALTER TABLE "UnemployedPerson" ADD COLUMN IF NOT EXISTS "arxivSanasi" TIMESTAMP(3);
ALTER TABLE "UnemployedPerson" ADD COLUMN IF NOT EXISTS "arxivchiId" TEXT;
ALTER TABLE "UnemployedPerson" ADD COLUMN IF NOT EXISTS "arxivSababi" TEXT;

CREATE INDEX IF NOT EXISTS "Household_arxivSanasi_idx" ON "Household"("arxivSanasi");
CREATE INDEX IF NOT EXISTS "UnemployedPerson_arxivSanasi_idx" ON "UnemployedPerson"("arxivSanasi");
