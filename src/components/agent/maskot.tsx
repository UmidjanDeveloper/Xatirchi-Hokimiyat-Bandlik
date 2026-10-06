'use client';

import { useId } from 'react';

export type MaskotHolati = 'tayyor' | 'eshitmoqda' | 'oylamoqda' | 'gapirmoqda';
import type { RobotKayfiyati } from '@/lib/agent/robot-ifoda';
export type { RobotKayfiyati } from '@/lib/agent/robot-ifoda';
export const MASKOT_HOLATLARI: readonly MaskotHolati[] = ['tayyor', 'eshitmoqda', 'oylamoqda', 'gapirmoqda'];

/** Vector face: mouth follows playback amplitude; expressions remain visible without motion. */
export function Maskot({ holat = 'tayyor', kayfiyat = 'vazmin', daraja = 0, olcham = 40, sarlavha, className = '' }: {
  holat?: MaskotHolati;
  kayfiyat?: RobotKayfiyati;
  daraja?: number;
  olcham?: number;
  sarlavha?: string;
  hammasi?: boolean;
  className?: string;
}) {
  const id = useId().replace(/:/g, '');
  const metall = `robot-metall-${id}`;
  const visor = `robot-visor-${id}`;
  const nur = `robot-nur-${id}`;
  const kuch = Number.isFinite(daraja) ? Math.min(1, Math.max(0, daraja)) : 0;
  return (
    <span className={`maskot robot robot-${kayfiyat} maskot-${holat} ${className}`}
      style={{ width: olcham, height: olcham }}
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        e.currentTarget.style.setProperty('--robot-nigoh-x', `${((e.clientX - r.left) / r.width - .5) * 5}px`);
        e.currentTarget.style.setProperty('--robot-nigoh-y', `${((e.clientY - r.top) / r.height - .5) * 3}px`);
      }}
      onPointerLeave={(e) => { e.currentTarget.style.setProperty('--robot-nigoh-x', '0px'); e.currentTarget.style.setProperty('--robot-nigoh-y', '0px'); }}
      data-kayfiyat={kayfiyat} data-holat={holat}
      role={sarlavha ? 'img' : undefined} aria-label={sarlavha} aria-hidden={sarlavha ? undefined : true}>
      <svg className="robot-tana" viewBox="0 0 120 120" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id={metall} x1="0" y1="0" x2=".85" y2="1" gradientUnits="objectBoundingBox">
            <stop offset="0" stopColor="#f8fafc" /><stop offset=".28" stopColor="#b8c8d8" />
            <stop offset=".6" stopColor="#607589" /><stop offset="1" stopColor="#dce7ef" />
          </linearGradient>
          <linearGradient id={visor} x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#233749" /><stop offset=".5" stopColor="#070f1d" /><stop offset="1" stopColor="#172639" />
          </linearGradient>
          <radialGradient id={nur}><stop stopColor="var(--robot-rang)" stopOpacity=".32" /><stop offset="1" stopColor="var(--robot-rang)" stopOpacity="0" /></radialGradient>
        </defs>
        <circle cx="60" cy="57" r="57" fill={`url(#${nur})`} />
        <ellipse cx="60" cy="112" rx="34" ry="3" fill="var(--robot-rang)" opacity=".16" />
        <path d="M60 11V21" stroke="#90a5b8" strokeWidth="3" strokeLinecap="round" />
        <circle className="robot-signal" cx="60" cy="9" r="4" fill="var(--robot-rang)" />
        <circle cx="60" cy="9" r="7" fill="none" stroke="var(--robot-rang)" opacity=".25" />
        <rect x="10" y="42" width="12" height="29" rx="6" fill={`url(#${metall})`} stroke="#46586f" />
        <rect x="98" y="42" width="12" height="29" rx="6" fill={`url(#${metall})`} stroke="#46586f" />
        <path d="M15 49V63M105 49V63" stroke="var(--robot-rang)" strokeWidth="2" strokeLinecap="round" />
        <path d="M36 91Q60 82 84 91L91 105Q60 117 29 105Z" fill={`url(#${metall})`} stroke="#64748b" />
        <path d="M43 91Q60 102 77 91L73 105H47Z" fill="#102132" />
        <path d="M21 44Q21 19 46 19H74Q99 19 99 44V65Q99 91 76 94H44Q21 91 21 65Z" fill={`url(#${metall})`} stroke="#94adc1" strokeWidth="1.2" />
        <path d="M32 29Q60 17 88 29" fill="none" stroke="#f1f7ff" strokeOpacity=".8" strokeWidth="1.5" strokeLinecap="round" />
        <rect x="26" y="31" width="68" height="51" rx="20" fill={`url(#${visor})`} stroke="#30465e" strokeWidth="1.5" />
        <path d="M34 38Q60 29 85 38" fill="none" stroke="#a3d8f0" strokeOpacity=".16" strokeWidth="2" strokeLinecap="round" />
        <path d="M42 87Q60 92 78 87" fill="none" stroke="var(--robot-rang)" strokeOpacity=".65" strokeWidth="1.3" />
        <g className="robot-qosh" fill="none" stroke="var(--robot-rang)" strokeWidth="2.5" strokeLinecap="round">
          <path className="robot-qosh-chap" d={kayfiyat === 'jiddiy' ? 'M36 41L49 47' : kayfiyat === 'xavotir' ? 'M37 45L49 41' : 'M38 43L48 43'} />
          <path className="robot-qosh-ong" d={kayfiyat === 'jiddiy' ? 'M71 47L84 41' : kayfiyat === 'xavotir' ? 'M71 41L83 45' : 'M72 43L82 43'} />
        </g>
        <g className="robot-nigoh"><g className="robot-koz" fill="var(--robot-rang)">
          {kayfiyat === 'xursand' ? <g fill="none" stroke="var(--robot-rang)" strokeWidth="4" strokeLinecap="round"><path d="M38 54Q43 46 48 54" /><path d="M72 54Q77 46 82 54" /></g>
            : <><rect x="39" y="49" width="8" height="11" rx="4" /><rect x="73" y="49" width="8" height="11" rx="4" /></>}
        </g>
        </g>
        <g fill="var(--robot-rang)" opacity=".18"><ellipse cx="37" cy="64" rx="5" ry="2" /><ellipse cx="83" cy="64" rx="5" ry="2" /></g>
        {holat === 'gapirmoqda' ? <ellipse className="robot-ogiz" cx="60" cy="68" rx="9" ry={1 + kuch * 8} fill="var(--robot-rang)" />
          : <path d={kayfiyat === 'xursand' ? 'M50 67Q60 78 70 67' : kayfiyat === 'jiddiy' || kayfiyat === 'xavotir' ? 'M51 72Q60 65 69 72' : 'M53 69Q60 73 67 69'}
            fill="none" stroke="var(--robot-rang)" strokeWidth="3" strokeLinecap="round" />}
        <circle cx="60" cy="104" r="3" fill="var(--robot-rang)" />
      </svg>
    </span>
  );
}
