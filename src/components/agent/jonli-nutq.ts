'use client';

import { nutqParchasi } from '@/lib/agent/matnlar';

/**
 * ============================================================
 *  JONLI SUHBATDA OVOZ NAVBATI
 *
 *  Gemini tugallangan javobni `/api/agent/gapir` ga bitta so'rovda
 *  yuboradi. Navbat javoblarni tartib bilan o'qiydi va yagona audio
 *  manbasini boshqaradi. Bir javob gaplarga bo'linib turli provayderlarda
 *  o'qilmaydi; zaxira butun javob uchun ishlaydi.
 *
 *  `toxtat()` — foydalanuvchi gapni bo'lganda: kutayotgan so'rovlar bekor
 *  qilinadi, o'ynayotgan ovoz o'chiriladi, kechikib kelgan javoblar
 *  tashlanadi (avlod hisoblagichi).
 * ============================================================
 */

export interface NutqNavbatiHodisalari {
  /** Yangi javobning birinchi ovozi o'yna boshladi */
  onBoshlandi(): void;
  /** Javob tugadi va navbat bo'shadi */
  onTugadi(): void;
  /** Og'iz harakati uchun 0..1 */
  onDaraja(d: number): void;
  onXato(matn: string): void;
  /** Server ElevenLabs o'rniga OpenAI zaxira ovozidan foydalandi (suhbatda bir marta xabar beriladi) */
  onZaxiraOvozi?(): void;
}

const BIR_VAQTDA = 2;
const SORO_KUTISH_MS = 25_000;

interface Bolak {
  matn: string;
  ctrl: AbortController;
  holat: 'kutadi' | 'yuklanmoqda' | 'tayyor';
  natija: Promise<AudioBuffer | null> | null;
}

export function nutqNavbatiYarat(ctx: AudioContext, ruxsat: () => string, h: NutqNavbatiHodisalari) {
  let navbat: Bolak[] = [];
  let manba: AudioBufferSourceNode | null = null;
  let analizator: AnalyserNode | null = null;
  let kadr: number | null = null;
  /** `davom` sikli ishlayotgan avlod (toxtat() avlodni oshirgach eski sikl avtomatik "band emas" bo'ladi) */
  let bandAvlod = -1;
  let ijroYakuni: (() => void) | null = null;
  let yakun = false;
  let boshlandi = false;
  let avlod = 0;
  let xatoBerildi = false;
  let yuklanmoqda = 0;
  let zaxiraBildirildi = false;

  const xato = (m: string) => { if (!xatoBerildi) { xatoBerildi = true; h.onXato(m); } };

  const yukla = (b: Bolak, mening: number): Promise<AudioBuffer | null> => {
    b.holat = 'yuklanmoqda';
    yuklanmoqda++;
    return (async () => {
      const taymer = setTimeout(() => b.ctrl.abort(), SORO_KUTISH_MS);
      try {
        const r = await fetch('/api/agent/gapir', {
          method: 'POST', signal: b.ctrl.signal, headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ matn: nutqParchasi(b.matn), jonli: ruxsat(), ...(zaxiraBildirildi ? { zaxira: true } : {}) }),
        });
        if (!r.ok) {
          const d = await r.json().catch(() => ({})) as { xabar?: string };
          if (r.status === 401) { window.location.href = '/kirish'; return null; }
          if (mening === avlod) xato(d.xabar ?? 'Овозли жавоб олинмади. Жавоб матни экранда.');
          return null;
        }
        if (r.headers.get('x-nutq-zaxira') === '1' && !zaxiraBildirildi && mening === avlod) { zaxiraBildirildi = true; h.onZaxiraOvozi?.(); }
        const bayt = await r.arrayBuffer();
        if (mening !== avlod) return null;
        return await ctx.decodeAudioData(bayt);
      } catch {
        if (mening === avlod && !b.ctrl.signal.aborted) xato('Овозли жавоб олинмади. Жавоб матни экранда.');
        else if (mening === avlod) xato('Овоз кечикди. Жавоб матни экранда.');
        return null;
      } finally {
        clearTimeout(taymer);
        b.holat = 'tayyor';
        if (mening === avlod) { yuklanmoqda--; boshla(mening); }
      }
    })();
  };

  /** Navbatdagi, hali boshlanmagan bo'laklarning so'rovini (BIR_VAQTDA gacha) boshlaydi */
  const boshla = (mening: number) => {
    for (const b of navbat) {
      if (yuklanmoqda >= BIR_VAQTDA) break;
      if (b.holat === 'kutadi') b.natija = yukla(b, mening);
    }
  };

  const daraja = () => {
    if (!analizator || !manba) return;
    const d = new Uint8Array(analizator.fftSize);
    analizator.getByteTimeDomainData(d);
    let kv = 0;
    for (const n of d) kv += ((n - 128) / 128) ** 2;
    h.onDaraja(Math.min(1, Math.sqrt(kv / d.length) * 5));
    kadr = requestAnimationFrame(daraja);
  };

  const tozala = () => {
    if (kadr !== null) cancelAnimationFrame(kadr);
    kadr = null;
    analizator?.disconnect();
    analizator = null;
    if (manba) {
      manba.onended = null;
      try { manba.stop(); manba.disconnect(); } catch { /* allaqachon tugagan */ }
      manba = null;
    }
    h.onDaraja(0);
    const y = ijroYakuni;
    ijroYakuni = null;
    y?.();
  };

  const ijroEt = (buf: AudioBuffer, mening: number) => new Promise<void>((tugadi) => {
    if (mening !== avlod) { tugadi(); return; }
    const s = ctx.createBufferSource();
    s.buffer = buf;
    const a = ctx.createAnalyser();
    a.fftSize = 256;
    s.connect(a);
    a.connect(ctx.destination);
    manba = s; analizator = a;
    ijroYakuni = tugadi;
    s.onended = () => { if (manba === s) tozala(); else tugadi(); };
    if (!boshlandi) { boshlandi = true; h.onBoshlandi(); }
    s.start();
    kadr = requestAnimationFrame(daraja);
  });

  const yakunla = (mening: number) => {
    if (mening !== avlod || !yakun || navbat.length || manba) return;
    yakun = false; boshlandi = false;
    h.onTugadi();
  };

  const davom = async () => {
    if (bandAvlod === avlod) return;
    bandAvlod = avlod;
    const mening = avlod;
    try {
      if (ctx.state === 'suspended') await ctx.resume().catch(() => {});
      while (navbat.length && mening === avlod) {
        if (ctx.state !== 'running') { xato('Овозни эшитиш учун жонли суҳбат тугмасини қайта босинг.'); navbat = []; break; }
        const b = navbat[0];
        boshla(mening);
        const buf = await (b.natija ?? (b.natija = yukla(b, mening)));
        if (mening !== avlod) return;
        navbat.shift();
        if (buf) await ijroEt(buf, mening);
      }
    } finally {
      if (bandAvlod === mening) bandAvlod = -1;
    }
    yakunla(mening);
  };

  return {
    /** Gemini native PCM: TTS xizmatidan mustaqil, ayni navbat va bekor qilish egasi. */
    qoshPcm(data: string, hz: number) {
      try {
        const raw = atob(data);
        if (!raw.length || raw.length % 2 || navbat.length >= 300) return;
        const bytes = Uint8Array.from(raw, (c) => c.charCodeAt(0));
        const v = new DataView(bytes.buffer);
        const buf = ctx.createBuffer(1, bytes.length / 2, hz);
        const ch = buf.getChannelData(0);
        for (let i = 0; i < ch.length; i++) ch[i] = v.getInt16(i * 2, true) / 32768;
        navbat.push({ matn: '', ctrl: new AbortController(), holat: 'tayyor', natija: Promise.resolve(buf) });
        void davom();
      } catch { xato('Gemini овозини ўқиб бўлмади. Жавоб матни экранда.'); }
    },
    /** Bitta gapni (yoki bo'lakni) o'qish uchun navbatga qo'yadi */
    qosh(matn: string) {
      const t = matn.trim();
      if (!t) return;
      navbat.push({ matn: t, ctrl: new AbortController(), holat: 'kutadi', natija: null });
      boshla(avlod);
      void davom();
    },
    /** Modelning bu javobi tugadi: boshqa matn kelmaydi */
    tugatish() {
      yakun = true;
      if (bandAvlod !== avlod) yakunla(avlod);
    },
    /** Gapni bo'lish / yopish: hammasi bekor, kechikkan javoblar tashlanadi */
    toxtat() {
      avlod++;
      for (const b of navbat) b.ctrl.abort();
      navbat = [];
      yakun = false; boshlandi = false; xatoBerildi = false;
      yuklanmoqda = 0;
      tozala();
    },
    faol: () => navbat.length > 0 || manba !== null || bandAvlod === avlod,
  };
}

export type NutqNavbati = ReturnType<typeof nutqNavbatiYarat>;
