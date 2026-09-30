-- ============================================================
--  ЭЪЛОН МОДЕРАЦИЯСИ: КИМ, ҚАЧОН ва НЕГА
--
--  Аввал эълон модерациясида фақат НАТИЖА сақланар эди.
--  «Бу эълонни ким рад этган ва нега?» деган саволга жавоб
--  йўқ эди — ҳолбуки иш берувчи айнан шуни сўрайди.
--
--  Иш берувчининг ўзида (`IshBeruvchi`) бу маълумот
--  аллақачон бор эди; эълонда эса йўқ.
--
--  Фақат ҚЎШАДИ — учта устун, ҳаммаси NULL бўлиши мумкин.
--  Эски ёзувлар ва эски код бемалол ишлайверади.
-- ============================================================
ALTER TABLE "Vacancy" ADD COLUMN IF NOT EXISTS "moderatsiyaQilganId" TEXT;
ALTER TABLE "Vacancy" ADD COLUMN IF NOT EXISTS "moderatsiyaSanasi" TIMESTAMP(3);
ALTER TABLE "Vacancy" ADD COLUMN IF NOT EXISTS "moderatsiyaSababi" TEXT;

DO $$
BEGIN
  ALTER TABLE "Vacancy"
    ADD CONSTRAINT "Vacancy_moderatsiyaQilganId_fkey"
    FOREIGN KEY ("moderatsiyaQilganId") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "Vacancy_moderatsiyaQilganId_idx"
  ON "Vacancy"("moderatsiyaQilganId");
