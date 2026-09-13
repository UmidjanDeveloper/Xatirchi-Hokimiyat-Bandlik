import { MapPin } from 'lucide-react';
import { matnchi } from '@/lib/alifbo-server';
import { orinTaqsimoti, TAQSIMOT_CHEGARASI } from '@/lib/taqsimot';

/**
 * ============================================================
 *  ЭЪЛОН ТАҚСИМОТИ — «бу иш ўрни қайси маҳаллаларга берилсин»
 *
 *  Бандлик ходими янги эълон киритгандан кейин туғиладиган
 *  савол: энди нима қилиш керак? Илгари жавоб йўқ эди — эълон
 *  базада турар, ходим эса ё ҳаммасини кутиб ўтирар, ёки
 *  танишларига қўнғироқ қиларди.
 *
 *  Бу рўйхат унга АНИҚ қадам беради: «Уйшун МФЙ да 4 та мос
 *  одам бор, Чағатойда 2 та». У ўша икки маҳалла раисига
 *  қўнғироқ қилади — 70 тасига эмас. Раис эса ўз саҳифасида
 *  айнан шу эълонни ва ўз фуқароларини кўради.
 *
 *  ── Нега эълон маҳалласи биринчи ──
 *
 *  Яқинлик — ишга бориш масаласи. Узоқдаги «мосроқ» одам
 *  биринчи ойда йўл харажатидан толиб, ишдан кетиб қолиши
 *  мумкин. Шунинг учун эълон очилган маҳалла, номзоди камроқ
 *  бўлса ҳам, рўйхатнинг тепасида туради ва белги билан
 *  ажратилади.
 * ============================================================
 */
export async function OrinTaqsimoti({ orinId }: { orinId: string }) {
  const tr = matnchi();
  const natija = await orinTaqsimoti(orinId);
  if (!natija) return null;

  const sarlavha = (
    <h2 className="flex items-center gap-1.5 text-sm font-bold text-ink">
      <MapPin className="h-4 w-4 shrink-0 text-ink-faint" />
      {tr('Тақсимот — қайси маҳаллаларга хабар берилсин')}
    </h2>
  );

  /*
    Ҳеч ким топилмаса ҳам бўлим ЯШИРИЛМАЙДИ.

    Илгари шундай режалаштирилган эди — «мос одам йўқ бўлса,
    кўрсатадиган нарса йўқ» деб. Аммо ходим учун бўш экран ва
    «тизим ишламаяпти» деган ўй бир хил нарса. «Мос одам
    топилмади» — бу ҳам ЖАВОБ ва ундан кейинги қадам аниқ:
    талабни юмшатиш ёки курс очиш.
  */
  if (natija.ulushlar.length === 0) {
    return (
      <section className="karta p-4 sm:p-5">
        {sarlavha}
        <p className="mt-2 text-sm text-ink-muted">
          {tr('Туманда бу эълонга мос фуқаро топилмади. Талабни юмшатиш (тажриба ёки маълумот даражаси) ёки шу йўналишда касб-ҳунар курси очиш масаласини кўриб чиқинг.')}
        </p>
      </section>
    );
  }

  const eng = natija.ulushlar[0].nomzodlar;

  return (
    <section className="karta p-4 sm:p-5">
      {sarlavha}
      <p className="mt-1 text-xs text-ink-faint">
        {natija.pastMoslik
          ? tr(`Мослиги ${TAQSIMOT_CHEGARASI}% дан юқори фуқаро топилмади — қуйида ЭНГ ЯҚИН маҳаллалар кўрсатилган. Улар билан ишлаш мумкин, аммо талабни юмшатиш ёки қўшимча ўқитиш керак бўлиши эҳтимоли юқори.`)
          : tr(`Жами ${natija.jami} та мос фуқаро, ${natija.ulushlar.length} та маҳаллада. Мослик ${TAQSIMOT_CHEGARASI}% дан юқори бўлганлар саналган. Шу маҳалла раисларига хабар беринг — эълон уларнинг саҳифасида ҳам кўринади.`)}
      </p>

      <div className="mt-3 space-y-1.5">
        {natija.ulushlar.map((u) => (
          <div key={u.mahallaId} className="flex items-center gap-3">
            <span className="w-44 shrink-0 truncate text-sm text-ink">
              {tr(u.nomiKirill)}
              {u.ozMahallasi && (
                <span className="ml-1.5 rounded bg-accent-soft px-1.5 py-0.5 text-[11px] font-medium text-accent">
                  {tr('эълон шу ерда')}
                </span>
              )}
            </span>
            {/*
              Устун узунлиги ЭНГ КЎП маҳаллага нисбатан. Сон
              ҳам ёзилади: узунлик таққослаш учун, рақам эса
              қўнғироқ қилишдан олдин билиш учун керак.
            */}
            <span className="h-2 flex-1 overflow-hidden rounded-full bg-surface-muted">
              <span
                className="block h-full rounded-full bg-accent"
                style={{ width: `${Math.max(6, Math.round((u.nomzodlar / eng) * 100))}%` }}
              />
            </span>
            <span className="raqam w-16 shrink-0 text-right text-sm font-medium text-ink">
              {u.nomzodlar} {tr('киши')}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
