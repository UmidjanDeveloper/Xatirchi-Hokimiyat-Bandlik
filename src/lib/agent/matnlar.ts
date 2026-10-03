import { A } from '@/lib/alifbo';
import type { Alifbo } from './turlar';

/**
 * ============================================================
 *  HUDHUD: KODDAN CHIQADIGAN MATNLAR
 *
 *  Model yozmaydigan, KODDA turgan matnlar shu yerda: salomlashuv, xatolar,
 *  yordam, limit tugagani. Ular:
 *
 *    · KIRILLDA yoziladi va foydalanuvchi alifbosiga `A()` bilan o'tkaziladi
 *      (butun ilovadagi qoida: bitta manba, ikki alifbo);
 *    · SOF O'ZBEKCHA: rus yoki ingliz so'zi aralashmaydi
 *      (`scripts/agent-sinov.ts` taqiqlangan so'zlar ro'yxati bilan tekshiradi);
 *    · ism bilan, hurmat bilan ("Siz").
 *
 *  Salomlashuvni model emas, KOD yozadi: ism noto'g'ri tushib qolishi yoki
 *  salom har safar boshqacha bo'lishi hokim uchun noqulay.
 * ============================================================
 */

/**
 * Ismni tizim ko'rsatmasiga va salomga xavfsiz qo'yish.
 *
 * Ism bazadan keladi va tizim ko'rsatmasiga (modelga) tushadi. Unga
 * ko'rsatma "yopishtirib" qo'yilmasligi uchun faqat ISMGA XOS belgilar
 * qoladi: harflar (lotin va kirill), bo'shliq, apostrof, defis, nuqta.
 * Raqam, ikki nuqta, qavs, tirnoq, yangi qator — hammasi olib tashlanadi;
 * 5 so'zdan va 60 belgidan uzun qismi kesiladi (ism bunchalik uzun emas).
 */
export function ismniTozala(ism: string): string {
  return ism
    .replace(/[^\p{L}\s'’ʻʼ.-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .slice(0, 5)
    .join(' ')
    .slice(0, 60)
    .trim();
}

/**
 * Model javobidan Markdown belgilarini olib tashlaydi.
 *
 * Javob ekranda oddiy matn sifatida chiqadi va OVOZDA o'qiladi: "**" yoki
 * "#" belgilari yulduzcha va panjara deb o'qilardi. Ko'rsatmada ham
 * "Markdown ishlatma" deyilgan, lekin model ba'zan baribir ishlatadi.
 */
export function javobniTozala(matn: string): string {
  return matn
    .replace(/```[\w-]*\n?([\s\S]*?)```/g, '$1')
    .replace(/`([^`\n]+)`/g, '$1')
    .replace(/\*\*([^*\n]+)\*\*/g, '$1')
    .replace(/__([^_\n]+)__/g, '$1')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '• ')
    .replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s).,!?:;]|$)/g, '$1$2')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export const ROL_NOMI_AGENT: Record<string, string> = {
  HOKIM: 'Ҳоким',
  BANDLIK: 'Бандлик маркази мутахассиси',
  BANDLIK_RAHBAR: 'Бандлик маркази раҳбари',
  ADMIN: 'Администратор',
};

/** Kun vaqtiga qarab, lekin Toshkent vaqti bilan */
export function salomMatni(ism: string, hozir: Date, alifbo: Alifbo): string {
  const soat = (hozir.getUTCHours() + 5) % 24;
  const vaqt = soat < 5 ? 'Хайрли тун' : soat < 12 ? 'Хайрли тонг' : soat < 18 ? 'Хайрли кун' : 'Хайрли оқшом';
  const t = ismniTozala(ism);
  /* Мисоллар салом ичида ЭМАС: улар пастдаги таклиф тугмаларида ва «тушунмадим» жавобида бор */
  return A(`${vaqt}, ҳурматли ${t}! Мен Коаламан — ёрдамчингиз.`, alifbo);
}

export const MATN = {
  limitKunlik: 'Бугунги сунъий интеллект чегараси тугади. Оддий режим: саҳифани очиш, умумий ҳолат.',
  limitOylik: 'Бу ойги сунъий интеллект чегараси тугади. Оддий режим: саҳифани очиш, умумий ҳолат.',
  aiYoq: 'Сунъий интеллект ишламаяпти. Оддий режим: саҳифани очиш, умумий ҳолат.',
  amalRuxsatYoq: 'Бу амал ролингиз учун эмас.',
  korishRejimi: 'Кўриш режимида ёзиш амаллари ишламайди. Ўз ҳисобингизга қайтинг.',
  ruxsatYoq: 'Бу саҳифа ролингиз учун очиқ эмас.',
  tushunmadim: 'Тушунмадим. Масалан: «ишсизлар рўйхатини оч», «хатлов ҳолати».',
  qaytaUrinish: 'Жавоб олинмади. Қайта уриниб кўринг.',
  juda_kop: 'Жуда кўп сўров. Бир оз кутинг.',
  uzunXabar: 'Сўров жуда узун. Қисқароқ айтинг.',
  murakkab: 'Савол мураккаб. Битта-битта сўранг.',
  tasdiqKutilmoqda: 'Амал ҳали бажарилмади. Тасдиқлаш тугмасини босинг.',
  rahmatga: 'Марҳамат!',
  salomga: 'Ассалому алайкум! Сизга қандай ёрдам бера оламан?',
  yordam: 'Саҳифа очаман, кўрсаткичларни айтаман. Фуқаро исми ва телефони менга кўринмайди.',
} as const;

export type MatnKaliti = keyof typeof MATN;

export function matn(k: MatnKaliti, alifbo: Alifbo): string {
  return A(MATN[k], alifbo);
}

/**
 * Rus va ingliz so'zlari: Hudhud matnlarida bo'lmasligi kerak (sof o'zbekcha).
 * Lotinga o'tkazilgan va kichik harfda. Rasmiy sahifa nomlarini o'zgartirmaymiz.
 */
export const TAQIQLANGAN_SOZLAR = [
  'otchyot', 'otchet', 'dashbord', 'dashboard', 'monitoring', 'zadacha', 'status', 'filtr', 'spravka',
  'okey', 'okay', 'ok', 'spasibo', 'pozhaluysta', 'konechno', 'normalno', 'problema', 'rezultat',
  'protsent', 'kolichestvo', 'sistema', 'informatsiya', 'dokument', 'vopros', 'otvet', 'spisok',
] as const;
