import type { CSSProperties } from 'react';

export type MaskotHolati = 'tayyor' | 'eshitmoqda' | 'oylamoqda' | 'gapirmoqda';
export type RobotKayfiyati = 'vazmin' | 'xursand' | 'jiddiy' | 'xavotir';
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
  const kuch = Number.isFinite(daraja) ? Math.min(1, Math.max(0, daraja)) : 0;
  return (
    <span className={`maskot robot robot-${kayfiyat} maskot-${holat} ${className}`}
      style={{ width: olcham, height: olcham, '--robot-ogiz': 1 + kuch * 10 } as CSSProperties}
      role={sarlavha ? 'img' : undefined} aria-label={sarlavha} aria-hidden={sarlavha ? undefined : true}>
      <svg className="robot-tana" viewBox="0 0 120 120" aria-hidden="true" focusable="false">
        <ellipse cx="60" cy="111" rx="33" ry="4" fill="currentColor" opacity=".1" />
        <path d="M60 9V19" stroke="#94a3b8" strokeWidth="4" strokeLinecap="round" />
        <circle className="robot-signal" cx="60" cy="8" r="5" fill="var(--robot-rang)" />
        <rect x="12" y="42" width="12" height="27" rx="6" fill="#64748b" />
        <rect x="96" y="42" width="12" height="27" rx="6" fill="#64748b" />
        <path d="M37 91Q60 82 83 91L91 106H29Z" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="2" />
        <path d="M52 90L60 98L68 90" fill="#64748b" />
        <rect x="21" y="19" width="78" height="73" rx="26" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="2" />
        <path d="M34 27Q60 18 86 27" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" />
        <rect x="28" y="32" width="64" height="49" rx="18" fill="#0f172a" />
        <g className="robot-qosh" fill="none" stroke="var(--robot-rang)" strokeWidth="2.5" strokeLinecap="round">
          <path className="robot-qosh-chap" d="M38 43L48 43" />
          <path className="robot-qosh-ong" d="M72 43L82 43" />
        </g>
        <g className="robot-koz" fill="var(--robot-rang)">
          {kayfiyat === 'xursand' ? <g fill="none" stroke="var(--robot-rang)" strokeWidth="4" strokeLinecap="round"><path d="M38 54Q43 46 48 54" /><path d="M72 54Q77 46 82 54" /></g>
            : <><rect x="39" y="49" width="8" height="11" rx="4" /><rect x="73" y="49" width="8" height="11" rx="4" /></>}
        </g>
        <g fill="var(--robot-rang)" opacity=".18"><ellipse cx="37" cy="64" rx="5" ry="2" /><ellipse cx="83" cy="64" rx="5" ry="2" /></g>
        {holat === 'gapirmoqda' ? <ellipse className="robot-ogiz" cx="60" cy="68" rx="9" ry="1" fill="var(--robot-rang)" />
          : <path d={kayfiyat === 'xursand' ? 'M50 67Q60 78 70 67' : kayfiyat === 'jiddiy' || kayfiyat === 'xavotir' ? 'M51 72Q60 65 69 72' : 'M53 69Q60 73 67 69'}
            fill="none" stroke="var(--robot-rang)" strokeWidth="3" strokeLinecap="round" />}
        <circle cx="60" cy="104" r="3" fill="var(--robot-rang)" />
      </svg>
    </span>
  );
}
