-- ============================================================
--  MONITORING: AVTOMATIK ISHLAR, XATOLAR, KIRISH URINISHLARI, ZAXIRA
--
--  TizimIshi        - cron va boshqa avtomatik ishlarning har bir bajarilishi
--                     ("oxirgi muvaffaqiyatli ish qachon" shu yerdan hisoblanadi)
--  TizimXatosi      - server xatolari, MAXFIY MA'LUMOTSIZ, takrorlar yig'iladi
--  KirishUrinishi   - kirish chegarasi serverless nusxalari orasida umumiy bo'lishi
--                     uchun (login va IP faqat xesh ko'rinishida)
--  ZaxiraTekshiruvi - zaxiradan tiklash sinovi o'tkazilgani haqida yozuv
--
--  ── FAQAT QO'SHADI ──
--
--  To'rtta yangi jadval va ikkita yangi tur. Mavjud jadvallar, ustunlar va
--  ma'lumotlarga tegilmaydi. Takror ishga tushirish xavfsiz (IF NOT EXISTS).
-- ============================================================

DO $$ BEGIN
  CREATE TYPE "IshHolati" AS ENUM ('DAVOM_ETMOQDA', 'MUVAFFAQIYATLI', 'XATO');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "ZaxiraNatijasi" AS ENUM ('MUVAFFAQIYATLI', 'XATO');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "TizimIshi" (
  "id"        TEXT NOT NULL,
  "nomi"      TEXT NOT NULL,
  "usul"      TEXT NOT NULL DEFAULT 'cron',
  "izId"      TEXT NOT NULL,
  "holati"    "IshHolati" NOT NULL DEFAULT 'DAVOM_ETMOQDA',
  "boshlandi" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "tugadi"    TIMESTAMP(3),
  "xulosa"    TEXT,
  "xatoMatni" TEXT,
  CONSTRAINT "TizimIshi_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "TizimIshi_izId_key" ON "TizimIshi"("izId");
CREATE INDEX IF NOT EXISTS "TizimIshi_nomi_usul_boshlandi_idx" ON "TizimIshi"("nomi", "usul", "boshlandi");
CREATE INDEX IF NOT EXISTS "TizimIshi_nomi_holati_tugadi_idx" ON "TizimIshi"("nomi", "holati", "tugadi");

CREATE TABLE IF NOT EXISTS "TizimXatosi" (
  "id"           TEXT NOT NULL,
  "manba"        TEXT NOT NULL,
  "xesh"         TEXT NOT NULL,
  "xabar"        TEXT NOT NULL,
  "soni"         INTEGER NOT NULL DEFAULT 1,
  "birinchiSana" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "oxirgiSana"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "oxirgiIzId"   TEXT,
  "korilgan"     BOOLEAN NOT NULL DEFAULT false,
  "korilganSana" TIMESTAMP(3),
  CONSTRAINT "TizimXatosi_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "TizimXatosi_xesh_key" ON "TizimXatosi"("xesh");
CREATE INDEX IF NOT EXISTS "TizimXatosi_korilgan_oxirgiSana_idx" ON "TizimXatosi"("korilgan", "oxirgiSana");

CREATE TABLE IF NOT EXISTS "KirishUrinishi" (
  "id"    TEXT NOT NULL,
  "kalit" TEXT NOT NULL,
  "vaqt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "KirishUrinishi_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "KirishUrinishi_kalit_vaqt_idx" ON "KirishUrinishi"("kalit", "vaqt");
CREATE INDEX IF NOT EXISTS "KirishUrinishi_vaqt_idx" ON "KirishUrinishi"("vaqt");

CREATE TABLE IF NOT EXISTS "ZaxiraTekshiruvi" (
  "id"             TEXT NOT NULL,
  "otkazilganSana" TIMESTAMP(3) NOT NULL,
  "natija"         "ZaxiraNatijasi" NOT NULL,
  "izoh"           TEXT NOT NULL,
  "kimId"          TEXT NOT NULL,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ZaxiraTekshiruvi_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ZaxiraTekshiruvi_otkazilganSana_idx" ON "ZaxiraTekshiruvi"("otkazilganSana");

DO $$ BEGIN
  ALTER TABLE "ZaxiraTekshiruvi"
    ADD CONSTRAINT "ZaxiraTekshiruvi_kimId_fkey"
    FOREIGN KEY ("kimId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
