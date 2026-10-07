'use client';

import { nutqParchasi } from '@/lib/agent/matnlar';
import { gapir, gapirishniToxtat, uzbekOvozi } from './ovoz';

let zaxiraOvozi = false; // Shu oyna ichida keyingi javoblar boshqa ovozga qaytmasin.
let audio: AudioContext | null = null;
let bekorQil: (() => void) | null = null;

/** Foydalanuvchi bosgan paytda ochiladi: iPhone kech kelgan javobni ham o'qiy oladi. */
export function nutqniTayyorla(): void {
  if (typeof window === 'undefined') return;
  try {
    const w = window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
    const AC = w.AudioContext ?? w.webkitAudioContext;
    if (AC && (!audio || audio.state === 'closed')) audio = new AC();
    if (audio?.state === 'suspended') void audio.resume().catch(() => {});
  } catch { /* Yozma javob ishlashda davom etadi. */ }
}

export function nutqniToxtat(): void {
  bekorQil?.();
  bekorQil = null;
  gapirishniToxtat();
}

export function nutqMuhitiniYop(): void {
  zaxiraOvozi = false;
  nutqniToxtat();
  const a = audio;
  audio = null;
  void a?.close().catch(() => {});
}

/** Bir vaqtda bitta javob. Bekor qilingach kechikkan ovoz va hodisalar chiqarilmaydi. */
export function javobniGapir(matn: string, h: {
  serverMumkin: boolean;
  onDaraja?(daraja: number): void;
  onYuklash(): void;
  onBoshlandi(): void;
  onTugadi(): void;
  onXato(xabar: string): void;
  onZaxiraOvozi?(): void;
}): void {
  nutqniToxtat();
  const ctrl = new AbortController();
  let manba: AudioBufferSourceNode | null = null;
  let taymer: ReturnType<typeof setTimeout> | null = null;
  let tugadi = false;
  let kadr: number | null = null;
  let analizator: AnalyserNode | null = null;
  const bosha = () => {
    if (kadr !== null) cancelAnimationFrame(kadr);
    kadr = null;
    analizator?.disconnect();
    analizator = null;
    h.onDaraja?.(0);
    if (taymer) clearTimeout(taymer);
    if (manba) {
      manba.onended = null;
      try { manba.stop(); manba.disconnect(); } catch { /* Allaqachon tugagan. */ }
      manba = null;
    }
  };
  const yakunla = (xato?: string) => {
    if (tugadi) return;
    tugadi = true;
    bosha();
    bekorQil = null;
    if (xato) h.onXato(xato);
    h.onTugadi();
  };
  bekorQil = () => { tugadi = true; ctrl.abort(); bosha(); };

  if (!h.serverMumkin && uzbekOvozi()) {
    // Brauzer ba'zan onend bermaydi: maskot uzoq vaqt gapirmoqda holatida qolmasin.
    taymer = setTimeout(() => { gapirishniToxtat(); yakunla(); }, 180_000);
    if (gapir(matn, () => yakunla(), () => {
      if (tugadi) return;
      h.onBoshlandi();
      const jonlantir = () => {
        if (tugadi) return;
        h.onDaraja?.(.2 + Math.abs(Math.sin(performance.now() / 110)) * .45);
        kadr = requestAnimationFrame(jonlantir);
      };
      jonlantir();
    }, () => yakunla('Қурилма овозни чиқара олмади. Овозни синаш тугмасини қайта босинг.'))) return;
  }
  if (!h.serverMumkin) { yakunla('Ўзбекча овоз уланмаган. Администратор овоз хизматини ёқиши керак.'); return; }
  if (taymer) clearTimeout(taymer);
  h.onYuklash();
  taymer = setTimeout(() => { ctrl.abort(); yakunla('Овоз кечикди. Жавобни ўқинг ёки қайта урининг.'); }, 25_000);
  void (async () => {
    try {
      const r = await fetch('/api/agent/gapir', {
        method: 'POST', signal: ctrl.signal, headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ matn: nutqParchasi(matn), ...(zaxiraOvozi ? { zaxira: true } : {}) }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({})) as { xabar?: string };
        if (r.status === 401) window.location.href = '/kirish';
        yakunla(d.xabar ?? 'Овозли жавоб олинмади. Жавобни ўқинг.');
        return;
      }
      const bayt = await r.arrayBuffer();
      if (tugadi) return;
      if (r.headers.get('x-nutq-zaxira') === '1') { zaxiraOvozi = true; h.onZaxiraOvozi?.(); }
      const a = audio;
      if (a?.state === 'suspended') await a.resume();
      if (tugadi) return;
      if (!a || a.state !== 'running') { yakunla('Овозни эшитиш учун жавоб ёнидаги овоз тугмасини босинг.'); return; }
      const bufer = await a.decodeAudioData(bayt);
      if (tugadi) return;
      if (taymer) clearTimeout(taymer);
      manba = a.createBufferSource();
      manba.buffer = bufer;
      analizator = a.createAnalyser();
      analizator.fftSize = 256;
      manba.connect(analizator);
      analizator.connect(a.destination);
      const namuna = new Uint8Array(analizator.fftSize);
      const jonlantir = () => {
        if (tugadi || !analizator) return;
        analizator.getByteTimeDomainData(namuna);
        let kvadrat = 0;
        for (const n of namuna) kvadrat += ((n - 128) / 128) ** 2;
        h.onDaraja?.(Math.min(1, Math.sqrt(kvadrat / namuna.length) * 5));
        kadr = requestAnimationFrame(jonlantir);
      };
      jonlantir();
      manba.onended = () => yakunla();
      h.onBoshlandi();
      manba.start();
      taymer = setTimeout(() => yakunla(), Math.min(180_000, bufer.duration * 1000 + 2000));
    } catch {
      if (!tugadi) yakunla('Овозли жавоб олинмади. Жавобни ўқинг ёки қайта урининг.');
    }
  })();
}
