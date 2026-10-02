/**
 * ============================================================
 *  OVOZ YOZUVI: PCM → 16 kHz → WAV (sof funksiyalar)
 *
 *  Server orqali matnga aylantirishda yozuvni brauzerning MediaRecorder'i
 *  emas, O'ZIMIZ yig'amiz (WebAudio) va oddiy WAV qilib yuboramiz. Sabab:
 *
 *    · iPhone'da MediaRecorder `audio/mp4` (bo'laklangan MP4) beradi — uni
 *      server tomondagi dekoder qabul qilishiga kafolat yo'q, men esa
 *      iPhone'ning o'zida sinab ko'ra olmayman. WAV (16 kHz, 16 bit, bitta
 *      kanal) hamma dekoderda bir xil ochiladi va uni shu yerda baytma-bayt
 *      tekshirish mumkin (`scripts/ovoz-sinov.ts`);
 *    · MediaRecorder bo'lmagan eski brauzerlarda ham ishlaydi;
 *    · nutqning boshi va oxiridagi jimlikni kesib tashlash mumkin: jim
 *      yozuvga model ba'zan "o'ylab topilgan" matn qaytaradi.
 *
 *  Fayl sof (brauzer va React'ga bog'liq emas): Node'da ham sinaladi.
 * ============================================================
 */

/** Serverga yuboriladigan namuna chastotasi (Whisper'ning o'z chastotasi) */
export const YUBORISH_CHASTOTASI = 16_000;

/** Bo'laklarni bitta massivga yig'adi */
export function birlashtir(bolaklar: Float32Array[]): Float32Array {
  let jami = 0;
  for (const b of bolaklar) jami += b.length;
  const natija = new Float32Array(jami);
  let o = 0;
  for (const b of bolaklar) {
    natija.set(b, o);
    o += b.length;
  }
  return natija;
}

/**
 * Chastotani pasaytiradi (masalan 48 000 → 16 000) va 16 bitli butun songa
 * o'tkazadi. Har chiqish namunasi — unga to'g'ri kelgan kirish oralig'ining
 * o'rtachasi (oddiy past chastotali filtr: takrorlanish buzilishi kamayadi).
 * Kirish chastotasi pastroq bo'lsa, namunalar o'zgarishsiz qoladi.
 */
export function namunalash(kirish: Float32Array, kirishChastotasi: number, chiqishChastotasi = YUBORISH_CHASTOTASI): Int16Array {
  if (kirishChastotasi <= chiqishChastotasi) {
    const o = new Int16Array(kirish.length);
    for (let i = 0; i < kirish.length; i++) o[i] = butunga(kirish[i]);
    return o;
  }
  const nisbat = kirishChastotasi / chiqishChastotasi;
  const uzunlik = Math.floor(kirish.length / nisbat);
  const chiqish = new Int16Array(uzunlik);
  for (let i = 0; i < uzunlik; i++) {
    const bosh = Math.floor(i * nisbat);
    const oxir = Math.min(kirish.length, Math.max(bosh + 1, Math.floor((i + 1) * nisbat)));
    let yig = 0;
    for (let j = bosh; j < oxir; j++) yig += kirish[j];
    chiqish[i] = butunga(yig / (oxir - bosh));
  }
  return chiqish;
}

function butunga(x: number): number {
  const q = Number.isFinite(x) ? Math.max(-1, Math.min(1, x)) : 0;
  return q < 0 ? Math.round(q * 32768) : Math.round(q * 32767);
}

/** 16 bitli bitta kanalli PCM → WAV fayl (44 baytlik sarlavha + ma'lumot) */
export function wavYoz(pcm: Int16Array, chastota = YUBORISH_CHASTOTASI): ArrayBuffer {
  const baytlar = pcm.length * 2;
  const bufer = new ArrayBuffer(44 + baytlar);
  const v = new DataView(bufer);
  const yoz = (o: number, s: string) => {
    for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i));
  };
  yoz(0, 'RIFF');
  v.setUint32(4, 36 + baytlar, true);
  yoz(8, 'WAVE');
  yoz(12, 'fmt ');
  v.setUint32(16, 16, true); // fmt bo'lagi uzunligi
  v.setUint16(20, 1, true); // PCM
  v.setUint16(22, 1, true); // bitta kanal
  v.setUint32(24, chastota, true);
  v.setUint32(28, chastota * 2, true); // sekundiga bayt
  v.setUint16(32, 2, true); // namuna hajmi (bayt)
  v.setUint16(34, 16, true); // bit
  yoz(36, 'data');
  v.setUint32(40, baytlar, true);
  for (let i = 0; i < pcm.length; i++) v.setInt16(44 + i * 2, pcm[i], true);
  return bufer;
}

/**
 * Nutq atrofini kesadi: nutqning boshidan `oldinMs` oldin, oxiridan `keyinMs`
 * keyin (so'z oxiri va boshi kesilib qolmasin). Nutq topilmagan bo'lsa
 * (`boshMs`/`oxirMs` yo'q) — hammasi qoladi.
 */
export function nutqOraligi(
  uzunlik: number,
  chastota: number,
  boshMs: number | null,
  oxirMs: number | null,
  oldinMs = 400,
  keyinMs = 600
): { bosh: number; oxir: number } {
  if (boshMs === null || oxirMs === null || oxirMs < boshMs) return { bosh: 0, oxir: uzunlik };
  const ms = (x: number) => Math.round((x / 1000) * chastota);
  const bosh = Math.max(0, ms(boshMs - oldinMs));
  const oxir = Math.min(uzunlik, ms(oxirMs + keyinMs));
  return oxir > bosh ? { bosh, oxir } : { bosh: 0, oxir: uzunlik };
}
