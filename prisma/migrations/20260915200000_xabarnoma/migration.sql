-- XABARNOMA - TELEGRAM
--
-- Xabar to'g'ridan-to'g'ri yuborilsa, Telegram ishlamay turganda
-- u shunchaki YO'QOLADI va hech kim bilmaydi. Navbat jadvali
-- buni ko'rsatadi: "12 ta xabar yuborilmadi" va sababi ham.

CREATE TYPE "XabarTuri" AS ENUM (
  'YANGI_ISH_ORNI',
  'VAUCHER_KUTMOQDA',
  'TOPSHIRIQ_MUDDATI',
  'ULANISH'
);

CREATE TYPE "XabarHolati" AS ENUM ('KUTILMOQDA', 'YUBORILDI', 'XATO', 'BEKOR');

-- Telegram bog'lanishi xodim yozuvida
ALTER TABLE "User" ADD COLUMN "telegramChatId" TEXT;
ALTER TABLE "User" ADD COLUMN "telegramSana" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "telegramKodi" TEXT;
ALTER TABLE "User" ADD COLUMN "telegramKodiVaqti" TIMESTAMP(3);

CREATE UNIQUE INDEX "User_telegramChatId_key" ON "User"("telegramChatId");
CREATE UNIQUE INDEX "User_telegramKodi_key" ON "User"("telegramKodi");

CREATE TABLE "Xabarnoma" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "turi" "XabarTuri" NOT NULL,
  "holati" "XabarHolati" NOT NULL DEFAULT 'KUTILMOQDA',
  "matn" TEXT NOT NULL,
  "urinishlar" INTEGER NOT NULL DEFAULT 0,
  "xatoMatni" TEXT,
  "yuborilganSana" TIMESTAMP(3),
  "bogliqTuri" TEXT,
  "bogliqId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Xabarnoma_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Xabarnoma_holati_createdAt_idx" ON "Xabarnoma"("holati", "createdAt");
CREATE INDEX "Xabarnoma_userId_createdAt_idx" ON "Xabarnoma"("userId", "createdAt");

ALTER TABLE "Xabarnoma" ADD CONSTRAINT "Xabarnoma_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
