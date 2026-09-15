-- ═══════════════════════════════════════════════════════════
--  ҲОКИМ ЮБОРГАН ҚЎШИМЧАЛАР
--
--  Саккизта банд, ҳар бири бир хил сабабдан: мавжуд савол
--  ЖАВОБ берарди, аммо ундан ЧОРА чиқмасди.
--
--  · «12 та бола» — 0-3, 3-17 ва 18+ учун уч хил чора керак;
--  · «чорваси бор» — 2 та товуқ ҳам, 40 та қорамол ҳам бир хил
--    кўринарди, субсидия эса бош сонига қараб берилади;
--  · «Россияда» — Москвами, Сургутми: консуллик иши шаҳар
--    даражасида юритилади;
--  · пул «сўм» деб ёзиларди — 500 доллар билан 5 млн сўм бир
--    устунга қўшилиб кетарди;
--  · «ёлғиз кекса бор» — «Инсон» маркази исмсиз рўйхатдан
--    ҳеч кимни топа олмайди;
--  · «Бошқа» танланар, нимаси ёзилмасди.
--
--  Иккита янги бўлим: пассив даромад (ишга жойлаштириб
--  бўлмайдиган аъзо учун учинчи йўл) ва маҳалла инфратузилмаси
--  (камбағалликнинг сабаби кўпинча хонадонда эмас, кўчада).
-- ═══════════════════════════════════════════════════════════

-- Болалар ёш гуруҳлари
ALTER TABLE "Household" ADD COLUMN "bolalar0_3Yosh"   INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Household" ADD COLUMN "bolalar3_17Yosh"  INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Household" ADD COLUMN "bolalar18Yoshdan" INTEGER NOT NULL DEFAULT 0;

-- Маблағ йўналиши «Бошқа»
ALTER TABLE "Household" ADD COLUMN "mablagYonalishiBoshqa" TEXT;

-- Чет эл: валюта, сўмдаги қиймат, шаҳарлар
ALTER TABLE "Household" ADD COLUMN "chetElValyuta"      TEXT;
ALTER TABLE "Household" ADD COLUMN "chetElOylikPulSom"  BIGINT;
ALTER TABLE "Household" ADD COLUMN "chetElShaharlari"   TEXT[];
ALTER TABLE "Household" ADD COLUMN "chetElBoshqaShahar" TEXT;

-- Мавжуд ёзувлар сўмда деб қабул қилинади: илгари майдон
-- «сўм» деб аталган ва ходимлар шунга қараб тўлдирган.
UPDATE "Household"
   SET "chetElValyuta" = 'UZS',
       "chetElOylikPulSom" = "chetElOylikPul"
 WHERE "chetElOylikPul" IS NOT NULL;

-- Ёлғиз яшовчи кексалар — исм рўйхати
ALTER TABLE "Household" ADD COLUMN "yolgizKeksaShaxslar" JSONB;

-- Чорва бош сони
ALTER TABLE "Household" ADD COLUMN "yirikShoxliSoni" INTEGER;
ALTER TABLE "Household" ADD COLUMN "maydaShoxliSoni" INTEGER;
ALTER TABLE "Household" ADD COLUMN "parrandaSoni"    INTEGER;

-- Пассив даромад
ALTER TABLE "Household" ADD COLUMN "passivDaromadIstagi"  BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Household" ADD COLUMN "passivDaromadTurlari" TEXT[];
ALTER TABLE "Household" ADD COLUMN "passivDaromadIzohi"   TEXT;

-- Маҳалла инфратузилмаси
ALTER TABLE "Household" ADD COLUMN "infratuzilmaMuammolari" TEXT[];
ALTER TABLE "Household" ADD COLUMN "infratuzilmaBoshqa"     TEXT;
ALTER TABLE "Household" ADD COLUMN "infratuzilmaIzohi"      TEXT;
