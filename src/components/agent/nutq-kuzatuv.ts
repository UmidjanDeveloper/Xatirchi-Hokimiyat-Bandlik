/**
 * ============================================================
 *  NUTQ KUZATUVCHISI: foydalanuvchi gapirib bo'ldimi?
 *
 *  Server orqali ovoz yozishda (iPhone, Firefox, brauzer tanishi
 *  ishlamaganda) brauzer o'zi "gap tugadi" demaydi: yozuv foydalanuvchi
 *  to'xtatguncha yoki eng uzun vaqtgacha davom etardi. Telefonda gapirib
 *  bo'lgach hech narsa bo'lmay turgan oyna "ishlamayapti" bo'lib tuyuladi.
 *
 *  Bu fayl faqat HISOB-KITOB (brauzer, React va ovoz API'siga bog'liq
 *  emas): har 50 ms da mikrofon kuchi (RMS, 0..1) beriladi, qaror
 *  qaytariladi. Shuning uchun uni brauzersiz, aniq ketma-ketliklar bilan
 *  sinash mumkin (`scripts/ovoz-sinov.ts`).
 *
 *  Qoidalar:
 *    · fon shovqini ("taban") = oxirgi 3 soniyadagi ENG PAST kuch: gapirish
 *      uni ko'tarmaydi (so'zlar orasida kuch past tushadi), o'zgarib turgan
 *      shovqinga esa 3 soniyada moslashadi. 0,04 dan kuchli kadrlar shovqin
 *      deb sanalmaydi (baland nutq "fon" bo'lib qolmasin);
 *    · nutq = taban x 3 dan kuchli (0,02 dan past va 0,12 dan baland emas)
 *      kadrlar. Bir "epizod" — 0,4 s dan kam tanaffusli kuchli kadrlar;
 *      epizodda kamida 4 kadr (0,2 s) bo'lsa — nutq boshlandi (ekran
 *      bosilgan "chertish" yoki shovqin nutq emas, va u yozuvning boshini
 *      kesishga xalaqit bermaydi);
 *    · nutqdan keyin 1,4 s jimlik — gap tugadi (so'zlar orasidagi tanaffus
 *      bundan qisqa);
 *    · 7 s gapirilmasa — "nutq yo'q"; eng uzun yozuv 15 s.
 * ============================================================
 */

export interface NutqSozlamasi {
  /** Nutqdan keyin shuncha jimlik — gap tugadi (ms) */
  jimlikMs: number;
  /** Nutq boshlanishini kutish chegarasi (ms) */
  nutqKutishMs: number;
  /** Eng uzun yozuv (ms) */
  engUzunMs: number;
  /** Nutq deb sanash uchun kerakli kadrlar soni */
  minNutqKadr: number;
  /** Nutq chegarasining mutlaq pastki qiymati (RMS) */
  minRms: number;
  /** Nutq chegarasi = fon shovqini x shu son */
  tabanKoeffitsiyenti: number;
}

export const NUTQ_SOZLAMASI: NutqSozlamasi = {
  jimlikMs: 1400,
  nutqKutishMs: 7000,
  engUzunMs: 15_000,
  minNutqKadr: 4,
  minRms: 0.02,
  tabanKoeffitsiyenti: 3,
};

/** "Hech narsa eshitilmadi" deyish uchun: bundan past signal — haqiqiy jimlik */
export const JIMLIK_RMS = 0.006;

export type NutqQarori = 'davom' | 'nutq-tugadi' | 'nutq-yoq' | 'vaqt';

/** Fon shovqinini baholash oynasi: 60 kadr x 50 ms = 3 soniya */
const OYNA_KADR = 60;
/** Kuchli kadrlar orasida shundan ko'p tanaffus bo'lsa — yangi epizod */
const EPIZOD_TANAFFUSI_MS = 400;
/** Bundan kuchli kadr fon shovqini hisoblanmaydi */
const SHOVQIN_CHEGARASI = 0.04;
/** Nutq chegarasining eng yuqori qiymati: baland shovqinda ham oddiy nutq o'tsin */
const ENG_YUQORI_ESIK = 0.12;

export class NutqKuzatuvchisi {
  private readonly s: NutqSozlamasi;
  private taban = 0;
  private readonly oyna: number[] = [];
  private epizodKadri = 0;
  private epizodBoshiMs = 0;
  private oxirgiKuchliMs = -Infinity;
  private boshlandi = false;
  private oxirgiNutqMs = 0;
  private birinchiNutqMs: number | null = null;
  private eng = 0;

  constructor(sozlama: Partial<NutqSozlamasi> = {}) {
    this.s = { ...NUTQ_SOZLAMASI, ...sozlama };
  }

  /** Hozirgi nutq chegarasi (RMS) */
  get chegara(): number {
    return Math.max(this.s.minRms, Math.min(this.taban * this.s.tabanKoeffitsiyenti, ENG_YUQORI_ESIK));
  }

  /** Nutq boshlandimi (bir epizodda kamida minNutqKadr kuchli kadr) */
  get nutqBoldi(): boolean {
    return this.boshlandi;
  }

  /** Nutq epizodining birinchi kadri vaqti (ms); nutq boshlanmagan bo'lsa — null */
  get nutqBoshiMs(): number | null {
    return this.nutqBoldi ? this.birinchiNutqMs : null;
  }

  /** Oxirgi kuchli kadr vaqti (ms); nutq boshlanmagan bo'lsa — null */
  get nutqOxiriMs(): number | null {
    return this.nutqBoldi ? this.oxirgiNutqMs : null;
  }

  /** Kuzatilgan eng kuchli signal (RMS) */
  get engKuchli(): number {
    return this.eng;
  }

  /**
   * Bitta kadr.
   * @param rms mikrofon kuchi, 0..1
   * @param t yozuv boshlanganidan beri o'tgan vaqt, ms
   */
  kadr(rms: number, t: number): NutqQarori {
    const q = Number.isFinite(rms) && rms > 0 ? Math.min(rms, 1) : 0;
    if (q > this.eng) this.eng = q;

    /* Chegara oldingi kadrlar bo'yicha; keyin shu kadr fon baholash oynasiga qo'shiladi */
    const nutq = q > this.chegara;
    if (q <= SHOVQIN_CHEGARASI) {
      this.oyna.push(q);
      if (this.oyna.length > OYNA_KADR) this.oyna.shift();
      this.taban = Math.min(...this.oyna);
    }
    if (nutq) {
      if (t - this.oxirgiKuchliMs > EPIZOD_TANAFFUSI_MS) {
        this.epizodBoshiMs = t;
        this.epizodKadri = 0;
      }
      this.oxirgiKuchliMs = t;
      this.epizodKadri += 1;
      if (!this.boshlandi && this.epizodKadri >= this.s.minNutqKadr) {
        this.boshlandi = true;
        this.birinchiNutqMs = this.epizodBoshiMs;
      }
      if (this.boshlandi) this.oxirgiNutqMs = t;
    }

    if (t >= this.s.engUzunMs) return 'vaqt';
    if (this.nutqBoldi) return t - this.oxirgiNutqMs >= this.s.jimlikMs ? 'nutq-tugadi' : 'davom';
    return t >= this.s.nutqKutishMs ? 'nutq-yoq' : 'davom';
  }
}
