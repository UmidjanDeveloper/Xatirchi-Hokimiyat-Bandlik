import Link from 'next/link';
import { LifeBuoy } from 'lucide-react';
import { matnchi } from '@/lib/alifbo-server';
import { formatDate } from '@/lib/utils';
import { YORDAM_OGOHLANTIRISHI, amaldagiDasturlar } from '@/lib/yordam-dasturlari';

const kun = (d: Date) => formatDate(d).split(',')[0];

/**
 * Amaldagi yordam dasturlari (fuqaro sahifasida).
 *
 * Faqat "amalda" dasturlar chiqadi: yopilmagan, muddati tugamagan va manbadan
 * yaqinda tekshirilgan. Muddati tugagan yoki uzoq tekshirilmagan dastur bu
 * yerda ko'rinmaydi. Tizim fuqaroning dasturga huquqini HISOBLAMAYDI:
 * talablar matn sifatida, manba va tekshirilgan sana bilan beriladi.
 *
 * Katalog bo'sh bo'lsa blok umuman chiqmaydi.
 *
 * Xato bu yerda yutiladi: bu ikkilamchi blok, fuqaro sahifasi katalog sabab
 * ochilmay qolmasligi kerak.
 */
export async function YordamBlogi() {
  const tr = matnchi();

  try {
    const royxat = await amaldagiDasturlar(new Date(), 10);
    if (royxat.length === 0) return null;

    return (
      <section className="karta p-4 sm:p-5" aria-labelledby="yb-sarlavha">
        <h2 id="yb-sarlavha" className="flex items-center gap-2 text-sm font-bold text-ink">
          <LifeBuoy className="h-4 w-4 text-accent" aria-hidden="true" />
          {tr('Амалдаги ёрдам дастурлари')}
        </h2>
        <p className="mt-1 text-xs text-ink-faint">{tr(YORDAM_OGOHLANTIRISHI)}</p>

        <ul className="mt-3 space-y-2">
          {royxat.map((d) => (
            <li key={d.id} className="rounded-md border border-line p-3">
              <p className="text-sm font-semibold text-ink">{d.nomi}</p>
              <p className="mt-0.5 text-xs text-ink-muted">
                {tr('Кимлар учун:')} {d.nishonGuruh}
              </p>
              <p className="mt-1 text-xs text-ink-muted">
                {tr('Талаблар:')} {d.talablar}
              </p>
              {d.hujjatlar && (
                <p className="mt-1 text-xs text-ink-muted">
                  {tr('Ҳужжатлар:')} {d.hujjatlar}
                </p>
              )}
              {d.miqdori && (
                <p className="mt-1 text-xs text-ink-muted">
                  {tr('Миқдор (манбадаги матн):')} {d.miqdori}
                </p>
              )}
              <p className="mt-1 text-[11px] text-ink-faint">
                {tr('Масъул:')} {d.masulTashkilot} · {tr('манба:')} {d.rasmiyManba} · {tr('текширилган:')} {kun(d.tekshirilganSana)}
                {d.amalQilishOxiri
                  ? ` · ${tr('амал қилади:')} ${kun(d.amalQilishOxiri)} ${tr('гача')}`
                  : ` · ${tr('амал қилиш муддати манбада кўрсатилмаган — аниқланг')}`}
              </p>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-[11px] text-ink-faint">
          <Link href="/yordam" className="text-accent hover:underline">
            {tr('Ҳамма дастурлар каталоги')}
          </Link>
        </p>
      </section>
    );
  } catch (e) {
    console.error('Yordam blokini yuklab bo‘lmadi:', e);
    return null;
  }
}
