'use client';

import { useAlifbo } from '@/components/alifbo/alifbo-provider';

import { Fragment, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Archive,
  BadgeCheck,
  CalendarCheck,
  Briefcase,
  Building2,
  ChartColumn,
  Circle,
  ClipboardList,
  House,
  HousePlus,
  ListChecks,
  ListTodo,
  LogOut,
  Menu,
  Settings,
  Route,
  Target,
  Users,
  UsersRound,
  X,
} from 'lucide-react';
import type { Rol } from '@prisma/client';
import { ThemeToggle } from '@/components/shared/theme-toggle';
import { AlifboTugmasi } from '@/components/alifbo/alifbo-provider';
import { Gerb } from '@/components/shared/gerb';
import { chiqishdaTozala } from '@/lib/offline';
import { menyuOl, MUNDARIJA_UYASI, MUNDARIJA_YOLI, ROL_NOMI } from './navigatsiya';
import { initials } from '@/lib/utils';

interface Props {
  fullName: string;
  /** Логин — телефон хотирасидаги ёзувлар шунга боғланган */
  username: string;
  rol: Rol;
  /** YETTILIK roli uchun - qaysi mahallaga biriktirilgan */
  mahallaNomi?: string | null;
  children: React.ReactNode;
}

/**
 * ============================================================
 *  MENYU IKONKALARI — FAQAT ISHLATILGANLARI
 *
 *  ── Qanday nuqsonni yopadi ──
 *
 *  Avval bu yerda shunday turardi:
 *
 *      import * as Ikonkalar from 'lucide-react';
 *      const K = Ikonkalar[nomi];
 *
 *  Ikonkani NOM bo'yicha topish uchun butun kutubxona —
 *  1 500 dan ortiq ikonka — paketga kirib qolgan. Tree-shaking
 *  `import *` bilan ishlamaydi: bundler qaysi nom so'ralishini
 *  oldindan bila olmaydi.
 *
 *  Oqibati: login sahifasi 143 KB, kirgandan keyin HAR sahifa
 *  313 KB (gzip) — o'rtadagi farqning katta qismi shu.
 *  Sekin 3G da bu yarim daqiqaga yaqin kutish.
 *
 *  Endi nom -> ikonka xaritasi QO'LDA yozilgan va faqat
 *  menyuda ishlatiladiganlari kiradi.
 *
 *  ── Yangi band qo'shilsa-chi ──
 *
 *  Menyuga yangi ikonka nomi yozilsa-yu, bu xaritaga
 *  qo'shilmasa, ikonka JIMGINA oddiy aylana bo'lib qolardi.
 *  `scripts/tezlik-sinov.ts` aynan shuni tekshiradi: menyudagi
 *  har bir nom shu xaritada bo'lishi shart.
 * ============================================================
 */
const IKONKALAR: Record<string, React.ComponentType<{ className?: string }>> = {
  Archive,
  BadgeCheck,
  CalendarCheck,
  Briefcase,
  Building2,
  ChartColumn,
  ClipboardList,
  House,
  HousePlus,
  ListChecks,
  ListTodo,
  Settings,
  Route,
  Target,
  Users,
  UsersRound,
};

function Ikonka({ nomi, className }: { nomi: string; className?: string }) {
  const K = IKONKALAR[nomi] ?? Circle;
  return <K className={className} />;
}

export function AppShell({ fullName, username, rol, mahallaNomi, children }: Props) {
  const { t: tr } = useAlifbo();

  const yol = usePathname();
  const router = useRouter();
  const [ochiq, setOchiq] = useState(false);
  const bandlar = menyuOl(rol);

  async function chiq() {
    /*
     * ── ТЕЛЕФОН ХОТИРАСИНИ ТОЗАЛАШ ──
     *
     * Сессия 12 соат яшайди, `localStorage` эса муддатсиз.
     * Ходим чиқиб кетса ҳам, телефонида хонадонлар
     * маълумоти — исм, манзил, телефон, ногиронлик,
     * даромад — очиқ матнда қолаверарди.
     *
     * Юборилмаган навбат ЎЧИРИЛМАЙДИ: у тайёр хатлов ва уни
     * йўқотиш ходимнинг бир соатлик ишини йўқотиш дегани.
     * Шунинг учун аввал сўраймиз.
     */
    /*
     * ФАҚАТ чиқаётган ходимнинг ёзувлари тегилади. Ҳамкасби
     * ўша телефонда иш қолдирган бўлса, у ЖОЙИДА қолади:
     * ўчириш ҳам маълумотни йўқотиш дегани.
     */
    const qoldiq = chiqishdaTozala(username);
    if (qoldiq.navbat > 0) {
      const davom = window.confirm(
        tr('Юборилмаган хатлов бор:') +
          ` ${qoldiq.navbat} ${tr('та')}. ` +
          tr('Улар телефон хотирасида қолади ва алоқа тикланганда ўзи юборилади. Барибир чиқасизми?')
      );
      if (!davom) return;
    }
    await fetch('/api/auth/chiqish', { method: 'POST' });
    router.replace('/kirish');
    router.refresh();
  }

  const faolmi = (bandYoli: string) =>
    yol === bandYoli || (bandYoli !== '/' && yol.startsWith(`${bandYoli}/`));

  return (
    <div className="app-workspace min-h-dvh bg-canvas">
      {/* ── Yuqori panel ── */}
      <header className="workspace-header sticky top-0 z-30 border-b border-line bg-elev/95 backdrop-blur supports-[backdrop-filter]:bg-elev/80">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4">
          <button
            type="button"
            onClick={() => setOchiq((o) => !o)}
            aria-label={ochiq ? tr('Менюни ёпиш') : tr('Менюни очиш')}
            aria-expanded={ochiq}
            className="flex h-10 w-10 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink lg:hidden"
          >
            {ochiq ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <Link href="/" className="flex min-w-0 items-center gap-2.5">
            <Gerb olcham={34} className="shrink-0" />
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold leading-tight text-ink">
                {tr('Хатирчи бандлик')}
              </span>
              <span className="block truncate text-[11px] leading-tight text-ink-faint">
                {mahallaNomi ? tr(`${mahallaNomi} МФЙ`) : tr('Туман ҳокимлиги')}
              </span>
            </span>
          </Link>

          <div className="ml-auto flex items-center gap-1.5">
            <AlifboTugmasi />
            <ThemeToggle />
            <div className="hidden items-center gap-2.5 border-l border-line pl-3 sm:flex">
              <span
                className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-soft text-xs font-bold text-accent"
                aria-hidden="true"
              >
                {initials(tr(fullName))}
              </span>
              <span className="max-w-[11rem]">
                <span className="block truncate text-xs font-semibold leading-tight text-ink">
                  {tr(fullName)}
                </span>
                <span className="block truncate text-[11px] leading-tight text-ink-faint">
                  {tr(ROL_NOMI[rol])}
                </span>
              </span>
            </div>
            <button
              type="button"
              onClick={chiq}
              aria-label={tr("Тизимдан чиқиш")}
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
          className={`workspace-sidebar ${
            ochiq ? 'block' : 'hidden'
          } fixed inset-x-0 top-16 z-20 border-b border-line bg-elev p-3 lg:sticky lg:top-16 lg:block lg:h-[calc(100dvh-4rem)] lg:w-60 lg:shrink-0 lg:overflow-y-auto lg:border-b-0 lg:border-r lg:bg-transparent`}
        >
          <nav className="space-y-0.5">
            {bandlar.map((b) => (
              <Fragment key={b.yol}>
                <Link
                  href={b.yol}
                  onClick={() => setOchiq(false)}
                  aria-current={faolmi(b.yol) ? 'page' : undefined}
                  className={`relative flex items-center gap-2.5 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                    faolmi(b.yol)
                      ? 'bg-accent-soft font-semibold text-accent'
                      : 'text-ink-muted hover:bg-surface-muted hover:text-ink'
                  }`}
                >
                  <Ikonka nomi={b.ikonka} className="h-[18px] w-[18px] shrink-0" />
                  <span className="truncate">{tr(b.nomi)}</span>
                </Link>

                {/*
                  ── МУНДАРИЖАНИНГ УЯСИ ──

                  Бўш `div` — мундарижа саҳифадан шу ерга
                  портал орқали тушади. Рўйхатнинг ЎЗИ шу
                  ерда ясалмайди: у қайси бўлимлар экранда
                  борлигига боғлиқ, буни эса фақат саҳифа
                  билади.

                  Уя фақат таҳлил панелида чизилади — бошқа
                  саҳифада мундарижа йўқ ва бўш қути меню
                  остида ортиқча оралиқ очиб турарди.

                  Кичик экранда меню — очиладиган рўйхат;
                  мундарижа у ерда эмас, саҳифанинг тепасида
                  ўз тугмаси билан чиқади.
                */}
                {b.yol === MUNDARIJA_YOLI && faolmi(b.yol) && (
                  <div id={MUNDARIJA_UYASI} className="hidden lg:block" />
                )}
              </Fragment>
            ))}
          </nav>

          {/*
            Yettilik a'zosi uchun eslatma: u faqat o'z mahallasini
            ko'radi. Buni ochiq yozib qo'yish kerak, aks holda "nega
            qo'shni mahalla ko'rinmayapti" degan savol tug'iladi.
          */}
          {rol === 'YETTILIK' && mahallaNomi && (
            <p className="mt-4 rounded-md bg-surface-muted px-3 py-2.5 text-[11px] leading-relaxed text-ink-faint">
              {tr('Сиз')} <span className="font-semibold text-ink-muted">{tr(mahallaNomi)}</span> {tr('МФЙ га бириктирилгансиз ва фақат шу маҳалла маълумотларини кўрасиз.')}
            </p>
          )}
        </aside>

        {/* Menyu ochiq bo'lganda ortidagi qismni yopadigan qatlam */}
        {ochiq && (
          <button
            type="button"
            aria-label={tr("Менюни ёпиш")}
            onClick={() => setOchiq(false)}
            className="fixed inset-0 top-16 z-10 bg-black/20 lg:hidden"
          />
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <main className="workspace-main min-w-0 flex-1 p-4 lg:p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
