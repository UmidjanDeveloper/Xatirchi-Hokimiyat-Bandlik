/*
 * Gemini Live uchun mikrofon qayta ishlovchisi (AudioWorklet).
 *
 * Brauzer mikrofonni odatda 48 000 yoki 44 100 Hz da beradi; Gemini esa
 * 16 000 Hz, bir kanalli PCM kutadi. Bu yerda har ~3 ta namunaning o'rtachasi
 * olinadi (oddiy past chastotali filtr + kamaytirish), so'ng 800 namunalik
 * (50 ms) bo'laklar asosiy oqimga yuboriladi. Har bo'lak bilan birga
 * ovoz kuchi (RMS) ham ketadi: javob o'qilayotganda gapni bo'lishni aniqlash
 * uchun kerak.
 *
 * Kalit, token va tarmoq bilan hech qanday aloqasi yo'q.
 */
class GeminiPcmQabulqilgich extends AudioWorkletProcessor {
  constructor() {
    super();
    this.nisbat = sampleRate / 16000;
    this.yigindi = 0;
    this.soni = 0;
    this.joy = 0;
    this.bolak = new Float32Array(800);
    this.k = 0;
  }

  process(inputs) {
    const kanal = inputs[0] && inputs[0][0];
    if (!kanal) return true;
    for (let i = 0; i < kanal.length; i++) {
      this.yigindi += kanal[i];
      this.soni++;
      this.joy += 1;
      if (this.joy >= this.nisbat) {
        this.joy -= this.nisbat;
        this.bolak[this.k++] = this.yigindi / this.soni;
        this.yigindi = 0;
        this.soni = 0;
        if (this.k === this.bolak.length) {
          let kv = 0;
          for (let j = 0; j < this.bolak.length; j++) kv += this.bolak[j] * this.bolak[j];
          this.port.postMessage({ f: this.bolak.slice(0), rms: Math.sqrt(kv / this.bolak.length) });
          this.k = 0;
        }
      }
    }
    return true;
  }
}

registerProcessor('gemini-pcm', GeminiPcmQabulqilgich);
