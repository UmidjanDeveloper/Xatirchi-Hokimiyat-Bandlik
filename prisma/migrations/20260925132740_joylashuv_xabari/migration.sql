-- «Иш топдим» хабари: занжирнинг етишмаган ҳалқаси.
--
-- Миграция ФАҚАТ ҚЎШАДИ. Эски код янги жадвални ҳам, янги
-- enum қийматларини ҳам сўрамайди, шунинг учун база янгиланиб,
-- код эса ҳали эски бўлган дақиқаларда ҳеч нарса синмайди.

-- 1) Хабар турлари.
ALTER TYPE "XabarTuri" ADD VALUE IF NOT EXISTS 'ISH_TOPILDI';
ALTER TYPE "XabarTuri" ADD VALUE IF NOT EXISTS 'JOYLASHUV_TASDIQLANDI';

-- 2) Хабарнинг ҳолати.
DO $$ BEGIN
  CREATE TYPE "JoylashuvHolati" AS ENUM ('XABAR_QILINDI', 'TASDIQLANDI', 'RAD_ETILDI');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 3) Жадвалнинг ўзи.
CREATE TABLE IF NOT EXISTS "JoylashuvXabari" (
  "id"              TEXT NOT NULL,
  "holati"          "JoylashuvHolati" NOT NULL DEFAULT 'XABAR_QILINDI',
  "vacancyId"       TEXT NOT NULL,
  "ishsizId"        TEXT NOT NULL,
  "xabarchiId"      TEXT NOT NULL,
  "muddat"          TIMESTAMP(3) NOT NULL,
  "halQilganId"     TEXT,
  "halQilinganSana" TIMESTAMP(3),
  "izoh"            TEXT,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL,
  CONSTRAINT "JoylashuvXabari_pkey" PRIMARY KEY ("id")
);

-- Битта фуқаро битта эълонга БИР МАРТА. Тугма икки марта
-- босилса, иккинчиси шу ерда тўхтайди.
CREATE UNIQUE INDEX IF NOT EXISTS "JoylashuvXabari_vacancyId_ishsizId_key"
  ON "JoylashuvXabari"("vacancyId", "ishsizId");

CREATE INDEX IF NOT EXISTS "JoylashuvXabari_holati_muddat_idx"
  ON "JoylashuvXabari"("holati", "muddat");
CREATE INDEX IF NOT EXISTS "JoylashuvXabari_xabarchiId_holati_idx"
  ON "JoylashuvXabari"("xabarchiId", "holati");

-- 4) Ташқи калитлар. `DO` блоки — такрор юргизилса хато
--    бермаслиги учун (`ADD CONSTRAINT` да `IF NOT EXISTS` йўқ).
DO $$ BEGIN
  ALTER TABLE "JoylashuvXabari" ADD CONSTRAINT "JoylashuvXabari_vacancyId_fkey"
    FOREIGN KEY ("vacancyId") REFERENCES "Vacancy"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "JoylashuvXabari" ADD CONSTRAINT "JoylashuvXabari_ishsizId_fkey"
    FOREIGN KEY ("ishsizId") REFERENCES "UnemployedPerson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "JoylashuvXabari" ADD CONSTRAINT "JoylashuvXabari_xabarchiId_fkey"
    FOREIGN KEY ("xabarchiId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "JoylashuvXabari" ADD CONSTRAINT "JoylashuvXabari_halQilganId_fkey"
    FOREIGN KEY ("halQilganId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
