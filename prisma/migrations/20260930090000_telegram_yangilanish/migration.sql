-- ============================================================
--  ТЕЛЕГРАМ ЯНГИЛАНИШЛАРИ — ТАКРОРНИ ТЎСИШ
--
--  Telegram жавоб ололмаса ўша янгиланишни қайта юборади.
--  Ҳимоясиз бўлса, бир «тасдиқлаш» тугмаси икки марта
--  ишларди: бир эълон икки марта тарқалар, бир ариза икки
--  марта ҳал қилинар эди.
--
--  Фақат ҚЎШАДИ: мавжуд жадвалларга тегмайди.
-- ============================================================
CREATE TABLE IF NOT EXISTS "TelegramYangilanish" (
  "updateId"  BIGINT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TelegramYangilanish_pkey" PRIMARY KEY ("updateId")
);

CREATE INDEX IF NOT EXISTS "TelegramYangilanish_createdAt_idx"
  ON "TelegramYangilanish"("createdAt");
