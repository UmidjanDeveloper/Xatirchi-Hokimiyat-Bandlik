-- ============================================================
--  ЖОЙЛАШТИРИШ ЗАНЖИРИ: ЭЪЛОН → ФУҚАРО → БАНД ЎРИН
--
--  Илгари мутахассис иш жойини ЭРКИН МАТН сифатида ёзарди.
--  Натижада:
--    · `Vacancy.ornlarSoni` ҳеч қачон камаймас эди;
--    · ўрин тўлгани билинмас, битта ўрин чексиз таклиф қилинар;
--    · «ким қайси ўринга жойлашди» деган саволга жавоб йўқ эди.
--
--  Энди фуқаро ЭЪЛОНГА боғланади. Банд ўрин сони шу боғланишдан
--  САНАЛАДИ — алоҳида ҳисоблагич сақланмайди, чунки ҳисоблагич
--  эртами-кечми ҳақиқатдан четга чиқади.
--
--  `ishJoyi` матн майдони ЎЗ ЎРНИДА ҚОЛДИ: фуқаро эълонсиз, ўзи
--  топган ишга ҳам жойлашиши мумкин ва уни йўқотиш маълумот
--  йўқотиш бўларди.
-- ============================================================

CREATE TYPE "VacancyYopilishi" AS ENUM ('TOLDI', 'QOLDA');

ALTER TABLE "Vacancy" ADD COLUMN "yopilishSababi" "VacancyYopilishi";
ALTER TABLE "Vacancy" ADD COLUMN "yopilganSana" TIMESTAMP(3);

ALTER TABLE "UnemployedPerson" ADD COLUMN "vacancyId" TEXT;

ALTER TABLE "UnemployedPerson"
  ADD CONSTRAINT "UnemployedPerson_vacancyId_fkey"
  FOREIGN KEY ("vacancyId") REFERENCES "Vacancy"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "UnemployedPerson_vacancyId_idx" ON "UnemployedPerson"("vacancyId");

-- Аввал қўл билан ёпилган эълонлар «қўлда ёпилган» деб белгиланади:
-- улар жойлаштириш бекор қилинганда ҚАЙТА ОЧИЛМАСЛИГИ керак.
UPDATE "Vacancy"
   SET "yopilishSababi" = 'QOLDA', "yopilganSana" = "updatedAt"
 WHERE "faol" = false AND "yopilishSababi" IS NULL;
