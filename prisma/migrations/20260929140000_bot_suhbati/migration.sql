-- Ботдаги кўп қадамли суҳбат ҳолати.
--
-- Бот бир нечта саволни КЕТМА-КЕТ беради ва олдинги
-- жавобларни эслаб туриши керак. Telegram эса ҳар хабарни
-- алоҳида юборади — орада ҳеч қандай «сеанс» йўқ.
--
-- Шунинг учун ҳолат базада сақланади: ким, қайси қадамда,
-- нималар терилган.
--
-- Миграция ФАҚАТ ҚЎШАДИ.

CREATE TABLE IF NOT EXISTS "BotSuhbati" (
  "id"        TEXT NOT NULL,
  "userId"    TEXT NOT NULL,
  "turi"      TEXT NOT NULL,
  "bosqich"   TEXT NOT NULL,
  "malumot"   JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BotSuhbati_pkey" PRIMARY KEY ("id")
);

-- Битта ходимда бир вақтда БИТТА суҳбат.
-- Иккинчисини бошласа, биринчиси ўрнини босади.
CREATE UNIQUE INDEX IF NOT EXISTS "BotSuhbati_userId_key" ON "BotSuhbati"("userId");

-- Эскирган суҳбатларни тозалаш учун
CREATE INDEX IF NOT EXISTS "BotSuhbati_updatedAt_idx" ON "BotSuhbati"("updatedAt");

DO $$ BEGIN
  ALTER TABLE "BotSuhbati" ADD CONSTRAINT "BotSuhbati_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
