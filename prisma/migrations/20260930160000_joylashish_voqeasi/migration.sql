-- ============================================================
--  ИШГА ЖОЙЛАШИШ ВОҚЕАСИ ва ДАЛИЛНИНГ МАНБАСИ
--
--  ── 1. ЭСКИ ДАЛИЛ ЯНГИ ИШНИ ТАСДИҚЛАРДИ ──
--
--  Далил ОДАМГА боғланган эди, ишга эмас:
--
--    2024: «Оқ Олтин МЧЖ», шартнома киритилди, ТАСДИҚЛАНДИ;
--    2025: ишдан чиқди, «Янги Йўл МЧЖ» га кирди.
--
--  Иккинчи иш учун далил йўқ эди-ю, одамда «тасдиқланган
--  далил бор» бўлиб турарди. Ҳокимликнинг «тасдиқланган
--  жойлаштириш» рақами шундан ҳисобланади.
--
--  ── 2. ҚЎЛДА ЮКЛАНГАН ФАЙЛ «РАСМИЙ» ДЕБ ҲИСОБЛАНАРДИ ──
--
--  Excel кўчирмасидан келган ёзув ДАРҲОЛ тасдиқланган
--  бўларди — худди текширилган интеграциядан келгандек.
--  Файлни ким, қачон ва қаердан олганини тизим билмайди.
--
--  ── ФАҚАТ ҚЎШАДИ ──
--
--  Янги жадвал ва янги устунлар. Мавжуд далиллар ва
--  уларнинг ҳолати ЎЗГАРМАЙДИ: эски ёзувларда `joylashishId`
--  бўш қолади ва улар «боғланиши керак» рўйхатига тушади.
--
--  Тахмин қилиб ўзимиз боғламаймиз: нотўғри боғланган далил
--  йўқ далилдан ёмонроқ.
-- ============================================================

-- ── Янги турлар ──
DO $$ BEGIN
  CREATE TYPE "DalilManbasi" AS ENUM ('XODIM_BILDIRDI', 'QOLDA_HUJJAT', 'QOLDA_REYESTR', 'RASMIY_INTEGRATSIYA');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "DalilMaqsadi" AS ENUM ('ISH_BOSHLAGANI', 'HOZIR_ISHLAYOTGANI');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "JoylashuvVoqeaHolati" AS ENUM ('ISHLAMOQDA', 'TUGADI', 'NOMALUM');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Ишга жойлашиш воқеаси ──
CREATE TABLE IF NOT EXISTS "IshgaJoylashish" (
  "id"              TEXT NOT NULL,
  "ishsizId"        TEXT NOT NULL,
  "korxonaNomi"     TEXT NOT NULL,
  "lavozim"         TEXT,
  "ishBeruvchiId"   TEXT,
  "vacancyId"       TEXT,
  "boshlanganSana"  TIMESTAMP(3) NOT NULL,
  "tugaganSana"     TIMESTAMP(3),
  "tugashSababi"    TEXT,
  "holati"          "JoylashuvVoqeaHolati" NOT NULL DEFAULT 'NOMALUM',
  "oxirgiTekshiruv" TIMESTAMP(3),
  "kiritganId"      TEXT,
  "izoh"            TEXT,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IshgaJoylashish_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "IshgaJoylashish_ishsizId_boshlanganSana_idx" ON "IshgaJoylashish"("ishsizId", "boshlanganSana");
CREATE INDEX IF NOT EXISTS "IshgaJoylashish_holati_idx"        ON "IshgaJoylashish"("holati");
CREATE INDEX IF NOT EXISTS "IshgaJoylashish_vacancyId_idx"     ON "IshgaJoylashish"("vacancyId");
CREATE INDEX IF NOT EXISTS "IshgaJoylashish_ishBeruvchiId_idx" ON "IshgaJoylashish"("ishBeruvchiId");

DO $$ BEGIN
  ALTER TABLE "IshgaJoylashish" ADD CONSTRAINT "IshgaJoylashish_ishsizId_fkey"
    FOREIGN KEY ("ishsizId") REFERENCES "UnemployedPerson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "IshgaJoylashish" ADD CONSTRAINT "IshgaJoylashish_ishBeruvchiId_fkey"
    FOREIGN KEY ("ishBeruvchiId") REFERENCES "IshBeruvchi"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "IshgaJoylashish" ADD CONSTRAINT "IshgaJoylashish_vacancyId_fkey"
    FOREIGN KEY ("vacancyId") REFERENCES "Vacancy"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "IshgaJoylashish" ADD CONSTRAINT "IshgaJoylashish_kiritganId_fkey"
    FOREIGN KEY ("kiritganId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Далилнинг воқеага боғланиши ва манбаси ──
ALTER TABLE "JoylashuvDalili" ADD COLUMN IF NOT EXISTS "joylashishId"   TEXT;
ALTER TABLE "JoylashuvDalili" ADD COLUMN IF NOT EXISTS "manbaTashkilot" TEXT;
ALTER TABLE "JoylashuvDalili" ADD COLUMN IF NOT EXISTS "hujjatSanasi"   TIMESTAMP(3);
ALTER TABLE "JoylashuvDalili" ADD COLUMN IF NOT EXISTS "davrBoshi"      TIMESTAMP(3);
ALTER TABLE "JoylashuvDalili" ADD COLUMN IF NOT EXISTS "davrOxiri"      TIMESTAMP(3);
ALTER TABLE "JoylashuvDalili" ADD COLUMN IF NOT EXISTS "importId"       TEXT;
ALTER TABLE "JoylashuvDalili" ADD COLUMN IF NOT EXISTS "faylIzi"        TEXT;

-- Enum устунлар: DEFAULT билан — эски ёзувлар ҳам тўлади
ALTER TABLE "JoylashuvDalili" ADD COLUMN IF NOT EXISTS "manbaTuri" "DalilManbasi" NOT NULL DEFAULT 'QOLDA_HUJJAT';
ALTER TABLE "JoylashuvDalili" ADD COLUMN IF NOT EXISTS "maqsadi"   "DalilMaqsadi" NOT NULL DEFAULT 'ISH_BOSHLAGANI';

DO $$ BEGIN
  ALTER TABLE "JoylashuvDalili" ADD CONSTRAINT "JoylashuvDalili_joylashishId_fkey"
    FOREIGN KEY ("joylashishId") REFERENCES "IshgaJoylashish"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "JoylashuvDalili_joylashishId_idx"      ON "JoylashuvDalili"("joylashishId");
CREATE INDEX IF NOT EXISTS "JoylashuvDalili_importId_idx"          ON "JoylashuvDalili"("importId");
CREATE INDEX IF NOT EXISTS "JoylashuvDalili_manbaTuri_holati_idx"  ON "JoylashuvDalili"("manbaTuri", "holati");

-- ── ЭСКИ РЕЕСТР ДАЛИЛЛАРИНИНГ МАНБАСИ ──
--
-- Улар қўлда юкланган Excel дан келган. Ҳолати
-- ЎЗГАРТИРИЛМАЙДИ — фақат манбаси тўғри ёзилади, шунда
-- ҳисоботда «қўлда» билан «расмий» ажралади.
UPDATE "JoylashuvDalili" SET "manbaTuri" = 'QOLDA_REYESTR'
WHERE "turi" = 'REYESTR' AND "manbaTuri" = 'QOLDA_HUJJAT';

UPDATE "JoylashuvDalili" SET "manbaTuri" = 'XODIM_BILDIRDI'
WHERE "turi" = 'MAHALLA' AND "manbaTuri" = 'QOLDA_HUJJAT';
