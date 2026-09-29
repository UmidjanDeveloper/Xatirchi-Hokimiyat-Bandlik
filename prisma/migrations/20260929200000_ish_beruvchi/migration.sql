-- ============================================================
--  ИШ БЕРУВЧИ ВА ЭЪЛОН МОДЕРАЦИЯСИ
--
--  Бугун эълонни фақат ҳокимият ходими қўяди. Иш берувчи эса
--  телефон қилиб, айтиб, кутиб ўтиради — ва кўп ҳолда умуман
--  қўнғироқ қилмайди.
--
--  Энди у ботдан туриб ўзи қўя олади. Аммо эълон 70 та
--  маҳалла ходимига хабар юборади ва туман ҳисоботига
--  киради, шунинг учун у МОДЕРАЦИЯдан ўтади.
--
--  ── Нега `moderatsiya` нинг бирламчи қиймати TASDIQLANDI ──
--
--  Миграция устунни қўшганда, эски код ҳали ишлаб туради ва у
--  бу устунни тўлдирмайди. Бирламчи қиймат KUTILMOQDA бўлса,
--  ўша орадаги ҳар бир эълон жимгина кўринмай қоларди —
--  ходим эълон қўярди, хабар эса ҳеч кимга бормасди.
--
--  Иш берувчи қўйган эълонда KUTILMOQDA АНИҚ ёзилади.
--
--  Миграция ФАҚАТ ҚЎШАДИ.
-- ============================================================

DO $$ BEGIN
  CREATE TYPE "IshBeruvchiHolati" AS ENUM ('KUTILMOQDA', 'TASDIQLANDI', 'RAD_ETILDI');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "ModeratsiyaHolati" AS ENUM ('KUTILMOQDA', 'TASDIQLANDI', 'RAD_ETILDI');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "IshBeruvchi" (
  "id"              TEXT NOT NULL,
  "telegramChatId"  TEXT NOT NULL,
  "holati"          "IshBeruvchiHolati" NOT NULL DEFAULT 'KUTILMOQDA',
  "korxonaNomi"     TEXT NOT NULL,
  "masulShaxs"      TEXT NOT NULL,
  "telefon"         TEXT NOT NULL,
  "mahallaId"       TEXT,
  "radSababi"       TEXT,
  "halQilganId"     TEXT,
  "halQilinganSana" TIMESTAMP(3),
  "bosqich"         TEXT,
  "suhbat"          JSONB NOT NULL DEFAULT '{}',
  "suhbatVaqti"     TIMESTAMP(3),
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL,
  CONSTRAINT "IshBeruvchi_pkey" PRIMARY KEY ("id")
);

-- Битта Telegram чатда битта иш берувчи
CREATE UNIQUE INDEX IF NOT EXISTS "IshBeruvchi_telegramChatId_key"
  ON "IshBeruvchi"("telegramChatId");

-- Модерация навбати шу бўйича олинади
CREATE INDEX IF NOT EXISTS "IshBeruvchi_holati_idx" ON "IshBeruvchi"("holati");

ALTER TABLE "Vacancy" ADD COLUMN IF NOT EXISTS "ishBeruvchiId" TEXT;
ALTER TABLE "Vacancy" ADD COLUMN IF NOT EXISTS "moderatsiya" "ModeratsiyaHolati"
  NOT NULL DEFAULT 'TASDIQLANDI';

CREATE INDEX IF NOT EXISTS "Vacancy_moderatsiya_idx" ON "Vacancy"("moderatsiya");

DO $$ BEGIN
  ALTER TABLE "Vacancy" ADD CONSTRAINT "Vacancy_ishBeruvchiId_fkey"
    FOREIGN KEY ("ishBeruvchiId") REFERENCES "IshBeruvchi"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "IshBeruvchi" ADD CONSTRAINT "IshBeruvchi_mahallaId_fkey"
    FOREIGN KEY ("mahallaId") REFERENCES "Mahalla"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "IshBeruvchi" ADD CONSTRAINT "IshBeruvchi_halQilganId_fkey"
    FOREIGN KEY ("halQilganId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
