'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type {
  DalilHolati,
  DalilManbasi,
  DalilMaqsadi,
  DalilTuri,
  JoylashuvVoqeaHolati,
} from '@prisma/client';
import {
  BadgeCheck,
  Briefcase,
  Check,
  FileCheck2,
  Link2Off,
  Loader2,
  TriangleAlert,
  X,
} from 'lucide-react';
import { useAlifbo } from '@/components/alifbo/alifbo-provider';
import {
  DALIL_HOLATI_NOMI,
  DALIL_MANBASI_NOMI,
  DALIL_MAQSADI_NOMI,
  DALIL_NOMI,
  JOYLASHISH_HOLATI_NOMI,
  TASDIQ_DARAJASI_NOMI,
  type TasdiqDarajasi,
} from '@/lib/dalil-nomlari';
import { formatDate } from '@/lib/utils';

/**
 * ============================================================
 *  ЖОЙЛАШТИРИШНИНГ ДАЛИЛИ — ФУҚАРО САҲИФАСИДА
 *
 *  ── Нега бу блок керак ──
 *
 *  «Ишга жойлаштирилди» ҳозирча битта босиш. Ходим тугмани
 *  босади, туман рақами биттага ошади, ва ҳеч ким
 *  текширмайди.
 *
 *  Бу блок ўша бўшлиқни ёпади: жойлаштирилган ҳар бир фуқаро
 *  ёнида «ҳужжати борми» деган савол ТУРАДИ ва унга жавоб
 *  берилмагунча йўқолмайди.
 *
 *  ── Нега киритган одам ўзи тасдиқлай олмайди ──
 *
 *  Ўзи ёзиб, ўзи тасдиқласа, текширувнинг маъноси қолмайди:
 *  рақам яна битта босиш билан ошаверарди.
 *
 *  Қоида техник эмас, ТАШКИЛИЙ: иккита одам кўрган рақам
 *  биттаси кўрганидан ишончлироқ.
 * ============================================================
 */

export interface DalilMaydonlari {
  id: string;
  turi: DalilTuri;
  holati: DalilHolati;
  izoh: string | null;
  reyestrIshJoyi: string | null;
  reyestrSanasi: Date | null;
  createdAt: Date;
  kiritganNomi: string | null;
  kiritganId: string | null;
  tasdiqlaganNomi: string | null;
  /** Текширилган сана (текширувчи қарор берган кун) */
  tasdiqlanganSana: Date | null;
  /** Далил қамраб олган давр (бор бўлса) */
  davrBoshi: Date | null;
  davrOxiri: Date | null;
  /**
   * ── ДАЛИЛ ҚАЕРДАН КЕЛГАН ──
   *
   * Аввал экранда фақат ТУРИ кўринарди: «Давлат реестри».
   * Аммо ўша ёзув қўлда юкланган Excel дан ҳам, текширилган
   * интеграциядан ҳам келиши мумкин — иккови БИР ХИЛ
   * кўринарди.
   */
  manbaTuri: DalilManbasi;
  /** Далил НИМАНИ исботлайди */
  maqsadi: DalilMaqsadi;
  /** Қайси ишга тегишли. `null` — боғланмаган */
  joylashishId: string | null;
  manbaTashkilot: string | null;
  hujjatSanasi: Date | null;
}

/**
 * ── ИШГА ЖОЙЛАШИШ ВОҚЕАСИ ──
 *
 * Аввал фуқаронинг иши ФАҚАТ битта майдонда турарди ва у
 * охиргисини сақларди. Одам иш алмаштирса, олдингиси изсиз
 * ўчиб кетар — ва эски ишнинг тасдиқланган шартномаси ЯНГИ
 * ишни тасдиқлаб турарди.
 */
export interface IshYozuvi {
  id: string;
  korxonaNomi: string;
  lavozim: string | null;
  boshlanganSana: Date;
  tugaganSana: Date | null;
  tugashSababi: string | null;
  holati: JoylashuvVoqeaHolati;
}

/** Қўлда киритиш мумкин бўлган турлар — реестр файлдан келади */
const QOLDA: DalilTuri[] = ['SHARTNOMA', 'BUYRUQ', 'ISH_BERUVCHI', 'MAHALLA'];

const NISHON: Record<DalilHolati, string> = {
  KIRITILDI: 'bg-warn-bg text-warn',
  TASDIQLANDI: 'bg-ok-bg text-ok',
  RAD_ETILDI: 'bg-danger-bg text-danger',
};

/**
 * Даража ранглари.
 *
 * `RAD_ETILGAN` ҚИЗИЛ: у «далил йўқ» эмас, «далил ёлғон
 * чиқди» дегани ва бу ЁМОНРОҚ ҳол. Аввал у ҳам сариқ
 * «кутилмоқда» бўлиб кўринарди.
 */
const DARAJA_NISHONI: Record<TasdiqDarajasi, string> = {
  RASMIY: 'bg-ok-bg text-ok',
  QOLDA_TASDIQ: 'bg-ok-bg text-ok',
  KUTILMOQDA: 'bg-warn-bg text-warn',
  FAQAT_XODIM: 'bg-warn-bg text-warn',
  RAD_ETILGAN: 'bg-danger-bg text-danger',
  DALILSIZ: 'bg-surface-muted text-ink-muted',
};

export function DalilBlogi({
  ishsizId,
  joylashgan,
  dalillar,
  ishlar,
  daraja,
  joriyIshId,
  qoshaOladi,
  tasdiqlayOladi,
  joriyUserId,
  muddat,
  muddatiOtgan,
}: {
  ishsizId: string;
  joylashgan: boolean;
  dalillar: DalilMaydonlari[];
  /** Ишлар тарихи — энг янгисидан бошлаб */
  ishlar: IshYozuvi[];
  /**
   * ҲОЗИРГИ ишнинг тасдиқ даражаси.
   *
   * Аввал бу ерда «далиллардан бирортаси тасдиқланганми»
   * деб ҳисобланарди — яъни ЭСКИ ишнинг далили ҳам «ҳа»
   * дерди.
   */
  daraja: TasdiqDarajasi;
  joriyIshId: string | null;
  qoshaOladi: boolean;
  tasdiqlayOladi: boolean;
  joriyUserId: string;
  muddat: Date | null;
  muddatiOtgan: boolean;
}) {
  const { t: tr } = useAlifbo();
  const router = useRouter();

  const [ochiq, setOchiq] = useState(false);
  const [turi, setTuri] = useState<DalilTuri | ''>('');
  const [izoh, setIzoh] = useState('');
  const [band, setBand] = useState(false);
  const [xato, setXato] = useState<string | null>(null);

  /* Жойлашмаган одамда далил ҳам бўлмайди — блок кўринмайди */
  if (!joylashgan) return null;

  /*
   * ── НИШОН ҲОЗИРГИ ИШ БЎЙИЧА ──
   *
   * Аввал шундай эди:
   *
   *     dalillar.some((d) => d.holati === 'TASDIQLANDI')
   *
   * Яъни одамда ҚАЧОНДИР тасдиқланган далил бўлса, экранда
   * «Тасдиқланган» деб турарди — ҳозирги иши бутунлай
   * ҳужжатсиз бўлса ҳам.
   */
  const tasdiqlangan = daraja === 'RASMIY' || daraja === 'QOLDA_TASDIQ';

  /* Ҳозирги ишга боғланмаган далиллар — алоҳида гуруҳ */
  const bogliqsizlar = dalillar.filter((d) => d.joylashishId === null);

  async function yubor() {
    if (!turi) return;
    setBand(true);
    setXato(null);
    try {
      const javob = await fetch(`/api/ishsizlar/${ishsizId}/dalil`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ turi, izoh: izoh.trim() || null }),
      });
      const n = await javob.json();
      if (!javob.ok || !n.ok) {
        setXato(n.xabar ?? 'Saqlab boʻlmadi');
        return;
      }
      setOchiq(false);
      setTuri('');
      setIzoh('');
      router.refresh();
    } catch {
      setXato('Tarmoq xatosi');
    } finally {
      setBand(false);
    }
  }

  async function halQil(dalilId: string, tasdiqlandi: boolean) {
    setBand(true);
    setXato(null);
    try {
      const javob = await fetch(`/api/ishsizlar/${ishsizId}/dalil`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dalilId, tasdiqlandi }),
      });
      const n = await javob.json();
      if (!javob.ok || !n.ok) {
        setXato(n.xabar ?? 'Saqlab boʻlmadi');
        return;
      }
      router.refresh();
    } catch {
      setXato('Tarmoq xatosi');
    } finally {
      setBand(false);
    }
  }

  return (
    <section className="karta space-y-3 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
            <FileCheck2 className="h-4 w-4 text-accent" />
            {tr('Ишга жойлашганлик далили')}
          </h2>
          <p className="mt-1 text-xs text-ink-faint">
            {tr('«Жойлаштирилди» деган ёзув ҳужжат билан тасдиқланиши керак')}
          </p>
        </div>

        {/*
          Нишон ДАРАЖАни айтади, «ҳа/йўқ» эмас.

          Аввал учта ҳар хил ҳол «Ҳужжат кутилмоқда» бўлиб
          бир хил кўринарди: ходим билдирган, ҳужжат
          киритилган, ва ҳужжат РАД ЭТИЛГАН. Учинчиси
          биринчисидан ёмонроқ.
        */}
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${DARAJA_NISHONI[daraja]}`}
        >
          {tasdiqlangan ? (
            <BadgeCheck className="h-3.5 w-3.5" />
          ) : daraja === 'RAD_ETILGAN' ? (
            <TriangleAlert className="h-3.5 w-3.5" />
          ) : null}
          {tr(TASDIQ_DARAJASI_NOMI[daraja])}
        </span>
      </div>

      {!tasdiqlangan && muddat && (
        <p className="text-xs text-ink-muted">
          {muddatiOtgan ? (
            <span className="text-danger">
              {tr('Ҳужжат муддати ЎТГАН')}: {formatDate(muddat).split(',')[0]}
            </span>
          ) : (
            <>
              {tr('Ҳужжат муддати')}: {formatDate(muddat).split(',')[0]}
            </>
          )}
        </p>
      )}

      {/*
        ── ИШЛАР ТАРИХИ ──

        Аввал экранда фақат ОХИРГИ иш кўринарди. Одам иш
        алмаштирса, олдингиси изсиз кетар ва «қанча ишлади»
        деган саволга жавоб қолмасди.

        Ҳозирги иш АЖРАТИБ кўрсатилади: далил айнан ўшанга
        боғланиши керак.
      */}
      {ishlar.length > 0 && (
        <div className="rounded-md border border-line bg-surface-muted p-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-muted">
            <Briefcase className="h-3.5 w-3.5" />
            {tr('Ишлар тарихи')}
          </p>
          <ul className="mt-2 space-y-1.5">
            {ishlar.map((i) => {
              const joriy = i.id === joriyIshId;
              const dalilSoni = dalillar.filter((d) => d.joylashishId === i.id).length;
              const tasdiqSoni = dalillar.filter(
                (d) => d.joylashishId === i.id && d.holati === 'TASDIQLANDI'
              ).length;
              return (
                <li
                  key={i.id}
                  className={`rounded px-2 py-1.5 text-xs ${
                    joriy ? 'bg-accent-bg text-ink' : 'text-ink-muted'
                  }`}
                >
                  <span className="font-semibold">{tr(i.korxonaNomi)}</span>
                  {i.lavozim ? <span> · {tr(i.lavozim)}</span> : null}
                  <span className="text-ink-faint">
                    {' '}
                    · {formatDate(i.boshlanganSana).split(',')[0]}
                    {i.tugaganSana
                      ? ` — ${formatDate(i.tugaganSana).split(',')[0]}`
                      : ` — ${tr('ҳозиргача')}`}
                  </span>
                  <span className="text-ink-faint"> · {tr(JOYLASHISH_HOLATI_NOMI[i.holati])}</span>
                  {/*
                    Ҳар ишнинг ЎЗ далили саналади: эски
                    ишнинг шартномаси янгисини тасдиқламайди.
                  */}
                  <span className={tasdiqSoni > 0 ? 'text-ok' : 'text-warn'}>
                    {' '}
                    · {tasdiqSoni > 0
                      ? `${tr('тасдиқланган')} (${tasdiqSoni})`
                      : dalilSoni > 0
                        ? `${tr('далил текширилмаган')} (${dalilSoni})`
                        : tr('далили йўқ')}
                  </span>
                  {i.tugashSababi ? (
                    <span className="text-ink-faint"> · {tr(i.tugashSababi)}</span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/*
        Боғланмаган далил — нуқсон эмас, ИШ: қайси ишга
        тегишли экани ёзилмаган. Тизим ЎЗИ тахмин қилмайди,
        чунки нотўғри боғланган далил йўқ далилдан ёмонроқ.
      */}
      {bogliqsizlar.length > 0 && ishlar.length > 0 && (
        <p className="flex items-start gap-1.5 rounded-md bg-warn-bg px-3 py-2 text-xs text-warn">
          <Link2Off className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            {bogliqsizlar.length} {tr('далил ҳеч қайси ишга боғланмаган — қайси ишга тегишли экани ёзилмаган. Тизим ўзи тахмин қилмайди.')}
          </span>
        </p>
      )}

      {dalillar.length > 0 && (
        <ul className="space-y-2">
          {dalillar.map((d) => (
            <li key={d.id} className="rounded-md border border-line p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink">{tr(DALIL_NOMI[d.turi])}</p>
                  {/*
                    ── МАНБА ЭКРАНДА ──

                    Ҳоким «тасдиқланган» сўзини ўқиганда
                    нимага ишонаётганини билиши керак: қўлда
                    юкланган Excel га ёки текширилган
                    интеграцияга.
                  */}
                  <p className="mt-0.5 text-xs">
                    <span
                      className={
                        d.manbaTuri === 'RASMIY_INTEGRATSIYA' ? 'text-ok' : 'text-ink-muted'
                      }
                    >
                      {tr(DALIL_MANBASI_NOMI[d.manbaTuri])}
                    </span>
                    <span className="text-ink-faint">
                      {' '}
                      · {tr(DALIL_MAQSADI_NOMI[d.maqsadi])}
                    </span>
                  </p>
                  <p className="mt-0.5 text-xs text-ink-faint">
                    {formatDate(d.createdAt)}
                    {d.kiritganNomi ? ` · ${tr(d.kiritganNomi)}` : ''}
                    {d.manbaTashkilot ? ` · ${tr(d.manbaTashkilot)}` : ''}
                    {d.hujjatSanasi
                      ? ` · ${tr('ҳужжат санаси')}: ${formatDate(d.hujjatSanasi).split(',')[0]}`
                      : ''}
                  </p>
                  {d.joylashishId === null && (
                    <p className="mt-1 text-xs text-warn">
                      {tr('Ҳеч қайси ишга боғланмаган')}
                    </p>
                  )}
                  {d.reyestrIshJoyi && (
                    <p className="mt-1 text-xs text-ink-muted">
                      {tr('Реестрда')}: {tr(d.reyestrIshJoyi)}
                    </p>
                  )}
                  {d.izoh && <p className="mt-1 text-xs text-warn">{tr(d.izoh)}</p>}
                  {/*
                    ── ДАВР, МАНБА ВА ТЕКШИРИШ САНАСИ ──

                    Кўчирма санаси ва далил қамраган давр (бор бўлса) ҳамда
                    текшириш куни ҚАРОР БЕРГАН ХОДИМ билан бирга кўринади:
                    «қачон ва ким текширди» деган савол ҳар қаторда жавобли.
                  */}
                  {(d.reyestrSanasi || d.davrBoshi || d.davrOxiri) && (
                    <p className="mt-1 text-xs text-ink-faint">
                      {d.reyestrSanasi
                        ? `${tr('Кўчирма санаси')}: ${formatDate(d.reyestrSanasi).split(',')[0]}`
                        : ''}
                      {d.davrBoshi || d.davrOxiri
                        ? `${d.reyestrSanasi ? ' · ' : ''}${tr('Давр')}: ${
                            d.davrBoshi ? formatDate(d.davrBoshi).split(',')[0] : '…'
                          } — ${d.davrOxiri ? formatDate(d.davrOxiri).split(',')[0] : '…'}`
                        : ''}
                    </p>
                  )}
                  {d.tasdiqlaganNomi && (
                    <p className="mt-1 text-xs text-ink-faint">
                      {tr('Текширди')}: {tr(d.tasdiqlaganNomi)}
                      {d.tasdiqlanganSana
                        ? ` · ${tr('текширилган сана')}: ${formatDate(d.tasdiqlanganSana).split(',')[0]}`
                        : ''}
                    </p>
                  )}
                </div>

                <span
                  className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${NISHON[d.holati]}`}
                >
                  {tr(DALIL_HOLATI_NOMI[d.holati])}
                </span>
              </div>

              {/*
                Текшириш тугмаси ФАҚАТ бошқа одам киритган
                далилда чиқади. Ўзи киритганида чиқса, ходим
                уни босиб қўярди — ва серверда рад жавоб
                оларди, яъни тугма ёлғон ваъда берарди.
              */}
              {tasdiqlayOladi && d.holati === 'KIRITILDI' && d.kiritganId !== joriyUserId && (
                <div className="mt-2.5 flex gap-2">
                  <button
                    type="button"
                    disabled={band}
                    onClick={() => halQil(d.id, true)}
                    className="inline-flex items-center gap-1.5 rounded-md bg-ok px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
                  >
                    <Check className="h-3.5 w-3.5" />
                    {tr('Тасдиқлайман')}
                  </button>
                  <button
                    type="button"
                    disabled={band}
                    onClick={() => halQil(d.id, false)}
                    className="inline-flex items-center gap-1.5 rounded-md border border-line px-3 py-1.5 text-xs font-semibold text-ink-muted transition hover:border-danger hover:text-danger disabled:opacity-50"
                  >
                    <X className="h-3.5 w-3.5" />
                    {tr('Яроқсиз')}
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {dalillar.length === 0 && (
        <p className="text-sm text-ink-muted">{tr('Ҳали ҳеч қандай ҳужжат киритилмаган.')}</p>
      )}

      {qoshaOladi &&
        (ochiq ? (
          <div className="space-y-2 rounded-md border border-line bg-surface-muted p-3">
            <label className="block text-xs font-semibold text-ink-muted">
              {tr('Ҳужжат тури')}
            </label>
            <select
              value={turi}
              onChange={(e) => setTuri(e.target.value as DalilTuri)}
              className="maydon w-full"
            >
              <option value="">{tr('— танланг —')}</option>
              {QOLDA.map((t) => (
                <option key={t} value={t}>
                  {tr(DALIL_NOMI[t])}
                </option>
              ))}
            </select>

            <label className="block text-xs font-semibold text-ink-muted">
              {tr('Изоҳ ёки ҳужжат рақами')}
            </label>
            <input
              value={izoh}
              onChange={(e) => setIzoh(e.target.value)}
              maxLength={500}
              className="maydon w-full"
              placeholder={tr('масалан: 12-сон буйруқ, 03.09.2026')}
            />

            {xato && <p className="text-xs text-danger">{tr(xato)}</p>}

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                disabled={band || !turi}
                onClick={yubor}
                className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-accent-contrast transition hover:opacity-90 disabled:opacity-50"
              >
                {band ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                {tr('Сақлаш')}
              </button>
              <button
                type="button"
                onClick={() => setOchiq(false)}
                className="rounded-md border border-line px-3 py-1.5 text-xs font-semibold text-ink-muted transition hover:text-ink"
              >
                {tr('Бекор')}
              </button>
            </div>

            <p className="pt-1 text-xs text-ink-faint">
              {tr('Киритилган ҳужжатни бандлик маркази текширади.')}
            </p>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setOchiq(true)}
            className="inline-flex items-center gap-1.5 rounded-md border border-line px-3 py-1.5 text-xs font-semibold text-ink-muted transition hover:border-accent hover:text-accent"
          >
            {tr('Ҳужжат қўшиш')}
          </button>
        ))}

      {xato && !ochiq && <p className="text-xs text-danger">{tr(xato)}</p>}
    </section>
  );
}
