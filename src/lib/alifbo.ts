/**
 * ============================================================
 *  ALIFBO: KIRILL ⇄ LOTIN
 *
 *  Butun ilova matni KIRILLDA yoziladi va lotin ko'rinishi
 *  o'girish (transliteratsiya) orqali hosil qilinadi.
 *
 *  Nega ikkita ro'yxat emas? Chunki ikkita ro'yxat muqarrar
 *  ravishda bir-biridan uzoqlashadi: kimdir kirill matnni
 *  tuzatadi, lotinini unutadi va oradan bir oy o'tib ikki
 *  alifboda ikki xil savol turadi. Bitta manba - bitta haqiqat.
 *
 *  Qo'shimcha foyda: o'girish DINAMIK matnga ham ishlaydi.
 *  Mahalla nomi, raisning familiyasi, xodim kiritgan kasb nomi -
 *  hammasi tanlangan alifboda ko'rinadi, garchi bazada bir
 *  ko'rinishda saqlansa ham.
 *
 *  Chegara: o'girish faqat KIRILLDAN LOTINGA. Teskarisi kerak
 *  emas, chunki asos matn har doim kirill.
 * ============================================================
 */

export type Alifbo = 'kir' | 'lot';

export const ALIFBO_COOKIE = 'bandlik_alifbo';

/**
 * Bir harfli mosliklar.
 *
 * `ц` uchun `ts` olindi: o'zbek tilida bu harf deyarli faqat
 * o'zlashgan so'zlarda uchraydi ("цех" -> "tsex").
 */
const HARF: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd',
  ж: 'j', з: 'z', и: 'i', й: 'y', к: 'k',
  л: 'l', м: 'm', н: 'n', о: 'o', п: 'p',
  р: 'r', с: 's', т: 't', у: 'u', ф: 'f',
  х: 'x', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sh',
  ы: 'i', э: 'e',
  // O'zbek kirilliga xos harflar
  ў: 'oʻ', қ: 'q', ғ: 'gʻ', ҳ: 'h',
};

/** Yumshatish belgisi yozuvda iz qoldirmaydi */
const TUSHIB_QOLADI = new Set(['ь']);

/** Unlilar - "е" va "ъ" qoidalari uchun kerak */
const UNLI = new Set(['а', 'е', 'ё', 'и', 'о', 'у', 'ў', 'э', 'ю', 'я', 'ы']);

/** Harf kirillmi (bosh yoki kichik) */
function kirillmi(ch: string): boolean {
  const k = ch.toLowerCase();
  return HARF[k] !== undefined || UNLI.has(k) || k === 'ъ' || k === 'ь' || k === 'е' || k === 'ё' || k === 'ю' || k === 'я';
}

/** Natijaning bosh harfini asl harfga qarab moslaydi */
/**
 * Lotin natijasini asl harfning bosh/kichikligiga moslaydi.
 *
 * Bir kirill harfi ikki lotin harfiga aylanganda (`Я` -> `ya`)
 * savol tug'iladi: `Ya` mi, `YA` mi? Javob so'zga bog'liq:
 *
 *   "Ялпи"     -> "Yalpi"    (faqat birinchi harf bosh)
 *   "ЯЛПИ"     -> "YALPI"    (butun so'z bosh harflarda)
 *
 * `hammasiBosh` shu farqni chaqiruvchidan olib keladi - u
 * qo'shni harflarni ko'rib turadi. Busiz "ТАВСИЯЛАР" degan
 * sarlavha "TAVSIYaLAR" bo'lib chiqardi: so'z o'rtasida kichik
 * harf paydo bo'lardi va hujjat qo'pol ko'rinardi.
 */
function moslash(asl: string, natija: string, hammasiBosh = false): string {
  if (asl === asl.toLowerCase()) return natija;
  if (hammasiBosh) return natija.toUpperCase();
  return natija.charAt(0).toUpperCase() + natija.slice(1);
}

/**
 * Kirill matnni lotinga o'giradi.
 *
 * Lotin harflar, raqamlar va tinish belgilariga tegilmaydi -
 * shu sababli aralash matn ("MChJ «Навоий»") to'g'ri chiqadi va
 * funksiyani ikki marta chaqirish zarar qilmaydi.
 */
export function lotinga(matn: string): string {
  if (!matn) return matn;

  let natija = '';

  for (let i = 0; i < matn.length; i++) {
    const ch = matn[i];
    const kichik = ch.toLowerCase();
    const oldingi = i > 0 ? matn[i - 1].toLowerCase() : '';
    const soznBoshi = i === 0 || !kirillmi(matn[i - 1]);

    /*
     * So'z BUTUNLAY bosh harflardami?
     *
     * Qo'shni kirill harfiga qaraymiz: biri ham bosh bo'lsa,
     * demak bu bosh harfli so'z ("ТАВСИЯЛАР"), va ikki harfli
     * lotin muqobili ham butunlay bosh bo'lishi kerak.
     *
     * Yolg'iz harf ("Я.") bu shartni qanoatlantirmaydi va
     * "Ya" bo'lib qoladi - to'g'risi shu, chunki u odatda
     * ism-familiyaning qisqartmasi.
     */
    const qoshni = (j: number) => {
      const c = matn[j];
      return c && kirillmi(c) ? c : '';
    };
    const boshHarfmi = (c: string) => !!c && c === c.toUpperCase() && c !== c.toLowerCase();
    const hammasiBosh =
      boshHarfmi(ch) && (boshHarfmi(qoshni(i - 1)) || boshHarfmi(qoshni(i + 1)));

    if (TUSHIB_QOLADI.has(kichik)) continue;

    if (kichik === 'ъ') {
      /*
       * Ayirish belgisi ikki xil ish qiladi.
       *
       * Yumshoq unlidan OLDIN kelsa, o'sha unli o'zi "y" tovushini
       * beradi va ayirish belgisi yozuvda ko'rinmaydi:
       *   "субъект"  -> "subyekt"   ("subʼekt" emas)
       *
       * Qolgan hollarda - tutuq belgisi:
       *   "маънавият" -> "maʼnaviyat"
       */
      const keyingi = i + 1 < matn.length ? matn[i + 1].toLowerCase() : '';
      const yumshoqUnli = keyingi === 'е' || keyingi === 'ё' || keyingi === 'ю' || keyingi === 'я';
      if (!soznBoshi && !yumshoqUnli) natija += 'ʼ';
      continue;
    }

    if (kichik === 'е') {
      /*
       * "е" ikki xil o'qiladi:
       *   so'z boshida yoki unlidan keyin  -> ye  ("Ерма" -> "Yerma")
       *   undoshdan keyin                  -> e   ("Бек" -> "Bek")
       */
      // Ayirish/yumshatish belgisi "e" ni "ye" ga aylantiradi:
      // "субъект" -> "subyekt"
      const ye = soznBoshi || UNLI.has(oldingi) || oldingi === 'ъ' || oldingi === 'ь';
      natija += moslash(ch, ye ? 'ye' : 'e', hammasiBosh);
      continue;
    }

    if (kichik === 'ё') { natija += moslash(ch, 'yo', hammasiBosh); continue; }
    if (kichik === 'ю') { natija += moslash(ch, 'yu', hammasiBosh); continue; }
    if (kichik === 'я') { natija += moslash(ch, 'ya', hammasiBosh); continue; }

    const lotin = HARF[kichik];
    if (lotin !== undefined) {
      natija += moslash(ch, lotin, hammasiBosh);
      continue;
    }

    // Kirill bo'lmagan belgi - o'zgarishsiz qoladi
    natija += ch;
  }

  return natija;
}

/**
 * Matnni tanlangan alifboda qaytaradi.
 *
 * Ilovada eng ko'p ishlatiladigan funksiya, shuning uchun nomi
 * qisqa. Kirill tanlangan bo'lsa - matn o'zgarishsiz qaytadi,
 * ya'ni hech qanday ish bajarilmaydi.
 */
export function A(matn: string, alifbo: Alifbo): string {
  return alifbo === 'lot' ? lotinga(matn) : matn;
}

/** Cookie qiymatidan alifboni aniqlaydi; noma'lum bo'lsa - kirill */
export function alifboOqi(qiymat?: string | null): Alifbo {
  return qiymat === 'lot' ? 'lot' : 'kir';
}

export const ALIFBO_NOMI: Record<Alifbo, string> = {
  kir: 'Кирилл',
  lot: 'Lotin',
};
