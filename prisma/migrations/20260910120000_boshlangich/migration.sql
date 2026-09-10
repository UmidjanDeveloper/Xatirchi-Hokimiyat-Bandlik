-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('YETTILIK', 'BANDLIK', 'BANDLIK_RAHBAR', 'HOKIM', 'ADMIN');

-- CreateEnum
CREATE TYPE "XatlovHolati" AS ENUM ('QORALAMA', 'YUBORILGAN', 'TASDIQLANGAN');

-- CreateEnum
CREATE TYPE "IshsizHolati" AS ENUM ('ANIQLANDI', 'SUHBAT_OTKAZILDI', 'TAKLIF_BERILDI', 'JOYLASHTIRILDI', 'TASDIQLANDI', 'RAD_ETDI');

-- CreateEnum
CREATE TYPE "TopshiriqHolati" AS ENUM ('KUTILMOQDA', 'BAJARILMOQDA', 'BAJARILDI', 'KECHIKDI', 'BEKOR_QILINDI');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "position" TEXT,
    "phone" TEXT,
    "rol" "Rol" NOT NULL,
    "mahallaId" TEXT,
    "faol" BOOLEAN NOT NULL DEFAULT true,
    "parolAlmashtirilsin" BOOLEAN NOT NULL DEFAULT true,
    "oxirgiKirish" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mahalla" (
    "id" TEXT NOT NULL,
    "tartib" INTEGER NOT NULL,
    "nomi" TEXT NOT NULL,
    "nomiKirill" TEXT NOT NULL,
    "raisFish" TEXT NOT NULL,
    "raisTelefon" TEXT NOT NULL,
    "raisMalumoti" TEXT NOT NULL,
    "aholi" INTEGER NOT NULL,
    "xonadon" INTEGER NOT NULL,
    "oila" INTEGER NOT NULL,
    "kambagalYanvar" INTEGER NOT NULL,
    "kambagalJami" INTEGER NOT NULL,
    "davlatTaminotida" INTEGER NOT NULL,
    "kambagalOilalar" INTEGER NOT NULL,
    "kambagallikChegarasida" INTEGER NOT NULL,
    "mehnatgaLayoqatli" INTEGER NOT NULL,
    "band" INTEGER NOT NULL,
    "ishsiz" INTEGER NOT NULL,
    "ayollarDaftari" INTEGER NOT NULL,
    "ijtimoiyReestr" INTEGER NOT NULL,
    "migratsiyadanQaytgan" INTEGER NOT NULL,
    "oliyBitiruvchi" INTEGER NOT NULL,
    "ortaMaxsusBitiruvchi" INTEGER NOT NULL,
    "maktabBitiruvchi" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Mahalla_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Household" (
    "id" TEXT NOT NULL,
    "holati" "XatlovHolati" NOT NULL DEFAULT 'QORALAMA',
    "viloyat" TEXT NOT NULL DEFAULT 'Navoiy',
    "tuman" TEXT NOT NULL DEFAULT 'Xatirchi',
    "mahallaId" TEXT NOT NULL,
    "manzil" TEXT NOT NULL,
    "oilaBoshligi" TEXT NOT NULL,
    "tugilganYili" INTEGER,
    "telefon" TEXT,
    "jamiAzo" INTEGER NOT NULL,
    "bolalarSoni" INTEGER NOT NULL DEFAULT 0,
    "mehnatgaLayoqatli" INTEGER NOT NULL DEFAULT 0,
    "ishlaydiganlar" INTEGER NOT NULL DEFAULT 0,
    "davlatKorxonada" INTEGER NOT NULL DEFAULT 0,
    "xususiySektorda" INTEGER NOT NULL DEFAULT 0,
    "ishsizlarSoni" INTEGER NOT NULL DEFAULT 0,
    "bogchaKutayotganAyollar" INTEGER NOT NULL DEFAULT 0,
    "ishsizlikMuddatiOy" INTEGER,
    "ishTuriIstagi" TEXT,
    "kasbHunarIstagi" BOOLEAN NOT NULL DEFAULT false,
    "kasbHunarYonalishi" TEXT[],
    "bandlikTakliflari" TEXT,
    "tadbirkorlikIstagi" BOOLEAN NOT NULL DEFAULT false,
    "tadbirkorlikSohasi" TEXT[],
    "moliyaEhtiyoji" BOOLEAN NOT NULL DEFAULT false,
    "moliyaTuri" TEXT[],
    "talabQilinganMablag" BIGINT,
    "mablagYonalishi" TEXT[],
    "oylikDaromad" BIGINT,
    "daromadManbalari" TEXT[],
    "daromadImkoniyati" TEXT,
    "kambagallikSabablari" TEXT[],
    "maktabgachaYoshdagi" INTEGER NOT NULL DEFAULT 0,
    "maktabgachaQamrovda" INTEGER NOT NULL DEFAULT 0,
    "maktabgachaQamrovsizSababi" TEXT,
    "maktabYoshdagi" INTEGER NOT NULL DEFAULT 0,
    "maktabQamrovda" INTEGER NOT NULL DEFAULT 0,
    "bolalarQiziqishlari" TEXT[],
    "togarakQamrovi" INTEGER NOT NULL DEFAULT 0,
    "togarakSababi" TEXT,
    "uzoqDavolanish" BOOLEAN NOT NULL DEFAULT false,
    "uzoqDavolanishIzoh" TEXT,
    "doriEhtiyoji" TEXT,
    "tibbiyXizmatEhtiyoji" TEXT,
    "oxirgiTibbiyKorik" TEXT,
    "uyHolati" TEXT,
    "ichimlikSuvi" TEXT,
    "sugorishSuvi" BOOLEAN NOT NULL DEFAULT false,
    "elektr" BOOLEAN NOT NULL DEFAULT true,
    "gaz" BOOLEAN NOT NULL DEFAULT false,
    "kanalizatsiya" BOOLEAN NOT NULL DEFAULT false,
    "sanitariya" TEXT,
    "boshqaMuammolar" TEXT,
    "nogironlikBor" BOOLEAN NOT NULL DEFAULT false,
    "nogironlikIzoh" TEXT,
    "yolgizKeksa" BOOLEAN NOT NULL DEFAULT false,
    "parvarishgaMuhtoj" BOOLEAN NOT NULL DEFAULT false,
    "parvarishIzoh" TEXT,
    "boshqaMuhtojlar" TEXT,
    "hujjatlarToliq" BOOLEAN NOT NULL DEFAULT true,
    "hujjatIzoh" TEXT,
    "xizmatTosiqlari" TEXT,
    "tomorqaBor" BOOLEAN NOT NULL DEFAULT false,
    "tomorqaMaydoni" DOUBLE PRECISION,
    "chorvachilik" TEXT,
    "hunarmandchilik" TEXT,
    "zarurKomak" TEXT[],
    "issiqxonaTalabi" BOOLEAN NOT NULL DEFAULT false,
    "issiqxonaMaydoni" DOUBLE PRECISION,
    "ijaraYer" BOOLEAN NOT NULL DEFAULT false,
    "ijaraYerMaydoni" DOUBLE PRECISION,
    "tadbirkorSubyektlar" INTEGER NOT NULL DEFAULT 0,
    "boshIshOrinlari" INTEGER NOT NULL DEFAULT 0,
    "subyektMoliyaEhtiyoji" BOOLEAN NOT NULL DEFAULT false,
    "yangiIshOrinlari" INTEGER NOT NULL DEFAULT 0,
    "umumiyXulosa" TEXT,
    "xatlovSanasi" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "xodimId" TEXT NOT NULL,
    "takrorKaliti" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Household_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UnemployedPerson" (
    "id" TEXT NOT NULL,
    "holati" "IshsizHolati" NOT NULL DEFAULT 'ANIQLANDI',
    "householdId" TEXT,
    "mahallaId" TEXT NOT NULL,
    "fish" TEXT NOT NULL,
    "telefon" TEXT,
    "jinsi" TEXT NOT NULL,
    "oilaviyHolat" TEXT,
    "farzandlarSoni" INTEGER,
    "millati" TEXT,
    "tugilganSana" TIMESTAMP(3),
    "malumoti" TEXT,
    "mutaxassisligi" TEXT,
    "sogliqHolati" TEXT,
    "nogironlik" BOOLEAN NOT NULL DEFAULT false,
    "nogironlikGuruhi" TEXT,
    "yashashManzili" TEXT,
    "kasbHunarEhtiyoji" BOOLEAN NOT NULL DEFAULT false,
    "organmoqchiKasb" TEXT,
    "ishTajribasiYil" DOUBLE PRECISION,
    "avvalgiIshJoyi" TEXT,
    "oxirgiIshJoyi" TEXT,
    "ishdanBoshaganSana" TIMESTAMP(3),
    "xohlaganIsh" TEXT,
    "kutilayotganMaosh" BIGINT,
    "ishgaTayyorligi" TEXT,
    "haydovchilikGuvohnomasi" BOOLEAN NOT NULL DEFAULT false,
    "haydovchilikToifasi" TEXT[],
    "imtiyozEhtiyoji" BOOLEAN NOT NULL DEFAULT false,
    "imtiyozTuri" TEXT[],
    "takliflar" TEXT[],
    "taklifIzohi" TEXT,
    "xulosa" TEXT,
    "ishJoyi" TEXT,
    "ishLavozimi" TEXT,
    "ishgaKirganSana" TIMESTAMP(3),
    "radSababi" TEXT,
    "suhbatSanasi" TIMESTAMP(3),
    "mutaxassisId" TEXT,
    "rasmUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UnemployedPerson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActionPlan" (
    "id" TEXT NOT NULL,
    "holati" "TopshiriqHolati" NOT NULL DEFAULT 'KUTILMOQDA',
    "householdId" TEXT,
    "ishsizId" TEXT,
    "muammo" TEXT NOT NULL,
    "sababi" TEXT,
    "yechim" TEXT NOT NULL,
    "masulTashkilot" TEXT NOT NULL,
    "muddat" TIMESTAMP(3) NOT NULL,
    "bajarilganSana" TIMESTAMP(3),
    "natijaIzohi" TEXT,
    "yaratganId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActionPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vacancy" (
    "id" TEXT NOT NULL,
    "mahallaId" TEXT NOT NULL,
    "korxonaNomi" TEXT NOT NULL,
    "lavozim" TEXT NOT NULL,
    "yonalish" TEXT,
    "ornlarSoni" INTEGER NOT NULL DEFAULT 1,
    "maosh" BIGINT,
    "talablar" TEXT,
    "telefon" TEXT,
    "faol" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vacancy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amal" TEXT NOT NULL,
    "obyektTuri" TEXT,
    "obyektId" TEXT,
    "izoh" TEXT,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "User_rol_faol_idx" ON "User"("rol", "faol");

-- CreateIndex
CREATE INDEX "User_mahallaId_idx" ON "User"("mahallaId");

-- CreateIndex
CREATE UNIQUE INDEX "Mahalla_tartib_key" ON "Mahalla"("tartib");

-- CreateIndex
CREATE UNIQUE INDEX "Mahalla_nomi_key" ON "Mahalla"("nomi");

-- CreateIndex
CREATE INDEX "Mahalla_nomi_idx" ON "Mahalla"("nomi");

-- CreateIndex
CREATE INDEX "Household_mahallaId_holati_idx" ON "Household"("mahallaId", "holati");

-- CreateIndex
CREATE INDEX "Household_xodimId_idx" ON "Household"("xodimId");

-- CreateIndex
CREATE INDEX "Household_xatlovSanasi_idx" ON "Household"("xatlovSanasi");

-- CreateIndex
CREATE UNIQUE INDEX "Household_mahallaId_takrorKaliti_key" ON "Household"("mahallaId", "takrorKaliti");

-- CreateIndex
CREATE INDEX "UnemployedPerson_mahallaId_holati_idx" ON "UnemployedPerson"("mahallaId", "holati");

-- CreateIndex
CREATE INDEX "UnemployedPerson_holati_idx" ON "UnemployedPerson"("holati");

-- CreateIndex
CREATE INDEX "UnemployedPerson_householdId_idx" ON "UnemployedPerson"("householdId");

-- CreateIndex
CREATE INDEX "UnemployedPerson_mutaxassisId_idx" ON "UnemployedPerson"("mutaxassisId");

-- CreateIndex
CREATE INDEX "ActionPlan_masulTashkilot_holati_idx" ON "ActionPlan"("masulTashkilot", "holati");

-- CreateIndex
CREATE INDEX "ActionPlan_muddat_holati_idx" ON "ActionPlan"("muddat", "holati");

-- CreateIndex
CREATE INDEX "ActionPlan_householdId_idx" ON "ActionPlan"("householdId");

-- CreateIndex
CREATE INDEX "ActionPlan_ishsizId_idx" ON "ActionPlan"("ishsizId");

-- CreateIndex
CREATE INDEX "Vacancy_mahallaId_faol_idx" ON "Vacancy"("mahallaId", "faol");

-- CreateIndex
CREATE INDEX "Vacancy_yonalish_faol_idx" ON "Vacancy"("yonalish", "faol");

-- CreateIndex
CREATE INDEX "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_amal_createdAt_idx" ON "AuditLog"("amal", "createdAt");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_mahallaId_fkey" FOREIGN KEY ("mahallaId") REFERENCES "Mahalla"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Household" ADD CONSTRAINT "Household_mahallaId_fkey" FOREIGN KEY ("mahallaId") REFERENCES "Mahalla"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Household" ADD CONSTRAINT "Household_xodimId_fkey" FOREIGN KEY ("xodimId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnemployedPerson" ADD CONSTRAINT "UnemployedPerson_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnemployedPerson" ADD CONSTRAINT "UnemployedPerson_mahallaId_fkey" FOREIGN KEY ("mahallaId") REFERENCES "Mahalla"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnemployedPerson" ADD CONSTRAINT "UnemployedPerson_mutaxassisId_fkey" FOREIGN KEY ("mutaxassisId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionPlan" ADD CONSTRAINT "ActionPlan_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionPlan" ADD CONSTRAINT "ActionPlan_ishsizId_fkey" FOREIGN KEY ("ishsizId") REFERENCES "UnemployedPerson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionPlan" ADD CONSTRAINT "ActionPlan_yaratganId_fkey" FOREIGN KEY ("yaratganId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vacancy" ADD CONSTRAINT "Vacancy_mahallaId_fkey" FOREIGN KEY ("mahallaId") REFERENCES "Mahalla"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

