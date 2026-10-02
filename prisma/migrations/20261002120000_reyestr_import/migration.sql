-- ============================================================
--  REYESTR IMPORTI: "AVVAL KO'RISH, KEYIN YOZISH" SERVERDA BOG'LANADI
--
--  ReyestrImport - bitta yuklash jarayoni: fayl izi (SHA-256), sana, holat
--                  (ko'rildi / yozilmoqda / yozildi / xato), sanoqlar va xato matni.
--                  Yozish qadami faqat shu yozuvdagi fayl izi va sana bilan ishlaydi:
--                  ko'rilgan fayl o'rniga boshqa fayl yozilmaydi, bir fayl ikki marta
--                  yozilmaydi, yarim yo'lda to'xtagan import xavfsiz davom ettiriladi.
--
--  ── FAQAT QO'SHADI ──
--
--  Bitta yangi jadval va bitta yangi tur. Mavjud jadvallar, ustunlar va
--  ma'lumotlarga tegilmaydi (JoylashuvDalili.importId va faylIzi ustunlari
--  allaqachon bor edi - endi ularni haqiqatan shu yozuv to'ldiradi).
--  Takror ishga tushirish xavfsiz (IF NOT EXISTS).
-- ============================================================

DO $$ BEGIN
  CREATE TYPE "ReyestrImportHolati" AS ENUM ('KORILDI', 'YOZILMOQDA', 'YOZILDI', 'XATO');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "ReyestrImport" (
  "id"              TEXT NOT NULL,
  "faylIzi"         TEXT NOT NULL,
  "faylNomi"        TEXT,
  "bayt"            INTEGER NOT NULL,
  "satrSoni"        INTEGER NOT NULL,
  "reyestrSanasi"   TIMESTAMP(3) NOT NULL,
  "manbaTashkilot"  TEXT,
  "holati"          "ReyestrImportHolati" NOT NULL DEFAULT 'KORILDI',
  "userId"          TEXT,
  "yozishBoshlandi" TIMESTAMP(3),
  "yozildiSana"     TIMESTAMP(3),
  "jami"            INTEGER,
  "yozilgan"        INTEGER NOT NULL DEFAULT 0,
  "takror"          INTEGER NOT NULL DEFAULT 0,
  "xatoMatni"       TEXT,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ReyestrImport_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ReyestrImport_faylIzi_reyestrSanasi_idx" ON "ReyestrImport"("faylIzi", "reyestrSanasi");
CREATE INDEX IF NOT EXISTS "ReyestrImport_holati_createdAt_idx" ON "ReyestrImport"("holati", "createdAt");
CREATE INDEX IF NOT EXISTS "ReyestrImport_userId_createdAt_idx" ON "ReyestrImport"("userId", "createdAt");
