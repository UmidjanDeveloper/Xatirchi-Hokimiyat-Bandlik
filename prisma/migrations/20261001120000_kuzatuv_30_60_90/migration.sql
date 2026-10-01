-- ============================================================
--  30/60/90 КУНЛИК КУЗАТУВ
--
--  Мавжуд «уч ойлик назорат» битта топшириқ эди: «боғланиб
--  ишлаётганини аниқланг». Натижа матн — уни ҳисоблаб бўлмайди.
--
--  Бу жадвал саволларни ажратади (ишга кирдими, қолаяптими, келишилган
--  ҳақни оляптими, шароит мосми, даромад, қўшимча ёрдам) ва ҲАР
--  ЖАВОБНИНГ МАНБАСИНИ ёзади: нома'лум / ходим қайд этган / фуқаро
--  билдирган / текширилган.
--
--  ── ФАҚАТ ҚЎШАДИ ──
--
--  Битта янги жадвал ва тўртта янги тур. Мавжуд жадвалларга тегилмайди,
--  мавжуд ёзувлар учун ҳеч нарса яратилмайди (орқага қараб тўлдириш
--  йўқ): муддати келган текширув рўйхати ёзувларсиз, ишга кирган
--  санадан ҳисобланади.
-- ============================================================

DO $$ BEGIN
  CREATE TYPE "KuzatuvJavobi" AS ENUM ('HA', 'YOQ', 'NOMALUM');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "MalumotDarajasi" AS ENUM ('NOMALUM', 'XODIM_QAYD_ETGAN', 'FUQARO_BILDIRGAN', 'TEKSHIRILGAN');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "KuzatuvNatijasi" AS ENUM ('MALUMOT_OLINDI', 'BOGLANILMADI');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "KuzatuvTekshiruvi" (
  "id"                 TEXT NOT NULL,
  "joylashishId"       TEXT NOT NULL,
  "kunBelgisi"         INTEGER NOT NULL,
  "rejaSana"           TIMESTAMP(3) NOT NULL,
  "natija"             "KuzatuvNatijasi" NOT NULL,
  "tekshiruvSanasi"    TIMESTAMP(3) NOT NULL,
  "tasdiqSanasi"       TIMESTAMP(3),
  "manba"              "MalumotDarajasi" NOT NULL DEFAULT 'NOMALUM',
  "ishBoshladi"        "KuzatuvJavobi" NOT NULL DEFAULT 'NOMALUM',
  "ishdaQolmoqda"      "KuzatuvJavobi" NOT NULL DEFAULT 'NOMALUM',
  "haqOlmoqda"         "KuzatuvJavobi" NOT NULL DEFAULT 'NOMALUM',
  "sharoitMos"         "KuzatuvJavobi" NOT NULL DEFAULT 'NOMALUM',
  "qoshimchaYordam"    "KuzatuvJavobi" NOT NULL DEFAULT 'NOMALUM',
  "ishHaqiSom"         BIGINT,
  "oilaDaromadiSom"    BIGINT,
  "oldingiDaromadSom"  BIGINT,
  "daromadManbasi"     "MalumotDarajasi" NOT NULL DEFAULT 'NOMALUM',
  "tugashSababi"       TEXT,
  "yordamIzohi"        TEXT,
  "dalilId"            TEXT,
  "qaytaUrinishSanasi" TIMESTAMP(3),
  "kiritganId"         TEXT NOT NULL,
  "createdAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "KuzatuvTekshiruvi_pkey" PRIMARY KEY ("id")
);

-- Бир иш учун ҳар босқичга БИТТА ёзув
CREATE UNIQUE INDEX IF NOT EXISTS "KuzatuvTekshiruvi_joylashishId_kunBelgisi_key" ON "KuzatuvTekshiruvi"("joylashishId", "kunBelgisi");
CREATE INDEX IF NOT EXISTS "KuzatuvTekshiruvi_kunBelgisi_natija_idx" ON "KuzatuvTekshiruvi"("kunBelgisi", "natija");
CREATE INDEX IF NOT EXISTS "KuzatuvTekshiruvi_rejaSana_idx" ON "KuzatuvTekshiruvi"("rejaSana");
CREATE INDEX IF NOT EXISTS "KuzatuvTekshiruvi_kiritganId_idx" ON "KuzatuvTekshiruvi"("kiritganId");
CREATE INDEX IF NOT EXISTS "KuzatuvTekshiruvi_dalilId_idx" ON "KuzatuvTekshiruvi"("dalilId");

DO $$ BEGIN
  ALTER TABLE "KuzatuvTekshiruvi" ADD CONSTRAINT "KuzatuvTekshiruvi_joylashishId_fkey"
    FOREIGN KEY ("joylashishId") REFERENCES "IshgaJoylashish"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "KuzatuvTekshiruvi" ADD CONSTRAINT "KuzatuvTekshiruvi_dalilId_fkey"
    FOREIGN KEY ("dalilId") REFERENCES "JoylashuvDalili"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "KuzatuvTekshiruvi" ADD CONSTRAINT "KuzatuvTekshiruvi_kiritganId_fkey"
    FOREIGN KEY ("kiritganId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
