-- XONADON TARIXI - KESMALAR
--
-- `Household` jadvalida faqat OXIRGI holat turadi. Xatlov qayta
-- o'tkazilsa, eski raqamlar ustidan yozilib ketadi va "bu oila
-- yil boshida qanday edi" degan savolga javob qolmaydi.
--
-- Kesma har yakuniy yuborishda olinadi: harakatdagi ko'rsatkichlar
-- alohida ustun bo'lib turadi (SQL so'rov yozish uchun), to'liq
-- yozuv esa JSON bo'lib saqlanadi (kelajakdagi savollar uchun).

CREATE TYPE "KesmaSababi" AS ENUM ('ILK_XATLOV', 'QAYTA_XATLOV', 'BOSHLANGICH');

CREATE TABLE "HouseholdKesma" (
  "id" TEXT NOT NULL,
  "householdId" TEXT NOT NULL,
  "mahallaId" TEXT NOT NULL,
  "olinganSana" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sababi" "KesmaSababi" NOT NULL DEFAULT 'QAYTA_XATLOV',

  "jamiAzo" INTEGER NOT NULL,
  "bolalarSoni" INTEGER NOT NULL DEFAULT 0,

  "mehnatgaLayoqatli" INTEGER NOT NULL DEFAULT 0,
  "ishlaydiganlar" INTEGER NOT NULL DEFAULT 0,
  "ishsizlarSoni" INTEGER NOT NULL DEFAULT 0,

  "oylikDaromad" BIGINT,
  "jonBoshigaDaromad" BIGINT,
  "chetElOylikPulSom" BIGINT,

  "yirikShoxliSoni" INTEGER,
  "maydaShoxliSoni" INTEGER,
  "parrandaSoni" INTEGER,
  "tomorqaMaydoni" DOUBLE PRECISION,

  "gaz" BOOLEAN NOT NULL DEFAULT false,
  "ichimlikSuvi" TEXT,
  "uyHolati" TEXT,

  "tadbirkorlikIstagi" BOOLEAN NOT NULL DEFAULT false,
  "kasbHunarIstagi" BOOLEAN NOT NULL DEFAULT false,

  "nogironSoni" INTEGER NOT NULL DEFAULT 0,
  "farovonlikBali" INTEGER NOT NULL,
  "toliq" JSONB NOT NULL,

  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "HouseholdKesma_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "HouseholdKesma_householdId_olinganSana_idx"
  ON "HouseholdKesma"("householdId", "olinganSana");
CREATE INDEX "HouseholdKesma_mahallaId_olinganSana_idx"
  ON "HouseholdKesma"("mahallaId", "olinganSana");

ALTER TABLE "HouseholdKesma" ADD CONSTRAINT "HouseholdKesma_householdId_fkey"
  FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "HouseholdKesma" ADD CONSTRAINT "HouseholdKesma_mahallaId_fkey"
  FOREIGN KEY ("mahallaId") REFERENCES "Mahalla"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
