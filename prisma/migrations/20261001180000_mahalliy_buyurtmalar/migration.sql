-- ============================================================
--  MAHALLIY BUYURTMALAR (PILOT, XODIM BOSHQARADI)
--
--  Fuqaro mahalliy xizmat taklif qiladi (XizmatTaklifi), kimdir xizmat
--  so'raydi (MahalliyBuyurtma), xodim ijrochini topadi. Narx kelishiladi;
--  to'lovni platforma YURITMAYDI. Bajarilgan ish ijrochi VA buyurtmachi
--  alohida tasdiqlagandagina "ikki tomonlama tasdiqlangan".
--
--  Ochiq bozor va fuqaro kabineti yo'q: faqat xodim ko'radi va boshqaradi.
--
--  ── FAQAT QO'SHADI ──
--
--  Ikkita yangi jadval va bitta yangi tur. Mavjud jadvallar, ustunlar va
--  ma'lumotlarga tegilmaydi. `RozilikUsuli` turi oldingi migratsiyada
--  yaratilgan va shu yerda qayta ishlatiladi.
-- ============================================================

DO $$ BEGIN
  CREATE TYPE "BuyurtmaHolati" AS ENUM (
    'YANGI', 'TAYINLANDI', 'KELISHILDI', 'BAJARILDI', 'BEKOR'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "XizmatTaklifi" (
  "id"            TEXT NOT NULL,
  "ishsizId"      TEXT NOT NULL,
  "nomi"          TEXT NOT NULL,
  "tavsif"        TEXT,
  "taxminiyNarx"  BIGINT,
  "rozilik"       BOOLEAN NOT NULL DEFAULT false,
  "roziligiUsuli" "RozilikUsuli",
  "roziligiSana"  TIMESTAMP(3),
  "faol"          BOOLEAN NOT NULL DEFAULT true,
  "yopilganSana"  TIMESTAMP(3),
  "yaratganId"    TEXT NOT NULL,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "XizmatTaklifi_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "XizmatTaklifi_ishsizId_idx" ON "XizmatTaklifi"("ishsizId");
CREATE INDEX IF NOT EXISTS "XizmatTaklifi_faol_rozilik_idx" ON "XizmatTaklifi"("faol", "rozilik");

CREATE TABLE IF NOT EXISTS "MahalliyBuyurtma" (
  "id"                      TEXT NOT NULL,
  "mahallaId"               TEXT NOT NULL,
  "buyurtmachiNomi"         TEXT NOT NULL,
  "buyurtmachiTelefon"      TEXT,
  "tavsif"                  TEXT NOT NULL,
  "holati"                  "BuyurtmaHolati" NOT NULL DEFAULT 'YANGI',
  "taklifId"                TEXT,
  "tayinlanganSana"         TIMESTAMP(3),
  "kelishilganNarx"         BIGINT,
  "kelishilganSana"         TIMESTAMP(3),
  "muddat"                  TIMESTAMP(3),
  "bajarilganSana"          TIMESTAMP(3),
  "ijrochiTasdigi"          BOOLEAN,
  "ijrochiTasdiqSanasi"     TIMESTAMP(3),
  "ijrochiTasdiqUsuli"      "RozilikUsuli",
  "buyurtmachiTasdigi"      BOOLEAN,
  "buyurtmachiTasdiqSanasi" TIMESTAMP(3),
  "buyurtmachiTasdiqUsuli"  "RozilikUsuli",
  "tasdiqIzohi"             TEXT,
  "bekorSababi"             TEXT,
  "yaratganId"              TEXT NOT NULL,
  "createdAt"               TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"               TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MahalliyBuyurtma_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "MahalliyBuyurtma_mahallaId_holati_idx" ON "MahalliyBuyurtma"("mahallaId", "holati");
CREATE INDEX IF NOT EXISTS "MahalliyBuyurtma_holati_createdAt_idx" ON "MahalliyBuyurtma"("holati", "createdAt");
CREATE INDEX IF NOT EXISTS "MahalliyBuyurtma_taklifId_idx" ON "MahalliyBuyurtma"("taklifId");

DO $$ BEGIN
  ALTER TABLE "XizmatTaklifi" ADD CONSTRAINT "XizmatTaklifi_ishsizId_fkey"
    FOREIGN KEY ("ishsizId") REFERENCES "UnemployedPerson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "XizmatTaklifi" ADD CONSTRAINT "XizmatTaklifi_yaratganId_fkey"
    FOREIGN KEY ("yaratganId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "MahalliyBuyurtma" ADD CONSTRAINT "MahalliyBuyurtma_mahallaId_fkey"
    FOREIGN KEY ("mahallaId") REFERENCES "Mahalla"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "MahalliyBuyurtma" ADD CONSTRAINT "MahalliyBuyurtma_taklifId_fkey"
    FOREIGN KEY ("taklifId") REFERENCES "XizmatTaklifi"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "MahalliyBuyurtma" ADD CONSTRAINT "MahalliyBuyurtma_yaratganId_fkey"
    FOREIGN KEY ("yaratganId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
