import { redirect } from 'next/navigation';
import { joriySessiya } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { AppShell } from '@/components/shell/app-shell';

/**
 * Tizimga kirgan xodimlar uchun umumiy qobiq.
 *
 * Sessiya bu yerda bir marta o'qiladi va bazadan tekshiriladi -
 * har bir sahifa uni qaytadan tekshirmaydi. Middleware faqat
 * cookie borligini ko'radi, haqiqiy qo'riqchi shu.
 */
export default async function IlovaLayout({ children }: { children: React.ReactNode }) {
  const sessiya = joriySessiya();
  if (!sessiya) redirect('/kirish');

  const user = await prisma.user.findUnique({
    where: { id: sessiya.userId },
    select: {
      fullName: true,
      rol: true,
      faol: true,
      parolAlmashtirilsin: true,
      mahalla: { select: { nomi: true } },
    },
  });

  // Xodim ishdan bo'shatilgan bo'lsa, cookie hali yaroqli bo'lsa ham kirmaydi
  if (!user || !user.faol) redirect('/kirish');

  // Boshlang'ich parol almashtirilmaguncha boshqa sahifalar ochilmaydi
  if (user.parolAlmashtirilsin) redirect('/parol-almashtirish');

  return (
    <AppShell fullName={user.fullName} rol={user.rol} mahallaNomi={user.mahalla?.nomi}>
      {children}
    </AppShell>
  );
}
