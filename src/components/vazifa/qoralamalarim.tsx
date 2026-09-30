'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FileEdit, TriangleAlert } from 'lucide-react';
import { useAlifbo } from '@/components/alifbo/alifbo-provider';
import { MAX_QORALAMA, QORALAMA_KUNI, qoralamalarim } from '@/lib/offline';

/**
 * ============================================================
 *  ҚОРАЛАМАЛАР ҲОЛАТИ — ВАЗИФАЛАР ТАХТАСИДА
 *
 *  ── Нега бу ерда керак ──
 *
 *  Қоралама ФАҚАТ телефоннинг ўзида ётади (`localStorage`).
 *  Уни сервер кўрмайди, демак вазифалар тахтасини ясаган
 *  сўров ҳам кўрмайди.
 *
 *  Ходим анкетани ярим тўлдириб қўйиб, эсдан чиқариши осон.
 *  Қоралама эса етти кундан кейин ЭСКИ деб белгиланади.
 *  Экранда турмаса, ходим бир соатлик ишини йўқотганини
 *  фақат кейин билади.
 *
 *  Шунинг учун бу блок браузерда ишлайди ва серверга ҳеч
 *  нарса юбормайди: ичида исм, манзил ва даромад бор.
 * ============================================================
 */
export function Qoralamalarim({ egasi }: { egasi: string }) {
  const { t: tr } = useAlifbo();
  const [royxat, setRoyxat] = useState<{ kalit: string; vaqt: string; eskimi: boolean }[]>([]);
  const [oqildi, setOqildi] = useState(false);

  useEffect(() => {
    /*
     * `localStorage` серверда йўқ ва шахсий режимда хато
     * бериши мумкин. Ўқиш `useEffect` да ва `try` ичида.
     */
    try {
      setRoyxat(
        qoralamalarim(egasi).map((y) => ({ kalit: y.kalit, vaqt: y.vaqt, eskimi: y.eskimi }))
      );
    } catch {
      setRoyxat([]);
    }
    setOqildi(true);
  }, [egasi]);

  /* Ўқилмагунча ҲЕЧ НАРСА чизилмайди — «0» ёзиб алдамаймиз */
  if (!oqildi) return null;

  const eskilar = royxat.filter((y) => y.eskimi).length;
  const jami = royxat.length;

  return (
    <section className="karta p-4 sm:p-5">
      <h2 className="flex items-center gap-2 text-sm font-bold text-ink">
        <FileEdit className="h-4 w-4 text-accent" />
        {tr('Тугалланмаган қоралама')}
        {jami > 0 && <span className="text-ink-muted">· {jami}</span>}
      </h2>

      {jami === 0 ? (
        <p className="mt-2 text-sm text-ok">{tr('Тугалланмаган анкета йўқ.')}</p>
      ) : (
        <>
          <p className="mt-1 text-xs text-ink-faint">
            {tr('Фақат шу телефонда сақланган. Юборилмаса, ҳеч қаерга ёзилмайди.')}
          </p>

          {eskilar > 0 && (
            <p className="mt-2 flex items-start gap-1.5 rounded-md bg-warn-bg px-3 py-2 text-xs text-warn">
              <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                {eskilar} {tr('та қоралама')} {QORALAMA_KUNI}{' '}
                {tr('кундан ортиқ турибди — уни тугатиш ёки ўчириш керак.')}
              </span>
            </p>
          )}

          <p className="mt-2 text-xs text-ink-faint">
            {tr('Чегара')}: {MAX_QORALAMA}{' '}
            {tr('та. Ошса, энг эскиси тушади — телефонда очиқ матнда исм ва даромад ётади.')}
          </p>

          <Link
            href="/xatlov/yangi"
            className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-line px-3 py-1.5 text-xs font-semibold text-ink-muted transition hover:border-accent hover:text-accent"
          >
            {tr('Қораламани давом эттириш')}
          </Link>
        </>
      )}
    </section>
  );
}
