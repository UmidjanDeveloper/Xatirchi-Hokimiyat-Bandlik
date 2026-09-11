import { redirect } from 'next/navigation';
import { alifboServer, matnchi } from '@/lib/alifbo-server';
import { joriySessiya } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ParolFormasi } from '@/components/auth/parol-formasi';
import { AlifboProvider, AlifboTugmasi } from '@/components/alifbo/alifbo-provider';
import { Gerb } from '@/components/shared/gerb';
import { ThemeToggle } from '@/components/shared/theme-toggle';

/*
 * Sahifa sarlavhasi ham alifboga ergashadi.
 *
 * `metadata` doimiy bo'lgani uchun cookie'ni o'qiy olmaydi,
 * shuning uchun `generateMetadata` ishlatiladi - u har so'rovda
 * qayta hisoblanadi va brauzer yorlig'ida to'g'ri alifbo turadi.
 */
export function generateMetadata() {
  return { title: matnchi()('Паролни алмаштириш') };
}

export default async function ParolSahifasi() {
  const tr = matnchi();
  const alifbo = alifboServer();

  const sessiya = joriySessiya();
  if (!sessiya) redirect('/kirish');

  const user = await prisma.user.findUnique({
    where: { id: sessiya.userId },
    select: { parolAlmashtirilsin: true, fullName: true },
  });

  /*
   * Bu sahifa `(ilova)` guruhidan TASHQARIDA turadi - qobiq va
   * uning AlifboProvider'i bu yerga yetib kelmaydi. Shuning uchun
   * provider qo'lda o'raladi.
   *
   * Aks holda sarlavha (server, cookie'ni o'qiydi) lotinda, forma
   * ichi (brauzer, provider yo'q - kirillga qaytadi) kirillda
   * chiqib, bitta ekranda ikki alifbo aralashadi. Aynan shu
   * nuqson sinovda ko'rindi.
   */
  return (
    <AlifboProvider boshlangich={alifbo}>
      <div className="login-scene flex min-h-dvh flex-col bg-canvas">
        <main className="login-main flex flex-1 items-center justify-center px-4 py-10">
          <div className="login-frame w-full max-w-[26rem]">
            <div className="login-brand mb-6 text-center">
              <div className="mx-auto mb-4 flex items-center justify-center">
                <span className="login-emblem flex h-[72px] w-[72px] items-center justify-center rounded-full border border-line bg-surface shadow-sm">
                  <Gerb olcham={50} />
                </span>
              </div>
              <h1 className="text-[1.25rem] font-bold leading-tight text-ink">
                {tr('Паролни алмаштириш')}
              </h1>
              {user?.fullName && (
                <p className="mt-1 text-sm text-ink-muted">{tr(user.fullName)}</p>
              )}
            </div>

            <div className="login-preferences mb-4 flex items-center justify-center gap-2">
              <AlifboTugmasi />
              <ThemeToggle />
            </div>

            <ParolFormasi majburiy={user?.parolAlmashtirilsin ?? false} />
          </div>
        </main>

      </div>
    </AlifboProvider>
  );
}
