import { AlertTriangle, MessageCircle } from 'lucide-react';
import { matnchi } from '@/lib/alifbo-server';
import { telegramSozlanganmi, xabarHisobi } from '@/lib/xabarnoma';
import { NavbatTugmasi } from './navbat-tugmasi';

/**
 * ============================================================
 *  ХАБАРНОМА ҲОЛАТИ — АДМИНИСТРАТОР УЧУН
 *
 *  Асосий савол: «хабарлар кетяптими».
 *
 *  Илгари бундай савол умуман йўқ эди, чунки хабарнинг ўзи
 *  йўқ эди. Энди у бор — ва у ЖИМГИНА ишламай қолиши мумкин:
 *  токен эскиради, бот блокланади, Telegram ўчади.
 *
 *  Ходим эса буни айтмайди: у хабар кутилганини ҳам билмайди.
 *  Шунинг учун ҳолат шу ерда, рақам билан туради.
 * ============================================================
 */

const raqam = (n: number) => n.toLocaleString('ru-RU');

export async function XabarHolati() {
  const tr = matnchi();
  const sozlangan = telegramSozlanganmi();
  const h = await xabarHisobi();

  return (
    <section className="karta p-4 sm:p-5">
      <div className="flex items-start gap-2.5">
        <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-ink-faint" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-bold text-ink">{tr('Telegram хабарномаси')}</h2>
          <p className="mt-1 text-xs text-ink-faint">
            {tr('Маҳалла ходимига «сизнинг маҳаллангизга мос эълон чиқди» деган хабар')}
          </p>
        </div>
        {sozlangan && <NavbatTugmasi />}
      </div>

      {/*
        Созланмаган бўлса — бу ХАТО эмас, шунчаки ҳали
        уланмаган. Аммо навбат тўпланиб бораётганини айтиш
        керак: акс ҳолда бир ойдан кейин «нега ҳеч ким хабар
        олмаган» деган савол туғиларди.
      */}
      {!sozlangan && (
        <div className="quti-ogoh mt-3 flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-medium">{tr('TELEGRAM_BOT_TOKEN созланмаган')}</p>
            <p className="mt-0.5 text-xs">
              {tr('Хабарлар навбатга тўпланаверади, аммо юборилмайди. Токенни Vercel созламаларига қўйинг.')}
              {h.kutilmoqda > 0 && ` ${tr('Ҳозир навбатда:')} ${raqam(h.kutilmoqda)}`}
            </p>
          </div>
        </div>
      )}

      <div className="mt-4 grid gap-2 sm:grid-cols-4">
        <Raqam nomi={tr('Уланган ходим')} qiymat={`${raqam(h.ulangan)} / ${raqam(h.jamiXodim)}`} />
        <Raqam nomi={tr('Юборилди')} qiymat={raqam(h.yuborildi)} />
        <Raqam nomi={tr('Навбатда')} qiymat={raqam(h.kutilmoqda)} xavfli={h.kutilmoqda > 50} />
        <Raqam nomi={tr('Хато')} qiymat={raqam(h.xato)} xavfli={h.xato > 0} />
      </div>

      {h.bekor > 0 && (
        <p className="mt-2.5 text-xs text-ink-faint">
          {raqam(h.bekor)}{' '}
          {tr('та хабар бекор қилинди — ходим Telegram ни уламаган. Бу хато эмас.')}
        </p>
      )}
    </section>
  );
}

function Raqam({
  nomi,
  qiymat,
  xavfli,
}: {
  nomi: string;
  qiymat: string;
  xavfli?: boolean;
}) {
  return (
    <div className={`rounded-md border p-2.5 ${xavfli ? 'border-warn' : 'border-line'}`}>
      <p className="text-[11px] text-ink-faint">{nomi}</p>
      <p className="mt-0.5 text-lg font-bold tabular-nums text-ink">{qiymat}</p>
    </div>
  );
}
