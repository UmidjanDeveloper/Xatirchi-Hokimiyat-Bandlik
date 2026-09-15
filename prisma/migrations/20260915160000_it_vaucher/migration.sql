-- IT-SHAHARCHA VAUCHERI
--
-- `UnemployedPerson.itShaharchaVaucheri` faqat "IT-shaharchaga
-- yo'naltirilsin" degan ISTAKNI saqlaydi. Vaucherning o'zi -
-- raqami, yo'nalishi va holati bilan - shu jadvalda.
--
-- Ikkovi ataylab ajratilgan: istak bor-u vaucher yo'q odam
-- zanjirning uzilgan joyini ko'rsatadi.

CREATE TYPE "ItVaucherHolati" AS ENUM (
  'BERILDI',
  'OQIMOQDA',
  'TUGATDI',
  'ISHGA_JOYLASHDI',
  'TASHLAB_KETDI',
  'BEKOR_QILINDI'
);

CREATE TABLE "ItVaucher" (
  "id" TEXT NOT NULL,
  "raqami" TEXT NOT NULL,
  "holati" "ItVaucherHolati" NOT NULL DEFAULT 'BERILDI',
  "ishsizId" TEXT NOT NULL,
  "mahallaId" TEXT NOT NULL,
  "yonalish" TEXT NOT NULL,
  "boshqaYonalish" TEXT,
  "berilganSana" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "boshlanganSana" TIMESTAMP(3),
  "tugatganSana" TIMESTAMP(3),
  "ishgaKirganSana" TIMESTAMP(3),
  "izoh" TEXT,
  "bergangaId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ItVaucher_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ItVaucher_raqami_key" ON "ItVaucher"("raqami");
CREATE INDEX "ItVaucher_mahallaId_holati_idx" ON "ItVaucher"("mahallaId", "holati");
CREATE INDEX "ItVaucher_holati_berilganSana_idx" ON "ItVaucher"("holati", "berilganSana");
CREATE INDEX "ItVaucher_ishsizId_idx" ON "ItVaucher"("ishsizId");

ALTER TABLE "ItVaucher" ADD CONSTRAINT "ItVaucher_ishsizId_fkey"
  FOREIGN KEY ("ishsizId") REFERENCES "UnemployedPerson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ItVaucher" ADD CONSTRAINT "ItVaucher_mahallaId_fkey"
  FOREIGN KEY ("mahallaId") REFERENCES "Mahalla"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ItVaucher" ADD CONSTRAINT "ItVaucher_bergangaId_fkey"
  FOREIGN KEY ("bergangaId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
