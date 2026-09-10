/**
 * ============================================================
 *  Oddiy tezlik chegarasi (rate limit)
 *
 *  Anketa yuborish API'si ochiq bo'lgani uchun bitta kompyuterdan
 *  ketma-ket yuzlab so'rov kelishi mumkin (bola F5 ni bosaversa
 *  yoki kimdir ataylab urinsa). Bu ma'lumotni buzadi.
 *
 *  Tashqi xizmat (Redis/Upstash) talab qilmaydigan, xotiradagi
 *  "sirpanuvchi oyna" (sliding window) usuli ishlatilgan.
 *
 *  MUHIM cheklov: Vercel kabi serverless muhitda har bir funksiya
 *  nusxasi o'z xotirasiga ega. Shu sababli chegara "taxminiy" —
 *  bir foydalanuvchi bir necha nusxaga tushsa, chegara nusxalar
 *  soniga ko'payadi. Amaliy F5 hujumini bu ham to'xtatadi, chunki
 *  ketma-ket so'rovlar odatda bitta "issiq" nusxaga tushadi.
 *  Qat'iy kafolat kerak bo'lsa — Upstash Redis ga o'tish mumkin.
 * ============================================================
 */

interface Bucket {
  /** So'rovlar vaqtlari (ms) */
  hits: number[];
}

const buckets = new Map<string, Bucket>();

/** Xotira to'lib ketmasligi uchun eskirgan yozuvlarni tozalash oralig'i */
const CLEANUP_EVERY = 500;
let requestCounter = 0;

export interface RateLimitResult {
  allowed: boolean;
  /** Qolgan urinishlar soni */
  remaining: number;
  /** Necha soniyadan so'ng qayta urinish mumkin */
  retryAfter: number;
}

/**
 * Berilgan kalit uchun chegarani tekshiradi.
 *
 * @param key      Odatda IP manzil
 * @param limit    Oynadagi maksimal so'rovlar soni
 * @param windowMs Oyna uzunligi (millisekund)
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const windowStart = now - windowMs;

  // Vaqti-vaqti bilan eskirgan kalitlarni tozalab turamiz
  if (++requestCounter % CLEANUP_EVERY === 0) {
    for (const [k, bucket] of Array.from(buckets.entries())) {
      if (bucket.hits.every((t: number) => t <= windowStart)) buckets.delete(k);
    }
  }

  let bucket = buckets.get(key);
  if (!bucket) {
    bucket = { hits: [] };
    buckets.set(key, bucket);
  }

  // Oynadan chiqib ketgan urinishlarni olib tashlaymiz
  bucket.hits = bucket.hits.filter((t) => t > windowStart);

  if (bucket.hits.length >= limit) {
    const oldest = bucket.hits[0];
    return {
      allowed: false,
      remaining: 0,
      retryAfter: Math.max(1, Math.ceil((oldest + windowMs - now) / 1000)),
    };
  }

  bucket.hits.push(now);
  return {
    allowed: true,
    remaining: limit - bucket.hits.length,
    retryAfter: 0,
  };
}

/**
 * Kalitning hisobini tozalaydi.
 *
 * Muvaffaqiyatli amaldan keyin chaqiriladi: masalan xodim parolni
 * bir-ikki marta xato yozib, keyin to'g'ri kirsa, oldingi xato
 * urinishlar uni bloklab qo'ymasligi kerak.
 */
export function resetRateLimit(key: string): void {
  buckets.delete(key);
}

/**
 * So'rov yuborgan mijozning IP manzilini aniqlaydi.
 * Vercel `x-forwarded-for` sarlavhasini to'ldiradi.
 */
export function getClientIp(request: Request): string {
  const headers = request.headers;
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return headers.get('x-real-ip') ?? 'noma\'lum';
}
