import { prisma } from './prisma';
import { CRON_ISHLARI, KECHIKISH_KOEFFITSIENTI, ishlarHolati, type IshBahosi } from './tizim-kuzatuvi';
import { maxfiyniTozala } from './maxfiy';

/**
 * ============================================================
 *  SALOMATLIK TEKSHIRUVI — TASHQI MONITORING UCHUN
 *
 *  `GET /api/health`            — jarayon tirik (bazaga tegmaydi)
 *  `GET /api/health/readiness`  — baza javob beradi va avtomatik ishlar
 *                                 o'z vaqtida ishlagan (200 yoki 503)
 *
 *  Nega kerak: tizimda ish yurmay qolsa (baza uzildi, cron o'ldi), buni
 *  faqat xodim "ochilmayapti" deganda bilamiz. Tashqi uptime xizmati
 *  (UptimeRobot, Better Stack, ...) shu manzilni har 5 daqiqada so'raydi
 *  va 503 bo'lsa administratorga xabar yuboradi.
 *
 *  ── Ochiq yo'l, shuning uchun QOP-QO'POL ──
 *
 *  Sessiyasiz ochiladi. Shu sababli javobda FAQAT "ok / degraded" va ikki
 *  mantiqiy qiymat bor: xato matni, versiya, vaqt, sonlar, jadval nomlari
 *  CHIQMAYDI (Prisma xatosida ulanish ma'lumoti bo'lishi mumkin). Batafsil
 *  holat — administrator uchun /tizim sahifasida.
 *
 *  Bazaga yuk: natija 10 soniya xotirada saqlanadi — kimdir manzilni
 *  tinimsiz so'rasa ham baza sekundiga bitta so'rovdan ko'p olmaydi.
 * ============================================================
 */

export interface SalomatlikNatijasi {
  status: 'ok' | 'degraded';
  tekshiruvlar: { baza: boolean; avtomatikIshlar: boolean };
}

/** Baza shu vaqtdan ko'p javob bermasa - "yo'q" */
export const BAZA_VAQTI_MS = 3000;
/** Natija xotirada necha ms turadi */
export const KESH_MS = 10_000;
/** Kuzatuv yoqilgandan shuncha soat o'tgach ham jadval BIR MARTA ham ishlamagan bo'lsa - nosoz */
export const BIRINCHI_ISH_MUDDATI_SOAT = 24 * KECHIKISH_KOEFFITSIENTI;

/**
 * Avtomatik ishlar sog'lommi (sof hisob).
 *
 *  · kechikkan / xato bilan tugagan / to'xtab qolgan -> nosog'
 *  · "hali ishlamagan": kuzatuv yangi yoqilgan bo'lsa kutiladi (aks holda
 *    har deployda soxta signal); eskirgan bo'lsa nosog' — jadval umuman
 *    ishlamayapti. `tizimYoshiSoat` noma'lum (null) bo'lsa - kutiladi.
 */
export function ishlarSogMi(baholar: readonly IshBahosi[], tizimYoshiSoat: number | null): boolean {
  for (const b of baholar) {
    if (b === 'KECHIKKAN' || b === 'XATODA' || b === 'TOXTAB_QOLGAN') return false;
    if (b === 'HECH_QACHON' && tizimYoshiSoat !== null && tizimYoshiSoat > BIRINCHI_ISH_MUDDATI_SOAT) return false;
  }
  return true;
}

function vaqtBilan<T>(va: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((yech, rad) => {
    const t = setTimeout(() => rad(new Error('vaqt tugadi')), ms);
    va.then(
      (x) => {
        clearTimeout(t);
        yech(x);
      },
      (e) => {
        clearTimeout(t);
        rad(e);
      }
    );
  });
}

/** Kuzatuv migratsiyasi qachon qo'llangan (soat oldin); o'qilmasa null */
async function tizimYoshi(hozir: Date): Promise<number | null> {
  try {
    const q = await prisma.$queryRaw<{ t: Date | null }[]>`
      SELECT finished_at AS t FROM "_prisma_migrations"
      WHERE migration_name LIKE '%_monitoring' AND finished_at IS NOT NULL
      ORDER BY finished_at ASC LIMIT 1`;
    const t = q[0]?.t;
    return t ? (hozir.getTime() - new Date(t).getTime()) / 3600_000 : null;
  } catch {
    return null;
  }
}

let kesh: { vaqt: number; natija: SalomatlikNatijasi } | null = null;

/** Sinovlar uchun */
export function salomatlikKeshiniTozala(): void {
  kesh = null;
}

/**
 * @param yosh sinov uchun: kuzatuv yoshini (soat) qo'lda berish; berilmasa bazadan o'qiladi
 */
export async function salomatlik(hozir = new Date(), yosh?: number | null): Promise<SalomatlikNatijasi> {
  if (kesh && hozir.getTime() - kesh.vaqt < KESH_MS && hozir.getTime() >= kesh.vaqt) return kesh.natija;

  let baza = false;
  try {
    await vaqtBilan(prisma.$queryRaw`SELECT 1`, BAZA_VAQTI_MS);
    baza = true;
  } catch (e) {
    console.error('Salomatlik: baza javob bermadi:', maxfiyniTozala(e));
  }

  let avtomatikIshlar = false;
  if (baza) {
    try {
      const [ishlar, yoshi] = await vaqtBilan(Promise.all([ishlarHolati(hozir), yosh === undefined ? tizimYoshi(hozir) : Promise.resolve(yosh)]), BAZA_VAQTI_MS);
      /* Ro'yxat bo'sh bo'lsa (CRON_ISHLARI o'chirilgan) - sog'lom deb yolg'on aytilmaydi */
      avtomatikIshlar = CRON_ISHLARI.length > 0 && ishlar.length === CRON_ISHLARI.length && ishlarSogMi(ishlar.map((j) => j.baho), yoshi);
    } catch (e) {
      console.error('Salomatlik: ishlar holatini o‘qib bo‘lmadi:', maxfiyniTozala(e));
    }
  }

  const natija: SalomatlikNatijasi = {
    status: baza && avtomatikIshlar ? 'ok' : 'degraded',
    tekshiruvlar: { baza, avtomatikIshlar },
  };
  kesh = { vaqt: hozir.getTime(), natija };
  return natija;
}
