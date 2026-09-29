'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CloudOff, Loader2, TriangleAlert, Upload, UserCheck } from 'lucide-react';
import { useAlifbo } from '@/components/alifbo/alifbo-provider';
import {
  begona,
  egasiz,
  egasizlarniOlish,
  etiborTalabQiladi,
  meniki,
  navbatniOqi,
  navbatniYubor,
  type BittaNatija,
  type NavbatNatijalari,
  type NavbatYozuvi,
} from '@/lib/offline';

/**
 * ============================================================
 *  ЮБОРИЛМАГАН ХАТЛОВЛАР
 *
 *  Хатлов ҳовлида, хонадон эшиги олдида тўлдирилади. Хатирчи
 *  туманининг чекка маҳаллаларида алоқа узилиб туради.
 *
 *  Илгари алоқа узилса, ходимга «маълумот телефон хотирасида
 *  сақланди — алоқа тикланганда қайта юборинг» деб ёзиларди.
 *  Бу РОСТ эди, лекин «қайта юбориш» ни ходим ЭСЛАБ ҚОЛИШИ ва
 *  ўзи бажариши керак эди: анкетани қайта очиб, охиригача
 *  ўтиб, яна юбориш тугмасини босиш. Кун охирида, ўнта
 *  хонадондан кейин, буни ким эслайди?
 *
 *  Энди тайёр хатлов НАВБАТГА тушади ва алоқа тикланиши билан
 *  ўзи кетади. Бу чизиқ фақат навбатда ёзув бўлганда кўринади.
 *
 *  ── КИМНИКИ ──
 *
 *  Навбат `localStorage` да ва у ҲИСОБГА боғланмаган. Телефон
 *  битта, ходим эса иккита бўлиши мумкин: аккумулятор ўтирган,
 *  телефон синган, ходим касал.
 *
 *  Илгари биринчи ходимнинг юборилмаган хатловлари иккинчиси
 *  кирган заҳоти ЎЗИ жўнаб кетарди ва сервер уларни иккинчи
 *  ходимнинг иши деб ёзиб қўярди. Журналда нотўғри исм —
 *  «ким хатлов қилди» деган саволга нотўғри жавоб.
 *
 *  Энди ҳар ёзувда эгаси турибди ва фақат ЎЗИНИКИ юборилади.
 *
 *  ── ТАКРОР ва ЗИДДИЯТ ──
 *
 *  Сервер жавоби келишидан олдин алоқа узилса, ёзув аслида
 *  сақланган бўлиши мумкин. Қайта юборилса, сервер 409
 *  қайтаради — аммо 409 нинг ИККИТА ҳар хил сабаби бор:
 *
 *    · ўзимизнинг олдинги юборишимиз ўтиб кетган — ТАКРОР,
 *      зарари йўқ, навбатдан ўчирамиз;
 *
 *    · ўша манзилни ҳамкасб аввалроқ киритган ёки бир
 *      манзилда иккита оила яшайди — ЗИДДИЯТ. Бизнинг
 *      анкетамиз ҳеч қаерга сақланмаган ва уни ўчириш
 *      ходимнинг бир соатлик ишини йўқотиш бўларди.
 *
 *  Фарқни сервер қилади: юборишда идемпотентлик калити
 *  кетади. Зиддиятли ёзув навбатда ҚОЛАДИ ва ходимга
 *  мавжуд ёзувнинг ҳаволаси кўрсатилади.
 * ============================================================
 */

/**
 * Битта ёзувни юборади ва натижани турига ажратади.
 *
 * Навбатда СЎРОВНИНГ ЎЗИ сақланади — қоралама `id` си билан
 * бирга. Бу муҳим: агар анкета аввал қоралама сифатида
 * сақланган бўлса, `id` сиз юбориш ЯНГИ ёзув яратишга уринарди,
 * ягоналик чегараси уни 409 билан рад этарди, ва эски қоралама
 * абадий «юборилмаган» бўлиб қолиб кетарди.
 */
async function bittasiniYubor(sorov: unknown): Promise<BittaNatija> {
  let javob: Response;
  try {
    javob = await fetch('/api/xatlov', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sorov),
    });
  } catch {
    return { holat: 'aloqa-yoq' };
  }

  const tana = (await javob.json().catch(() => ({}))) as {
    takror?: boolean;
    mavjudId?: string | null;
  };

  /*
   * Сервер калитни таниб, «бу ёзувни аллақачон олганман»
   * деса — 200 ва `takror: true`. Иш жойида.
   */
  if (javob.ok) return { holat: tana.takror ? 'takror' : 'saqlandi' };

  /* Ҳақиқий зиддият — ёзув навбатда қолади */
  if (javob.status === 409) return { holat: 'ziddiyat', mavjudId: tana.mavjudId ?? null };

  // Сервер ишламаяпти — кейинроқ уриниш мантиқли
  if (javob.status >= 500) return { holat: 'aloqa-yoq' };
  // 400, 401, 403 — қайта юборишдан фойда йўқ
  return { holat: 'yaroqsiz' };
}

interface Props {
  /** Жорий ходимнинг логини — фақат ЎЗИНИКИ юборилади */
  egasi: string;
}

export function XatlovNavbati({ egasi }: Props) {
  const { t: tr } = useAlifbo();
  const router = useRouter();

  const [mening, setMening] = useState<NavbatYozuvi[]>([]);
  const [boshqalar, setBoshqalar] = useState(0);
  const [egasizlar, setEgasizlar] = useState(0);
  const [ishlamoqda, setIshlamoqda] = useState(false);
  const [natija, setNatija] = useState<NavbatNatijalari | null>(null);

  const sana = useCallback(() => {
    const n = navbatniOqi();
    const m = meniki(n, egasi);
    setMening(m);
    setBoshqalar(begona(n, egasi).length);
    setEgasizlar(egasiz(n).length);
    return m.length;
  }, [egasi]);

  const yubor = useCallback(async () => {
    if (ishlamoqda) return;
    setIshlamoqda(true);
    try {
      const n = await navbatniYubor(bittasiniYubor, egasi);
      setNatija(n);
      sana();
      if (n.yuborildi > 0 || n.takror > 0) router.refresh();
    } finally {
      setIshlamoqda(false);
    }
  }, [ishlamoqda, router, sana, egasi]);

  useEffect(() => {
    /*
     * Саҳифа очилганда бир марта ва алоқа тикланганда — ҳар
     * сафар. Таймер билан такрорлаб турмаймиз: батарея ҳовлида
     * кун бўйи ишлайдиган телефонда қиммат, ва `online` ҳодисаси
     * айнан керакли пайтда келади.
     */
    if (sana() > 0 && navigator.onLine) void yubor();

    const tiklandi = () => { if (sana() > 0) void yubor(); };
    window.addEventListener('online', tiklandi);
    return () => window.removeEventListener('online', tiklandi);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [egasi]);

  const soni = mening.length;
  const etibor = mening.filter(etiborTalabQiladi).length;
  const ziddiyatlilar = mening.filter((y) => y.ziddiyat);

  /* Ҳеч нарса йўқ — чизиқ умуман кўринмайди */
  if (soni === 0 && boshqalar === 0 && egasizlar === 0 && !natija) return null;

  return (
    <div className="mb-3 space-y-2">
      {soni > 0 && <MeningNavbatim />}
      {soni === 0 && natija && <Yakunlandi />}
      {egasizlar > 0 && <Egasizlar />}
      {boshqalar > 0 && <Begonalar />}
    </div>
  );

  // ── Ўз навбатим ──
  function MeningNavbatim() {
    const hammasiEtibor = etibor === soni;
    return (
      <div
        className={`rounded-md border p-3 ${
          hammasiEtibor ? 'border-danger bg-danger-bg' : 'border-warn bg-warn-bg'
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            {hammasiEtibor ? (
              <TriangleAlert className="h-4 w-4 shrink-0 text-danger" />
            ) : (
              <CloudOff className="h-4 w-4 shrink-0 text-warn" />
            )}
            <div className="min-w-0">
              <p className={`text-sm font-semibold ${hammasiEtibor ? 'text-danger' : 'text-warn'}`}>
                <span className="raqam">{soni}</span> {tr('та хатлов ҳали юборилмаган')}
              </p>
              <p className="mt-0.5 text-[11px] text-ink-muted">
                {etibor > 0
                  ? tr(
                      `${etibor} таси ўтмади — уларни қайта очиб текшириш керак.`
                    )
                  : tr('Алоқа тикланиши билан ўзи юборилади. Телефонни ўчирсангиз ҳам йўқолмайди.')}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void yubor()}
            disabled={ishlamoqda}
            className="flex shrink-0 items-center gap-1.5 rounded-md border border-line bg-surface px-3 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:border-accent hover:text-accent disabled:opacity-60"
          >
            {ishlamoqda ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Upload className="h-3.5 w-3.5" />
            )}
            {tr('Ҳозир юбориш')}
          </button>
        </div>

        {ziddiyatlilar.length > 0 && (
          <div className="mt-2.5 rounded-md border border-line bg-surface p-2.5">
            <p className="text-[11px] font-semibold text-ink">
              {tr('Бу манзиллар бўйича базада бошқа ёзув бор:')}
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-ink-muted">
              {tr(
                'Сизнинг анкетангиз сақланмади ва телефонда турибди. Мавжуд ёзувни очиб солиштиринг: ўша хонадон бўлса — анкетангизни ўчириш мумкин, бошқа оила бўлса — манзилни аниқлаштириб қайта юборинг.'
              )}
            </p>
            <ul className="mt-2 space-y-1">
              {ziddiyatlilar.map((y) => (
                <li key={y.localId} className="flex flex-wrap items-center gap-2 text-[11px]">
                  <span className="text-ink-muted">{tr(manzili(y))}</span>
                  {y.ziddiyat && y.ziddiyat !== 'nomalum' && (
                    <Link
                      href={`/xatlov/${y.ziddiyat}`}
                      className="font-medium text-accent underline underline-offset-2"
                    >
                      {tr('Мавжуд ёзувни очиш')}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {natija?.aloqaYoq && !ishlamoqda && (
          <p className="mt-2 text-[11px] text-ink-muted">
            {tr('Алоқа ҳали йўқ. Кейинроқ ўзи қайта уринади.')}
          </p>
        )}
      </div>
    );
  }

  // ── Ҳаммаси кетди ──
  function Yakunlandi() {
    const jami = (natija?.yuborildi ?? 0) + (natija?.takror ?? 0);
    if (jami === 0) return null;
    return (
      <div className="quti-ok flex items-center gap-2">
        <Upload className="h-4 w-4 shrink-0" />
        <span>
          {tr('Кутиб турган')} {jami} {tr('та хатлов серверга юборилди.')}
          {natija && natija.takror > 0
            ? ` ${natija.takror} ${tr('таси аввалроқ сақланган экан.')}`
            : ''}
        </span>
      </div>
    );
  }

  // ── Эгаси белгиланмаган эски ёзувлар ──
  function Egasizlar() {
    return (
      <div className="rounded-md border border-line bg-surface p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <UserCheck className="h-4 w-4 shrink-0 text-ink-muted" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink">
                <span className="raqam">{egasizlar}</span>{' '}
                {tr('та юборилмаган хатловнинг эгаси номаълум')}
              </p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-ink-muted">
                {tr(
                  'Улар бу телефонда илгаридан қолган. Сизники бўлса — тасдиқланг, улар сизнинг номингиздан юборилади. Ҳамкасбингизники бўлса — тегманг, у ўз ҳисоби билан кирганда юборади.'
                )}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              egasizlarniOlish(egasi);
              sana();
            }}
            className="shrink-0 rounded-md border border-line bg-surface px-3 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:border-accent hover:text-accent"
          >
            {tr('Булар менинг ишим')}
          </button>
        </div>
      </div>
    );
  }

  // ── Бошқа ходимнинг ёзувлари ──
  function Begonalar() {
    return (
      <div className="rounded-md border border-line bg-surface-muted p-3">
        <p className="text-[11px] leading-relaxed text-ink-muted">
          {tr('Бу телефонда бошқа ходимнинг')} <span className="raqam">{boshqalar}</span>{' '}
          {tr(
            'та юборилмаган хатлови турибди. Улар сизнинг номингиздан юборилмайди — ўша ходим ўз ҳисоби билан кирганда ўзи жўнатади.'
          )}
        </p>
      </div>
    );
  }
}

/** Ёзувдаги манзилни кўрсатиш учун чиқариб олади */
function manzili(y: NavbatYozuvi): string {
  const m = y.malumot as
    | { malumot?: { xonadon?: { manzil?: string; oilaBoshligi?: string } } }
    | undefined;
  const x = m?.malumot?.xonadon;
  if (!x) return 'манзили ёзилмаган';
  return [x.oilaBoshligi, x.manzil].filter(Boolean).join(' · ') || 'манзили ёзилмаган';
}
