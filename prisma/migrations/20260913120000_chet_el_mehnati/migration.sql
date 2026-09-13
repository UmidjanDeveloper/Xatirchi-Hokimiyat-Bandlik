-- ============================================================
--  ЧЕТ ЭЛДА МЕҲНАТ МИГРАЦИЯСИ
--
--  Хатирчи тумани учун бу АЛОҲИДА бўлим бўлиши шарт: кўп
--  оиланинг асосий даромади чет элдаги аъзосидан келади ва бу
--  рақамсиз оила аҳволини тўғри баҳолаб бўлмайди.
--
--  «Даромади йўқ» деб белгиланган оила аслида ойига бир неча
--  миллион сўм олаётган бўлиши мумкин — ва аксинча, чет элдаги
--  аъзо ишдан чиқса, оила бирдан кўмаксиз қолади. Иккала ҳолат
--  ҳам чора танлашга бевосита таъсир қилади.
--
--  Айнан ЮБОРИЛАДИГАН сумма сўралади, чет элдаги маош эмас:
--  оила бюджетига кириб келадиган пул шу.
-- ============================================================

ALTER TABLE "Household" ADD COLUMN "chetElMehnati"      BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Household" ADD COLUMN "chetElIshchilar"    INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Household" ADD COLUMN "chetElDavlatlari"   TEXT[];
ALTER TABLE "Household" ADD COLUMN "chetElBoshqaDavlat" TEXT;
ALTER TABLE "Household" ADD COLUMN "chetElOylikPul"     BIGINT;
