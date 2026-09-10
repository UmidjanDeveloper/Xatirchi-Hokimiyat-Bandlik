import { redirect } from 'next/navigation';
import { joriySessiya } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ParolFormasi } from '@/components/auth/parol-formasi';

export const metadata = { title: 'Parolni almashtirish' };

export default async function ParolSahifasi() {
  const sessiya = joriySessiya();
  if (!sessiya) redirect('/kirish');

  const user = await prisma.user.findUnique({
    where: { id: sessiya.userId },
    select: { parolAlmashtirilsin: true },
  });

  return (
    <main className="flex min-h-dvh items-center justify-center bg-canvas px-4 py-10">
      <div className="w-full max-w-md">
        <h1 className="mb-6 text-center text-xl font-bold text-ink">
          Parolni almashtirish
        </h1>
        <ParolFormasi majburiy={user?.parolAlmashtirilsin ?? false} />
      </div>
    </main>
  );
}
