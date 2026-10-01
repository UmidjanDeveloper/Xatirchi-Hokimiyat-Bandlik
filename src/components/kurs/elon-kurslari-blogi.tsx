import Link from 'next/link';
import { GraduationCap } from 'lucide-react';
import { matnchi } from '@/lib/alifbo-server';
import { formatDate } from '@/lib/utils';
import { KAFOLAT_OGOHLANTIRISHI, elonUchunKurslar, type ElonMatni } from '@/lib/kurslar';

const kun = (d: Date) => formatDate(d).split(',')[0];

/**
 * E'lonning HAQIQIY talabiga mos, hali boshlanmagan kurslar.
 *
 * Har taklif yonida SABABI turadi (talabdagi qaysi ko'nikmani o'rgatadi).
 * Boshlangan, bekor qilingan, ma'lumoti eskirgan yoki o'rni qolmagan kurs
 * chiqmaydi. "Kursni tugatsa ishga olinadi" deb yozilmaydi.
 *
 * Xato bu yerda yutiladi: bu ikkilamchi blok, e'lon sahifasi kurs
 * qidiruvi sabab ochilmay qolmasligi kerak.
 */
export async function ElonKurslariBlogi({ elon }: { elon: ElonMatni }) {
  const tr = matnchi();

  try {
    const royxat = await elonUchunKurslar(elon);
    if (royxat.length === 0) return null;

    return (
      <section className="karta p-4 sm:p-5" aria-labelledby="ek-sarlavha">
        <h2 id="ek-sarlavha" className="flex items-center gap-2 text-sm font-bold text-ink">
          <GraduationCap className="h-4 w-4 text-accent" aria-hidden="true" />
          {tr('Талабга яқинлаштирадиган курслар')}
        </h2>
        <p className="mt-1 text-xs text-ink-faint">{tr(KAFOLAT_OGOHLANTIRISHI)}</p>

        <ul className="mt-3 space-y-2">
          {royxat.map((k) => (
            <li key={k.id} className="rounded-md border border-line p-3">
              <Link href={`/kurslar/${k.id}`} className="text-sm font-semibold text-ink hover:text-accent">
                {k.nomi}
              </Link>
              <p className="mt-0.5 text-xs text-ink-faint">
                {k.tashkilot} · {kun(k.boshlanishSanasi)} — {kun(k.tugashSanasi)}
                {k.qolganJoy !== null && ` · ${tr('бўш ўрин')}: ${k.qolganJoy}`}
              </p>
              <p className="mt-1 text-xs text-ink-muted">
                {tr('Нега мос:')} {tr(k.sabab.matn)}
              </p>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-[11px] text-ink-faint">
          {tr('Фуқарони курсга ёзиш — унинг саҳифасидаги «Курслар» блокидан.')}
        </p>
      </section>
    );
  } catch (e) {
    console.error('Elon kurslari blokini yuklab bo‘lmadi:', e);
    return null;
  }
}
