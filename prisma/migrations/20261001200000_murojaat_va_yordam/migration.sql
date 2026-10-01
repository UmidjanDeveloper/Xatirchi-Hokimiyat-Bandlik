-- ============================================================
--  MUROJAATLAR (XODIM QAYD ETADI) VA YORDAM DASTURLARI KATALOGI
--
--  Murojaat: fuqaro xodimga (qabulxonada, telefonda, uyma-uy yurganda)
--  aytgan muammo. Kanal, qabul vaqti, mas'ul, javob muddati, holat va
--  uning TARIXI, natija va qayta ochish sababi yoziladi.
--
--  Yordam dasturlari katalogi BO'SH boshlanadi: dastur va miqdorni xodim
--  rasmiy manbadan kiritadi; tizim o'zi hech narsa to'qimaydi.
--
--  ── FAQAT QO'SHADI ──
--
--  Uchta yangi jadval va to'rtta yangi tur. Mavjud jadvallar, ustunlar va
--  ma'lumotlarga tegilmaydi.
-- ============================================================

DO $$ BEGIN
  CREATE TYPE "MurojaatKanali" AS ENUM ('QABULXONA', 'TELEFON', 'UYMA_UY', 'XAT', 'TELEGRAM', 'BOSHQA');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "MurojaatHolati" AS ENUM ('YANGI', 'JARAYONDA', 'JAVOB_BERILDI', 'YOPILDI');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "MurojaatNatijasi" AS ENUM ('HAL_QILINDI', 'TUSHUNTIRILDI', 'YONALTIRILDI', 'RAD_ETILDI', 'VOZ_KECHDI');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "Murojaat" (
  "id"                      TEXT NOT NULL,
  "raqami"                  TEXT NOT NULL,
  "mahallaId"               TEXT NOT NULL,
  "ishsizId"                TEXT,
  "murojaatchiNomi"         TEXT NOT NULL,
  "murojaatchiTelefon"      TEXT,
  "kanal"                   "MurojaatKanali" NOT NULL,
  "tavsif"                  TEXT NOT NULL,
  "qabulVaqti"              TIMESTAMP(3) NOT NULL,
  "masulId"                 TEXT NOT NULL,
  "javobMuddati"            TIMESTAMP(3) NOT NULL,
  "holati"                  "MurojaatHolati" NOT NULL DEFAULT 'YANGI',
  "natijaTuri"              "MurojaatNatijasi",
  "natija"                  TEXT,
  "javobSanasi"             TIMESTAMP(3),
  "yopilganSana"            TIMESTAMP(3),
  "qaytaOchilganSoni"       INTEGER NOT NULL DEFAULT 0,
  "oxirgiQaytaOchishSababi" TEXT,
  "yaratganId"              TEXT NOT NULL,
  "createdAt"               TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"               TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Murojaat_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Murojaat_raqami_key" ON "Murojaat"("raqami");
CREATE INDEX IF NOT EXISTS "Murojaat_mahallaId_holati_idx" ON "Murojaat"("mahallaId", "holati");
CREATE INDEX IF NOT EXISTS "Murojaat_holati_javobMuddati_idx" ON "Murojaat"("holati", "javobMuddati");
CREATE INDEX IF NOT EXISTS "Murojaat_masulId_holati_idx" ON "Murojaat"("masulId", "holati");
CREATE INDEX IF NOT EXISTS "Murojaat_ishsizId_idx" ON "Murojaat"("ishsizId");

CREATE TABLE IF NOT EXISTS "MurojaatTarixi" (
  "id"         TEXT NOT NULL,
  "murojaatId" TEXT NOT NULL,
  "hodisa"     TEXT NOT NULL,
  "holatdan"   "MurojaatHolati",
  "holatga"    "MurojaatHolati",
  "kimId"      TEXT NOT NULL,
  "izoh"       TEXT,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MurojaatTarixi_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "MurojaatTarixi_murojaatId_createdAt_idx" ON "MurojaatTarixi"("murojaatId", "createdAt");

CREATE TABLE IF NOT EXISTS "YordamDasturi" (
  "id"               TEXT NOT NULL,
  "nomi"             TEXT NOT NULL,
  "nishonGuruh"      TEXT NOT NULL,
  "talablar"         TEXT NOT NULL,
  "hujjatlar"        TEXT,
  "masulTashkilot"   TEXT NOT NULL,
  "rasmiyManba"      TEXT NOT NULL,
  "miqdori"          TEXT,
  "amalQilishBoshi"  TIMESTAMP(3),
  "amalQilishOxiri"  TIMESTAMP(3),
  "tekshirilganSana" TIMESTAMP(3) NOT NULL,
  "tekshirganId"     TEXT NOT NULL,
  "faol"             BOOLEAN NOT NULL DEFAULT true,
  "yopilganSana"     TIMESTAMP(3),
  "yopilishSababi"   TEXT,
  "yaratganId"       TEXT NOT NULL,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "YordamDasturi_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "YordamDasturi_faol_amalQilishOxiri_idx" ON "YordamDasturi"("faol", "amalQilishOxiri");
CREATE INDEX IF NOT EXISTS "YordamDasturi_tekshirilganSana_idx" ON "YordamDasturi"("tekshirilganSana");

DO $$ BEGIN
  ALTER TABLE "Murojaat" ADD CONSTRAINT "Murojaat_mahallaId_fkey"
    FOREIGN KEY ("mahallaId") REFERENCES "Mahalla"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Murojaat" ADD CONSTRAINT "Murojaat_ishsizId_fkey"
    FOREIGN KEY ("ishsizId") REFERENCES "UnemployedPerson"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Murojaat" ADD CONSTRAINT "Murojaat_masulId_fkey"
    FOREIGN KEY ("masulId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Murojaat" ADD CONSTRAINT "Murojaat_yaratganId_fkey"
    FOREIGN KEY ("yaratganId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "MurojaatTarixi" ADD CONSTRAINT "MurojaatTarixi_murojaatId_fkey"
    FOREIGN KEY ("murojaatId") REFERENCES "Murojaat"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "MurojaatTarixi" ADD CONSTRAINT "MurojaatTarixi_kimId_fkey"
    FOREIGN KEY ("kimId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "YordamDasturi" ADD CONSTRAINT "YordamDasturi_tekshirganId_fkey"
    FOREIGN KEY ("tekshirganId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "YordamDasturi" ADD CONSTRAINT "YordamDasturi_yaratganId_fkey"
    FOREIGN KEY ("yaratganId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
