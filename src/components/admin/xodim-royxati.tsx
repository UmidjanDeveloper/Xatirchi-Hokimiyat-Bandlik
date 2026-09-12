'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Check,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Pencil,
  Search,
  X,
} from 'lucide-react';
import type { Rol } from '@prisma/client';
import { useAlifbo } from '@/components/alifbo/alifbo-provider';
import { ROL_NOMI } from '@/components/shell/navigatsiya';
import { kirilldanLotinga } from '@/lib/hudud-qidiruv';
import { parolYarat } from '@/lib/parol-yarat';
import { formatPhone } from '@/lib/utils';

/**
 * ============================================================
 *  XODIMLAR RO'YXATI
 *
 *  Qidiruv, joyida tahrirlash va parolni ko'rish.
 *
 *  ── Qidiruv ikkala alifboda ishlaydi ──
 *
 *  Ismlar bazada KIRILLDA saqlanadi, lekin xodim lotinda
 *  yozishi mumkin - va aksincha. Shuning uchun qidiruvdan oldin
 *  ham so'rov, ham ism bitta ko'rinishga keltiriladi: kirill
 *  lotinga o'giriladi, apostroflar olib tashlanadi.
 *
 *  Ya'ni "To'raqulov", "Тўрақулов" va "turaqulov" - uchalasi ham
 *  bir xil natija beradi.
 * ============================================================
 */

export interface Xodim {
  id: string;
  username: string;
  fullName: string;
  position: string | null;
  phone: string | null;
  rol: Rol;
  faol: boolean;
  parolAlmashtirilsin: boolean;
  oxirgiKirish: Date | null;
  mahalla: { nomiKirill: string } | null;
}

export interface Mahalla {
  id: string;
  nomiKirill: string;
}

/** Qidiruv uchun matnni bitta ko'rinishga keltiradi */
function kalit(matn: string): string {
  return kirilldanLotinga(matn.toLowerCase())
    .replace(/[‘’ʻʼ`´′']/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function XodimRoyxati({
  xodimlar,
  mahallalar,
  toliqHuquq,
}: {
  xodimlar: Xodim[];
  mahallalar: Mahalla[];
  /**
   * Administrator uchun `true`: rol va mahallani ham o'zgartira
   * oladi. Bandlik rahbari uchun `false` - u faqat mahalla
   * hisoblarini ko'radi va ularning rolini o'zgartira olmaydi.
   *
   * Bu QULAYLIK uchun; haqiqiy to'siq serverda.
   */
  toliqHuquq: boolean;
}) {
  const { t: tr, alifbo } = useAlifbo();
  const router = useRouter();

  const [sorov, setSorov] = useState('');
  const [tahrirId, setTahrirId] = useState<string | null>(null);
  const [ishlayapti, setIshlayapti] = useState<string | null>(null);
  const [xato, setXato] = useState<string | null>(null);

  /** Ochib ko'rsatilgan parollar: xodim id -> parol */
  const [parollar, setParollar] = useState<Record<string, string | null>>({});

  const royxat = useMemo(() => {
    const s = kalit(sorov);
    if (!s) return xodimlar;
    return xodimlar.filter((x) => {
      const maydonlar = [
        x.fullName,
        x.username,
        x.position ?? '',
        x.mahalla?.nomiKirill ?? '',
        x.phone ?? '',
      ];
      return maydonlar.some((m) => kalit(m).includes(s));
    });
  }, [xodimlar, sorov]);

  async function sorovYubor(id: string, tana: Record<string, unknown>) {
    setXato(null);
    setIshlayapti(id);
    try {
      const javob = await fetch(`/api/admin/xodimlar/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tana),
      });
      const natija = await javob.json().catch(() => ({}));
      if (!javob.ok) {
        setXato(natija.xabar ?? tr('Сақлашда хатолик'));
        return null;
      }
      router.refresh();
      return natija as { parol?: string | null };
    } catch {
      setXato(tr('Алоқа йўқ. Қайта уриниб кўринг.'));
      return null;
    } finally {
      setIshlayapti(null);
    }
  }

  /** Parolni serverdan so'rab, ekranda ochadi */
  async function parolniOch(id: string) {
    setXato(null);
    setIshlayapti(id);
    try {
      const javob = await fetch(`/api/admin/xodimlar/${id}`);
      const d = await javob.json().catch(() => ({}));
      if (!javob.ok) {
        setXato(d.xabar ?? tr('Паролни кўриб бўлмади'));
        return;
      }
      setParollar((p) => ({ ...p, [id]: d.parol ?? null }));
    } finally {
      setIshlayapti(null);
    }
  }

  async function yangiParol(id: string) {
    const p = parolYarat();
    const natija = await sorovYubor(id, { yangiParol: p });
    if (natija) setParollar((q) => ({ ...q, [id]: p }));
  }

  return (
    <div className="space-y-3">
      {/* ── Qidiruv ── */}
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint"
          aria-hidden="true"
        />
        <input
          type="search"
          value={sorov}
          onChange={(e) => setSorov(e.target.value)}
          placeholder={tr('Исм, логин, маҳалла ёки телефон бўйича қидириш…')}
          aria-label={tr('Қидириш')}
          className="w-full rounded-md border border-line bg-surface py-2.5 pl-9 pr-3 text-sm text-ink outline-none transition-colors focus:border-accent"
        />
      </div>

      <p className="text-xs text-ink-faint">
        {sorov
          ? `${royxat.length} ${tr('та топилди')} · ${xodimlar.length} ${tr('тадан')}`
          : `${xodimlar.length} ${tr('та ҳисоб')}`}
      </p>

      {xato && (
        <div className="quti-xato" role="alert">
          {xato}
        </div>
      )}

      <div className="karta divide-y divide-line">
        {royxat.length === 0 && (
          <p className="p-6 text-center text-sm text-ink-faint">
            {tr('Ҳеч нарса топилмади')}
          </p>
        )}

        {royxat.map((x) =>
          tahrirId === x.id ? (
            <TahrirQatori
              key={x.id}
              xodim={x}
              mahallalar={mahallalar}
              toliqHuquq={toliqHuquq}
              ishlayapti={ishlayapti === x.id}
              bekor={() => setTahrirId(null)}
              saqla={async (tana) => {
                const ok = await sorovYubor(x.id, tana);
                if (ok) setTahrirId(null);
              }}
            />
          ) : (
            <div key={x.id} className="flex flex-wrap items-center gap-3 p-3.5">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate font-medium text-ink">{tr(x.fullName)}</span>
                  <code className="rounded bg-surface-muted px-1.5 py-0.5 text-[11px] text-ink-muted">
                    {x.username}
                  </code>
                  {!x.faol && (
                    <span className="rounded bg-danger-bg px-1.5 py-0.5 text-[11px] font-semibold text-danger">
                      {tr('Фаол эмас')}
                    </span>
                  )}
                  {x.parolAlmashtirilsin && x.faol && (
                    <span className="rounded bg-warn-bg px-1.5 py-0.5 text-[11px] font-semibold text-warn">
                      {tr('Парол алмаштирилмаган')}
                    </span>
                  )}
                </div>

                <p className="mt-0.5 truncate text-xs text-ink-faint">
                  {tr(ROL_NOMI[x.rol])}
                  {x.mahalla ? tr(` · ${x.mahalla.nomiKirill} МФЙ`) : ''}
                  {x.phone ? ` · ${formatPhone(x.phone)}` : ''}
                  {x.position ? ` · ${tr(x.position)}` : ''}
                </p>

                {/* Ochilgan parol shu yerda ko'rinadi */}
                {x.id in parollar && (
                  <ParolQatori
                    parol={parollar[x.id]}
                    yop={() =>
                      setParollar((p) => {
                        const { [x.id]: _olindi, ...qolgan } = p;
                        return qolgan;
                      })
                    }
                  />
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setTahrirId(x.id)}
                  className="flex items-center gap-1.5 rounded-md border border-line px-2.5 py-2 text-xs font-medium text-ink-muted transition-colors hover:border-accent hover:text-accent"
                >
                  <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                  {tr('Таҳрирлаш')}
                </button>

                <button
                  type="button"
                  onClick={() => parolniOch(x.id)}
                  disabled={ishlayapti === x.id}
                  aria-label={tr('Паролни кўриш')}
                  className="flex items-center gap-1.5 rounded-md border border-line px-2.5 py-2 text-xs font-medium text-ink-muted transition-colors hover:border-accent hover:text-accent disabled:opacity-60"
                >
                  {ishlayapti === x.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  ) : (
                    <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  {tr('Парол')}
                </button>

                <button
                  type="button"
                  onClick={() => yangiParol(x.id)}
                  disabled={ishlayapti === x.id}
                  aria-label={tr('Янги парол тайинлаш')}
                  className="flex items-center gap-1.5 rounded-md border border-line px-2.5 py-2 text-xs font-medium text-ink-muted transition-colors hover:border-accent hover:text-accent disabled:opacity-60"
                >
                  <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
                  {tr('Янгилаш')}
                </button>

                <button
                  type="button"
                  onClick={() => sorovYubor(x.id, { faol: !x.faol })}
                  disabled={ishlayapti === x.id}
                  className={`rounded-md border px-2.5 py-2 text-xs font-medium transition-colors disabled:opacity-60 ${
                    x.faol
                      ? 'border-line text-ink-muted hover:border-danger hover:text-danger'
                      : 'border-ok bg-ok-bg text-ok'
                  }`}
                >
                  {x.faol ? tr('Фаолсизлантириш') : tr('Фаоллаштириш')}
                </button>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}

/* ── Ochilgan parol ───────────────────────────────────────── */

function ParolQatori({ parol, yop }: { parol: string | null; yop: () => void }) {
  const { t: tr } = useAlifbo();
  const [korinsin, setKorinsin] = useState(true);

  if (!parol) {
    return (
      <p className="mt-2 flex items-center gap-2 text-xs text-ink-faint">
        <EyeOff className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        {tr('Парол кўринмайди — ходим уни ўзи алмаштирган ёки сақланмаган. Янги парол тайинланг.')}
        <button type="button" onClick={yop} aria-label={tr('Ёпиш')} className="ml-auto">
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </p>
    );
  }

  return (
    <div className="quti-ogoh mt-2 flex flex-wrap items-center gap-2 text-xs">
      <span className="font-medium">{tr('Жорий парол:')}</span>
      <code className="rounded bg-surface px-2 py-1 font-mono text-sm font-bold text-ink">
        {korinsin ? parol : '•'.repeat(parol.length)}
      </code>
      <button
        type="button"
        onClick={() => setKorinsin((k) => !k)}
        aria-label={korinsin ? tr('Яшириш') : tr('Кўрсатиш')}
        className="text-ink-muted hover:text-ink"
      >
        {korinsin ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
      </button>
      <button
        type="button"
        onClick={() => navigator.clipboard?.writeText(parol)}
        className="font-semibold text-accent hover:underline"
      >
        {tr('Нусха олиш')}
      </button>
      <button type="button" onClick={yop} aria-label={tr('Ёпиш')} className="ml-auto">
        <X className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}

/* ── Tahrir qatori ────────────────────────────────────────── */

/**
 * Joyida tahrirlash.
 *
 * Alohida sahifa yoki modal oyna emas: xodim ro'yxatni ko'rib
 * turib tuzatadi va darhol keyingisiga o'tadi. 70 ta MFY raisining
 * ismini kiritishda bu farq sezilarli.
 */
function TahrirQatori({
  xodim,
  mahallalar,
  toliqHuquq,
  ishlayapti,
  saqla,
  bekor,
}: {
  xodim: Xodim;
  mahallalar: Mahalla[];
  toliqHuquq: boolean;
  ishlayapti: boolean;
  saqla: (tana: Record<string, unknown>) => void;
  bekor: () => void;
}) {
  const { t: tr } = useAlifbo();

  const [fullName, setFullName] = useState(xodim.fullName);
  const [position, setPosition] = useState(xodim.position ?? '');
  const [telefon, setTelefon] = useState(xodim.phone ?? '');
  const [mahallaId, setMahallaId] = useState<string>('');

  const maydon =
    'w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-accent';

  return (
    <div className="space-y-3 bg-surface-muted p-3.5">
      <div className="flex items-center justify-between">
        <code className="rounded bg-surface px-1.5 py-0.5 text-[11px] text-ink-muted">
          {xodim.username}
        </code>
        <span className="text-xs text-ink-faint">{tr(ROL_NOMI[xodim.rol])}</span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1.5">
          <span className="text-xs font-medium text-ink">{tr('Ф.И.Ш.')}</span>
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className={maydon}
            autoFocus
          />
        </label>

        <label className="space-y-1.5">
          <span className="text-xs font-medium text-ink">{tr('Лавозими')}</span>
          <input
            value={position}
            onChange={(e) => setPosition(e.target.value)}
            className={maydon}
            placeholder={tr('МФЙ раиси')}
          />
        </label>

        <label className="space-y-1.5">
          <span className="text-xs font-medium text-ink">{tr('Телефон')}</span>
          <input
            value={telefon}
            onChange={(e) => setTelefon(e.target.value)}
            className={maydon}
            placeholder="+998 __ ___ __ __"
            type="tel"
          />
        </label>

        {/*
          Mahallani faqat administrator o'zgartiradi va faqat
          yettilik a'zosi uchun. Boshqa rollar butun tumanni
          ko'radi, ularga mahalla biriktirish ma'nosiz.
        */}
        {toliqHuquq && xodim.rol === 'YETTILIK' && (
          <label className="space-y-1.5">
            <span className="text-xs font-medium text-ink">{tr('Маҳалла')}</span>
            <select
              value={mahallaId}
              onChange={(e) => setMahallaId(e.target.value)}
              className={maydon}
            >
              <option value="">
                {xodim.mahalla ? tr(`${xodim.mahalla.nomiKirill} (ўзгартирилмайди)`) : tr('— Танланг —')}
              </option>
              {mahallalar.map((m) => (
                <option key={m.id} value={m.id}>
                  {tr(m.nomiKirill)}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={ishlayapti || fullName.trim().length < 3}
          onClick={() =>
            saqla({
              fullName: fullName.trim(),
              position: position.trim() || null,
              telefon: telefon.trim() || null,
              ...(mahallaId ? { mahallaId } : {}),
            })
          }
          className="flex items-center gap-1.5 rounded-md tugma-asosiy px-3 py-2 text-xs font-semibold disabled:opacity-60"
        >
          {ishlayapti ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          {tr('Сақлаш')}
        </button>

        <button
          type="button"
          onClick={bekor}
          className="rounded-md border border-line px-3 py-2 text-xs font-medium text-ink-muted transition-colors hover:text-ink"
        >
          {tr('Бекор қилиш')}
        </button>
      </div>
    </div>
  );
}
