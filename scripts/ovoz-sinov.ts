/**
 * ============================================================
 *  KOALA OVOZ KIRISH — SINOV (brauzersiz)
 *
 *  Ishga tushirish:  npx tsx scripts/ovoz-sinov.ts
 *
 *  iPhone'dagi nuqson: brauzer ovoz tanishi "not-allowed" deb xato bergach
 *  zaxira yo'liga o'tilmagan va "tugadi" signali kelmagani uchun oyna
 *  "eshitmoqda" holatida qotib qolgan. Bu sinov quyidagilarni qo'riqlaydi:
 *
 *   A. WAV yozuvi baytma-bayt to'g'ri (sarlavha, chastota, uzunlik),
 *      chastota pasaytirish tovushni buzmaydi, nutq atrofi to'g'ri kesiladi;
 *   B. Nutq kuzatuvchisi: gapirib bo'lgach to'xtaydi, so'z orasidagi
 *      tanaffusda to'xtamaydi, shovqinga moslashadi, jimlikni aytadi;
 *   C. Xatolar to'g'ri xaritalanadi (qaysi xatoda zaxiraga o'tiladi);
 *   D. Ulanish qoidalari: iPhone'da to'g'ridan-to'g'ri yozuv; `onTugadi`
 *      faqat bitta joydan chaqiriladi; oyna yopilsa bekor qilinadi;
 *   E. Matnlar QISQA (byudjet) va eski uzun matnlar qaytib kelmaydi.
 *
 *  Brauzerda ko'rinishi (soxta mikrofon oqimi, 22 stsenariy):
 *  `scripts/brauzer/mikrofon-brauzer.mjs`.
 * ============================================================
 */
import { existsSync, readFileSync } from 'node:fs';
import { A } from '../src/lib/alifbo';
import { MATN, salomMatni } from '../src/lib/agent/matnlar';
import { JIMLIK_RMS, NUTQ_SOZLAMASI, NutqKuzatuvchisi, type NutqQarori } from '../src/components/agent/nutq-kuzatuv';
import { YUBORISH_CHASTOTASI, birlashtir, namunalash, nutqOraligi, wavYoz } from '../src/components/agent/ovoz-yozuv';
import { mikrofonXatosi, tanishXatosiniHalEt } from '../src/components/agent/ovoz';

const kodiOl = (m: string) => m.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const oqi = (y: string) => readFileSync(y, 'utf8');

type Sinov = { nomi: string; tekshir: () => boolean };

/* ── yordamchilar ── */

const KADR_MS = 50;
const jim = (soniya: number, rms = 0.002): number[] => Array(Math.round((soniya * 1000) / KADR_MS)).fill(rms);
/** Haqiqiy nutqqa o'xshash: ba'zi kadrlar pastroq, har 9-chisi — undosh orasidagi tanaffus */
const nutq = (soniya: number, rms = 0.15): number[] =>
  Array.from({ length: Math.round((soniya * 1000) / KADR_MS) }, (_, i) => (i % 9 === 8 ? 0.01 : i % 7 === 3 ? rms * 0.3 : rms));

function yurgiz(kadrlar: number[]): { qaror: NutqQarori; t: number; k: NutqKuzatuvchisi } {
  const k = new NutqKuzatuvchisi();
  for (let i = 0; i < kadrlar.length; i++) {
    const t = (i + 1) * KADR_MS;
    const q = k.kadr(kadrlar[i], t);
    if (q !== 'davom') return { qaror: q, t, k };
  }
  return { qaror: 'davom', t: kadrlar.length * KADR_MS, k };
}

function sinus(chastota: number, soniya: number, amplituda: number, namunaChastotasi: number): Float32Array {
  const n = Math.round(soniya * namunaChastotasi);
  const x = new Float32Array(n);
  for (let i = 0; i < n; i++) x[i] = amplituda * Math.sin((2 * Math.PI * chastota * i) / namunaChastotasi);
  return x;
}
const rmsHisobla = (x: ArrayLike<number>, olcham = 1): number => {
  let y = 0;
  for (let i = 0; i < x.length; i++) y += (x[i] / olcham) ** 2;
  return Math.sqrt(y / x.length);
};
const nolOtish = (x: ArrayLike<number>): number => {
  let n = 0;
  for (let i = 1; i < x.length; i++) if ((x[i - 1] < 0) !== (x[i] < 0)) n++;
  return n;
};

const OVOZ = kodiOl(oqi('src/components/agent/ovoz.ts'));
const OYNA = kodiOl(oqi('src/components/agent/agent-oynasi.tsx'));
const OYNA_XOM = oqi('src/components/agent/agent-oynasi.tsx');
const YOL = kodiOl(oqi('src/app/api/agent/ovoz/route.ts'));
const CSS = oqi('src/app/globals.css');
const PAKET = oqi('package.json');

/** Oynadagi matn: `t('...')` ichidagi va XATO_MATNI dagi kirill satrlar */
function xatoMatnlari(): string[] {
  const blok = /const XATO_MATNI[\s\S]*?\n\};/.exec(OYNA)?.[0] ?? '';
  return [...blok.matchAll(/:\s*'([^']+)'/g)].map((m) => m[1]);
}

const SINOVLAR: Sinov[] = [
  /* ══ A. WAV, chastota, kesish ══ */
  {
    nomi: 'WAV sarlavhasi baytma-bayt to‘g‘ri: RIFF/WAVE/fmt/data, PCM, bitta kanal, 16 000 Hz, sekundiga 32 000 bayt, 16 bit; uzunliklar mos',
    tekshir: () => {
      const pcm = Int16Array.from([0, 1, -1, 32767, -32768, 1234]);
      const u = new Uint8Array(wavYoz(pcm));
      const v = new DataView(u.buffer);
      const s4 = (o: number) => String.fromCharCode(u[o], u[o + 1], u[o + 2], u[o + 3]);
      return (
        u.length === 44 + pcm.length * 2 &&
        s4(0) === 'RIFF' && v.getUint32(4, true) === 36 + pcm.length * 2 && s4(8) === 'WAVE' && s4(12) === 'fmt ' &&
        v.getUint32(16, true) === 16 && v.getUint16(20, true) === 1 && v.getUint16(22, true) === 1 &&
        v.getUint32(24, true) === 16000 && v.getUint32(28, true) === 32000 && v.getUint16(32, true) === 2 && v.getUint16(34, true) === 16 &&
        s4(36) === 'data' && v.getUint32(40, true) === pcm.length * 2
      );
    },
  },
  {
    nomi: 'WAV namunalari to‘g‘ri tartibda va little-endian: 0, 1, -1, 32767, -32768, 1234 qaytib o‘qiladi',
    tekshir: () => {
      const pcm = Int16Array.from([0, 1, -1, 32767, -32768, 1234]);
      const v = new DataView(wavYoz(pcm));
      return pcm.every((x, i) => v.getInt16(44 + i * 2, true) === x);
    },
  },
  {
    nomi: 'Chastota pasaytirish 48 000 → 16 000: uzunlik aniq 1/3, tovush kuchi saqlanadi (±5%), 440 Hz tovush 440 Hz bo‘lib qoladi (nol kesishlar)',
    tekshir: () => {
      const kirish = sinus(440, 1, 0.5, 48000);
      const chiqish = namunalash(kirish, 48000);
      const kuch = rmsHisobla(chiqish, 32768);
      const kutilgan = 0.5 / Math.SQRT2;
      const nol = nolOtish(chiqish);
      return chiqish.length === 16000 && Math.abs(kuch - kutilgan) / kutilgan < 0.05 && Math.abs(nol - 880) <= 4;
    },
  },
  {
    nomi: 'Chastota pasaytirish 44 100 → 16 000 (iPhone): uzunlik 16 000±1, kuch va chastota saqlanadi',
    tekshir: () => {
      const chiqish = namunalash(sinus(440, 1, 0.5, 44100), 44100);
      const kutilgan = 0.5 / Math.SQRT2;
      return Math.abs(chiqish.length - 16000) <= 1 && Math.abs(rmsHisobla(chiqish, 32768) - kutilgan) / kutilgan < 0.05 && Math.abs(nolOtish(chiqish) - 880) <= 4;
    },
  },
  {
    nomi: 'Chastota pasaytirish: yuqori chastota (6 kHz) zaiflashadi, lekin takrorlanish buzilishi hosil qilmaydi; 16 kHz va undan past kirishda uzunlik o‘zgarmaydi',
    tekshir: () => {
      const yuqori = namunalash(sinus(6000, 1, 0.5, 48000), 48000);
      const oddiy = namunalash(sinus(440, 1, 0.5, 16000), 16000);
      return rmsHisobla(yuqori, 32768) < 0.5 / Math.SQRT2 && oddiy.length === 16000;
    },
  },
  {
    nomi: 'Butun songa o‘tkazish xavfsiz: 2 va -2 kesiladi (32767/-32768), NaN va Infinity 0 bo‘ladi, 0,5 → ~16 384',
    tekshir: () => {
      const o = namunalash(Float32Array.from([2, -2, NaN, Infinity, 0.5]), 16000);
      return o[0] === 32767 && o[1] === -32768 && o[2] === 0 && o[3] === 0 && Math.abs(o[4] - 16384) <= 1;
    },
  },
  {
    nomi: 'Bo‘laklar birlashtirilganda tartib saqlanadi va uzunlik yig‘indiga teng; bo‘sh ro‘yxat — bo‘sh massiv',
    tekshir: () => {
      const b = birlashtir([Float32Array.from([1, 2]), Float32Array.from([3]), Float32Array.from([4, 5])]);
      return b.length === 5 && [1, 2, 3, 4, 5].every((x, i) => b[i] === x) && birlashtir([]).length === 0;
    },
  },
  {
    nomi: 'Nutq atrofi kesiladi: boshidan 400 ms oldin, oxiridan 600 ms keyin; chetdan chiqmaydi; nutq topilmasa yoki chegaralar buzuq bo‘lsa — hammasi qoladi',
    tekshir: () => {
      const L = 10 * 48000;
      const a = nutqOraligi(L, 48000, 1000, 3000);
      const b = nutqOraligi(L, 48000, 100, 9900);
      const c = nutqOraligi(L, 48000, null, null);
      const d = nutqOraligi(L, 48000, 3000, 1000);
      return a.bosh === 0.6 * 48000 && a.oxir === 3.6 * 48000 && b.bosh === 0 && b.oxir === L && c.bosh === 0 && c.oxir === L && d.bosh === 0 && d.oxir === L;
    },
  },

  /* ══ B. Nutq kuzatuvchisi ══ */
  {
    nomi: 'Faqat jimlik: aniq 7 soniyada "nutq-yoq"; haqiqiy jimlik (kuch < JIMLIK_RMS) — serverga YUBORILMAYDI',
    tekshir: () => {
      const r = yurgiz(jim(20));
      return r.qaror === 'nutq-yoq' && r.t === NUTQ_SOZLAMASI.nutqKutishMs && !r.k.nutqBoldi && r.k.engKuchli < JIMLIK_RMS;
    },
  },
  {
    nomi: '0,8 s jimlik + 1,6 s nutq + jimlik: gap tugaganidan 1,4 s keyin "nutq-tugadi" (~3,8 s); nutq boshi/oxiri to‘g‘ri aniqlanadi',
    tekshir: () => {
      const r = yurgiz([...jim(0.8), ...nutq(1.6), ...jim(5)]);
      const b = r.k.nutqBoshiMs ?? -1;
      const o = r.k.nutqOxiriMs ?? -1;
      return r.qaror === 'nutq-tugadi' && r.t >= 3700 && r.t <= 3900 && b >= 800 && b <= 950 && o >= 2300 && o <= 2400;
    },
  },
  {
    nomi: 'So‘zlar orasidagi 1,0 s tanaffusda TO‘XTAMAYDI (jimlik chegarasi 1,4 s): ikkinchi qism ham yoziladi',
    tekshir: () => {
      const r = yurgiz([...nutq(1), ...jim(1), ...nutq(1), ...jim(3)]);
      return r.qaror === 'nutq-tugadi' && r.t >= 4300 && r.t <= 4500;
    },
  },
  {
    nomi: '1,6 s tanaffus — gap tugadi: birinchi qismdan 1,4 s keyin to‘xtaydi',
    tekshir: () => {
      const r = yurgiz([...nutq(1), ...jim(1.6), ...nutq(1), ...jim(3)]);
      return r.qaror === 'nutq-tugadi' && r.t >= 2300 && r.t <= 2500;
    },
  },
  {
    nomi: 'Bitta "chertish" (1 kadr, kuchli) nutq emas: nutq boshlanmagan, 7 s da "nutq-yoq"',
    tekshir: () => {
      const r = yurgiz([...jim(1), 0.5, ...jim(10)]);
      return r.qaror === 'nutq-yoq' && !r.k.nutqBoldi && r.k.nutqBoshiMs === null;
    },
  },
  {
    nomi: 'Doimiy fon shovqini (0,03) ga moslashadi: shovqin "nutq" deb sanalmaydi, keyingi nutq to‘g‘ri topiladi va gap tugagach to‘xtaydi',
    tekshir: () => {
      const r = yurgiz([...jim(4, 0.03), ...nutq(1, 0.2), ...jim(4, 0.03)]);
      const b = r.k.nutqBoshiMs ?? -1;
      return r.qaror === 'nutq-tugadi' && r.t >= 6300 && r.t <= 6500 && b >= 3950 && b <= 4300;
    },
  },
  {
    nomi: 'Gapirish fon shovqinini ko‘tarmaydi: uzun nutqdan keyingi jimlik ham o‘z vaqtida (1,4 s) to‘xtatadi',
    tekshir: () => {
      const r = yurgiz([...jim(0.5), ...nutq(6, 0.12), ...jim(3)]);
      return r.qaror === 'nutq-tugadi' && r.t >= 7800 && r.t <= 8100;
    },
  },
  {
    nomi: 'Hech qanday jimliksiz, darhol gapirish (kuch 0,05): nutq topiladi va gap tugagach to‘xtaydi',
    tekshir: () => {
      const r = yurgiz([...nutq(1.5, 0.05), ...jim(3)]);
      return r.qaror === 'nutq-tugadi' && r.t >= 2800 && r.t <= 3100 && (r.k.nutqBoshiMs ?? 9999) <= 200;
    },
  },
  {
    nomi: 'Eng uzun yozuv: to‘xtovsiz nutq 15 s da "vaqt" bilan to‘xtaydi',
    tekshir: () => {
      const r = yurgiz(nutq(30, 0.15));
      return r.qaror === 'vaqt' && r.t === NUTQ_SOZLAMASI.engUzunMs;
    },
  },
  {
    nomi: 'Juda baland doimiy shovqin (0,06) — cheklov: o‘zi to‘xtamaydi, 15 s da to‘xtaydi (foydalanuvchi qo‘lda to‘xtata oladi)',
    tekshir: () => yurgiz(jim(30, 0.06)).qaror === 'vaqt',
  },
  {
    nomi: 'Past ovozli, lekin bor nutq (kuch 0,012 < chegara): "nutq-yoq", ammo kuch JIMLIK_RMS dan baland — serverga YUBORILADI (jim emas)',
    tekshir: () => {
      const r = yurgiz([...jim(1), ...Array(40).fill(0.012), ...jim(10)]);
      return r.qaror === 'nutq-yoq' && r.k.engKuchli >= JIMLIK_RMS;
    },
  },
  {
    nomi: 'Kuzatuvchi xato qiymatlardan buzilmaydi: NaN, manfiy, Infinity, 1 dan katta',
    tekshir: () => {
      const k = new NutqKuzatuvchisi();
      let q: NutqQarori = 'davom';
      for (const x of [NaN, -1, Infinity, 5, 0]) q = k.kadr(x, 50);
      return q === 'davom' && Number.isFinite(k.chegara) && k.engKuchli <= 1;
    },
  },

  /* ══ C. Xatolar xaritasi ══ */
  {
    nomi: 'Brauzer tanishi xatosi, zaxira BOR: aborted — e’tibor yo‘q; no-speech — eshitilmadi; qolgan HAMMASI (not-allowed, service-not-allowed, til, tarmoq...) — zaxiraga o‘tish',
    tekshir: () => {
      const kodlar = ['not-allowed', 'service-not-allowed', 'language-not-supported', 'network', 'audio-capture', 'bad-grammar', 'nomalum'];
      return (
        tanishXatosiniHalEt('aborted', true).tur === 'otkaz' &&
        JSON.stringify(tanishXatosiniHalEt('no-speech', true)) === JSON.stringify({ tur: 'xato', kod: 'eshitilmadi' }) &&
        kodlar.every((k) => tanishXatosiniHalEt(k, true).tur === 'zaxira')
      );
    },
  },
  {
    nomi: 'Brauzer tanishi xatosi, zaxira YO‘Q: not-allowed → ruxsat; service-not-allowed/til → qollanmaydi (ruxsat DEMAYDI: sabab ruxsat emas); audio-capture → mikrofonYoq; network → tarmoq',
    tekshir: () => {
      const q = (k: string) => {
        const r = tanishXatosiniHalEt(k, false);
        return r.tur === 'xato' ? r.kod : r.tur;
      };
      return (
        q('not-allowed') === 'ruxsat' && q('service-not-allowed') === 'qollanmaydi' && q('language-not-supported') === 'qollanmaydi' &&
        q('audio-capture') === 'mikrofonYoq' && q('network') === 'tarmoq' && q('nomalum') === 'qollanmaydi' && q('aborted') === 'otkaz'
      );
    },
  },
  {
    nomi: 'Mikrofon (getUserMedia) xatosi: NotAllowed/Security → ruxsat; NotFound/Overconstrained → mikrofonYoq; NotReadable/Abort/noma‘lum → mikrofonBand',
    tekshir: () =>
      ['NotAllowedError', 'SecurityError', 'PermissionDeniedError'].every((n) => mikrofonXatosi(n) === 'ruxsat') &&
      ['NotFoundError', 'DevicesNotFoundError', 'OverconstrainedError'].every((n) => mikrofonXatosi(n) === 'mikrofonYoq') &&
      ['NotReadableError', 'AbortError', 'TrackStartError', '', 'Nimadir'].every((n) => mikrofonXatosi(n) === 'mikrofonBand'),
  },

  /* ══ D. Ulanish qoidalari (kod) ══ */
  {
    nomi: 'iPhone/iPad (barcha brauzerlar): server yo‘li bor bo‘lsa, brauzer tanishi UMUMAN ishlatilmaydi — to‘g‘ridan-to‘g‘ri yozuv (tanish tekshiruvidan OLDIN)',
    tekshir: () => {
      const i = OVOZ.indexOf('export function ovozniBoshla');
      const blok = OVOZ.slice(i);
      const ios = blok.indexOf('zaxiraBor && iosMi()');
      const tanish = blok.indexOf('brauzerTanishi(h, s');
      return i > 0 && ios > 0 && tanish > ios && /iosMi\(\)[\s\S]{0,80}yozuvgaOt\(\)/.test(blok) && OVOZ.includes('/iPad|iPhone|iPod/') && OVOZ.includes("navigator.platform === 'MacIntel'");
    },
  },
  {
    nomi: 'Qotib qolmaslik: `onTugadi` FAQAT seans ichida (yakuniy/xato/bekor) chaqiriladi — har holatda aynan bir marta; tanish xatosidan keyin `end` kutilmaydi',
    tekshir: () => {
      const n = (OVOZ.match(/h\.onTugadi\(\)/g) ?? []).length;
      const seans = /function seansYarat[\s\S]*?\n\}\n/.exec(OVOZ)?.[0] ?? '';
      const onerror = /r\.onerror = \(e\) => \{[\s\S]*?\n  \};/.exec(OVOZ)?.[0] ?? '';
      return n === 3 && (seans.match(/h\.onTugadi\(\)/g) ?? []).length === 3 && /if \(tugadi\) return;\s*tugadi = true;/.test(seans) &&
        /yech\(\);/.test(onerror) && onerror.indexOf('yech();') < onerror.indexOf('s.xato(') && !/onend/.test(onerror);
    },
  },
  {
    nomi: '"To‘xtat" bosilganda brauzer `end` demasa — 2 s dan keyin, hech narsa javob bermasa — 30 s dan keyin o‘zi yakunlanadi (taymerlar)',
    tekshir: () =>
      /TOXTATISHDAN_KEYIN_MS = 2_000/.test(OVOZ) && /ENG_UZUN_TANISH_MS = 30_000/.test(OVOZ) &&
      /soat\(yakunla, ENG_UZUN_TANISH_MS\)/.test(OVOZ) && /soat\(yakunla, TOXTATISHDAN_KEYIN_MS\)/.test(OVOZ),
  },
  {
    nomi: 'Mikrofon oqimi har yo‘lda bo‘shatiladi: bosha() treklarni to‘xtatadi va audio kontekstni yopadi; ruxsat kutilganda bekor qilinsa, kech kelgan oqim ham bo‘shatiladi',
    tekshir: () => {
      const bosha = /const bosha = \(\) => \{[\s\S]*?\n  \};/.exec(OVOZ)?.[0] ?? '';
      return /getTracks\(\)\.forEach/.test(bosha) && /t\.stop\(\)/.test(bosha) && /a\.close\?\.\(\)/.test(bosha) && /onaudioprocess = null/.test(bosha) &&
        /if \(tugadi \|\| !audio\) return bosha\(\)/.test(OVOZ);
    },
  },
  {
    nomi: 'Ruxsat kutilayotganda "to‘xtat" bosilsa: seans BEKOR bilan tugaydi (holat qotmaydi), mikrofon bo‘shatiladi; yozuv yuborilmaydi',
    tekshir: () => {
      const t = /const toxtatish = [\s\S]*?\n  \};/.exec(OVOZ)?.[0] ?? '';
      return /if \(!oqim \|\| !islov\) \{[\s\S]*?tugadi = true;[\s\S]*?bosha\(\);[\s\S]*?s\.bekor\(\);[\s\S]*?return;/.test(t);
    },
  },
  {
    nomi: 'AudioContext bosish ICHIDA, getUserMedia kutilmasdan yaratiladi (iPhone shuni talab qiladi); karnayga ulanmaydi (nol kuchaytirish)',
    tekshir: () => {
      const i = OVOZ.indexOf('function yozuvniBoshla');
      const blok = OVOZ.slice(i);
      return blok.indexOf('new AC()') > 0 && blok.indexOf('new AC()') < blok.indexOf('getUserMedia') && /gain\.value = 0/.test(blok);
    },
  },
  {
    nomi: 'Yozuv WAV (audio/wav, ovoz.wav) bo‘lib ketadi va server shu turni qabul qiladi; server limitlari (1,5 MB, 60 s, audio turlari) saqlangan',
    tekshir: () =>
      /type: 'audio\/wav'/.test(OVOZ) && /ovoz\.wav/.test(OVOZ) && /wav\|x-wav/.test(YOL) && /ENG_KATTA_BAYT = 1_500_000/.test(YOL) &&
      !/MediaRecorder/.test(OVOZ),
  },
  {
    nomi: 'Nutq atrofi kesiladi va jim yozuv serverga YUBORILMAYDI (nutq-yoq + kuch < JIMLIK_RMS → eshitilmadi); eng qisqa yozuv 0,6 s',
    tekshir: () =>
      /nutqOraligi\(butun\.length, tezlik, kuzatuv\.nutqBoshiMs, kuzatuv\.nutqOxiriMs\)/.test(OVOZ) &&
      /sabab === 'nutq-yoq' && kuzatuv\.engKuchli < JIMLIK_RMS\) return s\.xato\('eshitilmadi'\)/.test(OVOZ) && /ENG_QISQA_YOZUV_S = 0\.6/.test(OVOZ),
  },
  {
    nomi: 'Oyna: yopilsa/fonga o‘tsa yozuv bekor qilinadi (yuborilmaydi); tugma holat kelguncha yopiq (server yo‘li ma’lum bo‘lsin); TTS tugashi mikrofon holatini buzmaydi',
    tekshir: () =>
      /if \(!ochiq\) \{\s*tanish\.current\?\.bekor\(\);/.test(OYNA) && /visibilitychange/.test(OYNA) && /document\.hidden/.test(OYNA) &&
      /disabled=\{!mikrofonMumkin \|\| !malumotTayyor \|\| holat === 'oylamoqda'\}/.test(OYNA) &&
      /setHolat\(\(h\) => \(h === 'gapirmoqda' \? 'tayyor' : h\)\)/.test(OYNA),
  },
  {
    nomi: 'Oyna: mikrofon tugagach holat har doim tiklanadi (eshitmoqda → tayyor; savol ketmagan bo‘lsa o‘ylamoqda → tayyor), yozuv serverda matnga aylanayotganda "o‘ylamoqda" va qayta bosish yopiq',
    tekshir: () =>
      /onTugadi: \(\) => \{[\s\S]*?h === 'eshitmoqda' \|\| \(h === 'oylamoqda' && !bandRef\.current\)/.test(OYNA) &&
      /onIshlov: \(\) => \{[\s\S]*?setHolat\('oylamoqda'\)/.test(OYNA) && /bandRef\.current = true/.test(OYNA) && /bandRef\.current = false/.test(OYNA),
  },
  {
    nomi: 'Mikrofon darajasi halqasi: zaif qurilma va "harakatni kamaytirish"da ISHLAMAYDI (CSS himoyasi + JS tekshiruvi)',
    tekshir: () => {
      const blok = /@media \(prefers-reduced-motion: no-preference\) \{\s*html:not\(\[data-fx='lite'\]\) \.mikrofon-faol[\s\S]*?\n\}/.exec(CSS)?.[0] ?? '';
      return /calc\(var\(--daraja, 0\) \* 10px\)/.test(blok) && !/\banimation:/.test(blok) && /dataset\.fx === 'lite'/.test(OYNA);
    },
  },

  /* ══ E. Matnlar qisqa ══ */
  {
    nomi: 'Mikrofon xato matnlari QISQA: har biri ≤ 70 belgi (kirillda), barchasi nuqta bilan tugagan gap; "ruxsat" xabari ruxsatni aytadi',
    tekshir: () => {
      const m = xatoMatnlari();
      return m.length === 7 && m.every((x) => x.length <= 70) && m.some((x) => /^Микрофонга рухсат йўқ/.test(x));
    },
  },
  {
    nomi: 'Salom QISQA: ismi bilan, "Мен Коаламан", ≤ 80 belgi (lotinda); namunaviy savollar salom ichida EMAS (ular tugmalarda bor)',
    tekshir: () => {
      const lot = salomMatni('Umidjon Zoxiddinovich', new Date('2026-10-02T17:00:00Z'), 'lot');
      return lot === 'Xayrli oqshom, hurmatli Umidjon Zoxiddinovich! Men Koalaman — yordamchingiz.' && lot.length <= 80 && !/masalan|xatlov qanday/i.test(lot);
    },
  },
  {
    nomi: 'Pastki eslatma QISQA (≤ 80 belgi, lotinda) va maxfiylikni saqlaydi: ovoz tashqi xizmatda matnga aylanadi, fuqaro ismi/telefonini aytmaslik',
    tekshir: () => {
      const m = /t\('(Овоз ташқи[^']+)'\)/.exec(OYNA)?.[1] ?? '';
      const lot = A(m, 'lot');
      return m.length > 0 && lot.length <= 80 && /tashqi xizmat/.test(lot) && /telefon/.test(lot) && /fuqaro/i.test(lot);
    },
  },
  {
    nomi: 'Eski uzun matnlar qaytib kelmagan: "Chrome — Google serverida...", "Браузер созламаларидан...", salomdagi "масалан" ro‘yxati, sarlavhadagi "бугун яна ... сўров"',
    tekshir: () =>
      !/Chrome — Google/.test(OYNA) && !/Браузер созламаларидан/.test(OYNA) && !/бугун яна/.test(OYNA) &&
      !/ёзиб юборинг/.test(OYNA) && !/Овоз билан ёки ёзиб сўранг/.test(oqi('src/lib/agent/matnlar.ts')),
  },
  {
    nomi: 'Koddan chiqadigan matnlar byudjeti: har bir MATN ≤ 100 belgi (lotinda); jami "tushunmadim", "limit", "ai yo‘q", "yordam" qisqa — foydalanuvchi o‘qib charchamasin',
    tekshir: () => Object.entries(MATN).every(([k, v]) => {
      const uz = A(v, 'lot').length;
      if (uz > 100) console.log(`     uzun: ${k} (${uz})`);
      return uz <= 100;
    }),
  },
  {
    nomi: 'Brauzerda saqlangan ESKI (uzun) salom yangilanadi: tiklashda birinchi salom hozirgi qisqa matn bilan almashtiriladi, qolgan suhbat saqlanadi',
    tekshir: () => /tiklandi\[0\]\.r === 'a' && \/\^\(Хайрли\|Xayrli\)\/\.test\(tiklandi\[0\]\.matn\)/.test(OYNA) && /tiklandi\[0\] = \{ \.\.\.tiklandi\[0\], matn: salomMatni\(ism, new Date\(\), alifbo\) \}/.test(OYNA),
  },
  {
    nomi: 'Takroriy holat matni yo‘q: "Ўйлаяпман…" suhbat ro‘yxatida alohida chiqmaydi (holat qatori bitta)',
    tekshir: () => (OYNA_XOM.match(/Ўйлаяпман…/g) ?? []).length === 1,
  },
  {
    nomi: 'Tizim ko‘rsatmasi modelga javobni JUDA qisqa (1–2 gap), kirish/xulosa gaplarisiz yozishni buyuradi',
    tekshir: () => {
      const k = oqi('src/lib/agent/kursatma.ts');
      return /Javob JUDA qisqa: odatda 1–2 gap/.test(k) && /salomlashma, savolni takrorlama/.test(k);
    },
  },
  {
    nomi: 'Sinov o‘zi zanjirda: `npm run sinov` ovoz-sinov.ts ni ishga tushiradi; brauzer stsenariylari fayli bor',
    tekshir: () => /tsx scripts\/ovoz-sinov\.ts/.test(PAKET) && existsSync('scripts/brauzer/mikrofon-brauzer.mjs'),
  },
];

let xato = 0;
for (const s of SINOVLAR) {
  let ok = false;
  try {
    ok = s.tekshir();
  } catch (e) {
    console.log(`     xatolik: ${(e as Error).message}`);
  }
  if (!ok) xato++;
  console.log(`${ok ? 'OK  ' : 'XATO'} ${s.nomi}`);
}
console.log(`\n${SINOVLAR.length - xato}/${SINOVLAR.length} o'tdi`);
process.exit(xato ? 1 : 0);
