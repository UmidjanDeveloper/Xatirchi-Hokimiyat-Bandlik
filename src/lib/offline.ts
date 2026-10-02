/**
 * ============================================================
 *  OFLAYN QORALAMA VA NAVBAT
 *
 *  Xatlov hovlida, xonadon eshigi oldida to'ldiriladi. Xatirchi
 *  tumanining chekka mahallalarida aloqa uzilib turadi, telefonning
 *  quvvati esa kun oxiriga borib tugaydi.
 *
 *  Ikkita alohida himoya:
 *
 *  1. QORALAMA - har o'zgarishda brauzer xotirasiga yoziladi.
 *     Telefon o'chsa yoki sahifa yopilsa, xodim qaytib kelganda
 *     to'ldirgan joyidan davom etadi.
 *
 *  2. NAVBAT - aloqa yo'q bo'lsa, tayyor xatlov navbatga tushadi
 *     va aloqa tiklanishi bilan avtomatik yuboriladi.
 *
 *  Eng muhim qoida: xotira to'lib qolsa, xodimga SOXTA "saqlandi"
 *  emas, rost xabar ko'rsatiladi. Aks holda u xonadondan ketadi va
 *  ma'lumot yo'qolganini faqat kechqurun bilib qoladi.
 * ============================================================
 */

const QORALAMA_KEY = 'bandlik_qoralama';
const NAVBAT_KEY = 'bandlik_navbat';

/**
 * Navbatdagi xatlovlarning eng ko'p soni.
 *
 * Bitta xatlov ~3 KB, localStorage odatda ~5 MB. Chegara texnik
 * emas, mantiqiy: bitta xodim bir kunda 30-40 xonadondan ortiq
 * ulgurmaydi, 200 tadan oshgani esa aloqa haftalab yo'q ekanini
 * bildiradi va bu holda administratorga xabar berish kerak.
 */
const MAX_NAVBAT = 200;

export interface NavbatYozuvi {
  localId: string;
  /** Yuboriladigan JSON */
  malumot: unknown;
  qoshilganVaqt: string;
  urinishlar: number;
  /**
   * ЁЗУВНИ КИМ ТЎЛДИРГАН — логини.
   *
   * ── Нима учун керак ──
   *
   * Телефон битта, ходим эса иккита бўлиши мумкин: аккумулятор
   * ўтирган, телефон синган, ходим касал — иккинчиси ўз ҳисоби
   * билан ҲАМКАСБИНИНГ телефонига киради.
   *
   * Навбат эса `localStorage` да ва у ҳисобга боғланмаган.
   * Илгари биринчи ходимнинг юборилмаган хатловлари иккинчиси
   * кирган заҳоти ЎЗИ жўнаб кетарди — сервер эса уларни
   * иккинчи ходимнинг иши деб ёзиб қўярди. Журналда нотўғри
   * исм, «ким хатлов қилди» деган саволга нотўғри жавоб.
   *
   * ── Эски ёзувлар ──
   *
   * Бу майдон қўшилгунга қадар навбатга тушганларда у йўқ
   * (`undefined`). Уларни ҳеч кимга ЁЗИБ бермаймиз: ходим
   * ўзи «бу менинг ишим» деб тасдиқласа, ўшанда эгаси
   * белгиланади.
   */
  egasi?: string;
  /**
   * ИДЕМПОТЕНТЛИК КАЛИТИ — сервер такрорни шундан таниди.
   *
   * `takrorKaliti` (манзил + оила бошлиғи) МАЗМУН калити:
   * иккита ҳар хил ходим бир хил хонадонни киритса ҳам у
   * бир хил чиқади. Бу эса ЮБОРИШ калити — ҳар бир хатлов
   * учун бир марта яратилади ва қайта юборишларда ўзгармайди.
   */
  kalit?: string;
  /**
   * Сервер «бу хонадон бошқа ёзувда бор» деди (409) ва у
   * ёзув БИЗНИКИ эмас. Мавжуд ёзувнинг `id` си — ходим
   * очиб солиштириши учун.
   */
  ziddiyat?: string;
  /**
   * Сервер «рухсат йўқ» деди (403): ҳуқуқ ёки ҳисоб ҳолати ўзгарган.
   * Анкетанинг ўзида хато йўқ — уни қайта-қайта юбориш бефойда,
   * текширувчи одам керак. Ёзув навбатда ҚОЛАДИ.
   */
  ruxsat?: boolean;
}

/**
 * Идемпотентлик калитини ясайди.
 *
 * `crypto.randomUUID` ХАВФСИЗ контекстда (https ёки
 * localhost) бор, аммо эски Android браузерларида йўқ ва
 * ундоқ жойда чақирув хато билан йиқилади. Захира варианти
 * криптографик эмас, лекин бу ерда шарт ҳам эмас: калит сир
 * эмас, у фақат ЎЗ юборишимизни таниш учун.
 */
export function kalitYasa(): string {
  try {
    const c = (globalThis as { crypto?: Crypto }).crypto;
    if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  } catch {
    /* захирага ўтамиз */
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

function xotiraBormi(): boolean {
  try {
    return typeof window !== 'undefined' && !!window.localStorage;
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────────────────────
//  QORALAMA
// ─────────────────────────────────────────────────────────────

/**
 * Qoralamani saqlaydi.
 * @returns saqlandimi - `false` bo'lsa foydalanuvchiga aytish SHART
 */
export function qoralamaSaqla(id: string, malumot: unknown, egasi?: string): boolean {
  if (!xotiraBormi()) return false;
  try {
    const barchasi = qoralamalarniOqi();
    barchasi[id] = { malumot, vaqt: new Date().toISOString(), egasi };
    window.localStorage.setItem(QORALAMA_KEY, JSON.stringify(barchasi));
    return true;
  } catch {
    return false;
  }
}

/**
 * Қоралама қанча яшайди.
 *
 * Телефонда ОЧИҚ МАТНДА исм, манзил, телефон, ногиронлик ва
 * даромад ётади. Ходим анкетани ташлаб кетган бўлса ҳам, у
 * йиллаб сақланиб қоларди: телефон сотилса, йўқолса ёки
 * бошқага берилса — маълумот у билан кетарди.
 *
 * Етти кун — амалий чегара: бир ҳафтада қайтиб келмаган
 * қораламадан фойда йўқ, ходим уни барибир бошидан
 * тўлдиради.
 *
 * Навбатга бу тегмайди: навбатдаги ёзув ТАЙЁР хатлов ва у
 * серверга етиб бориши керак. Унинг ўз чегараси бор —
 * `MAX_URINISH`.
 */
export const QORALAMA_KUNI = 7;

/** Ёзув эскирганми */
function eskirganmi(vaqt: string): boolean {
  const t = Date.parse(vaqt);
  if (Number.isNaN(t)) return true; // сана ўқилмаса — ишончсиз, ташланади
  return Date.now() - t > QORALAMA_KUNI * 24 * 60 * 60 * 1000;
}

export interface Qoralama {
  malumot: unknown;
  vaqt: string;
  /** Кимнинг қораламаси — логини. Эскиларида йўқ. */
  egasi?: string;
}

export function qoralamalarniOqi(): Record<string, Qoralama> {
  if (!xotiraBormi()) return {};
  try {
    const xom = window.localStorage.getItem(QORALAMA_KEY);
    if (!xom) return {};
    const parsed = JSON.parse(xom);
    if (!parsed || typeof parsed !== 'object') return {};

    /*
     * Эскиргани ЎҚИШДА тушиб қолади ва дарҳол ёзиб
     * қўйилади. Алоҳида «тозалагич» ёзиш ҳам мумкин эди,
     * лекин уни ишга тушириш керак бўларди — ва аввал ё
     * кечроқ кимдир чақиришни унутарди.
     */
    const toza: Record<string, Qoralama> = {};
    let tashlandi = 0;
    for (const [id, y] of Object.entries(parsed as Record<string, Qoralama>)) {
      if (y && typeof y === 'object' && !eskirganmi(y.vaqt)) toza[id] = y;
      else tashlandi++;
    }
    if (tashlandi > 0) {
      try {
        window.localStorage.setItem(QORALAMA_KEY, JSON.stringify(toza));
      } catch {
        /* ёзиб бўлмаса — ўқиганимиз барибир тоза */
      }
    }
    return toza;
  } catch {
    return {};
  }
}

/**
 * Қораламани ўқийди.
 *
 * `egasi` берилса ва ёзув БОШҚА ходимники бўлса — `null`.
 * Эгаси белгиланмаган эски ёзувлар ҳаммага очиқ қолади: улар
 * шу ўзгаришдан ОЛДИН ёзилган ва етти кунда ўзи тугайди
 * (`QORALAMA_KUNI`), ходимнинг ярим соатлик ишини эса
 * бекорга йўқотиб бўлмайди.
 */
export function qoralamaOqi<T>(id: string, egasi?: string): T | null {
  const y = qoralamalarniOqi()[id];
  if (!y) return null;
  if (egasi !== undefined && y.egasi !== undefined && y.egasi !== egasi) return null;
  return y.malumot as T;
}

export function qoralamaOchir(id: string): void {
  if (!xotiraBormi()) return;
  try {
    const barchasi = qoralamalarniOqi();
    delete barchasi[id];
    window.localStorage.setItem(QORALAMA_KEY, JSON.stringify(barchasi));
  } catch {
    /* xotira o'chirib bo'lmasa - zarari yo'q */
  }
}

// ─────────────────────────────────────────────────────────────
//  ҚОРАЛАМА КАЛИТЛАРИ — ҲАР ХОДИМГА, ҲАР АНКЕТАГА АЛОҲИДА
// ─────────────────────────────────────────────────────────────

/**
 * Эски, УМУМИЙ калит.
 *
 * Бутун илова битта `joriy-xatlov` калитидан фойдаланарди.
 * Яъни:
 *
 *   · иккинчи ходим кирса, унинг автосақлаши БИРИНЧИСИНИНГ
 *     қораламасини босиб ўтарди (эгаси текширилса ҳам —
 *     текширув ЎҚИШДА эди, ЁЗИШДА эмас);
 *   · битта ходим иккита анкетани параллел тўлдиролмасди:
 *     иккинчиси биринчисини ўчирарди.
 *
 * Калит ҚОЛДИРИЛДИ: хатлов ҲОЗИР кетмоқда ва дала
 * телефонларида шу калит остида тўлдирилаётган анкета бор.
 * Уларни йўқотиб бўлмайди — улар ҳам рўйхатда кўринади.
 */
export const ESKI_QORALAMA_KALITI = 'joriy-xatlov';

/** Янги калитларнинг боши */
const QORALAMA_BOSHI = 'xatlov:';

/**
 * Битта қораламанинг калити.
 *
 * Шакли: `xatlov:<ходим>:<қоралама>`. Эгаси калитнинг
 * ЎЗИДА турибди — бошқа ходимнинг автосақлаши бу калитга
 * умуман тегмайди.
 */
export function qoralamaKaliti(egasi: string, qoralamaId: string): string {
  return `${QORALAMA_BOSHI}${egasi}:${qoralamaId}`;
}

/** Янги қоралама учун ID */
export function qoralamaIdYasa(): string {
  return kalitYasa();
}

/**
 * Битта телефонда битта ходимга нечта қоралама сақланади.
 *
 * Телефонда ОЧИҚ МАТНДА исм, манзил, телефон ва даромад
 * ётади. Чегарасиз бўлса, улар ойлаб тўпланиб борарди.
 *
 * Йигирма — амалий чегара: ходим бир вақтда шунчасини
 * тўлдириб юрмайди. Ошса, ЭНГ ЭСКИСИ тушиб қолади.
 */
export const MAX_QORALAMA = 20;

export interface QoralamaYozuvi {
  /** Тўлиқ калит — ўчириш ва давом эттириш учун */
  kalit: string;
  malumot: unknown;
  vaqt: string;
  /** Эгаси белгиланмаган эски ёзувми */
  eskimi: boolean;
}

/**
 * ЖОРИЙ ХОДИМНИНГ қораламалари, янгисидан эскисига.
 *
 * Эгаси белгиланмаган эски ёзув ҳам киради ва `eskimi`
 * билан белгиланади: у шу ўзгаришдан ОЛДИН ёзилган ва
 * кимники эканини билиб бўлмайди. Ходим уни кўрсин —
 * ташлаб юбориш унинг ишини йўқотиш бўларди.
 */
export function qoralamalarim(egasi: string): QoralamaYozuvi[] {
  const barchasi = qoralamalarniOqi();
  const meniki: QoralamaYozuvi[] = [];

  for (const [kalit, y] of Object.entries(barchasi)) {
    const eskimi = y.egasi === undefined;
    if (!eskimi && y.egasi !== egasi) continue;
    /* Бошқа ходимнинг янги калити — номи бўйича ҳам чиқариб ташлаймиз */
    if (kalit.startsWith(QORALAMA_BOSHI) && !kalit.startsWith(`${QORALAMA_BOSHI}${egasi}:`)) {
      continue;
    }
    meniki.push({ kalit, malumot: y.malumot, vaqt: y.vaqt, eskimi });
  }

  return meniki.sort((a, b) => (a.vaqt < b.vaqt ? 1 : -1));
}

/**
 * Чегарадан ошган ЭНГ ЭСКИ қораламаларни ўчиради.
 *
 * Сақлашдан кейин чақирилади. Ўчирилганлар сони
 * қайтарилади — чақирувчи ходимга айтиши учун.
 */
export function qoralamalarniChekla(egasi: string): number {
  const meniki = qoralamalarim(egasi).filter((y) => !y.eskimi);
  if (meniki.length <= MAX_QORALAMA) return 0;
  const ortiqcha = meniki.slice(MAX_QORALAMA);
  for (const y of ortiqcha) qoralamaOchir(y.kalit);
  return ortiqcha.length;
}

// ─────────────────────────────────────────────────────────────
//  NAVBAT
// ─────────────────────────────────────────────────────────────

export function navbatniOqi(): NavbatYozuvi[] {
  if (!xotiraBormi()) return [];
  try {
    const xom = window.localStorage.getItem(NAVBAT_KEY);
    if (!xom) return [];
    const parsed = JSON.parse(xom);
    return Array.isArray(parsed) ? (parsed as NavbatYozuvi[]) : [];
  } catch {
    return [];
  }
}

function navbatYoz(navbat: NavbatYozuvi[]): boolean {
  try {
    window.localStorage.setItem(NAVBAT_KEY, JSON.stringify(navbat));
    return true;
  } catch {
    return false;
  }
}

export type NavbatNatijasi =
  | { ok: true }
  | { ok: false; sabab: 'xotira-yoq' | 'navbat-toldi' | 'yozib-bolmadi' };

/**
 * Xatlovni navbatga qo'shadi.
 *
 * @param egasi  ходимнинг логини — ёзув ЎШАНИКИ бўлиб қолади
 * @param kalit  идемпотентлик калити (сервер такрорни шундан таниди)
 */
export function navbatgaQosh(
  malumot: unknown,
  egasi?: string,
  kalit?: string
): NavbatNatijasi {
  if (!xotiraBormi()) return { ok: false, sabab: 'xotira-yoq' };

  const navbat = navbatniOqi();
  if (navbat.length >= MAX_NAVBAT) return { ok: false, sabab: 'navbat-toldi' };

  navbat.push({
    localId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    malumot,
    qoshilganVaqt: new Date().toISOString(),
    urinishlar: 0,
    ...(egasi ? { egasi } : {}),
    ...(kalit ? { kalit } : {}),
  });

  return navbatYoz(navbat) ? { ok: true } : { ok: false, sabab: 'yozib-bolmadi' };
}

/**
 * ── КИМНИКИ ──
 *
 * Учта гуруҳ бўлади ва учовига муносабат ҳар хил:
 *
 *   · МЕНИКИ    — ўзи юборилади;
 *   · БЕГОНА    — бошқа ходимнинг иши. ТЕГМАЙМИЗ ва
 *                 ўчирмаймиз: эгаси кирганда ўзи юборади;
 *   · ЭГАСИЗ    — бу майдон қўшилгунча ёзилганлар. Ходим
 *                 «бу менинг ишим» деб тасдиқласа юборилади.
 */
export function meniki(navbat: NavbatYozuvi[], egasi: string): NavbatYozuvi[] {
  return navbat.filter((y) => y.egasi === egasi);
}

export function begona(navbat: NavbatYozuvi[], egasi: string): NavbatYozuvi[] {
  return navbat.filter((y) => y.egasi !== undefined && y.egasi !== egasi);
}

export function egasiz(navbat: NavbatYozuvi[]): NavbatYozuvi[] {
  return navbat.filter((y) => y.egasi === undefined);
}

/**
 * Эгасиз ёзувларни жорий ходимга ёзиб беради.
 *
 * Фақат ходим ЎЗИ тасдиқлаганда чақирилади — автоматик эмас.
 * Акс ҳолда бу майдоннинг умуман маъноси қолмасди.
 */
export function egasizlarniOlish(egasi: string): number {
  if (!xotiraBormi()) return 0;
  const navbat = navbatniOqi();
  let olindi = 0;
  const yangi = navbat.map((y) => {
    if (y.egasi !== undefined) return y;
    olindi++;
    return { ...y, egasi };
  });
  if (olindi > 0) navbatYoz(yangi);
  return olindi;
}

export function navbatdanOchir(localId: string): void {
  if (!xotiraBormi()) return;
  navbatYoz(navbatniOqi().filter((y) => y.localId !== localId));
}

export function urinishBelgila(localId: string): void {
  if (!xotiraBormi()) return;
  navbatYoz(
    navbatniOqi().map((y) =>
      y.localId === localId ? { ...y, urinishlar: y.urinishlar + 1 } : y
    )
  );
}

/**
 * Bitta yozuvni yuborishga urinish natijasi.
 *
 * Nega oddiy `boolean` emas: "yuborilmadi" ning UCH XIL sababi
 * bor va ularga munosabat ham har xil bo'lishi kerak.
 *
 *  · `saqlandi`  - server qabul qildi, navbatdan chiqariladi;
 *  · `takror`    - сервер «бу ЁЗУВНИ аллақачон қабул қилганман»
 *                  деди. Яъни ўзимизнинг олдинги юборишимиз
 *                  ўтиб кетган, фақат жавоби келмаган. Ёзув
 *                  жойида — навбатдан чиқарамиз;
 *  · `ziddiyat`  - сервер «бу манзил ва оила бошлиғи бўйича
 *                  ёзув бор, лекин у СЕНИКИ эмас» деди (409).
 *                  Буни муваффақият деб ҳисоблаб бўлмайди:
 *                  бизнинг ёзувимиз ҲЕЧ ҚАЕРГА сақланмади.
 *                  Навбатда қолади ва ходимга кўрсатилади —
 *                  иккита ёзувни солиштириш ОДАМНИНГ иши;
 *  · `yaroqsiz`  - ma'lumotda xato bor (400). Qayta-qayta
 *                  yuborish foydasiz, lekin O'CHIRIB HAM
 *                  BO'LMAYDI: bu xodimning bir soatlik ishi.
 *                  Navbatda qoladi va xodimga ko'rsatiladi;
 *  · `qayta-kirish` - sessiya tugagan (401). Anketa YAROQSIZ EMAS:
 *                  urinish hisoblanmaydi, qolganlariga urinish ham
 *                  behuda (hammasi 401 oladi) - to'xtaymiz va xodimga
 *                  "qayta kiring" deymiz;
 *  · `ruxsat`    - huquq yoki hisob holati o'zgargan (403). Anketani
 *                  tuzatish foydasiz; navbatda qoladi, urinish
 *                  hisoblanmaydi, odam tekshiradi. Qolganlari davom etadi;
 *  · `aloqa-yoq` - tarmoq yo'q yoki server javob bermadi.
 *                  Qolganlariga urinish ham behuda - to'xtaymiz.
 *
 *  ── НЕГА `takror` ва `ziddiyat` АЖРАТИЛДИ ──
 *
 *  Илгари 409 нинг ҳаммаси `takror` эди ва ёзув навбатдан
 *  ЎЧИРИЛАРДИ. Бир хил манзилда иккита ҳақиқий оила яшаса
 *  ёки ҳамкасб ўша хонадонни аввалроқ киритган бўлса,
 *  ходимнинг бир соатлик иши ЖИМГИНА йўқоларди — экранда эса
 *  «юборилди» деб ёзиларди.
 *
 *  Энди фарқни СЕРВЕР қилади: юборишда идемпотентлик калити
 *  кетади ва сервер «бу ўша калит» деса — ростдан ҳам
 *  такрор; калит бошқа бўлса — зиддият.
 */
export type YuborishNatijasi =
  | 'saqlandi'
  | 'takror'
  | 'ziddiyat'
  | 'yaroqsiz'
  | 'qayta-kirish'
  | 'ruxsat'
  | 'aloqa-yoq';

/**
 * Shundan ortiq urinishdan keyin yozuv "e'tibor talab qiladi"
 * deb belgilanadi va avtomatik yuborishga qo'shilmaydi.
 *
 * Chegara bo'lmasa, ma'lumoti buzuq bitta yozuv har safar
 * navbatni to'sib turardi va orqasidagilar yuborilmasdi.
 */
export const MAX_URINISH = 5;

/**
 * Yozuv avtomatik yuborishga yaroqlimi.
 *
 * Зиддиятга тушган ёзув қайта юборилмайди: сервер уни ҳар
 * сафар бир хил рад этади, навбат эса ҳар гал шу ердан
 * тўсилиб турарди.
 */
export function avtomatikYuboriladimi(y: NavbatYozuvi): boolean {
  return y.urinishlar < MAX_URINISH && !y.ziddiyat && !y.ruxsat;
}

/** Ходим кўриб чиқиши керак бўлган ёзув */
export function etiborTalabQiladi(y: NavbatYozuvi): boolean {
  return !avtomatikYuboriladimi(y);
}

/** Зиддиятни ёзиб қўяди — ёзув навбатда ҚОЛАДИ */
export function ziddiyatBelgila(localId: string, mavjudId: string): void {
  if (!xotiraBormi()) return;
  navbatYoz(
    navbatniOqi().map((y) =>
      y.localId === localId ? { ...y, ziddiyat: mavjudId || 'nomalum' } : y
    )
  );
}

/** «Рухсат йўқ» (403) ни ёзиб қўяди — ёзув навбатда ҚОЛАДИ, уриниш ҳисобланмайди */
export function ruxsatBelgila(localId: string): void {
  if (!xotiraBormi()) return;
  navbatYoz(navbatniOqi().map((y) => (y.localId === localId ? { ...y, ruxsat: true } : y)));
}

/**
 * Ходим «Ҳозир юбориш» ни ўзи босганда: рухсат йўқ деб белгиланган ЎЗ
 * ёзувларидан белгини олади. Администратор ҳисобни тузатган бўлиши
 * мумкин; белги ёзув ўзи тузалмагунча олинмаса, анкета абадий қотиб
 * қоларди. Автоматик юборишда белги ОЛИНМАЙДИ — у ҳар кириш сайин
 * бир хил 403 олиб турмайди.
 */
export function ruxsatBelgisiniOl(egasi: string): number {
  if (!xotiraBormi()) return 0;
  let n = 0;
  navbatYoz(
    navbatniOqi().map((y) => {
      if (y.ruxsat && y.egasi === egasi) {
        n++;
        return { ...y, ruxsat: undefined };
      }
      return y;
    })
  );
  return n;
}

export interface NavbatNatijalari {
  /** Serverga yangi yozilganlar */
  yuborildi: number;
  /** Server «бу ёзувни аллақачон олганман» деди — улар ҳам жойида */
  takror: number;
  /** Бошқа ёзув билан тўқнашди — ходим кўриб чиқиши керак */
  ziddiyat: number;
  /** Navbatda qolgani (ФАҚАТ ўзиники) */
  qoldi: number;
  /** E'tibor talab qiladiganlar (urinish chegarasidan oshgan yoki ziddiyatli) */
  etibor: number;
  /** Aloqa yo'qligi sababli to'xtadimi */
  aloqaYoq: boolean;
  /** Sessiya tugagani (401) sababli to'xtadimi - xodim qayta kirishi kerak */
  qaytaKirish: boolean;
  /** Huquq/hisob holati (403) tufayli o'tmaganlar - odam tekshiradi */
  ruxsat: number;
}

/**
 * Битта ёзувни юбориш натижаси.
 *
 * Зиддиятда мавжуд ёзувнинг `id` си ҳам қайтади — ходим
 * иккисини солиштириши учун ҳавола ясалади.
 */
export interface BittaNatija {
  holat: YuborishNatijasi;
  mavjudId?: string | null;
}

/**
 * Navbatni serverga yuborishga urinadi.
 *
 * ФАҚАТ `egasi` га тегишли ёзувлар юборилади. Бошқа
 * ходимнинг иши ҳам, эгасиз эски ёзувлар ҳам тегилмайди:
 * уларни бу ҳисоб номидан жўнатиш — журналга ёлғон ёзиш
 * дегани.
 *
 * @param yubor bitta yozuvni yuboradigan funksiya
 * @param egasi ходимнинг логини
 */
export async function navbatniYubor(
  yubor: (malumot: unknown, yozuv: NavbatYozuvi) => Promise<YuborishNatijasi | BittaNatija>,
  egasi?: string
): Promise<NavbatNatijalari> {
  const hammasi = navbatniOqi();
  const mening = egasi === undefined ? hammasi : meniki(hammasi, egasi);
  const navbat = mening.filter(avtomatikYuboriladimi);

  let yuborildi = 0;
  let takror = 0;
  let ziddiyat = 0;
  let ruxsat = 0;
  let aloqaYoq = false;
  let qaytaKirish = false;

  for (const yozuv of navbat) {
    let javob: YuborishNatijasi | BittaNatija;
    try {
      javob = await yubor(yozuv.malumot, yozuv);
    } catch {
      javob = 'aloqa-yoq';
    }
    const natija = typeof javob === 'string' ? javob : javob.holat;
    const mavjudId = typeof javob === 'string' ? null : (javob.mavjudId ?? null);

    if (natija === 'saqlandi' || natija === 'takror') {
      navbatdanOchir(yozuv.localId);
      if (natija === 'takror') takror++;
      else yuborildi++;
      continue;
    }

    if (natija === 'ziddiyat') {
      /*
       * Ёзув НАВБАТДА ҚОЛАДИ. Уринишлар сонини ҳам
       * оширмаймиз: зиддият «ҳали етиб бормади» эмас,
       * «одам қарамагунча ҳал бўлмайди» дегани.
       */
      ziddiyatBelgila(yozuv.localId, mavjudId ?? '');
      ziddiyat++;
      continue;
    }

    if (natija === 'qayta-kirish') {
      /*
       * Sessiya tugagan. Anketada xato yo'q, shuning uchun urinish
       * HISOBLANMAYDI (aks holda besh marta ochilgan sahifa ishlaydigan
       * anketani "e'tibor talab qiladi"ga aylantirardi). Qolgan yozuvlar
       * ham xuddi shu 401 ni oladi - to'xtaymiz.
       */
      qaytaKirish = true;
      break;
    }

    if (natija === 'ruxsat') {
      ruxsatBelgila(yozuv.localId);
      ruxsat++;
      continue;
    }

    urinishBelgila(yozuv.localId);
    if (natija === 'aloqa-yoq') {
      aloqaYoq = true;
      break;
    }
  }

  const qolgan = egasi === undefined ? navbatniOqi() : meniki(navbatniOqi(), egasi);
  return {
    yuborildi,
    takror,
    ziddiyat,
    qoldi: qolgan.length,
    etibor: qolgan.filter(etiborTalabQiladi).length,
    aloqaYoq,
    qaytaKirish,
    ruxsat,
  };
}

/**
 * ТИЗИМДАН ЧИҚҚАНДА телефон хотирасини тозалайди.
 *
 * Сессия 12 соат яшайди, `localStorage` эса МУДДАТСИЗ.
 * Яъни ходим чиқиб кетса ҳам, унинг телефонида хонадонлар
 * маълумоти қолаверарди — кейинги эгасига ҳам, топиб олган
 * одамга ҳам.
 *
 * НАВБАТ ЮБОРИЛМАГАН бўлса тегилмайди: у тайёр хатлов ва
 * уни ўчириш ходимнинг бир соатлик ишини йўқотарди. Функция
 * нечта ёзув қолганини қайтаради — чақирувчи ходимни
 * огоҳлантириши учун.
 */
export function chiqishdaTozala(egasi?: string): { qoralama: number; navbat: number } {
  if (!xotiraBormi()) return { qoralama: 0, navbat: 0 };

  let qoralama = 0;
  try {
    const barchasi = qoralamalarniOqi();
    /*
     * ФАҚАТ чиқаётган ходимнинг қораламалари ўчирилади.
     * Ҳамкасбининг ярим тўлдирилган анкетаси телефонда
     * қолиши керак — уни ўчириш ҳам маълумотни йўқотиш.
     *
     * Эгаси белгиланмаган эски ёзувлар ҳам ўчирилади: улар
     * шу ўзгаришдан олдин ёзилган ва қайси ҳисобга
     * тегишлилиги номаълум — телефонда очиқ матнда исм,
     * манзил ва даромад бўлиб қолгандан кўра ўчгани яхши.
     */
    const qoladigan: Record<string, Qoralama> = {};
    for (const [id, y] of Object.entries(barchasi)) {
      if (egasi !== undefined && y.egasi !== undefined && y.egasi !== egasi) {
        qoladigan[id] = y;
      } else {
        qoralama++;
      }
    }
    if (Object.keys(qoladigan).length === 0) window.localStorage.removeItem(QORALAMA_KEY);
    else window.localStorage.setItem(QORALAMA_KEY, JSON.stringify(qoladigan));
  } catch {
    /* ўчириб бўлмаса — зарари йўқ */
  }

  let navbat = 0;
  try {
    const hammasi = navbatniOqi();
    navbat = egasi === undefined ? hammasi.length : meniki(hammasi, egasi).length;
    if (hammasi.length === 0) window.localStorage.removeItem(NAVBAT_KEY);
  } catch {
    /* ўқиб бўлмаса — навбат ҳам йўқ деб ҳисоблаймиз */
  }
  return { qoralama, navbat };
}
