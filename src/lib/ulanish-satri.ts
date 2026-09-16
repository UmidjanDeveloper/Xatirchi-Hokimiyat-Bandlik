
/**
 * ============================================================
 *  PRISMA MIJOZI
 *
 *  ── Nega ulanish satri qayta yoziladi ──
 *
 *  2026-yil 16-sentabrda sayt "juda sekin" bo'lib qoldi va
 *  boshqaruv panelida aniq xabar chiqdi:
 *
 *      Bazaga ulanishlar chegarasi to'lgan
 *
 *  Sabab Vercel'ning ishlash usulida. Har so'rov alohida
 *  funksiya nusxasida bajariladi va HAR NUSXA o'z Prisma
 *  mijozini yaratadi. Prisma esa standart holatda
 *  `num_cpus * 2 + 1` ta ulanish ochadi — ya'ni bitta nusxa
 *  uchun 5-9 ta. O'nta xodim bir vaqtda ishlasa, Supabase'ning
 *  bepul tarifidagi ulanishlar bir zumda tugaydi.
 *
 *  Tugagach nima bo'ladi: yangi so'rovlar navbatda turadi va
 *  bir necha soniyadan keyin xato beradi. Foydalanuvchi buni
 *  "sayt sekin" va "tushunarsiz uzilishlar" deb ko'radi.
 *
 *  Yechim: serverless'da har nusxaga BITTA ulanish yetadi —
 *  nusxa baribir bir vaqtda bitta so'rovni bajaradi. Shuning
 *  uchun `connection_limit=1` majburan qo'yiladi.
 *
 *  ── Nega sozlamada emas, kodda ──
 *
 *  Buni `DATABASE_URL` ga qo'lda yozish ham mumkin, lekin
 *  o'shanda u bitta odamning esida qolishiga bog'liq bo'ladi.
 *  Kodda bo'lsa — har doim ishlaydi va yangi muhitda ham
 *  o'z-o'zidan to'g'ri bo'ladi.
 *
 *  Sozlamada ALLAQACHON yozilgan bo'lsa, tegilmaydi: odam
 *  ataylab qo'ygan qiymat kodnikidan ustun.
 * ============================================================
 */

/**
 * Serverless uchun xavfsiz ulanish satri.
 *
 * Mavjud parametrlarga TEGMAYDI — faqat yo'qlarini qo'shadi.
 */
export function ulanishSatri(): string | undefined {
  const xom = process.env.DATABASE_URL;
  if (!xom) return undefined;

  try {
    const u = new URL(xom);

    /*
     * Supabase puleri (6543-port) tranzaksiya rejimida ishlaydi
     * va tayyorlangan so'rovlarni qo'llab-quvvatlamaydi. Prisma
     * buni `pgbouncer=true` orqali biladi; aytilmasa, so'rovlar
     * tasodifiy xato bera boshlaydi.
     */
    const pulerdanmi = u.port === '6543' || u.hostname.includes('pooler');
    if (pulerdanmi && !u.searchParams.has('pgbouncer')) {
      u.searchParams.set('pgbouncer', 'true');
    }

    /*
     * ── ULANISHLAR SONI ──
     *
     * Ikki xil holat, ikki xil javob.
     *
     * TO'G'RIDAN-TO'G'RI ulanishda (5432) Postgres'ning o'zida
     * ulanishlar kam — Supabase'ning bepul tarifida ~60 ta.
     * Har funksiya nusxasi 5-9 tadan olsa, o'nta xodim ishlasa
     * ular tugaydi. Shuning uchun bitta.
     *
     * PULER ORQALI esa aksincha. Puler minglab mijoz ulanishini
     * bir nechta haqiqiy ulanishga yig'adi — cheklashning
     * hojati yo'q. Bu yerda bittaga tushirish ZARAR qiladi:
     * panel bir vaqtda to'qqizta so'rov yuboradi va ular
     * NAVBATDA turadi. Baza bilan aloqa 463 ms bo'lsa,
     * to'qqiztasi ketma-ket 5,5 soniyaga aylanadi — ishlab
     * chiqarishda aynan shu bo'ldi.
     *
     * Beshta yetadi: panel so'rovlari parallel ketadi, puler
     * esa bu yukni bemalol ko'taradi.
     */
    if (!u.searchParams.has('connection_limit')) {
      u.searchParams.set('connection_limit', pulerdanmi ? '5' : '1');
    }

    return u.toString();
  } catch {
    /* Satr noto'g'ri bo'lsa - o'zini beramiz, Prisma o'zi aytadi */
    return xom;
  }
}

