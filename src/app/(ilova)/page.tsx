import { redirect } from 'next/navigation';
import { joriySessiya } from '@/lib/auth';
import { boshSahifa } from '@/components/shell/navigatsiya';

/**
 * Bosh sahifa har rolni o'zi eng ko'p ishlatadigan bo'limga yuboradi:
 * yettilik a'zosini xatlovga, hokimni tahlil paneliga.
 */
export default function Bosh() {
  const sessiya = joriySessiya();
  if (!sessiya) redirect('/kirish');
  redirect(boshSahifa(sessiya.rol));
}
