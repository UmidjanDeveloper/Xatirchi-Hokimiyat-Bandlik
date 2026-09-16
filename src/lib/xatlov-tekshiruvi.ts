/**
 * ============================================================
 *  XATLOV ARIFMETIKASI
 *
 *  Bu modul platformaning eng muhim farqi.
 *
 *  Qog'oz anketa ham, Google Forma ham raqamlarni tekshirmaydi.
 *  Xodim kun oxirida yigirmanchi xonadonda shoshib "5 ta ayol,
 *  4 ta erkak, jami 12 kishi" deb yozadi va forma qabul qiladi.
 *  Keyin hokim paneli o'sha raqamlar ustiga quriladi.
 *
 *  Bu yerda esa forma yubormaydi: qaysi ikki raqam bir-biriga
 *  to'g'ri kelmayotganini aniq ko'rsatadi va xodim o'sha
 *  xonadonda turib tuzatadi. Keyin tuzatib bo'lmaydi - xonadon
 *  egasi bilan qayta uchrashish kerak bo'ladi.
 *
 *  Ikki daraja bor:
 *    XATO           - yuborishga yo'l qo'yilmaydi. Faqat mantiqan
 *                     mumkin bo'lmagan holatlar (qism butundan katta).
 *    OGOHLANTIRISH  - yuborsa bo'ladi, lekin xodim bir qarab
 *                     chiqsin. Kam uchraydigan, ammo mumkin holatlar.
 *
 *  Ikkovini ajratish muhim: har bir g'alati raqamni bloklasak,
 *  xodim haqiqatan ham katta oilani yoki nol daromadli xonadonni
 *  kirita olmay qoladi va soxta raqam yozib qutuladi.
 * ============================================================
 */

export interface Nosozlik {
  /** Formadagi maydon nomi - xatoni o'sha joyga ko'rsatish uchun */
  maydon: string;
  xabar: string;
}

export interface TekshiruvHisoboti {
  xatolar: Nosozlik[];
  ogohlantirishlar: Nosozlik[];
  /** Yuborish mumkinmi */
  ok: boolean;
}

/** Tekshiruvga tushadigan raqamli maydonlar */
export interface XatlovRaqamlari {
  jamiAzo?: number | null;
  bolalarSoni?: number | null;
  mehnatgaLayoqatli?: number | null;
  /** Иш ёшида, аммо ишлай олмайди — бандлик тенгламасига кирмайди */
  mehnatgaLayoqatsiz?: number | null;
  ishlaydiganlar?: number | null;
  davlatKorxonada?: number | null;
  xususiySektorda?: number | null;
  ishsizlarSoni?: number | null;
  bogchaKutayotganAyollar?: number | null;

  bolalar0_3Yosh?: number | null;
  bolalar3_17Yosh?: number | null;
  bolalar18Yoshdan?: number | null;
  maktabgachaYoshdagi?: number | null;
  maktabgachaQamrovda?: number | null;
  maktabYoshdagi?: number | null;
  maktabQamrovda?: number | null;
  togarakQamrovi?: number | null;


  moliyaEhtiyoji?: boolean | null;
  talabQilinganMablag?: number | bigint | null;
  tomorqaBor?: boolean | null;
  chorvaBor?: boolean | null;
  chorvaTurlari?: string[] | null;
  hunarmandBor?: boolean | null;
  hunarTurlari?: string[] | null;
  hunarmandchilik?: string | null;
  ekinMaydoni?: number | null;
  tomorqaFoydalanish?: string | null;
  qoshimchaYerBor?: boolean | null;
  qoshimchaYerMaydoni?: number | null;
  issiqxonaTalabi?: boolean | null;
  issiqxonaMaydoni?: number | null;
  ijaraYer?: boolean | null;
  ijaraYerMaydoni?: number | null;
  oylikDaromad?: number | bigint | null;

  nogironlikBor?: boolean | null;
  nogironlikIzoh?: string | null;
  uzoqDavolanish?: boolean | null;
  uzoqDavolanishIzoh?: string | null;
}

/** `null`/`undefined` ni 0 deb oladi */
const n = (x?: number | null): number => (typeof x === 'number' && !Number.isNaN(x) ? x : 0);
const b = (x?: number | bigint | null): number => (x == null ? 0 : Number(x));

/**
 * Xatlov raqamlarining ichki mantiqini tekshiradi.
 *
 * Har bir qoida ostida NEGA shunday ekani yozilgan - keyinchalik
 * kimdir qoidani "ortiqcha" deb olib tashlamasligi uchun.
 */
export function xatlovTekshir(d: XatlovRaqamlari): TekshiruvHisoboti {
  const xatolar: Nosozlik[] = [];
  const ogohlantirishlar: Nosozlik[] = [];

  const xato = (maydon: string, xabar: string) => xatolar.push({ maydon, xabar });
  const ogoh = (maydon: string, xabar: string) => ogohlantirishlar.push({ maydon, xabar });

  const jami = n(d.jamiAzo);
  const bolalar = n(d.bolalarSoni);
  const layoqatli = n(d.mehnatgaLayoqatli);
  const layoqatsiz = n(d.mehnatgaLayoqatsiz);
  const ishlaydi = n(d.ishlaydiganlar);
  const davlat = n(d.davlatKorxonada);
  const xususiy = n(d.xususiySektorda);
  const ishsiz = n(d.ishsizlarSoni);

  // ── Xonadon tarkibi ──────────────────────────────────────

  /*
   * Diqqat: "jamiAzo bo'sh" tekshiruvi BU YERDA EMAS.
   *
   * Bu modul faqat raqamlar bir-biriga mos kelishini tekshiradi va
   * uning natijasi formada JONLI ko'rsatiladi. Majburiy maydon
   * tekshiruvini ham shu yerga qo'shsak, xodim sahifani ochishi
   * bilan bo'sh formada qizil xato paydo bo'ladi - go'yo u
   * allaqachon xato qilgandek. Majburiy maydonlar yuborish
   * paytida tekshiriladi.
   */

  /*
   * ── ЁШ ГУРУҲЛАРИ БУТУНГА МОС КЕЛСИНМИ ──
   *
   * 0-3 ва 3-17 иккови ҳам 18 ёшгача, яъни уларнинг йиғиндиси
   * «болалар сони» дан ошиб кетмаслиги керак. 18 дан катта
   * фарзанд эса болалар ичига КИРМАЙДИ — у алоҳида ҳисобланади
   * ва бу текширувга аралашмайди.
   *
   * Тенг бўлмаслиги МУМКИН: ходим болалар сонини билиб, ёш
   * тақсимотини аниқлаштиролмаган бўлиши мумкин. Шунинг учун
   * ошиб кетиши — ХАТО, кам бўлиши — ОГОҲЛАНТИРИШ.
   */
  const yosh0_3 = n(d.bolalar0_3Yosh);
  const yosh3_17 = n(d.bolalar3_17Yosh);
  const yoshJami = yosh0_3 + yosh3_17;

  if (yoshJami > bolalar) {
    xato(
      'bolalar0_3Yosh',
      `Ёш гуруҳлари йиғиндиси ${yoshJami} та, болалар сони эса ${bolalar} та. Улар ошиб кетмаслиги керак.`
    );
  } else if (bolalar > 0 && yoshJami > 0 && yoshJami < bolalar) {
    ogoh(
      'bolalar3_17Yosh',
      `${bolalar} та боладан ${yoshJami} тасининг ёш гуруҳи кўрсатилган. Қолгани қайси гуруҳга киришини аниқланг.`
    );
  }

  if (bolalar > jami) {
    xato(
      'bolalarSoni',
      `Болалар сони (${bolalar}) хонадондаги умумий аъзолар сонидан (${jami}) кўп бўлиши мумкин эмас`
    );
  }

  if (layoqatli > jami) {
    xato(
      'mehnatgaLayoqatli',
      `Меҳнатга лаёқатлилар (${layoqatli}) умумий аъзолар сонидан (${jami}) кўп бўлиши мумкин эмас`
    );
  }

  /*
   * 18 ёшгача бола меҳнатга лаёқатли эмас; меҳнатга лаёқатсиз
   * одам ҳам лаёқатлилар ичида эмас. Учовининг йиғиндиси
   * хонадон аъзоларидан ошиб кетолмайди — акс ҳолда битта
   * одам икки марта саналган.
   */
  if (bolalar + layoqatli + layoqatsiz > jami) {
    const yigindi = bolalar + layoqatli + layoqatsiz;
    xato(
      'mehnatgaLayoqatli',
      layoqatsiz > 0
        ? `Болалар (${bolalar}), меҳнатга лаёқатлилар (${layoqatli}) ва лаёқатсизлар (${layoqatsiz}) жами ${yigindi} — бу хонадондаги ${jami} кишидан кўп`
        : `Болалар (${bolalar}) ва меҳнатга лаёқатлилар (${layoqatli}) жами ${yigindi} — бу хонадондаги ${jami} кишидан кўп`
    );
  }

  // ── I bo'lim: bandlik ────────────────────────────────────

  /*
   * Ишлайдиган ва ишсиз — иккови ҳам МЕҲНАТГА ЛАЁҚАТЛИ одам.
   * Лаёқатсизлар бу тенгламага кирмайди.
   *
   * Хато матни энди ЙЎЛ ҲАМ КЎРСАТАДИ. Аввал у фақат
   * «мос келмади» деб турарди ва дала ходими нима қилишни
   * билмасди: хонадонда иш ёшидаги, аммо ишлай олмайдиган
   * одам бор эди — уни «ишсиз» деб ёзарди ва анкета рад
   * этарди. Энди хабарнинг ўзи «Меҳнатга лаёқатсизлар»
   * катагини кўрсатади.
   */
  if (ishlaydi + ishsiz > layoqatli) {
    xato(
      'ishsizlarSoni',
      `Ишлайдиганлар (${ishlaydi}) ва ишсизлар (${ishsiz}) жами ${ishlaydi + ishsiz} — бу меҳнатга лаёқатлилар сонидан (${layoqatli}) кўп. ` +
        `Агар улардан бири иш ёшида бўлса-ю, ишлай олмаса (ногиронлик, касаллик), уни «Меҳнатга лаёқатсизлар сони» катагига ёзинг — у ишсизлар қаторига кирмайди.`
    );
  }

  // Davlat va xususiy sektor - ishlayotganlarning to'liq taqsimoti.
  // Yig'indi kamroq bo'lsa, qayerda ishlashi noma'lum qolgan odam bor;
  // ko'proq bo'lsa - bir odam ikki joyda sanalgan.
  if (davlat + xususiy > ishlaydi) {
    xato(
      'xususiySektorda',
      `Давлат (${davlat}) ва хусусий секторда (${xususiy}) жами ${davlat + xususiy} — бу ишлайдиганлар сонидан (${ishlaydi}) кўп`
    );
  } else if (ishlaydi > 0 && davlat + xususiy < ishlaydi) {
    ogoh(
      'xususiySektorda',
      `${ishlaydi} киши ишлайди, лекин фақат ${davlat + xususiy} тасининг иш жойи кўрсатилган`
    );
  }

  /*
   * ── БУ ҚОИДА НОТЎҒРИ ЭДИ ──
   *
   * Илгари шундай ёзилганди: «боғча кутаётган аёллар ишсизлар
   * сонидан кўп бўлиши мумкин эмас». Дала буни рад этди.
   *
   * Уч ёшгача бола билан уйда ўтирган аёл ИШСИЗЛАР РЎЙХАТИДА
   * бўлиши шарт эмас: у иш қидирмайди, бандлик марказига
   * мурожаат қилмаган ва ходим уни «ишсиз» деб ёзмайди.
   * Иккови икки хил рўйхат эди, қоида эса уларни бир деб
   * ҳисоблади.
   *
   * Натижа: хонадонда битта шундай аёл бўлса, анкета БУТУНЛАЙ
   * ёпилиб қоларди ва маҳалла ходими хатловни тугата олмасди.
   * Ҳақиқий маълумот тизимга кирмади.
   *
   * Ўрнига ҲАҚИҚАТАН мумкин бўлмаган чегара қолди: хонадонда
   * неча киши бўлса, боғча кутаётган аёл ундан кўп бўлолмайди.
   */
  if (n(d.bogchaKutayotganAyollar) > jami && jami > 0) {
    xato(
      'bogchaKutayotganAyollar',
      `Боғча кутаётган аёллар (${n(d.bogchaKutayotganAyollar)}) хонадондаги аъзолар сонидан (${jami}) кўп бўлиши мумкин эмас`
    );
  }

  // ── IV bo'lim: bolalar ta'limi ───────────────────────────

  const maktabgacha = n(d.maktabgachaYoshdagi);
  const maktabYosh = n(d.maktabYoshdagi);

  if (n(d.maktabgachaQamrovda) > maktabgacha) {
    xato(
      'maktabgachaQamrovda',
      `Боғчага қатнайдиганлар (${n(d.maktabgachaQamrovda)}) мактабгача ёшдаги болалар сонидан (${maktabgacha}) кўп бўлиши мумкин эмас`
    );
  }

  if (n(d.maktabQamrovda) > maktabYosh) {
    xato(
      'maktabQamrovda',
      `Мактабга қатнайдиганлар (${n(d.maktabQamrovda)}) мактаб ёшидаги болалар сонидан (${maktabYosh}) кўп бўлиши мумкин эмас`
    );
  }

  if (n(d.togarakQamrovi) > maktabgacha + maktabYosh) {
    xato(
      'togarakQamrovi',
      `Тўгаракка қатнайдиганлар (${n(d.togarakQamrovi)}) хонадондаги болалар сонидан кўп бўлиши мумкин эмас`
    );
  }

  if (maktabgacha + maktabYosh > bolalar) {
    xato(
      'maktabYoshdagi',
      `Мактабгача (${maktabgacha}) ва мактаб ёшидаги (${maktabYosh}) болалар жами ${maktabgacha + maktabYosh} — бу хонадондаги болалар сонидан (${bolalar}) кўп`
    );
  }

  // Maktab yoshidagi bola maktabga bormasa - bu jiddiy signal,
  // lekin haqiqat bo'lishi mumkin. Bloklamaymiz, ko'rsatamiz.
  if (maktabYosh > 0 && n(d.maktabQamrovda) < maktabYosh) {
    ogoh(
      'maktabQamrovda',
      `${maktabYosh - n(d.maktabQamrovda)} та мактаб ёшидаги бола таълим билан қамраб олинмаган — сабабини изоҳда ёзинг`
    );
  }

  // ── X bo'lim: tadbirkorlik subyektlari ───────────────────


  // ── II bo'lim: moliya ────────────────────────────────────

  if (d.moliyaEhtiyoji && b(d.talabQilinganMablag) <= 0) {
    xato(
      'talabQilinganMablag',
      'Молиявий эҳтиёж белгиланган — талаб қилинадиган маблағ миқдорини киритинг'
    );
  }

  if (!d.moliyaEhtiyoji && b(d.talabQilinganMablag) > 0) {
    xato(
      'talabQilinganMablag',
      'Маблағ миқдори киритилган, лекин молиявий эҳтиёж «йўқ» деб белгиланган'
    );
  }

  // Byudjet rejasiga kiradigan raqam, shuning uchun aniq bo'lishi kerak.
  if (b(d.talabQilinganMablag) > 5_000_000_000) {
    ogoh(
      'talabQilinganMablag',
      'Талаб қилинган маблағ 5 млрд сўмдан кўп — рақамни текширинг'
    );
  }

  // ── IX bo'lim: yer va tomorqa ────────────────────────────

  /*
   * Chorva yoki hunarmandchilik "bor" deb belgilangan bo'lsa,
   * turi ham tanlanishi kerak - aks holda yozuvdan foyda yo'q:
   * "chorvasi bor" degan raqamni rejaga qo'sha olmaymiz, lekin
   * "12 ta yirik shoxli" degan ma'lumot bilan ish ko'rish mumkin.
   */
  if (d.chorvaBor && !(d.chorvaTurlari ?? []).length) {
    xato('chorvaTurlari', 'Чорвачилик бор деб белгиланган — турини танланг');
  }
  if (d.hunarmandBor && !(d.hunarTurlari ?? []).length) {
    xato('hunarTurlari', 'Ҳунармандчилик бор деб белгиланган — йўналишини танланг');
  }
  if ((d.hunarTurlari ?? []).includes('Boshqa') && !d.hunarmandchilik?.trim()) {
    xato('hunarmandchilik', '«Бошқа» танланган — қайси ҳунар эканини ёзинг');
  }

  if (d.tomorqaBor && n(d.ekinMaydoni) <= 0) {
    xato('ekinMaydoni', 'Ер бор деб белгиланган — экин экиладиган майдонни киритинг');
  }
  if (!d.tomorqaBor && n(d.ekinMaydoni) > 0) {
    xato('ekinMaydoni', 'Экин майдони киритилган, лекин «ер йўқ» деб белгиланган');
  }
  /*
   * Майдон сони ЕТМАЙДИ: ўша 10 сотих тўлиқ экилган ҳам,
   * ташлаб қўйилган ҳам бўлиши мумкин. Баҳо кесмага тушади ва
   * кейинги хатловда таққосланади — шунинг учун мажбурий.
   */
  if (d.tomorqaBor && !d.tomorqaFoydalanish) {
    xato('tomorqaFoydalanish', 'Томорқадан фойдаланиш даражасини танланг');
  }
  if (d.qoshimchaYerBor && n(d.qoshimchaYerMaydoni) <= 0) {
    xato('qoshimchaYerMaydoni', 'Қўшимча ер бор деб белгиланган — майдонини киритинг');
  }
  if (!d.qoshimchaYerBor && n(d.qoshimchaYerMaydoni) > 0) {
    xato('qoshimchaYerMaydoni', 'Майдон киритилган, лекин «қўшимча ер йўқ» деб белгиланган');
  }
  if (d.issiqxonaTalabi && n(d.issiqxonaMaydoni) <= 0) {
    ogoh('issiqxonaMaydoni', 'Иссиқхона талаби бор — режалаштирилган майдонни киритинг');
  }
  if (d.ijaraYer && n(d.ijaraYerMaydoni) <= 0) {
    xato('ijaraYerMaydoni', 'Ижара ер бор деб белгиланган — майдонини киритинг');
  }

  // ── V va VII bo'lim: izoh talab qiladigan belgilar ───────

  if (d.nogironlikBor && !d.nogironlikIzoh?.trim()) {
    xato('nogironlikIzoh', 'Ногиронлиги бўлган шахс бор — ким эканини ва гуруҳини ёзинг');
  }
  if (d.uzoqDavolanish && !d.uzoqDavolanishIzoh?.trim()) {
    xato('uzoqDavolanishIzoh', 'Узоқ даволанишга муҳтож аъзо бор — ким эканини ва ташхисни ёзинг');
  }

  // ── III bo'lim: daromad ──────────────────────────────────

  /*
   * Daromad ogohlantirishlari faqat XATLOV BOSHLANGANDAN keyin.
   *
   * `jami > 0` sharti - forma ochilgan zahoti "daromad kiritilmagan"
   * deb yozib qo'ymaslik uchun. Xodim hali hech narsa yozmagan
   * bo'lsa, uni ogohlantirishning ma'nosi yo'q: sariq quti bo'sh
   * formada turgani xodimni chalkashtiradi va vaqt o'tishi bilan u
   * ogohlantirishlarga umuman qaramaydigan bo'lib qoladi.
   */
  if (jami > 0) {
    // Nol daromad haqiqat bo'lishi mumkin (yangi ko'chib kelgan, hamma
    // ishsiz), lekin ko'pincha bu "to'ldirishni unutdim" degani.
    if (b(d.oylikDaromad) === 0) {
      ogoh('oylikDaromad', 'Ойлик даромад киритилмаган ёки нол — текширинг');
    }

    // Ishlaydigan odam bor, lekin daromad nol - qarama-qarshilik.
    if (ishlaydi > 0 && b(d.oylikDaromad) === 0) {
      ogoh(
        'oylikDaromad',
        `Хонадонда ${ishlaydi} киши ишлайди, лекин ойлик даромад нол кўрсатилган`
      );
    }
  }

  // ── Katta oila ───────────────────────────────────────────

  if (jami > 20) {
    ogoh('jamiAzo', `Хонадонда ${jami} киши — рақамни текширинг`);
  }

  return { xatolar, ogohlantirishlar, ok: xatolar.length === 0 };
}

/**
 * Xonadonni yuborishga tayyorligini tekshiradi.
 *
 * Arifmetikadan tashqari: agar xonadonda ishsiz bor deyilgan bo'lsa,
 * ularning har biri uchun shaxsiy anketa to'ldirilgan bo'lishi kerak.
 *
 * Ana shu bog'lanish butun platformani ushlab turadi - ishsizlar
 * soni faqat raqam bo'lib qolsa, bandlik markazi kim bilan
 * ishlashini bilmaydi va xatlov behuda qog'ozbozlikka aylanadi.
 */
export function yuborishgaTayyormi(
  d: XatlovRaqamlari,
  kiritilganIshsizlar: number,
  /**
   * Розилик ва имзо — ЯКУНИЙ юборишда мажбурий.
   *
   * Қоралама сақлашда текширилмайди: ходим анкетани бир неча
   * марта келиб тўлдириши мумкин, имзо эса энг охирида,
   * фуқаронинг ўзи олдида қўйилади.
   *
   * Ихтиёрий параметр: эски чақирувлар (масалан алоҳида
   * синовлар) ўзгармасин.
   */
  tasdiq?: { rozilikBerdi: boolean; imzoYoli: string }
): TekshiruvHisoboti {
  const hisobot = xatlovTekshir(d);
  const ishsiz = n(d.ishsizlarSoni);

  if (ishsiz > kiritilganIshsizlar) {
    hisobot.xatolar.push({
      maydon: 'ishsizlar',
      xabar: `Хонадонда ${ishsiz} та ишсиз кўрсатилган, лекин ${kiritilganIshsizlar} тасининг анкетаси тўлдирилган. Қолган ${ishsiz - kiritilganIshsizlar} тасини киритинг.`,
    });
  }

  if (kiritilganIshsizlar > ishsiz) {
    hisobot.xatolar.push({
      maydon: 'ishsizlar',
      xabar: `${kiritilganIshsizlar} та ишсиз анкетаси тўлдирилган, лекин I бўлимда ${ishsiz} та деб кўрсатилган. Рақамни тўғриланг.`,
    });
  }

  if (tasdiq) {
    if (!tasdiq.rozilikBerdi) {
      hisobot.xatolar.push({
        maydon: 'rozilikBerdi',
        xabar:
          'Фуқаро маълумотлари йиғилишига розилик бермаган. XIII бўлимдаги белгини фуқаронинг ўзи олдида белгиланг.',
      });
    }

    /*
     * Имзо УЗУНЛИГИ ҳам текширилади.
     *
     * Экранга тасодифан битта нуқта тегиб кетса, `imzoYoli` бўш
     * бўлмайди — лекин бу имзо эмас. 40 белги ҳам жуда кам:
     * бир-икки ҳарфли имзо ҳам ундан узун бўлади.
     */
    if (tasdiq.imzoYoli.trim().length < 40) {
      hisobot.xatolar.push({
        maydon: 'imzoYoli',
        xabar:
          'Имзо қўйилмаган ёки тўлиқ эмас. XIII бўлимдаги майдонга фуқаро ЎЗ имзосини чизиши керак.',
      });
    }
  }

  hisobot.ok = hisobot.xatolar.length === 0;
  return hisobot;
}

/**
 * Takror xatlovni aniqlash kaliti.
 *
 * Manzil bir xil yozilmaydi: "Navoiy ko'chasi 12-uy", "navoiy kochasi 12 uy",
 * "Navoiy k. 12". Shuning uchun apostrof, defis, bo'shliq va nuqta
 * olib tashlanadi va oila boshlig'ining ismi bilan birga kalit tuziladi.
 */
export function takrorKaliti(manzil: string, oilaBoshligi: string): string {
  const tozala = (s: string) =>
    s
      .toLowerCase()
      .replace(/[‘’ʻʼ`´′']/g, '')
      .replace(/[^\p{L}\p{N}]/gu, '');
  return `${tozala(manzil)}|${tozala(oilaBoshligi)}`;
}
