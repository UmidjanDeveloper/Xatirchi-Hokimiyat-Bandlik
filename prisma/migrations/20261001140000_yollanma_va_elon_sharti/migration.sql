-- ============================================================
--  NOMZODNI ISH BERUVCHIGA YO'LLASH + E'LON JADVALI/SHAROITI
--
--  Ish beruvchi botda o'z e'lonlarini ko'radi, suhbat va ishga qabul
--  natijasini bildiradi. Nomzodning ismi va telefoni unga FAQAT fuqaro
--  roziligi bilan va zarur minimumda beriladi; rozilik xodim tomonidan
--  usuli va sanasi bilan yozib olinadi.
--
--  Ish beruvchining "ishga qabul qildik" degani TASDIQLANGAN joylashish
--  EMAS: u joylashish voqeasi va dalil orqali alohida tasdiqlanadi.
--
--  ── FAQAT QO'SHADI ──
--
--  Bitta yangi jadval, uchta yangi tur, `Vacancy` ga ikkita IXTIYORIY
--  matn ustuni. Mavjud e'lonlar va ularning holati o'zgarmaydi.
-- ============================================================

DO $$ BEGIN
  CREATE TYPE "YollanmaHolati" AS ENUM (
    'YOLLANDI', 'SUHBAT_BELGILANDI', 'SUHBAT_OTKAZILDI', 'ISHGA_QABUL',
    'ISH_BERUVCHI_RAD', 'FUQARO_RAD', 'BEKOR'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "RozilikUsuli" AS ENUM ('OGZAKI', 'TELEFON', 'YOZMA');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "YollanmaManbasi" AS ENUM ('XODIM_QAYD_ETGAN', 'ISH_BERUVCHI_BILDIRGAN');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "Vacancy" ADD COLUMN IF NOT EXISTS "jadvali"     TEXT;
ALTER TABLE "Vacancy" ADD COLUMN IF NOT EXISTS "sharoitlari" TEXT;

CREATE TABLE IF NOT EXISTS "NomzodYollanmasi" (
  "id"             TEXT NOT NULL,
  "ishsizId"       TEXT NOT NULL,
  "vacancyId"      TEXT NOT NULL,
  "holati"         "YollanmaHolati" NOT NULL DEFAULT 'YOLLANDI',
  "rozilik"        BOOLEAN NOT NULL DEFAULT false,
  "roziligiSana"   TIMESTAMP(3),
  "roziligiUsuli"  "RozilikUsuli",
  "ulashilgan"     TEXT[],
  "ulashilganSana" TIMESTAMP(3),
  "suhbatSanasi"   TIMESTAMP(3),
  "natijaIzohi"    TEXT,
  "natijaManbasi"  "YollanmaManbasi",
  "natijaSanasi"   TIMESTAMP(3),
  "yaratganId"     TEXT NOT NULL,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "NomzodYollanmasi_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "NomzodYollanmasi_ishsizId_vacancyId_key" ON "NomzodYollanmasi"("ishsizId", "vacancyId");
CREATE INDEX IF NOT EXISTS "NomzodYollanmasi_vacancyId_holati_idx" ON "NomzodYollanmasi"("vacancyId", "holati");
CREATE INDEX IF NOT EXISTS "NomzodYollanmasi_holati_ulashilganSana_idx" ON "NomzodYollanmasi"("holati", "ulashilganSana");
CREATE INDEX IF NOT EXISTS "NomzodYollanmasi_yaratganId_idx" ON "NomzodYollanmasi"("yaratganId");

DO $$ BEGIN
  ALTER TABLE "NomzodYollanmasi" ADD CONSTRAINT "NomzodYollanmasi_ishsizId_fkey"
    FOREIGN KEY ("ishsizId") REFERENCES "UnemployedPerson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "NomzodYollanmasi" ADD CONSTRAINT "NomzodYollanmasi_vacancyId_fkey"
    FOREIGN KEY ("vacancyId") REFERENCES "Vacancy"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "NomzodYollanmasi" ADD CONSTRAINT "NomzodYollanmasi_yaratganId_fkey"
    FOREIGN KEY ("yaratganId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
