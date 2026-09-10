import { redirect } from 'next/navigation';
import { joriySessiya } from '@/lib/auth';
import { KirishFormasi } from '@/components/auth/kirish-formasi';

export const metadata = { title: 'Кириш — Хатирчи бандлик платформаси' };

export default function KirishSahifasi({
  searchParams,
}: {
  searchParams: { keyin?: string };
}) {
  // Allaqachon kirgan bo'lsa, login sahifasini ko'rsatishning ma'nosi yo'q
  if (joriySessiya()) redirect('/');

  return (
    <main className="flex min-h-dvh items-center justify-center bg-canvas px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-7 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-lg bg-accent-soft">
            <svg
              viewBox="0 0 24 24"
              className="h-7 w-7"
              fill="none"
              stroke="var(--accent)"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M3 21h18" />
              <path d="M5 21V7l7-4 7 4v14" />
              <path d="M9 21v-6h6v6" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-ink">Хатирчи тумани ҳокимлиги</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Бандлик ва камбағалликни қисқартириш платформаси
          </p>
        </div>

        <KirishFormasi keyin={searchParams.keyin} />

        <p className="mt-6 text-center text-xs text-ink-faint">
          Тизимга кириш фақат ваколатли ходимлар учун.
          <br />
          Логин ва паролни администратор беради.
        </p>
      </div>
    </main>
  );
}
