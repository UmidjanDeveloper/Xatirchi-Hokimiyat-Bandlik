'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { RozilikUsuli } from '@prisma/client';
import { Loader2 } from 'lucide-react';
import { useAlifbo } from '@/components/alifbo/alifbo-provider';
import { MAYDON } from '@/components/reja/umumiy';
import { ROZILIK_NOMI, ULASHILADIGAN, type Ulashiladi } from '@/lib/yollanma-nomlari';

const MAYDON_NOMI: Record<Ulashiladi, string> = {
  fish: 'Ф.И.Ш.',
  telefon: 'Телефон',
  kasb: 'Касби',
};

type Holat = 'SUHBAT_BELGILANDI' | 'SUHBAT_OTKAZILDI' | 'FUQARO_RAD' | 'BEKOR';

const HOLAT_TANLOVI: { q: Holat; nom: string }[] = [
  { q: 'SUHBAT_BELGILANDI', nom: 'Суҳбат белгиланди' },
  { q: 'SUHBAT_OTKAZILDI', nom: 'Суҳбат ўтказилди' },
  { q: 'FUQARO_RAD', nom: 'Фуқаро воз кечди' },
  { q: 'BEKOR', nom: 'Бекор қилиш' },
];

/**
 * Bitta yo'llanma ustidagi amallar: rozilik, ish beruvchiga yuborish,
 * holat. Ish beruvchiga ma'lumot FAQAT rozilik qayd etilgach yuboriladi -
 * tugma rozilik bo'lmaguncha umuman ko'rinmaydi, server ham tekshiradi.
 */
export function YollanmaBoshqaruvi({
  id,
  rozilik,
  yuborilgan,
  beruvchiBor,
  yakunlangan,
}: {
  id: string;
  rozilik: boolean;
  /** Ma'lumot ish beruvchiga yuborilgan */
  yuborilgan: boolean;
  /** E'lon botdagi tasdiqlangan ish beruvchiga bog'langan */
  beruvchiBor: boolean;
  yakunlangan: boolean;
}) {
  const { t: tr } = useAlifbo();
  const router = useRouter();
  const [usul, setUsul] = useState<RozilikUsuli>('TELEFON');
  const [maydonlar, setMaydonlar] = useState<Ulashiladi[]>([...ULASHILADIGAN]);
  const [holat, setHolat] = useState<Holat>('SUHBAT_BELGILANDI');
  const [izoh, setIzoh] = useState('');
  const [xato, setXato] = useState<string | null>(null);
  const [yuborilmoqda, setYuborilmoqda] = useState(false);

  async function amal(tana: Record<string, unknown>) {
    if (yuborilmoqda) return;
    setXato(null);
    setYuborilmoqda(true);
    try {
      const javob = await fetch(`/api/yollanma/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tana),
      });
      const d = await javob.json().catch(() => ({}));
      if (!javob.ok) {
        setXato(d.xabar ?? tr('Сақлаб бўлмади'));
        return;
      }
      router.refresh();
    } catch {
      setXato(tr('Алоқа йўқ. Қайта уриниб кўринг.'));
    } finally {
      setYuborilmoqda(false);
    }
  }

  if (yakunlangan) return null;

  const tugma = 'tugma-ikkilamchi flex min-h-11 items-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium';

  return (
    <div className="mt-3 space-y-3 border-t border-line pt-3">
      {xato && (
        <div className="quti-xato" role="alert">
          {xato}
        </div>
      )}

      {!rozilik && (
        <div className="space-y-2">
          <p className="text-xs text-ink-muted">
            {tr('Фуқаро исми ва телефонини иш берувчига беришга розилик берганми? Розилик олинмагунча маълумот юборилмайди.')}
          </p>
          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1">
              <label htmlFor={`yb-usul-${id}`} className="text-xs text-ink-faint">
                {tr('Розилик қандай олинди')}
              </label>
              <select
                id={`yb-usul-${id}`}
                value={usul}
                onChange={(e) => setUsul(e.target.value as RozilikUsuli)}
                className={`${MAYDON} min-h-11 text-sm`}
              >
                {(Object.keys(ROZILIK_NOMI) as RozilikUsuli[]).map((u) => (
                  <option key={u} value={u}>
                    {tr(ROZILIK_NOMI[u])}
                  </option>
                ))}
              </select>
            </div>
            <button type="button" disabled={yuborilmoqda} onClick={() => amal({ amal: 'rozilik', usul })} className="tugma-asosiy flex min-h-11 items-center gap-1.5 rounded-md px-4 py-2 text-xs font-semibold">
              {yuborilmoqda && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
              {tr('Розилик олинди')}
            </button>
          </div>
        </div>
      )}

      {rozilik && !yuborilgan && (
        <div className="space-y-2">
          {beruvchiBor ? (
            <>
              <fieldset className="space-y-1">
                <legend className="text-xs font-medium text-ink-muted">
                  {tr('Иш берувчига нима юборилади (энг камини танланг)')}
                </legend>
                <div className="flex flex-wrap gap-2">
                  {ULASHILADIGAN.map((m) => (
                    <label key={m} className="flex min-h-11 items-center gap-2 rounded-md border border-line px-3 text-sm text-ink">
                      <input
                        type="checkbox"
                        checked={maydonlar.includes(m)}
                        onChange={() =>
                          setMaydonlar((x) => (x.includes(m) ? x.filter((y) => y !== m) : [...x, m]))
                        }
                        className="h-4 w-4"
                      />
                      {tr(MAYDON_NOMI[m])}
                    </label>
                  ))}
                </div>
              </fieldset>
              <button
                type="button"
                disabled={yuborilmoqda || maydonlar.length === 0}
                onClick={() => amal({ amal: 'yuborish', maydonlar })}
                className="tugma-asosiy flex min-h-11 items-center gap-1.5 rounded-md px-4 py-2 text-xs font-semibold"
              >
                {yuborilmoqda && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
                {tr('Иш берувчига ботда юбориш')}
              </button>
            </>
          ) : (
            <p className="text-xs text-warn">
              {tr('Бу эълон ботдаги иш берувчига боғланмаган (ходим қўйган). Номзод ҳақида иш берувчига ўзингиз хабар беринг.')}
            </p>
          )}
          <button type="button" disabled={yuborilmoqda} onClick={() => amal({ amal: 'rozilik-qaytar' })} className="text-xs text-ink-faint underline hover:text-accent">
            {tr('Розиликни қайтариб олиш')}
          </button>
        </div>
      )}

      <div className="space-y-2">
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <label htmlFor={`yb-holat-${id}`} className="text-xs text-ink-faint">
              {tr('Ҳолатни белгилаш')}
            </label>
            <select
              id={`yb-holat-${id}`}
              value={holat}
              onChange={(e) => setHolat(e.target.value as Holat)}
              className={`${MAYDON} min-h-11 text-sm`}
            >
              {HOLAT_TANLOVI.map((h) => (
                <option key={h.q} value={h.q}>
                  {tr(h.nom)}
                </option>
              ))}
            </select>
          </div>
          <input
            aria-label={tr('Изоҳ')}
            placeholder={tr('Изоҳ (ихтиёрий)')}
            value={izoh}
            onChange={(e) => setIzoh(e.target.value)}
            className={`${MAYDON} min-h-11 max-w-xs text-sm`}
          />
          <button
            type="button"
            disabled={yuborilmoqda}
            onClick={() => amal({ amal: 'holat', holati: holat, izoh: izoh.trim() || null })}
            className={tugma}
          >
            {tr('Сақлаш')}
          </button>
        </div>
      </div>
    </div>
  );
}
