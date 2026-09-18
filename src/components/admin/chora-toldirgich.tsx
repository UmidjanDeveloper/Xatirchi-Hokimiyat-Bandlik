'use client';

import { useState } from 'react';
import { ListChecks, Loader2, Play } from 'lucide-react';
import { useAlifbo } from '@/components/alifbo/alifbo-provider';

/**
 * ============================================================
 *  ЭСКИ ХАТЛОВЛАРДАН ТОПШИРИҚ ЯРАТИШ — тугма
 *
 *  ── Нега бу блок бор ──
 *
 *  Эҳтиёж → топшириқ занжири кейинроқ уланди. Ундан ОЛДИН
 *  киритилган хатловлардаги эҳтиёжлар анкета ичида ётиб қолди:
 *  ҳокимнинг «Чора-тадбирлар режаси» саҳифасида кўринмади,
 *  демак ҳеч ким уларни бажармади ҳам.
 *
 *  Бу тугма ўша эски хатловларни ҳам худди янгидек занжирдан
 *  ўтказади.
 *
 *  ── Нега икки қадам ──
 *
 *  Аввал САНАЛАДИ: «61 та топшириқ чиқади» деб кўрсатилади ва
 *  қайси ташкилотга нечтаси тушиши ёзилади. Фақат шундан кейин
 *  яратиш тугмаси очилади. Чунки топшириқ реал ходимга
 *  юкланади — уни кўрмасдан яратиш нотўғри.
 *
 *  ── Такрор босиш хавфсиз ──
 *
 *  Мавжуд топшириқ қайта яратилмайди. Иккинчи марта босилса
 *  «янги топшириқ йўқ» деб қайтаради.
 * ============================================================
 */

interface Natija {
  yozildimi: boolean;
  tekshirilgan: number;
  jami: number;
  xonadonSoni: number;
  tashkilotlar: Record<string, number>;
  /** Жойлаштирилгани 3 ойдан ошган-у текширилмаганлар */
  mustahkamlash: { tekshirilgan: number; yangi: number };
  /** «Ta'lim bo'limi» → «Xalq ta’limi» каби тузатишлар */
  nomlar: { tuzatilgan: number; ozgarishlar: { eski: string; yangi: string; soni: number }[] };
  mustahkamlashKun: number;
}

export function ChoraToldirgich() {
  const { t: tr } = useAlifbo();
  const [natija, setNatija] = useState<Natija | null>(null);
  const [yuklanmoqda, setYuklanmoqda] = useState<'sanash' | 'yozish' | null>(null);
  const [xato, setXato] = useState<string | null>(null);

  async function chaqir(usul: 'GET' | 'POST') {
    setYuklanmoqda(usul === 'GET' ? 'sanash' : 'yozish');
    setXato(null);
    try {
      const javob = await fetch('/api/admin/chora-toldirish', { method: usul });
      const d = await javob.json().catch(() => ({}));
      if (!javob.ok) throw new Error(d.xabar ?? tr('Бажариб бўлмади'));
      setNatija(d as Natija);
    } catch (e) {
      setXato(e instanceof Error ? e.message : tr('Бажариб бўлмади'));
    } finally {
      setYuklanmoqda(null);
    }
  }

  const tashkilotRoyxati = natija ? Object.entries(natija.tashkilotlar) : [];
  /* Учта ишдан бирортаси борми — «ҳеч нарса йўқ» дейишдан олдин */
  const ishBormi =
    natija !== null &&
    (natija.jami > 0 || natija.mustahkamlash.yangi > 0 || natija.nomlar.tuzatilgan > 0);

  return (
    <section className="karta p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <ListChecks className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
            <h2 className="text-sm font-bold text-ink">{tr('Эски хатловлардан топшириқ')}</h2>
          </div>
          <p className="mt-1 text-xs text-ink-faint">
            {tr('Занжир уланишидан олдинги анкеталардаги эҳтиёжларни топшириққа айлантиради')}
          </p>
        </div>

        <button
          type="button"
          onClick={() => void chaqir('GET')}
          disabled={yuklanmoqda !== null}
          className="tugma-asosiy flex shrink-0 items-center gap-2 rounded-md px-3.5 py-2 text-xs font-semibold"
        >
          {yuklanmoqda === 'sanash' ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <ListChecks className="h-4 w-4" aria-hidden="true" />
          )}
          {yuklanmoqda === 'sanash' ? tr('Саналмоқда…') : tr('Нечта чиқишини санаш')}
        </button>
      </div>

      {xato && (
        <p className="mt-3 text-xs text-danger" role="alert">
          {xato}
        </p>
      )}

      {natija && (
        <div className="mt-4 space-y-3">
          {!ishBormi ? (
            <p className="quti-ogoh text-xs leading-relaxed">
              {tr('Қиладиган иш йўқ')} — {natija.tekshirilgan} {tr('та хатлов ва')}{' '}
              {natija.mustahkamlash.tekshirilgan} {tr('та жойлаштириш текширилди')};{' '}
              {tr('ҳаммаси аллақачон тартибда.')}
            </p>
          ) : (
            <>
              {natija.jami > 0 && (
                <p
                  className={`text-xs leading-relaxed ${natija.yozildimi ? 'quti-ok' : 'quti-ogoh'}`}
                >
                  <b>{tr('Эҳтиёждан топшириқ')}</b> —{' '}
                  {natija.yozildimi ? tr('яратилди') : tr('чиқади')}:{' '}
                  <span className="raqam font-bold">{natija.jami}</span> {tr('та топшириқ')},{' '}
                  <span className="raqam font-bold">{natija.xonadonSoni}</span>{' '}
                  {tr('та хонадон бўйича')} ({natija.tekshirilgan} {tr('та хатловдан')}).
                </p>
              )}

              {/*
                ── ЗАНЖИРНИНГ ОХИРГИ ҲАЛҚАСИ ──

                Схемада «3 ойдан кейин текширилади» деб ёзилган
                эди, лекин фақат ҚЎЛДА белгиланарди. Ҳеч ким
                эсламади ва одамлар тўртинчи ойдан бери
                «жойлаштирилди» да ётаверди.
              */}
              {natija.mustahkamlash.yangi > 0 && (
                <p
                  className={`text-xs leading-relaxed ${natija.yozildimi ? 'quti-ok' : 'quti-ogoh'}`}
                >
                  <b>{tr('Мустаҳкамлаш текшируви')}</b> —{' '}
                  {natija.yozildimi ? tr('яратилди') : tr('чиқади')}:{' '}
                  <span className="raqam font-bold">{natija.mustahkamlash.yangi}</span>{' '}
                  {tr('та топшириқ')}. {tr('Булар жойлаштирилган, аммо')}{' '}
                  {natija.mustahkamlashKun} {tr('кундан кейин ишда қолгани ҳеч ким томонидан')}{' '}
                  {tr('текширилмаган фуқаролар')} ({natija.mustahkamlash.tekshirilgan}{' '}
                  {tr('тадан')}).
                </p>
              )}

              {/*
                ── МАСЪУЛ НОМЛАРИ ──

                «Xalq ta’limi» билан «Ta'lim bo'limi» кесимда
                икки ташкилот бўлиб турарди: ҳоким 12 та
                кечикиш деб кўрарди, аслида 15 та эди.
              */}
              {natija.nomlar.tuzatilgan > 0 && (
                <div
                  className={`text-xs leading-relaxed ${natija.yozildimi ? 'quti-ok' : 'quti-ogoh'}`}
                >
                  <b>{tr('Масъул номлари')}</b> —{' '}
                  {natija.yozildimi ? tr('тузатилди') : tr('тузатилади')}:{' '}
                  <span className="raqam font-bold">{natija.nomlar.tuzatilgan}</span>{' '}
                  {tr('та ёзув')}.
                  <ul className="mt-1 space-y-0.5">
                    {natija.nomlar.ozgarishlar.map((o) => (
                      <li key={o.eski}>
                        · {tr(o.eski)} → <b>{tr(o.yangi)}</b> ({o.soni} {tr('та')})
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <ul className="space-y-1">
                {tashkilotRoyxati.map(([nomi, soni]) => (
                  <li
                    key={nomi}
                    className="flex items-center justify-between rounded-md border border-line px-3 py-2 text-xs"
                  >
                    <span className="text-ink">{tr(nomi)}</span>
                    <span className="raqam font-bold text-ink">
                      {soni} {tr('та')}
                    </span>
                  </li>
                ))}
              </ul>

              {!natija.yozildimi && (
                <button
                  type="button"
                  onClick={() => void chaqir('POST')}
                  disabled={yuklanmoqda !== null}
                  className="tugma-asosiy flex items-center gap-2 rounded-md px-3.5 py-2 text-xs font-semibold"
                >
                  {yuklanmoqda === 'yozish' ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Play className="h-4 w-4" aria-hidden="true" />
                  )}
                  {yuklanmoqda === 'yozish' ? tr('Бажарилмоқда…') : tr('Шуларнинг ҳаммасини бажариш')}
                </button>
              )}

              <p className="text-[11px] text-ink-faint">
                {tr(
                  'Мавжуд топшириқ қайта яратилмайди — тугмани такрор босиш хавфсиз. Қоралама хатловларга тегилмайди.'
                )}
              </p>
            </>
          )}
        </div>
      )}
    </section>
  );
}
