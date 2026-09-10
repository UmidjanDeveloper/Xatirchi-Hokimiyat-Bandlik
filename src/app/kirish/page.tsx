import { redirect } from 'next/navigation';
import { joriySessiya } from '@/lib/auth';
import { KirishFormasi } from '@/components/auth/kirish-formasi';
import { AlifboProvider, AlifboTugmasi } from '@/components/alifbo/alifbo-provider';
import { Gerb } from '@/components/shared/gerb';
import { SiteFooter } from '@/components/shared/site-footer';
import { alifboServer, matnchi } from '@/lib/alifbo-server';

/*
 * Sahifa sarlavhasi ham alifboga ergashadi.
 *
 * `metadata` doimiy bo'lgani uchun cookie'ni o'qiy olmaydi,
 * shuning uchun `generateMetadata` ishlatiladi - u har so'rovda
 * qayta hisoblanadi va brauzer yorlig'ida to'g'ri alifbo turadi.
 */
export function generateMetadata() {
  return { title: matnchi()('Кириш — Хатирчи бандлик платформаси') };
}

export default function KirishSahifasi({
  searchParams,
}: {
  searchParams: { keyin?: string };
}) {
  const tr = matnchi();
  const alifbo = alifboServer();

  // Allaqachon kirgan bo'lsa, login sahifasini ko'rsatishning ma'nosi yo'q
  if (joriySessiya()) redirect('/');

  return (
    <AlifboProvider boshlangich={alifbo}>
      <div className="flex min-h-dvh flex-col bg-canvas">
        <main className="flex flex-1 items-center justify-center px-4 py-10">
          <div className="w-full max-w-[26rem]">
            {/* ── Rasmiy sarlavha ── */}
            <div className="mb-7 text-center">
              <div className="mx-auto mb-4 flex items-center justify-center">
                {/*
                  Gerb atrofidagi halqa - u fon bilan qo'shilib ketmasin
                  va rasmiy belgi ekani ko'rinib tursin.
                */}
                <span className="flex h-[86px] w-[86px] items-center justify-center rounded-full border border-line bg-surface shadow-sm">
                  <Gerb olcham={62} />
                </span>
              </div>

              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
                {tr('Навоий вилояти')}
              </p>
              <h1 className="mt-1 text-[1.375rem] font-bold leading-tight text-ink">
                {tr('Хатирчи тумани ҳокимлиги')}
              </h1>
              <p className="mx-auto mt-2 max-w-[22rem] text-sm leading-relaxed text-ink-muted">
                {tr('Аҳоли бандлигини таъминлаш ва камбағалликни қисқартириш платформаси')}
              </p>
            </div>

            <div className="mb-4 flex justify-center">
              <AlifboTugmasi />
            </div>

            <KirishFormasi keyin={searchParams.keyin} />

            <p className="mt-6 text-center text-xs leading-relaxed text-ink-faint">
              {tr('Тизимга кириш фақат ваколатли ходимлар учун.')}
              <br />
              {tr('Логин ва паролни администратор беради.')}
            </p>
          </div>
        </main>

        <SiteFooter />
      </div>
    </AlifboProvider>
  );
}
