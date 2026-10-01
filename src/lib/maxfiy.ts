import { createHash } from 'node:crypto';

/**
 * ============================================================
 *  XATO MATNINI MAXFIY MA'LUMOTSIZ QILISH
 *
 *  Xato jurnaliga va administrator ekraniga tushadigan har qanday
 *  matn shu yerdan o'tadi. Maqsad: jurnalni o'qiydigan odam (yoki
 *  ekran suratiga tushib qolgan matn) quyidagilarni KO'RMASLIGI:
 *
 *   · baza ulanish satri (login:parol@host)
 *   · Telegram bot tokeni (u xato matnida URL ichida chiqadi:
 *     "request to https://api.telegram.org/bot123:ABC.../sendMessage failed")
 *   · Bearer token, JWT, API kalitlari
 *   · parol, sir, kuki kabi "kalit=qiymat" juftlari
 *   · telefon raqami, JSHSHIR, e-pochta (fuqaro shaxsiy ma'lumoti)
 *   · Prisma xatosidagi so'rov argumentlari: u yerda fuqaroning ismi,
 *     telefoni va boshqa yozilayotgan qiymatlar turadi
 *
 *  Bu "oxirgi to'siq": xato matni jurnalga yozilishidan OLDIN ham,
 *  ekranda ko'rsatilishidan OLDIN ham (eski yozuvlar uchun) qo'llanadi.
 *
 *  Tozalash TAXMINIY emas, kafolat berishga intiladi, lekin barcha
 *  shaklni oldindan bilib bo'lmaydi: shuning uchun xabar uzunligi
 *  cheklangan va ayni ketma-ketliklar (uzun raqamlar, uzun tasodifiy
 *  satrlar) har holda yashiriladi.
 * ============================================================
 */

/** Jurnaldagi bitta xabarning eng katta uzunligi */
export const XATO_UZUNLIGI = 400;

const YASHIRILDI = '[yashirildi]';

/**
 * Prisma xatosining so'rov kodi (argumentlar) qismini tashlab, faqat sababini qoldiradi.
 *
 * Prisma xabari: sarlavha ("Invalid `prisma.x.create()` invocation in"), fayl joyi,
 * KOD PARCHASI (raqamli satrlar, "→" bilan belgilangan satr va uning argumentlari -
 * fuqaroning ismi, telefoni shu yerda turadi) va oxirida SABAB. Kod parchasidagi
 * satrlar bo'shliq, raqam yoki "→" bilan boshlanadi; sabab esa chap chetdan, oddiy matn.
 */
function prismaQisqartma(matn: string): string {
  const satrlar = matn.split('\n');
  const h = satrlar.findIndex((q) => /Invalid `[^`]+` invocation/.test(q));
  if (h === -1) return matn;

  const op = satrlar[h].match(/Invalid `([^`]+)` invocation/)![1];
  const sabab = satrlar
    .slice(h + 1)
    .filter((q) => q.trim() !== '' && /^[^\s→\d/{}[\]()]/.test(q))
    .map((q) => q.trim());
  /* Sarlavhadan oldingi qism (xato nomi va kodi: "PrismaClientKnownRequestError P2002:") saqlanadi */
  const oldi = satrlar.slice(0, h).join(' ').trim();
  return `${oldi ? `${oldi} ` : ''}${op}: ${sabab.join(' ') || 'xato'}`;
}

/**
 * Matndan maxfiy qismlarni olib tashlaydi va uzunligini cheklaydi.
 * Hech qachon xato tashlamaydi.
 */
export function maxfiyniTozala(kirish: unknown, uzunlik = XATO_UZUNLIGI): string {
  let m: string;
  try {
    m = typeof kirish === 'string' ? kirish : kirish instanceof Error ? kirish.message : String(kirish);
  } catch {
    return '[o‘qib bo‘lmadi]';
  }

  m = prismaQisqartma(m);

  /* 1. Ulanish satrlari: sxema://login:parol@host/... */
  m = m.replace(/\b[a-z][a-z0-9+.-]*:\/\/[^\s/@:]+(?::[^\s/@]*)?@[^\s'"<>]+/gi, '[ulanish-satri]');

  /* 2. Telegram bot tokeni: 123456789:AA... (URL ichida ham, alohida ham) */
  m = m.replace(/(?<!\d)\d{6,12}:[A-Za-z0-9_-]{30,}/g, '[bot-token]');

  /* 3. JWT */
  m = m.replace(/\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]*/g, '[jwt]');

  /* 4. Bearer va Basic */
  m = m.replace(/\b(Bearer|Basic)\s+[A-Za-z0-9._~+/=-]{6,}/gi, `$1 ${YASHIRILDI}`);

  /* 5. Mashhur API kalit shakllari */
  m = m.replace(/\b(?:sk|pk|gsk|rk)[-_][A-Za-z0-9_-]{16,}/g, '[kalit]');
  m = m.replace(/\bAIza[0-9A-Za-z_-]{20,}/g, '[kalit]');
  m = m.replace(/\b(?:ghp|gho|ghs|github_pat)_[A-Za-z0-9_]{16,}/g, '[kalit]');

  /* 6. "kalit=qiymat" / "kalit: qiymat" ko'rinishidagi sirlar */
  m = m.replace(
    /\b(password|passwd|parol|secret|sir|token|api[_-]?key|apikey|authorization|cookie|set-cookie|session|sessiya|passwordHash)\b(["']?\s*[:=]\s*)("[^"]*"|'[^']*'|[^\s,;&)}\]]+)/gi,
    `$1$2${YASHIRILDI}`
  );

  /* 7. E-pochta */
  m = m.replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '[e-pochta]');

  /* 8. Telefon, JSHSHIR va boshqa uzun raqamlar: 7 va undan ko'p raqam (ajratgichlar bilan) */
  m = m.replace(/\+?\d(?:[\s().-]?\d){6,}/g, '[raqam]');

  /* 9. Uzun tasodifiy satrlar (xesh, kalit): 40 va undan ko'p belgi */
  m = m.replace(/\b[A-Za-z0-9_+/=-]{40,}\b/g, '[uzun-qator]');

  /* 10. Tirnoq ichidagi qiymatlar: Prisma "Argument `x`: Got invalid value 'Ali'" kabi joylarda fuqaro ma'lumoti bo'lishi mumkin */
  m = m.replace(/(value|qiymat|got|received|key)\s+(["'])([^"']{1,200})\2/gi, `$1 $2${YASHIRILDI}$2`);

  /* 11. Fayl yo'li: faqat fayl nomi qoladi */
  m = m.replace(/(?:\/[\w.@~-]+){2,}\/([\w.-]+\.(?:ts|tsx|js|mjs|cjs))(?::\d+(?::\d+)?)?/g, '$1');

  m = m.replace(/\s+/g, ' ').trim();
  if (m.length > uzunlik) m = `${m.slice(0, uzunlik - 1)}…`;
  return m || 'noma‘lum xato';
}

/**
 * Xatoni jurnal uchun bir qatorga keltiradi: nom, kod, tozalangan xabar.
 */
export function xatoXulosasi(e: unknown): string {
  if (e instanceof Error) {
    const kod = (e as { code?: unknown }).code;
    const bosh = [e.name, typeof kod === 'string' ? kod : null].filter(Boolean).join(' ');
    return maxfiyniTozala(`${bosh}: ${e.message}`);
  }
  return maxfiyniTozala(e);
}

/**
 * Bir xil xatoni bitta qatorga yig'ish uchun xesh.
 * Raqamlar va identifikatorlar normallashtiriladi: "id=cm123… topilmadi" har safar
 * yangi xato bo'lib ketmasin.
 */
export function xatoXeshi(manba: string, tozalanganXabar: string): string {
  const oddiy = tozalanganXabar
    .replace(/\bc[a-z0-9]{23,29}\b/g, '#')
    .replace(/\d+/g, '#')
    .toLowerCase();
  return createHash('sha256').update(`${manba}\n${oddiy}`).digest('hex').slice(0, 32);
}

/** Kirish chegarasi kaliti: login va IP bazaga xom holda yozilmaydi */
export function kalitXeshi(kalit: string): string {
  return createHash('sha256').update(kalit).digest('hex').slice(0, 40);
}
