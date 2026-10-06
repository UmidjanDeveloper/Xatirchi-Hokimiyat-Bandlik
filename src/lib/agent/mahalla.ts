import { prisma } from '@/lib/prisma';
import { hududBahosi } from '@/lib/hudud-qidiruv';
import { lotinga } from '@/lib/alifbo';
import type { Alifbo } from './turlar';

/**
 * ============================================================
 *  MAHALLA NOMINI OVOZDAN TOPISH
 *
 *  Ovozdan matnga o'tkazish ("Qorabuloq") ismlarni tez-tez buzadi:
 *  "Qoraboloq", "Karabuloq", "Qora buloq". Aniq moslik yetmaydi, lekin
 *  YOLG'ON moslik undan yomon: boshqa mahalla ma'lumotini ko'rsatib
 *  qo'yish "topilmadi" deganidan zararliroq.
 *
 *  Shuning uchun uch natija bor:
 *    · topildi   — bitta aniq g'olib;
 *    · noaniq    — bir nechta yaqin variant: foydalanuvchidan so'raladi;
 *    · yoq       — mos nom yo'q.
 *
 *  Baholash `hududBahosi` bilan (kirill/lotin, apostrof, xato harf
 *  hisobga olinadi) — mahalla qidiruvidagi o'sha funksiya.
 * ============================================================
 */

export interface MahallaNomi {
  id: string;
  nomi: string;
  nomiKirill: string;
}

export type MahallaNatijasi =
  | { holat: 'topildi'; mahalla: MahallaNomi }
  | { holat: 'noaniq'; variantlar: MahallaNomi[] }
  | { holat: 'yoq' };

/** Shu balldan past — mos emas */
export const ENG_PAST_BALL = 55;
/** G'olibdan shuncha ballgacha farq qiladigan boshqa mahalla "bahsli" hisoblanadi */
export const BAHS_ORALIGI = 8;

/** Nom bilan birga aytiladigan, nomga kirmaydigan so'zlar */
const QOSHIMCHA_SOZLAR = /\b(mahalla(si|da|ga|ning|dagi)?|mfy|fuqarolar|yig['‘’ʻʼ`]?ini)\b/giu;

export function nomniTozala(matn: string): string {
  return lotinga(matn).replace(QOSHIMCHA_SOZLAR, ' ').replace(/\s+/g, ' ').trim();
}

function aniqKalit(matn: string): string {
  return nomniTozala(matn).toLowerCase().replace(/[‘’ʻʼ`´′']/g, '').replace(/[^a-z0-9]/g, '');
}

/** Toza hisob: ro'yxat va so'rov beriladi, xotira/baza kerak emas (sinov uchun) */
export function mahallaniTanla(royxat: MahallaNomi[], sorov: string): MahallaNatijasi {
  const q = nomniTozala(sorov);
  if (q.length < 3) return { holat: 'yoq' };
  const aniq = royxat.filter((m) => [m.nomi, m.nomiKirill].some((n) => aniqKalit(n) === aniqKalit(q)));
  if (aniq.length === 1) return { holat: 'topildi', mahalla: aniq[0] };
  if (aniq.length > 1) return { holat: 'noaniq', variantlar: aniq.slice(0, 5) };

  const baholar = royxat
    .map((m) => ({ m, ball: Math.max(hududBahosi(m.nomiKirill, q), hududBahosi(m.nomi, q)) }))
    .filter((x) => x.ball >= ENG_PAST_BALL)
    .sort((a, b) => b.ball - a.ball);

  if (baholar.length === 0) return { holat: 'yoq' };

  const eng = baholar[0];
  const yaqinlar = baholar.filter((x) => eng.ball - x.ball <= BAHS_ORALIGI);

  // Fonetik 100 ball ham boshqa yozilish: xato eshitilgan nomni indamay almashtirmaymiz.
  return { holat: 'noaniq', variantlar: yaqinlar.slice(0, 5).map((x) => x.m) };
}

let keshdagi: { vaqt: number; royxat: MahallaNomi[] } | null = null;
const KESH_MS = 5 * 60_000;

export async function mahallaRoyxati(): Promise<MahallaNomi[]> {
  if (keshdagi && Date.now() - keshdagi.vaqt < KESH_MS) return keshdagi.royxat;
  const royxat = await prisma.mahalla.findMany({
    select: { id: true, nomi: true, nomiKirill: true },
    orderBy: { nomi: 'asc' },
  });
  keshdagi = { vaqt: Date.now(), royxat };
  return royxat;
}

export function mahallaKeshiniTozala(): void {
  keshdagi = null;
}

export async function mahallaTop(sorov: string): Promise<MahallaNatijasi> {
  return mahallaniTanla(await mahallaRoyxati(), sorov);
}

/** Mahalla nomini foydalanuvchi alifbosida beradi */
export function mahallaKorinishi(m: { nomi: string; nomiKirill: string }, alifbo: Alifbo): string {
  return alifbo === 'kir' ? m.nomiKirill : m.nomi;
}
