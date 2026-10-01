-- ============================================================
--  ОИЛАВИЙ РИВОЖЛАНИШ РЕЖАСИ
--
--  Хатлов оиланинг аҳволини ЁЗИБ ОЛАДИ, чора-тадбир эса алоҳида
--  топшириқларни. Уларни боғлайдиган нарса йўқ эди: ходим «бу
--  оила билан нима қилмоқчимиз ва нега» деган саволга битта
--  жойдан жавоб ололмасди.
--
--  ── ФАҚАТ ҚЎШАДИ ──
--
--  Икки янги жадвал ва `ActionPlan` га тўртта ИХТИЁРИЙ устун.
--  Мавжуд топшириқлар ва уларнинг ҳолати ЎЗГАРМАЙДИ, режасиз
--  ишлашда давом этади. Хатлов ҳозир кетмоқда — эски кодга
--  бу миграциянинг таъсири йўқ.
-- ============================================================

DO $$ BEGIN
  CREATE TYPE "RejaHolati" AS ENUM ('FAOL', 'TUGALLANDI', 'TOXTATILDI');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "RejaTosigi" AS ENUM (
    'TRANSPORT', 'BOLAGA_QARASH', 'ISH_JADVALI', 'KONIKMA', 'SOGLIQ_MOSLASHUVI',
    'MOS_ISH_SHAROITI', 'ASBOB_USKUNA', 'BUYURTMA_YETISHMASLIGI', 'BOSHQA'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "AloqaUsuli" AS ENUM ('TELEFON', 'UCHRASHUV', 'TASHRIF');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Режа ──
CREATE TABLE IF NOT EXISTS "OilaRejasi" (
  "id"                 TEXT NOT NULL,
  "holati"             "RejaHolati" NOT NULL DEFAULT 'FAOL',
  "faolBelgi"          BOOLEAN,
  "householdId"        TEXT NOT NULL,
  "boshlangichHolat"   TEXT NOT NULL,
  "boshlangichManba"   TEXT,
  "boshlangichSana"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "maqsad"             TEXT,
  "maqsadKelishilgan"  BOOLEAN NOT NULL DEFAULT false,
  "resurslar"          TEXT,
  "tosiqlar"           "RejaTosigi"[],
  "tosiqIzohi"         TEXT,
  "masulXodimId"       TEXT,
  "masulTashkilot"     TEXT,
  "muddat"             TIMESTAMP(3),
  "zarurResurs"        TEXT,
  "natijaDalili"       TEXT,
  "keyingiAloqaSanasi" TIMESTAMP(3),
  "yopilganSana"       TIMESTAMP(3),
  "yopilishIzohi"      TEXT,
  "yaratganId"         TEXT NOT NULL,
  "createdAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OilaRejasi_pkey" PRIMARY KEY ("id")
);

-- Бир оилада бир вақтда БИТТА фаол режа: (householdId, faolBelgi) да
-- `faolBelgi` фақат фаол режада `true`, қолганида NULL.
CREATE UNIQUE INDEX IF NOT EXISTS "OilaRejasi_householdId_faolBelgi_key" ON "OilaRejasi"("householdId", "faolBelgi");
CREATE INDEX IF NOT EXISTS "OilaRejasi_householdId_idx" ON "OilaRejasi"("householdId");
CREATE INDEX IF NOT EXISTS "OilaRejasi_holati_keyingiAloqaSanasi_idx" ON "OilaRejasi"("holati", "keyingiAloqaSanasi");
CREATE INDEX IF NOT EXISTS "OilaRejasi_masulXodimId_idx" ON "OilaRejasi"("masulXodimId");

DO $$ BEGIN
  ALTER TABLE "OilaRejasi" ADD CONSTRAINT "OilaRejasi_householdId_fkey"
    FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "OilaRejasi" ADD CONSTRAINT "OilaRejasi_masulXodimId_fkey"
    FOREIGN KEY ("masulXodimId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "OilaRejasi" ADD CONSTRAINT "OilaRejasi_yaratganId_fkey"
    FOREIGN KEY ("yaratganId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Оила билан алоқа ──
CREATE TABLE IF NOT EXISTS "OilaAloqasi" (
  "id"          TEXT NOT NULL,
  "rejaId"      TEXT NOT NULL,
  "usul"        "AloqaUsuli" NOT NULL,
  "aloqaVaqti"  TIMESTAMP(3) NOT NULL,
  "kimBilan"    TEXT,
  "mazmun"      TEXT NOT NULL,
  "fuqaroFikri" TEXT,
  "qaydEtganId" TEXT NOT NULL,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OilaAloqasi_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "OilaAloqasi_rejaId_aloqaVaqti_idx" ON "OilaAloqasi"("rejaId", "aloqaVaqti");
CREATE INDEX IF NOT EXISTS "OilaAloqasi_qaydEtganId_idx" ON "OilaAloqasi"("qaydEtganId");

DO $$ BEGIN
  ALTER TABLE "OilaAloqasi" ADD CONSTRAINT "OilaAloqasi_rejaId_fkey"
    FOREIGN KEY ("rejaId") REFERENCES "OilaRejasi"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "OilaAloqasi" ADD CONSTRAINT "OilaAloqasi_qaydEtganId_fkey"
    FOREIGN KEY ("qaydEtganId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Чора-тадбир: режанинг қадами сифатида (ҳаммаси ихтиёрий) ──
ALTER TABLE "ActionPlan" ADD COLUMN IF NOT EXISTS "rejaId"       TEXT;
ALTER TABLE "ActionPlan" ADD COLUMN IF NOT EXISTS "zarurResurs"  TEXT;
ALTER TABLE "ActionPlan" ADD COLUMN IF NOT EXISTS "natijaDalili" TEXT;
ALTER TABLE "ActionPlan" ADD COLUMN IF NOT EXISTS "masulXodimId" TEXT;

CREATE INDEX IF NOT EXISTS "ActionPlan_rejaId_idx" ON "ActionPlan"("rejaId");

DO $$ BEGIN
  ALTER TABLE "ActionPlan" ADD CONSTRAINT "ActionPlan_rejaId_fkey"
    FOREIGN KEY ("rejaId") REFERENCES "OilaRejasi"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ActionPlan" ADD CONSTRAINT "ActionPlan_masulXodimId_fkey"
    FOREIGN KEY ("masulXodimId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
