'use client';

import { useAlifbo } from '@/components/alifbo/alifbo-provider';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound, Loader2, Plus, UserPlus, X } from 'lucide-react';
import type { Rol } from '@prisma/client';
import { ROL_NOMI } from '@/components/shell/navigatsiya';
import { formatPhone } from '@/lib/utils';
import { parolYarat } from '@/lib/parol-yarat';

interface Xodim {
  id: string;
  username: string;
  fullName: string;
  position: string | null;
  phone: string | null;
  rol: Rol;
  faol: boolean;
  oxirgiKirish: Date | null;
  mahalla: { nomiKirill: string } | null;
}

interface Mahalla {
  id: string;
  nomiKirill: string;
}

const ROLLAR: Rol[] = ['YETTILIK', 'BANDLIK', 'BANDLIK_RAHBAR', 'HOKIM', 'ADMIN'];

/**
 * Xodimlarni boshqarish.
 *
 * Parol bu yerda BIR MARTA ko'rsatiladi va boshqa hech qayerda
 * saqlanmaydi (bazada faqat xeshi turadi). Administrator uni
 * xodimga yetkazadi, xodim esa birinchi kirishda o'zinikiga
 * almashtiradi.
 */
export function XodimBoshqaruvi({
  xodimlar,
  mahallalar,
}: {
  xodimlar: Xodim[];
  mahallalar: Mahalla[];
}) {
  const { t: tr } = useAlifbo();

  const router = useRouter();
  const [ochiq, setOchiq] = useState(false);
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [position, setPosition] = useState('');
  const [telefon, setTelefon] = useState('');
  const [rol, setRol] = useState<Rol>('YETTILIK');
  const [mahallaId, setMahallaId] = useState('');
  const [parol, setParol] = useState(() => parolYarat());
  const [xato, setXato] = useState<string | null>(null);
  const [yuborilmoqda, setYuborilmoqda] = useState(false);
  const [yaratildi, setYaratildi] = useState<{ login: string; parol: string } | null>(null);

  async function yubor() {
    if (yuborilmoqda) return;
    setXato(null);
    setYuborilmoqda(true);

    try {
      const javob = await fetch('/api/admin/xodimlar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim().toLowerCase(),
          parol,
          fullName: fullName.trim(),
          position: position.trim() || null,
          telefon: telefon.trim() || null,
          rol,
          mahallaId: rol === 'YETTILIK' ? mahallaId || null : null,
        }),
      });
      const natija = await javob.json().catch(() => ({}));
      if (!javob.ok) {
        setXato(natija.xabar ?? tr('Сақлаб бўлмади'));
        return;
      }

      setYaratildi({ login: username.trim().toLowerCase(), parol });
      setUsername('');
      setFullName('');
      setPosition('');
      setTelefon('');
      setMahallaId('');
      setParol(parolYarat());
      setOchiq(false);
      router.refresh();
    } catch {
      setXato(tr('Алоқа йўқ. Қайта уриниб кўринг.'));
    } finally {
      setYuborilmoqda(false);
    }
  }

  async function faollikOzgartir(id: string, faol: boolean) {
    await fetch(`/api/admin/xodimlar/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ faol }),
    });
    router.refresh();
  }

  async function parolTikla(id: string, login: string) {
    const yangi = parolYarat();
    const javob = await fetch(`/api/admin/xodimlar/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ yangiParol: yangi }),
    });
    if (javob.ok) {
      setYaratildi({ login, parol: yangi });
      router.refresh();
    }
  }

  const maydon =
    'w-full rounded-md border border-line bg-surface px-3 py-2.5 text-ink outline-none focus:border-accent';

  return (
    <div className="space-y-4">
      {/* Yangi parol - bir marta ko'rsatiladi */}
      {yaratildi && (
        <div className="quti-ok flex flex-wrap items-center justify-between gap-3">
          <span>
            <b>{yaratildi.login}</b> {tr('учун парол:')}{' '}
            <code className="raqam rounded bg-surface px-2 py-0.5 font-mono text-sm text-ink">
              {yaratildi.parol}
            </code>
            <br />
            <span className="text-xs">
              {tr('Бу парол бошқа кўрсатилмайди — ходимга ҳозир етказинг.')}
            </span>
          </span>
          <button
            type="button"
            onClick={() => setYaratildi(null)}
            className="rounded-md border border-line px-3 py-1.5 text-xs text-ink-muted"
          >
            {tr('Тушунарли')}
          </button>
        </div>
      )}

      {!ochiq ? (
        <button
          type="button"
          onClick={() => setOchiq(true)}
          className="flex items-center gap-1.5 tugma-asosiy rounded-md px-4 py-2.5 text-sm font-semibold"
        >
          <UserPlus className="h-4 w-4" />
          {tr('Ходим қўшиш')}
        </button>
      ) : (
        <div className="karta space-y-3 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-ink">{tr('Янги ходим')}</h3>
            <button
              type="button"
              onClick={() => setOchiq(false)}
              aria-label={tr("Ёпиш")}
              className="flex h-8 w-8 items-center justify-center rounded-md text-ink-faint hover:text-ink"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {xato && <div className="quti-xato">{xato}</div>}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="x-fish" className="text-sm font-medium text-ink">
                {tr('Ф.И.Ш.')}
              </label>
              <input
                id="x-fish"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className={maydon}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="x-login" className="text-sm font-medium text-ink">
                {tr('Логин')}
              </label>
              <input
                id="x-login"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                placeholder="mfy_chechakota"
                className={maydon}
              />
              <p className="text-[11px] text-ink-faint">
                {tr('Кичик лотин ҳарф, рақам ва пастки чизиқ')}
              </p>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="x-rol" className="text-sm font-medium text-ink">
                {tr('Роли')}
              </label>
              <select
                id="x-rol"
                value={rol}
                onChange={(e) => setRol(e.target.value as Rol)}
                className={maydon}
              >
                {ROLLAR.map((r) => (
                  <option key={r} value={r}>
                    {tr(ROL_NOMI[r])}
                  </option>
                ))}
              </select>
            </div>

            {rol === 'YETTILIK' && (
              <div className="space-y-1.5">
                <label htmlFor="x-mahalla" className="text-sm font-medium text-ink">
                  {tr('Маҳалла')}
                </label>
                <select
                  id="x-mahalla"
                  value={mahallaId}
                  onChange={(e) => setMahallaId(e.target.value)}
                  className={maydon}
                >
                  <option value="">{tr('— Танланг —')}</option>
                  {mahallalar.map((m) => (
                    <option key={m.id} value={m.id}>
                      {tr(m.nomiKirill)}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-ink-faint">
                  {tr('Ходим фақат шу маҳалла маълумотларини кўради')}
                </p>
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="x-lavozim" className="text-sm font-medium text-ink">
                {tr('Лавозими')}
              </label>
              <input
                id="x-lavozim"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                className={maydon}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="x-tel" className="text-sm font-medium text-ink">
                {tr('Телефон')}
              </label>
              <input
                id="x-tel"
                type="tel"
                inputMode="tel"
                value={telefon}
                onChange={(e) => setTelefon(e.target.value)}
                className={maydon}
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label htmlFor="x-parol" className="text-sm font-medium text-ink">
                {tr('Бошланғич парол')}
              </label>
              <div className="flex gap-2">
                <input
                  id="x-parol"
                  value={parol}
                  onChange={(e) => setParol(e.target.value)}
                  className={`${maydon} font-mono`}
                />
                <button
                  type="button"
                  onClick={() => setParol(parolYarat())}
                  className="shrink-0 rounded-md border border-line px-3 text-sm text-ink-muted hover:text-ink"
                >
                  {tr('Янгилаш')}
                </button>
              </div>
              <p className="text-[11px] text-ink-faint">
                {tr('Ходим биринчи киришда ўзиникига алмаштиради')}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={yubor}
            disabled={yuborilmoqda}
            className="flex items-center gap-1.5 tugma-asosiy rounded-md px-5 py-2.5 text-sm font-semibold"
          >
            {yuborilmoqda ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            {tr('Яратиш')}
          </button>
        </div>
      )}

      {/* ── Ro'yxat ── */}
      <div className="karta divide-y divide-line">
        {xodimlar.map((x) => (
          <div key={x.id} className="flex flex-wrap items-center gap-3 p-3.5">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="truncate font-medium text-ink">{x.fullName}</span>
                <code className="raqam rounded bg-surface-muted px-1.5 py-0.5 font-mono text-[11px] text-ink-muted">
                  {x.username}
                </code>
                {!x.faol && (
                  <span className="rounded bg-danger-bg px-1.5 py-0.5 text-[11px] font-semibold text-danger">
                    {tr('Фаол эмас')}
                  </span>
                )}
              </div>
              <p className="mt-0.5 truncate text-xs text-ink-faint">
                {tr(ROL_NOMI[x.rol])}
                {x.mahalla ? tr(` · ${x.mahalla.nomiKirill} МФЙ`) : ''}
                {x.phone ? ` · ${formatPhone(x.phone)}` : ''}
              </p>
            </div>

            <div className="flex shrink-0 gap-1.5">
              <button
                type="button"
                onClick={() => parolTikla(x.id, x.username)}
                title={tr("Паролни тиклаш")}
                className="flex h-9 w-9 items-center justify-center rounded-md border border-line text-ink-faint transition-colors hover:text-ink"
              >
                <KeyRound className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => faollikOzgartir(x.id, !x.faol)}
                className={`rounded-md border px-3 py-2 text-xs font-medium transition-colors ${
                  x.faol
                    ? 'border-line text-ink-muted hover:border-danger hover:text-danger'
                    : 'border-ok bg-ok-bg text-ok'
                }`}
              >
                {x.faol ? tr('Фаолсизлантириш') : tr('Фаоллаштириш')}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
