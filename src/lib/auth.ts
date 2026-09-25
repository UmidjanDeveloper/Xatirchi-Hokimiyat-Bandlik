/**
 * ============================================================
 *  AUTENTIFIKATSIYA VA SESSIYA
 *
 *  Kelajak Egasi'dan asosiy farq: u yerda BITTA umumiy parol
 *  yetarli edi, chunki panel faqat statistikani ko'rsatardi.
 *
 *  Bu yerda esa har bir yozuvning ostida aniq xodimning ismi va
 *  imzosi turadi - "suhbatni kim o'tkazdi", "xatlovni kim
 *  qildi", "topshiriqni kim yopdi". Umumiy parol bilan bu
 *  savollarga javob bo'lmaydi. Shuning uchun har xodimga
 *  alohida login/parol beriladi.
 *
 *  Parol scrypt bilan xeshlanadi - Node'ning o'zida bor,
 *  qo'shimcha kutubxona kerak emas va bcrypt darajasida ishonchli.
 * ============================================================
 */

import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';
import type { Rol } from '@prisma/client';
import { SESSION_COOKIE } from './sessiya-nomi';

export { SESSION_COOKIE } from './sessiya-nomi';

/** Sessiya muddati - 12 soat (bir ish kuni) */
const SESSION_MS = 12 * 60 * 60 * 1000;

const SCRYPT_KEYLEN = 64;

// ─────────────────────────────────────────────────────────────
//  PAROL
// ─────────────────────────────────────────────────────────────

/** Parolni "salt:hash" ko'rinishida xeshlaydi */
export function parolXeshla(parol: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(parol, salt, SCRYPT_KEYLEN).toString('hex');
  return `${salt}:${hash}`;
}

/**
 * Parolni tekshiradi.
 *
 * Taqqoslash `timingSafeEqual` bilan: oddiy `===` xeshning nechta
 * boshlang'ich bayti to'g'ri kelganini javob vaqti orqali oshkor
 * qiladi va parolni bit-bit topib olish mumkin bo'lardi.
 */
export function parolTogrimi(parol: string, saqlangan: string): boolean {
  const [salt, hash] = saqlangan.split(':');
  if (!salt || !hash) return false;

  const kutilgan = Buffer.from(hash, 'hex');
  if (kutilgan.length !== SCRYPT_KEYLEN) return false;

  const hisoblangan = scryptSync(parol, salt, SCRYPT_KEYLEN);
  return timingSafeEqual(kutilgan, hisoblangan);
}

/**
 * Parol talablari.
 *
 * Xodimlar orasida "12345678" qo'yish odati kuchli, shuning uchun
 * faqat uzunlik emas, tarkib ham tekshiriladi.
 */
export function parolYaroqlimi(parol: string): { ok: boolean; xato?: string } {
  if (parol.length < 8) {
    return { ok: false, xato: 'Parol kamida 8 ta belgidan iborat bo‘lishi kerak' };
  }
  if (!/[a-zA-Z]/.test(parol)) {
    return { ok: false, xato: 'Parolda kamida bitta harf bo‘lishi kerak' };
  }
  if (!/[0-9]/.test(parol)) {
    return { ok: false, xato: 'Parolda kamida bitta raqam bo‘lishi kerak' };
  }
  const oson = ['12345678', 'password', 'parol123', 'admin123', 'qwerty123'];
  if (oson.includes(parol.toLowerCase())) {
    return { ok: false, xato: 'Bu parol juda oson - boshqasini tanlang' };
  }
  return { ok: true };
}

// ─────────────────────────────────────────────────────────────
//  SESSIYA
// ─────────────────────────────────────────────────────────────

export interface Sessiya {
  userId: string;
  username: string;
  fullName: string;
  rol: Rol;
  /// YETTILIK roli uchun - faqat shu mahallani ko'radi
  mahallaId: string | null;
  /// Muddati (ms)
  exp: number;
}

function kalit(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32 || secret.startsWith('ALMASHTIRING')) {
    throw new Error(
      'SESSION_SECRET sozlanmagan. `openssl rand -base64 32` bilan yarating va .env ga yozing.'
    );
  }
  return secret;
}

function imzola(payload: string): string {
  return createHmac('sha256', kalit()).update(payload).digest('base64url');
}

/** Sessiyani imzolangan token ko'rinishiga keltiradi */
export function sessiyaYarat(
  data: Omit<Sessiya, 'exp'>
): { token: string; exp: number } {
  const exp = Date.now() + SESSION_MS;
  const payload = Buffer.from(JSON.stringify({ ...data, exp })).toString('base64url');
  return { token: `${payload}.${imzola(payload)}`, exp };
}

/**
 * Tokenni tekshiradi va sessiyani qaytaradi.
 * Imzo noto'g'ri yoki muddati o'tgan bo'lsa - `null`.
 */
export function sessiyaOqi(token?: string | null): Sessiya | null {
  if (!token) return null;

  const [payload, imzo] = token.split('.');
  if (!payload || !imzo) return null;

  const kutilgan = imzola(payload);
  // Uzunlik farq qilsa timingSafeEqual xato beradi, shuning uchun oldin tekshiramiz
  if (imzo.length !== kutilgan.length) return null;
  if (!timingSafeEqual(Buffer.from(imzo), Buffer.from(kutilgan))) return null;

  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString()) as Sessiya;
    if (!data.exp || data.exp < Date.now()) return null;
    return data;
  } catch {
    return null;
  }
}

/** Joriy so'rovdagi sessiya (server komponentlari uchun) */
export function joriySessiya(): Sessiya | null {
  return sessiyaOqi(cookies().get(SESSION_COOKIE)?.value);
}

// ─────────────────────────────────────────────────────────────
//  HUQUQLAR
// ─────────────────────────────────────────────────────────────

/** Xatlov va anketa kirita oladimi */
export function yozaOladi(rol: Rol): boolean {
  return rol === 'YETTILIK' || rol === 'BANDLIK' || rol === 'BANDLIK_RAHBAR' || rol === 'ADMIN';
}

/** Ishsizlar bilan ishlash (suhbat, taklif, joylashtirish) */
export function bandlikIshi(rol: Rol): boolean {
  return rol === 'BANDLIK' || rol === 'BANDLIK_RAHBAR' || rol === 'ADMIN';
}

/** Hokim panelini ko'ra oladimi */
export function tahlilKoradi(rol: Rol): boolean {
  return rol === 'HOKIM' || rol === 'BANDLIK_RAHBAR' || rol === 'ADMIN';
}

/**
 * AI xulosasini SO'RAY oladimi.
 *
 * Qoida bo'yicha xulosa HAMMAGA ko'rinadi va bepul: u anketadagi
 * chegaralardan hisoblanadi, tashqariga so'rov yubormaydi.
 *
 * AI esa pul turadi va har so'rov hisobdan yechiladi. Shuning
 * uchun u faqat QAROR QABUL QILADIGAN darajaga ochiq: hokim,
 * bandlik rahbari va administrator. Mahalla xodimi va bandlik
 * mutaxassisi kundalik ishda o'nlab yozuvni ochadi - ularning
 * har biriga model chaqirilsa, byudjet bir haftada tugardi.
 *
 * Ayni paytda `tahlilKoradi` bilan bir xil ro'yxat, lekin
 * MA'NOSI boshqa: biri "panelni ko'radi", ikkinchisi "modelga
 * pul sarflashi mumkin". Ertaga biri o'zgarsa, ikkinchisi
 * o'zgarmasligi kerak.
 */
export function aiXulosaSoraydi(rol: Rol): boolean {
  return rol === 'HOKIM' || rol === 'BANDLIK_RAHBAR' || rol === 'ADMIN';
}

/**
 * So'rovga qo'shiladigan mahalla filtri.
 *
 * YETTILIK a'zosi faqat o'z mahallasini ko'rishi kerak. Buni har bir
 * so'rovda qo'lda yozish o'rniga shu yordamchi ishlatiladi - bir joyda
 * unutilsa, butun tumandagi oilalar ma'lumoti ochilib qolardi.
 */
export function mahallaFiltri(sessiya: Sessiya): { mahallaId?: string } {
  if (sessiya.rol === 'YETTILIK' && sessiya.mahallaId) {
    return { mahallaId: sessiya.mahallaId };
  }
  return {};
}

/** Xodim shu mahalladagi yozuvga tega oladimi */
export function mahallagaRuxsat(
  /*
   * Тўлиқ сессия эмас, фақат КЕРАКЛИ иккита майдон.
   *
   * Занжирга Telegram орқали ҳам кирилади — у ерда сессия
   * умуман йўқ, боғланган ходимнинг роли ва маҳалласи бор,
   * холос. Тур торайтирилгани учун иккала йўл ҲАМ шу
   * текширувдан ўтади.
   */
  sessiya: Pick<Sessiya, 'rol' | 'mahallaId'>,
  mahallaId: string
): boolean {
  if (sessiya.rol === 'YETTILIK') return sessiya.mahallaId === mahallaId;
  return true;
}
