-- ============================================================
--  KURSLAR: KATALOG VA FUQAROLARNING KURSDAGI YO'LI
--
--  Kurs (o'quv guruhi) tashkilotdan olingan ma'lumot bilan yuritiladi,
--  fuqaro kursga yoziladi, boshlaydi, tamomlaydi yoki tashlaydi; natija
--  (suhbat, ish) shu zanjirga bog'lanadi.
--
--  Kurs yozuvi o'zi "ishga joylashdi" degani EMAS: ish MAVJUD joylashish
--  voqeasiga bog'lanadi va dalil orqali alohida tasdiqlanadi.
--
--  ── FAQAT QO'SHADI ──
--
--  Ikkita yangi jadval va bitta yangi tur. Mavjud jadvallar, ustunlar va
--  ma'lumotlarga tegilmaydi (IT-shaharcha vaucheri oqimi o'zgarmaydi).
-- ============================================================

DO $$ BEGIN
  CREATE TYPE "KursYozuvHolati" AS ENUM (
    'YOLLANDI', 'BOSHLADI', 'TAMOMLADI', 'TASHLADI', 'KELMADI', 'BEKOR'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "Kurs" (
  "id"               TEXT NOT NULL,
  "nomi"             TEXT NOT NULL,
  "yonalish"         TEXT,
  "konikmalar"       TEXT[],
  "tashkilot"        TEXT NOT NULL,
  "manzil"           TEXT,
  "aloqa"            TEXT,
  "boshlanishSanasi" TIMESTAMP(3) NOT NULL,
  "tugashSanasi"     TIMESTAMP(3) NOT NULL,
  "jamiDarsKuni"     INTEGER,
  "joylar"           INTEGER,
  "bepul"            BOOLEAN,
  "narxi"            BIGINT,
  "manba"            TEXT NOT NULL,
  "tekshirilganSana" TIMESTAMP(3) NOT NULL,
  "bekorQilingan"    TIMESTAMP(3),
  "bekorSababi"      TEXT,
  "yaratganId"       TEXT NOT NULL,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Kurs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Kurs_boshlanishSanasi_idx" ON "Kurs"("boshlanishSanasi");
CREATE INDEX IF NOT EXISTS "Kurs_bekorQilingan_tugashSanasi_idx" ON "Kurs"("bekorQilingan", "tugashSanasi");
CREATE INDEX IF NOT EXISTS "Kurs_yaratganId_idx" ON "Kurs"("yaratganId");

CREATE TABLE IF NOT EXISTS "KursYollanmasi" (
  "id"                TEXT NOT NULL,
  "kursId"            TEXT NOT NULL,
  "ishsizId"          TEXT NOT NULL,
  "holati"            "KursYozuvHolati" NOT NULL DEFAULT 'YOLLANDI',
  "boshlaganSana"     TIMESTAMP(3),
  "tugatganSana"      TIMESTAMP(3),
  "qatnashganKun"     INTEGER,
  "sertifikat"        BOOLEAN,
  "olinganKonikmalar" TEXT[],
  "izoh"              TEXT,
  "suhbatSanasi"      TIMESTAMP(3),
  "joylashishId"      TEXT,
  "itVaucherId"       TEXT,
  "yaratganId"        TEXT NOT NULL,
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "KursYollanmasi_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "KursYollanmasi_kursId_ishsizId_key" ON "KursYollanmasi"("kursId", "ishsizId");
CREATE INDEX IF NOT EXISTS "KursYollanmasi_ishsizId_idx" ON "KursYollanmasi"("ishsizId");
CREATE INDEX IF NOT EXISTS "KursYollanmasi_kursId_holati_idx" ON "KursYollanmasi"("kursId", "holati");
CREATE UNIQUE INDEX IF NOT EXISTS "KursYollanmasi_joylashishId_key" ON "KursYollanmasi"("joylashishId");
CREATE INDEX IF NOT EXISTS "KursYollanmasi_holati_tugatganSana_idx" ON "KursYollanmasi"("holati", "tugatganSana");

DO $$ BEGIN
  ALTER TABLE "Kurs" ADD CONSTRAINT "Kurs_yaratganId_fkey"
    FOREIGN KEY ("yaratganId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "KursYollanmasi" ADD CONSTRAINT "KursYollanmasi_kursId_fkey"
    FOREIGN KEY ("kursId") REFERENCES "Kurs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "KursYollanmasi" ADD CONSTRAINT "KursYollanmasi_ishsizId_fkey"
    FOREIGN KEY ("ishsizId") REFERENCES "UnemployedPerson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "KursYollanmasi" ADD CONSTRAINT "KursYollanmasi_joylashishId_fkey"
    FOREIGN KEY ("joylashishId") REFERENCES "IshgaJoylashish"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "KursYollanmasi" ADD CONSTRAINT "KursYollanmasi_itVaucherId_fkey"
    FOREIGN KEY ("itVaucherId") REFERENCES "ItVaucher"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "KursYollanmasi" ADD CONSTRAINT "KursYollanmasi_yaratganId_fkey"
    FOREIGN KEY ("yaratganId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
