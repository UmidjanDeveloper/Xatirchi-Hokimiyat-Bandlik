'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useAlifbo } from '@/components/alifbo/alifbo-provider';
import { Maskot, type RobotKayfiyati } from './maskot';
import { petChegarasi, type PetJoy } from './pet-joy';

const Oyna = dynamic(() => import('./agent-oynasi'), { ssr: false, loading: () => null });
const JOY = 'koala:joy:v1';

export function AgentTugmasi({ ism, rol, korish = false }: { ism: string; rol: string; korish?: boolean }) {
  const { t } = useAlifbo();
  const [vazifa, setVazifa] = useState<{ kayfiyat: RobotKayfiyati; kechikkan: number } | null>(null);
  const [ochiq, setOchiq] = useState(false);
  const [yuklangan, setYuklangan] = useState(false);
  const [joy, setJoy] = useState<PetJoy | null>(null);
  const [sudralmoqda, setSudralmoqda] = useState(false);
  const [uxlayapti, setUxlayapti] = useState(false);
  const tugma = useRef<HTMLButtonElement>(null);
  const sudrash = useRef<{ id: number; x: number; y: number; joy: PetJoy; siljidi: boolean } | null>(null);
  const bosishniYut = useRef(false);
  const uyqu = useRef<ReturnType<typeof setTimeout> | null>(null);
  const uygot = () => {
    setUxlayapti(false);
    if (uyqu.current) clearTimeout(uyqu.current);
    uyqu.current = setTimeout(() => setUxlayapti(true), 45_000);
  };
  const saqla = (p: PetJoy) => {
    setJoy(p);
    try { localStorage.setItem(JOY, JSON.stringify(p)); } catch { /* optional preference */ }
  };
  useEffect(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(JOY) ?? 'null');
      if (raw && typeof raw.x === 'number' && typeof raw.y === 'number') {
        setJoy(petChegarasi(raw, window.innerWidth, window.innerHeight));
      }
    } catch { /* use default corner */ }
    const resize = () => setJoy((p) => p ? petChegarasi(p, window.innerWidth, window.innerHeight) : p);
    window.addEventListener('resize', resize);
    uygot();
    return () => { window.removeEventListener('resize', resize); if (uyqu.current) clearTimeout(uyqu.current); };
  }, []);
  useEffect(() => {
    if (ochiq) return;
    const ctrl = new AbortController();
    const yangila = () => {
      if (document.hidden) return;
      void fetch('/api/agent/holat', { cache: 'no-store', signal: ctrl.signal })
        .then((r) => r.ok ? r.json() : null)
        .then((d) => { if (!ctrl.signal.aborted) setVazifa(d?.vazifa ?? null); })
        .catch(() => { if (!ctrl.signal.aborted) setVazifa(null); });
    };
    yangila();
    const taymer = setInterval(yangila, 120_000);
    return () => { ctrl.abort(); clearInterval(taymer); };
  }, [ochiq]);
  const isit = () => void import('./agent-oynasi');
  return (
    <>
      {!ochiq && (
        <button ref={tugma} type="button" data-agent-tugmasi="ha"
          className={`koala-pet chop-etilmasin fixed z-40 flex flex-col items-center justify-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent ${sudralmoqda ? 'koala-sudrash' : uxlayapti ? 'koala-uyqu' : 'koala-uygoq'}`}
          style={joy ? { left: joy.x, top: joy.y } : { right: 16, bottom: 'max(16px, env(safe-area-inset-bottom))' }}
          onPointerDown={(e) => {
            if (!e.isPrimary || e.button !== 0) return;
            uygot(); bosishniYut.current = false;
            const rect = e.currentTarget.getBoundingClientRect();
            sudrash.current = { id: e.pointerId, x: e.clientX, y: e.clientY, joy: { x: rect.left, y: rect.top }, siljidi: false };
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            const d = sudrash.current;
            if (!d || e.pointerId !== d.id) return;
            const dx = e.clientX - d.x, dy = e.clientY - d.y;
            if (Math.hypot(dx, dy) > 7) d.siljidi = true;
            if (d.siljidi) {
              bosishniYut.current = true; setSudralmoqda(true);
              setJoy(petChegarasi({ x: d.joy.x + dx, y: d.joy.y + dy }, window.innerWidth, window.innerHeight));
            }
          }}
          onPointerUp={(e) => {
            const d = sudrash.current;
            if (!d || d.id !== e.pointerId) return;
            if (d.siljidi) saqla(petChegarasi({ x: d.joy.x + e.clientX - d.x, y: d.joy.y + e.clientY - d.y }, window.innerWidth, window.innerHeight));
            sudrash.current = null; setSudralmoqda(false);
            if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
          }}
          onPointerCancel={() => { sudrash.current = null; bosishniYut.current = true; setSudralmoqda(false); }}
          onLostPointerCapture={() => { sudrash.current = null; setSudralmoqda(false); }}
          onKeyDown={(e) => {
            const deltas: Record<string, PetJoy> = { ArrowLeft: { x: -24, y: 0 }, ArrowRight: { x: 24, y: 0 }, ArrowUp: { x: 0, y: -24 }, ArrowDown: { x: 0, y: 24 } };
            if (e.key === 'Home') { e.preventDefault(); setJoy(null); try { localStorage.removeItem(JOY); } catch {} return; }
            const d = deltas[e.key];
            if (!d) return;
            e.preventDefault(); uygot();
            const r = e.currentTarget.getBoundingClientRect();
            saqla(petChegarasi({ x: r.left + d.x, y: r.top + d.y }, window.innerWidth, window.innerHeight));
          }}
          onClick={(e) => {
            if (e.detail !== 0 && bosishniYut.current) { bosishniYut.current = false; return; }
            uygot(); setYuklangan(true); setOchiq(true);
          }}
          onMouseEnter={() => { uygot(); isit(); }} onFocus={() => { uygot(); isit(); }}
          aria-label={t('Ҳамроҳ — ёрдамчини очиш. Жойини суриш ёки йўналиш тугмалари билан ўзгартириш мумкин.')}
          title={t('Ҳамроҳ: босинг — суҳбат; суринг — жойини ўзгартириш; Home — жойига қайтариш')}>
          <span className="koala-pet-tana"><Maskot olcham={80} kayfiyat={vazifa?.kayfiyat} /></span>
          <span className="koala-pet-yozuv" aria-hidden="true">{vazifa?.kechikkan ? t(`${vazifa.kechikkan} та кечиккан`) : uxlayapti ? 'z z z' : t('Ҳамроҳ')}</span>
        </button>
      )}
      {yuklangan && <Oyna ochiq={ochiq} yopish={() => {
        setOchiq(false); uygot(); setTimeout(() => tugma.current?.focus(), 0);
      }} ism={ism} rol={rol} korish={korish} />}
    </>
  );
}
