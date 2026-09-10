'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import * as Ikonkalar from 'lucide-react';
import { LogOut, Menu, X } from 'lucide-react';
import type { Rol } from '@prisma/client';
import { ThemeToggle } from '@/components/shared/theme-toggle';
import { menyuOl, ROL_NOMI } from './navigatsiya';
import { initials } from '@/lib/utils';

interface Props {
  fullName: string;
  rol: Rol;
  /** YETTILIK roli uchun - qaysi mahallaga biriktirilgan */
  mahallaNomi?: string | null;
  children: React.ReactNode;
}

/** Lucide ikonkasini nomi bo'yicha oladi */
function Ikonka({ nomi, className }: { nomi: string; className?: string }) {
  const K = (Ikonkalar as unknown as Record<string, React.ComponentType<{ className?: string }>>)[
    nomi
  ];
  return K ? <K className={className} /> : <Ikonkalar.Circle className={className} />;
}

export function AppShell({ fullName, rol, mahallaNomi, children }: Props) {
  const yol = usePathname();
  const router = useRouter();
  const [ochiq, setOchiq] = useState(false);
  const bandlar = menyuOl(rol);

  async function chiq() {
    await fetch('/api/auth/chiqish', { method: 'POST' });
    router.replace('/kirish');
    router.refresh();
  }

  const faolmi = (bandYoli: string) =>
    yol === bandYoli || (bandYoli !== '/' && yol.startsWith(`${bandYoli}/`));

  return (
    <div className="min-h-dvh bg-canvas">
      {/* ── Yuqori panel ── */}
      <header className="sticky top-0 z-30 border-b border-line bg-elev">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4">
          <button
            type="button"
            onClick={() => setOchiq((o) => !o)}
            aria-label={ochiq ? 'Menyuni yopish' : 'Menyuni ochish'}
            aria-expanded={ochiq}
            className="flex h-10 w-10 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink lg:hidden"
          >
            {ochiq ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <Link href="/" className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-accent-soft">
              <svg
                viewBox="0 0 24 24"
                className="h-[18px] w-[18px]"
                fill="none"
                stroke="var(--accent)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M3 21h18" />
                <path d="M5 21V7l7-4 7 4v14" />
                <path d="M9 21v-6h6v6" />
              </svg>
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold leading-tight text-ink">
                Xatirchi bandlik
              </span>
              <span className="block truncate text-[11px] leading-tight text-ink-faint">
                {mahallaNomi ? `${mahallaNomi} MFY` : 'Tuman hokimligi'}
              </span>
            </span>
          </Link>

          <div className="ml-auto flex items-center gap-1.5">
            <ThemeToggle />
            <div className="hidden items-center gap-2.5 border-l border-line pl-3 sm:flex">
              <span
                className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-soft text-xs font-bold text-accent"
                aria-hidden="true"
              >
                {initials(fullName)}
              </span>
              <span className="max-w-[11rem]">
                <span className="block truncate text-xs font-semibold leading-tight text-ink">
                  {fullName}
                </span>
                <span className="block truncate text-[11px] leading-tight text-ink-faint">
                  {ROL_NOMI[rol]}
                </span>
              </span>
            </div>
            <button
              type="button"
              onClick={chiq}
              aria-label="Tizimdan chiqish"
              className="flex h-10 w-10 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-danger-bg hover:text-danger"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl">
        {/* ── Yon menyu ── */}
        <aside
          className={`${
            ochiq ? 'block' : 'hidden'
          } fixed inset-x-0 top-14 z-20 border-b border-line bg-elev p-3 lg:sticky lg:top-14 lg:block lg:h-[calc(100dvh-3.5rem)] lg:w-60 lg:shrink-0 lg:border-b-0 lg:border-r lg:bg-transparent`}
        >
          <nav className="space-y-0.5">
            {bandlar.map((b) => (
              <Link
                key={b.yol}
                href={b.yol}
                onClick={() => setOchiq(false)}
                aria-current={faolmi(b.yol) ? 'page' : undefined}
                className={`flex items-center gap-2.5 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                  faolmi(b.yol)
                    ? 'bg-accent-soft text-accent'
                    : 'text-ink-muted hover:bg-surface-muted hover:text-ink'
                }`}
              >
                <Ikonka nomi={b.ikonka} className="h-[18px] w-[18px] shrink-0" />
                <span className="truncate">{b.nomi}</span>
              </Link>
            ))}
          </nav>

          {/*
            Yettilik a'zosi uchun eslatma: u faqat o'z mahallasini
            ko'radi. Buni ochiq yozib qo'yish kerak, aks holda "nega
            qo'shni mahalla ko'rinmayapti" degan savol tug'iladi.
          */}
          {rol === 'YETTILIK' && mahallaNomi && (
            <p className="mt-4 rounded-md bg-surface-muted px-3 py-2.5 text-[11px] leading-relaxed text-ink-faint">
              Siz <span className="font-semibold text-ink-muted">{mahallaNomi}</span> MFY
              ga biriktirilgansiz va faqat shu mahalla ma&#8216;lumotlarini ko&#8216;rasiz.
            </p>
          )}
        </aside>

        {/* Menyu ochiq bo'lganda ortidagi qismni yopadigan qatlam */}
        {ochiq && (
          <button
            type="button"
            aria-label="Menyuni yopish"
            onClick={() => setOchiq(false)}
            className="fixed inset-0 top-14 z-10 bg-black/20 lg:hidden"
          />
        )}

        <main className="min-w-0 flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
