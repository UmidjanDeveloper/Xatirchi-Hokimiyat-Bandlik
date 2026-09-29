import { redirect } from 'next/navigation';
import { joriyXodim } from '@/lib/sahifa-auth';
import { boshSahifa } from '@/components/shell/navigatsiya';

/**
 * Bosh sahifa har rolni o'zi eng ko'p ishlatadigan bo'limga yuboradi:
 * yettilik a'zosini xatlovga, hokimni tahlil paneliga.
 */
export default async function Bosh() {
  const sessiya = await joriyXodim();
  if (!sessiya) redirect('/kirish');
  redirect(boshSahifa(sessiya.rol));
}
