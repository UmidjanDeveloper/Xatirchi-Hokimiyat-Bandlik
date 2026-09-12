-- ============================================================
--  ANKETANI QAYTA QURISH
--
--  OLIB TASHLANADI: X bo'lim - "Mahalla hududidagi tadbirkorlik
--  subyektlari". To'rtta ustun tushiriladi va ulardagi ma'lumot
--  butunlay yo'qoladi.
--
--  Bu ataylab: bo'sh ish o'rinlari alohida reestrda
--  (`Vacancy` jadvali) yuritiladi va u yerda tashkilot nomi,
--  lavozimi, maoshi ham bor. Xatlov anketasidagi "nechta subyekt
--  va nechta bo'sh o'rin" degan ikki raqam esa hech qayerda
--  ishlatilmasdi - yettilik a'zosi eshik oldida turib butun
--  mahalladagi korxonalarni sanashi ham amalda imkonsiz edi.
--
--  QO'SHILADI:
--    gazTuri            - tabiiy gaz yoki propan balon
--    oilaBoshligiJinsi  - nafaqa yoshi tekshiruvi uchun
--    ekinMaydoni        - tomorqa o'rniga (uy turgan yer emas)
--    chorvaBor/Turlari  - erkin matn o'rniga tanlov
--    hunarmandBor/Turlari
--    nogironShaxslar    - kim va oiladagi o'rni
--    parvarishShaxslar
--    aiXulosa           - ismsiz tayyorlangan tavsiya
--    rozilikBerdi/imzo  - yuborishdan oldin majburiy
--
--  `tomorqaMaydoni` va `chorvachilik` ATAYLAB qoldirildi: eski
--  xatlovlardagi qiymatlar yo'qolmasin.
-- ============================================================

-- AlterTable
ALTER TABLE "Household" DROP COLUMN "boshIshOrinlari",
DROP COLUMN "subyektMoliyaEhtiyoji",
DROP COLUMN "tadbirkorSubyektlar",
DROP COLUMN "yangiIshOrinlari",
ADD COLUMN     "aiManbasi" TEXT,
ADD COLUMN     "aiXulosa" TEXT,
ADD COLUMN     "aiXulosaVaqti" TIMESTAMP(3),
ADD COLUMN     "chorvaBor" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "chorvaTurlari" TEXT[],
ADD COLUMN     "ekinMaydoni" DOUBLE PRECISION,
ADD COLUMN     "gazTuri" TEXT,
ADD COLUMN     "hunarTurlari" TEXT[],
ADD COLUMN     "hunarmandBor" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "imzoVaqti" TIMESTAMP(3),
ADD COLUMN     "imzoYoli" TEXT,
ADD COLUMN     "nogironShaxslar" JSONB,
ADD COLUMN     "oilaBoshligiJinsi" TEXT,
ADD COLUMN     "parvarishShaxslar" JSONB,
ADD COLUMN     "rozilikBerdi" BOOLEAN NOT NULL DEFAULT false;

