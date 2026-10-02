-- ============================================================
--  HUDHUD (AI AGENT): FOYDALANISH HISOBI VA TASDIQ KUTAYOTGAN AMALLAR
--
--  AgentFoydalanish - xodim bo'yicha KUNLIK hisob: so'rovlar, tokenlar, xatolar.
--                     Suhbat MATNI saqlanmaydi (shaxsiy ma'lumot bo'lishi mumkin).
--                     Xarajat limiti va "kim qancha ishlatdi" shu yerdan.
--  AgentAmali       - agent TAKLIF qilgan, lekin xodim hali TASDIQLAMAGAN yozish
--                     amali. Taklif serverda saqlanadi (xodim tomonidan o'zgartirib
--                     bo'lmaydi), bir marta ishlaydi va muddati bor.
--
--  ── FAQAT QO'SHADI ──
--
--  Ikkita yangi jadval va bitta yangi tur. Mavjud jadvallar, ustunlar va
--  ma'lumotlarga tegilmaydi. Takror ishga tushirish xavfsiz (IF NOT EXISTS).
-- ============================================================

DO $$ BEGIN
  CREATE TYPE "AgentAmaliHolati" AS ENUM ('KUTILMOQDA', 'BAJARILDI', 'RAD_ETILDI', 'MUDDATI_OTDI', 'XATO');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "AgentFoydalanish" (
  "id"         TEXT NOT NULL,
  "userId"     TEXT NOT NULL,
  "kun"        DATE NOT NULL,
  "sorovlar"   INTEGER NOT NULL DEFAULT 0,
  "qoidali"    INTEGER NOT NULL DEFAULT 0,
  "tokenlar"   INTEGER NOT NULL DEFAULT 0,
  "ovozSoniya" INTEGER NOT NULL DEFAULT 0,
  "xatolar"    INTEGER NOT NULL DEFAULT 0,
  "updatedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AgentFoydalanish_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "AgentFoydalanish_userId_kun_key" ON "AgentFoydalanish"("userId", "kun");
CREATE INDEX IF NOT EXISTS "AgentFoydalanish_kun_idx" ON "AgentFoydalanish"("kun");

CREATE TABLE IF NOT EXISTS "AgentAmali" (
  "id"        TEXT NOT NULL,
  "userId"    TEXT NOT NULL,
  "amal"      TEXT NOT NULL,
  "sarlavha"  TEXT NOT NULL,
  "holati"    "AgentAmaliHolati" NOT NULL DEFAULT 'KUTILMOQDA',
  "muddat"    TIMESTAMP(3) NOT NULL,
  "natija"    TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "hal"       TIMESTAMP(3),
  CONSTRAINT "AgentAmali_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "AgentAmali_userId_holati_idx" ON "AgentAmali"("userId", "holati");
CREATE INDEX IF NOT EXISTS "AgentAmali_createdAt_idx" ON "AgentAmali"("createdAt");
