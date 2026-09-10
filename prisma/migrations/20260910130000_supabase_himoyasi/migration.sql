-- ============================================================
--  SUPABASE HIMOYASI
--
--  Supabase har bir loyihaga "PostgREST" deb ataladigan avtomatik
--  REST API qo'shadi. U `public` sxemasidagi jadvallarni tashqariga
--  ochadi va `anon` (ya'ni ANONIM, hech kim) roli uchun ruxsat
--  beradi. Ya'ni loyihaning ochiq "anon key" ini bilgan har qanday
--  odam brauzerdan turib jadvallarni o'qib ketishi mumkin.
--
--  Bu platformada fuqarolarning shaxsiy ma'lumotlari turadi:
--  F.I.Sh., tug'ilgan sana, manzil, telefon, oilaviy ahvoli,
--  daromadi. Ular hech qachon anonim ochilmasligi kerak.
--
--  Ilova Supabase REST API'sidan UMUMAN foydalanmaydi - u bazaga
--  Prisma orqali to'g'ridan-to'g'ri, `postgres` roli bilan
--  ulanadi. Shuning uchun `anon` va `authenticated` rollarini
--  butunlay yopib qo'yish mumkin va ilova ishlashda davom etadi.
--
--  Ikki qavat himoya qo'yiladi:
--    1) GRANT'lar olib tashlanadi - rol jadvalni umuman ko'rmaydi;
--    2) RLS (Row Level Security) yoqiladi, lekin birorta ham
--       siyosat yozilmaydi - bu "hech kimga hech narsa" degani.
--       `postgres` roli RLS'dan o'tib ketadi, ilova ishlaydi.
--
--  Bu migratsiya oddiy PostgreSQL'da ham xatosiz o'tadi: u yerda
--  `anon`/`authenticated` rollari yo'q, shuning uchun rol bor-
--  yo'qligi avval tekshiriladi.
-- ============================================================

-- ── 1-qavat: RLS. Siyosatsiz RLS = hamma so'rov bo'sh qaytadi ──
ALTER TABLE "User"             ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Mahalla"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Household"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UnemployedPerson" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ActionPlan"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Vacancy"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog"         ENABLE ROW LEVEL SECURITY;

-- ── 2-qavat: GRANT'larni olib tashlash ──
DO $$
DECLARE
  rol text;
BEGIN
  FOREACH rol IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    -- Rol yo'q bo'lsa (oddiy PostgreSQL) - o'tkazib yuboriladi
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = rol) THEN
      EXECUTE format('REVOKE ALL ON ALL TABLES    IN SCHEMA public FROM %I', rol);
      EXECUTE format('REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM %I', rol);
      EXECUTE format('REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM %I', rol);
      EXECUTE format('REVOKE ALL ON SCHEMA public FROM %I', rol);

      -- Kelajakda yaratiladigan jadvallar ham yopiq bo'lsin:
      -- `postgres` roli yaratgan yangi jadvallarga standart ruxsat berilmaydi.
      EXECUTE format(
        'ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON TABLES FROM %I',
        rol
      );
      EXECUTE format(
        'ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON SEQUENCES FROM %I',
        rol
      );

      RAISE NOTICE 'Supabase himoyasi: % roli yopildi', rol;
    END IF;
  END LOOP;
END
$$;
