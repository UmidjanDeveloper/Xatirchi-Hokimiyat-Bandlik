-- ============================================================
--  ЖОЙЛАШТИРИШНИНГ ДАЛИЛИ
--
--  «Ишга жойлаштирилди» ҳозирча битта босиш: ходим тугмани
--  босади ва туман рақами биттага ошади. Ҳеч ким текширмайди.
--
--  Ҳоким эса ўша рақамни юқорига ҳисобот қилиб беради. Агар
--  рақам нотўғри бўлса, у ТУМАН даражасида нотўғри бўлади.
--
--  Далил АЛОҲИДА жадвалда, чунки битта жойлаштириш бир неча
--  марта тасдиқланади: ишга кирган куни шартнома билан, уч
--  ойдан кейин реестр билан. Фуқаро ёзувидаги битта майдон
--  буни кўтара олмайди — иккинчи далил биринчисини ўчириб
--  юборарди.
--
--  Миграция ФАҚАТ ҚЎШАДИ: янги жадвал ва иккита enum.
--  Мавжуд устунга ҳам, маълумотга ҳам тегилмайди — эски код
--  янги базада ишлайверади.
-- ============================================================

DO $$ BEGIN
  CREATE TYPE "DalilTuri" AS ENUM ('REYESTR', 'SHARTNOMA', 'BUYRUQ', 'ISH_BERUVCHI', 'MAHALLA');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "DalilHolati" AS ENUM ('KIRITILDI', 'TASDIQLANDI', 'RAD_ETILDI');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "JoylashuvDalili" (
  "id"               TEXT NOT NULL,
  "turi"             "DalilTuri" NOT NULL,
  "holati"           "DalilHolati" NOT NULL DEFAULT 'KIRITILDI',
  "ishsizId"         TEXT NOT NULL,
  "reyestrIshJoyi"   TEXT,
  "reyestrSanasi"    TIMESTAMP(3),
  "izoh"             TEXT,
  "kiritganId"       TEXT,
  "tasdiqlaganId"    TEXT,
  "tasdiqlanganSana" TIMESTAMP(3),
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3) NOT NULL,
  CONSTRAINT "JoylashuvDalili_pkey" PRIMARY KEY ("id")
);

-- Фуқаро саҳифасида далиллар рўйхати шу бўйича олинади
CREATE INDEX IF NOT EXISTS "JoylashuvDalili_ishsizId_holati_idx"
  ON "JoylashuvDalili"("ishsizId", "holati");

-- «Нечтаси реестр билан тасдиқланган» деган жамланма учун
CREATE INDEX IF NOT EXISTS "JoylashuvDalili_turi_holati_idx"
  ON "JoylashuvDalili"("turi", "holati");

CREATE INDEX IF NOT EXISTS "JoylashuvDalili_createdAt_idx"
  ON "JoylashuvDalili"("createdAt");

DO $$ BEGIN
  ALTER TABLE "JoylashuvDalili" ADD CONSTRAINT "JoylashuvDalili_ishsizId_fkey"
    FOREIGN KEY ("ishsizId") REFERENCES "UnemployedPerson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Ходим ишдан бўшаса, далил ЙЎҚОЛМАЙДИ: «ким киритган» майдони
-- бўшайди, далилнинг ўзи эса жойида қолади.
DO $$ BEGIN
  ALTER TABLE "JoylashuvDalili" ADD CONSTRAINT "JoylashuvDalili_kiritganId_fkey"
    FOREIGN KEY ("kiritganId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "JoylashuvDalili" ADD CONSTRAINT "JoylashuvDalili_tasdiqlaganId_fkey"
    FOREIGN KEY ("tasdiqlaganId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
