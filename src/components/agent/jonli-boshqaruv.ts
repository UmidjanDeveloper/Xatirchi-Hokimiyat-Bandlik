'use client';

import type { JonliHodisalar } from './jonli-suhbat';

export type JonliNazorat = { bekor(): void; yubor(matn: string): boolean; eslat(matn: string): void };
type Provayder = 'openai' | 'gemini';
type UlanishOpt = { mahalliyOvoz?: boolean; zaxira?: boolean; davom?: string; qoplash?: string; mikrofon?: MediaStream | null };
type Boshlash = (cb: JonliHodisalar, opt: UlanishOpt) => JonliNazorat;

/** Yagona egasi: uzilish/vaqt tugashida qayta ulanadi, qo'lda yopilgach hech narsa tiklanmaydi. */
export function jonliBoshqaruv(cb: JonliHodisalar, opt: {
  asosiy: Provayder; boshlangich?: Provayder; zaxiraBor: boolean;
  openai: Boshlash; gemini: Boshlash;
  onProvayder?(p: Provayder, mahalliyOvoz: boolean): void;
}): JonliNazorat {
  let mahalliyOvoz = false;
  let tugadi = false, avlod = 0, urinish = 0, bosh = Date.now();
  let nazorat: JonliNazorat | null = null, mik: MediaStream | null = null;
  let vaqt: ReturnType<typeof setTimeout> | undefined;
  const ishlatilgan = new Set<string>();
  let p = opt.boshlangich ?? opt.asosiy;
  const yakun = () => {
    if (tugadi) return;
    tugadi = true; avlod++; clearTimeout(vaqt);
    if (nazorat) nazorat.bekor();
    else mik?.getTracks().forEach((t) => t.stop());
    cb.onDaraja(0); cb.onHolat('tayyor'); cb.onTugadi();
  };
  const ulan = (u: UlanishOpt = {}) => {
    if (tugadi) { u.mikrofon?.getTracks().forEach((t) => t.stop()); return; }
    const mening = ++avlod;
    bosh = Date.now(); mik = u.mikrofon ?? mik;
    opt.onProvayder?.(p, mahalliyOvoz); cb.onHolat('oylamoqda');
    const hodisalar: JonliHodisalar = {
      ...cb,
      onHolat: (h) => { if (!tugadi && mening === avlod) cb.onHolat(h); },
      onDaraja: (d) => { if (!tugadi && mening === avlod) cb.onDaraja(d); },
      onMatn: (...a) => { if (!tugadi && mening === avlod) cb.onMatn(...a); },
      onAmallar: (...a) => !tugadi && mening === avlod ? cb.onAmallar(...a) : Promise.resolve({ bekor: true }),
      onOvoz: (m, s) => !tugadi && mening === avlod ? cb.onOvoz?.(m, s) ?? Promise.resolve() : Promise.resolve(),
      onOgoh: (m) => { if (!tugadi && mening === avlod) cb.onOgoh?.(m); },
      onXato: (m) => { if (!tugadi && mening === avlod) cb.onXato(m); },
      onTugadi: () => { if (!tugadi && mening === avlod) yakun(); },
      onQaytaUlanish: (sabab, ruxsat, mikrofon, qoplash) => {
        if (tugadi || mening !== avlod) { if (tugadi || mikrofon !== mik) mikrofon?.getTracks().forEach((t) => t.stop()); return; }
        mik = mikrofon;
        nazorat = null; // Pastki ulanish allaqachon yopildi; kutishda mikrofon egasi shu modul.
        avlod++; // Eski WebSocket/peer hodisalari yangi sessiyaga ta'sir qilmasin.
        if (sabab === 'muddat' || Date.now() - bosh > 30_000) urinish = 0;
        if (sabab !== 'muddat' && ++urinish > 2) {
          cb.onXato('Jonli xizmatlar javob bermadi. Ulanishni tekshiring va qayta urinib ko‘ring.'); yakun(); return;
        }
        if (sabab === 'ovoz') mahalliyOvoz = true;
        if (sabab === 'provayder' && opt.zaxiraBor) p = p === 'gemini' ? 'openai' : 'gemini';
        cb.onOgoh?.(sabab === 'ovoz' ? 'Tashqi ovoz ishlamadi. Jonli xizmatning o‘z ovoziga o‘tilmoqda; oxirgi savolni qayta ayting.' : sabab === 'muddat' ? 'Жонли суҳбат автоматик янгиланмоқда.' : `${p === 'gemini' ? 'Gemini' : 'OpenAI'} билан қайта уланмоқда. Охирги саволни қайта айтинг.`);
        cb.onHolat('oylamoqda'); cb.onDaraja(0);
        const davom = ruxsat && !ishlatilgan.has(ruxsat) ? ruxsat : undefined;
        if (davom) ishlatilgan.add(davom);
        vaqt = setTimeout(() => ulan({ davom, ...(p === 'openai' && !davom && qoplash ? { qoplash } : {}), mikrofon: mik }), sabab === 'muddat' ? 0 : 800);
      },
    };
    try {
      const n = (p === 'gemini' ? opt.gemini : opt.openai)(hodisalar, { ...u, mahalliyOvoz, zaxira: p !== opt.asosiy });
      if (!tugadi && mening === avlod) nazorat = n;
      else n.bekor();
    } catch { cb.onXato('Jonli ovozni ochib bo‘lmadi. Mikrofon va brauzerni tekshiring.'); yakun(); }
  };
  ulan();
  return { bekor: yakun, yubor: (m) => !tugadi && (nazorat?.yubor(m) ?? false), eslat: (m) => { if (!tugadi) nazorat?.eslat(m); } };
}
