import { cookies } from 'next/headers';
import { A, ALIFBO_COOKIE, alifboOqi, type Alifbo } from './alifbo';

/**
 * Server komponentlari uchun alifbo.
 *
 * Sahifa serverda chizilayotgan paytda cookie'ni o'qiydi, ya'ni
 * HTML brauzerga DARHOL to'g'ri alifboda yetib boradi. Bu muhim:
 * aks holda sahifa avval kirillda ko'rinib, keyin lotinga
 * sakrardi.
 */
export function alifboServer(): Alifbo {
  return alifboOqi(cookies().get(ALIFBO_COOKIE)?.value);
}

/**
 * Alifboga bog'langan tarjimon.
 *
 * Sahifa boshida bir marta chaqiriladi:
 *   const t = matnchi();
 *   <h1>{t('Таҳлил панели')}</h1>
 */
export function matnchi(alifbo?: Alifbo): (matn: string) => string {
  const a = alifbo ?? alifboServer();
  return (matn: string) => A(matn, a);
}
