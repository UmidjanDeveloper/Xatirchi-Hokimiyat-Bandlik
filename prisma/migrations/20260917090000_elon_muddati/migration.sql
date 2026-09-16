-- E'lonning amal qilish muddati.
--
-- Ilgari e'lon qo'lda yopilmaguncha abadiy faol turardi: korxona
-- fikridan qaytsa ham, e'lon ro'yxatda qolib, mahalla xodimlari
-- allaqachon yopilgan o'ringa odam yuborib yuraverardi.
ALTER TYPE "VacancyYopilishi" ADD VALUE IF NOT EXISTS 'MUDDATI_TUGADI';

ALTER TABLE "Vacancy" ADD COLUMN IF NOT EXISTS "amalQilishMuddati" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "Vacancy_faol_amalQilishMuddati_idx"
  ON "Vacancy"("faol", "amalQilishMuddati");
