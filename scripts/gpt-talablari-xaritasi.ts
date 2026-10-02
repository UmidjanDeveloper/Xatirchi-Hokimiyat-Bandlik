/**
 * GPT promptining 21 bo'limi: har bir talab -> holat -> dalil xaritasi.
 * Tekshiruvchi: `scripts/gpt-talablari-sinov.ts`. Hujjat: `hujjatlar/GPT-TALABLARI-AUDITI.md`.
 *
 * Holat:
 *   TOLIQ  - talab bajarilgan va kamida bitta haqiqiy xulq-atvor sinovi bor;
 *   QISMAN - bajarilgan, lekin `cheklov` da aytilgan qism QILINMAGAN;
 *   HUJJAT - talab hujjat yoki baholash (kod emas); dalil - hujjatdagi aniq ibora.
 */

export type Holat = 'TOLIQ' | 'QISMAN' | 'HUJJAT';
export interface Dalil {
  fayl: string;
  /** Sinov nomining bir qismi (haqiqiy xulq-atvor sinovi) */
  nomi?: string;
  /** Hujjat yoki kodning aniq iborasi (o'zi yetarli emas) */
  kod?: string;
}
export interface Band {
  raqam: string;
  matn: string;
  holat: Holat;
  dalil: Dalil[];
  /** QISMAN bo'lsa: nima qilinmagan va nega */
  cheklov?: string;
}
export interface Bolim {
  raqam: number;
  sarlavha: string;
  bandlar: Band[];
}

/* ── Fayl nomlari ── */
const S = (n: string) => `scripts/${n}-sinov.ts`;
const D = S('dalil');
const J = S('joylashish');
const JU = S('joylashuv');
const RY = S('reyestr-yuklash');
const N = S('navbat');
const I = S('idempotent');
const W = S('webhook');
const X = S('xabarnoma');
const SS = S('sessiya');
const H = S('huquq');
const M = S('moderatsiya');
const R = S('reja');
const K = S('kuzatuv');
const B = S('beruvchi');
const KU = S('kurs');
const BU = S('buyurtma');
const MU = S('murojaat');
const MX = S('murojaat-xabari');
const MD = S('modullar');
const Y = S('yordam');
const V = S('vazifa');
const DZ = S('dizayn');
const P = S('pwa');
const T = S('tezlik');
const SH = S('sahifalash');
const MO = S('monitoring');
const Z = S('zaxira-nusxa');
const HU = S('hudud');
const A = S('agent');
const YO = S('yollanma');
const MG = S('migratsiya');
const MS = S('moslik');
const PQ = S('prototip-qoriqchi');
const QM = S('qamrov');
const RX = S('regressiya-xaritasi');
const AI = S('ai');
const SN = S('sana');
const HT = 'scripts/http-regressiya.ts';

const AUDIT = 'hujjatlar/GPT-TALABLARI-AUDITI.md';
const INT = 'hujjatlar/INTEGRATSIYALAR-REJA.md';
const ZAX = 'hujjatlar/ZAXIRA-VA-TIKLASH.md';
const TUMAN = 'hujjatlar/KOP-TUMAN.md';
const TOPSH = 'hujjatlar/TOPSHIRISH-HISOBOTI.md';
const AGH = 'hujjatlar/HUDHUD-AGENT.md';

const t = (fayl: string, nomi: string): Dalil => ({ fayl, nomi });
const k = (fayl: string, kod: string): Dalil => ({ fayl, kod });

export const BOLIMLAR: Bolim[] = [
  /* ═══════════════════════════ §1 ═══════════════════════════ */
  {
    raqam: 1,
    sarlavha: 'Boshlang‘ich audit',
    bandlar: [
      {
        raqam: '1.1',
        matn: 'Har bir kuzatuv joriy kodda qayta tekshirilib, holati belgilanadi (tasdiqlandi / qisman / to‘liq / qo‘shimcha tekshiruv)',
        holat: 'HUJJAT',
        dalil: [k(AUDIT, 'Holat belgilari'), t(RX, 'Hech bir holat FAQAT kod-grep bilan qoplanmagan')],
      },
      {
        raqam: '1.2',
        matn: 'Mavjud ishlaydigan funksiyalar saqlanadi; migratsiyalar ma‘lumotni o‘chirmaydi, production bazasi reset qilinmaydi',
        holat: 'TOLIQ',
        dalil: [
          t(MG, 'Янги миграциялар ФАҚАТ ҚЎШАДИ'),
          t(MG, 'Янги миграциялар такрор юргизилса ҳам хато бермайди'),
          t(MG, 'Миграция йиқилса деплой тўхтайди'),
          t(D, 'Миграция ҲЕЧ НАРСА ЎЧИРМАЙДИ'),
        ],
      },
    ],
  },

  /* ═══════════════════════════ §2 ═══════════════════════════ */
  {
    raqam: 2,
    sarlavha: 'Reyestrdagi shaxsni moslashtirish',
    bandlar: [
      {
        raqam: '2.1',
        matn: 'Tug‘ilgan sana ikki tomonda bo‘lsa HAR DOIM solishtiriladi; qarama-qarshi bo‘lsa avtomatik tasdiqlanmaydi',
        holat: 'TOLIQ',
        dalil: [
          t(D, 'Бошқа туғилган санали одам «мос» деб ОЛИНМАЙДИ'),
          t(D, 'Бир хил туғилган сана — мос деб топилади'),
        ],
      },
      {
        raqam: '2.2',
        matn: 'Faqat ism bo‘yicha moslik "tekshiruv talab qiladi" holati; yetishmagan ma‘lumot qarama-qarshi ma‘lumotdan ajratiladi',
        holat: 'TOLIQ',
        dalil: [
          t(D, 'Сана ЕТИШМАСА — алоҳида гуруҳ, автоматик тасдиқланмайди'),
          t(D, 'Бошқа туғилган санали одам «мос» деб ОЛИНМАЙДИ'),
        ],
      },
      {
        raqam: '2.3',
        matn: 'Bir xil ismli shaxslar avtomatik birlashtirilmaydi',
        holat: 'TOLIQ',
        dalil: [t(D, 'Бир хил исмли иккита фуқаро — ҳеч бири танланмайди')],
      },
      {
        raqam: '2.4',
        matn: 'Moslik sababi va ziddiyat foydalanuvchiga ko‘rsatiladi',
        holat: 'TOLIQ',
        dalil: [
          t(D, 'Бошқа туғилган санали одам «мос» деб ОЛИНМАЙДИ'),
          k('src/components/dalil/reyestr-yuklash.tsx', 'Туғилган санаси МОС КЕЛМАДИ'),
        ],
      },
      {
        raqam: '2.5',
        matn: 'Shaxsiy identifikator (JSHSHIR/PINFL) kerak bo‘lsa — yig‘ish zarurati, ruxsat va saqlash himoyasi OLDINDAN baholanadi',
        holat: 'HUJJAT',
        dalil: [k(INT, 'PINFL saqlanadimi'), k(INT, 'HMAC-SHA256'), t(MO, 'Tozalash: telefon (har xil yozuv), JSHSHIR')],
      },
    ],
  },

  /* ═══════════════════════════ §3 ═══════════════════════════ */
  {
    raqam: 3,
    sarlavha: 'Dalilni aniq ishga joylashish voqeasiga bog‘lash',
    bandlar: [
      {
        raqam: '3.1',
        matn: 'Ishga joylashish tarixi alohida voqealar sifatida saqlanadi (ish beruvchi, lavozim, boshlanish/tugash, holat, vakansiya)',
        holat: 'TOLIQ',
        dalil: [
          t(J, 'Биринчи сақлашда воқеа яратилади'),
          t(J, 'Корхона АЛМАШСА — эскиси ёпилади, янгиси яратилади'),
          t(J, 'Бир вақтда ФАҚАТ БИТТА очиқ воқеа қолади'),
          k('prisma/schema.prisma', 'model IshgaJoylashish'),
        ],
      },
      {
        raqam: '3.2',
        matn: 'Dalil aniq voqeaga bog‘lanadi; eski ish dalili yangi ishga avtomatik ko‘chmaydi',
        holat: 'TOLIQ',
        dalil: [
          t(J, 'ЭСКИ ишнинг далили ЯНГИ ишни тасдиқламайди'),
          t(J, 'Янги ишга ЎЗ далили келса — яна тасдиқланади'),
          t(J, 'БОШҚА одамнинг ишига боғлаб бўлмайди'),
          t(J, 'Параллел боғлаш — фақат биттаси ўтади'),
        ],
      },
      {
        raqam: '3.3',
        matn: '"Ish boshlagani tasdiqlangan" va "hozir ham ishlayotgani tekshirilgan" alohida holatlar',
        holat: 'TOLIQ',
        dalil: [
          t(J, 'Иш бошлагани тасдиқланса, ҳолати ҲАМОН «номаълум»'),
          t(J, '«Ҳамон ишлаяпти» далили воқеани ИШЛАМОҚДА қилади'),
          t(J, 'РАД ЭТИЛГАН «ишлаяпти» далили воқеани ўзгартирмайди'),
        ],
      },
      {
        raqam: '3.4',
        matn: 'Dalilning tegishli davri, manbasi va tekshirish sanasi ko‘rinadi',
        holat: 'QISMAN',
        dalil: [
          t(J, 'Далил қаторида манба ташкилот, ҳужжат санаси, кўчирма санаси, давр ва ТЕКШИРИЛГАН САНА'),
          k('src/components/dalil/dalil-blogi.tsx', 'текширилган сана'),
        ],
        cheklov:
          'Manba, hujjat sanasi, ko‘chirma sanasi va tekshirish sanasi har dalil qatorida ko‘rinadi. Dalil qamrab olgan DAVR (boshi–oxiri) maydonlari sxemada bor va bor bo‘lsa ko‘rsatiladi, lekin qo‘lda kiritish formasida va reyestr yuklashda to‘ldirilmaydi; davr mosligi avtomatik tekshirilmaydi. Ekran matni brauzerda avtomatik sinalmagan (kod darajasida).',
      },
      {
        raqam: '3.5',
        matn: 'Ish o‘zgarganda yoki tugaganda tarix saqlanadi',
        holat: 'TOLIQ',
        dalil: [
          t(J, 'Иш алмаштирган одам ИШ РЎЙХАТИДА қолади'),
          t(J, 'Сабаб билан ёпилади ва ҳолати ТУГАДИ бўлади'),
          t(J, 'Тугаш санаси бошланишдан ИЛГАРИ бўлмайди'),
        ],
      },
      {
        raqam: '3.6',
        matn: 'Mavjud dalillarni migratsiya qilishda noma‘lum bog‘lanish o‘ylab topilmaydi — tekshiruv talab qiladigan holatga ajratiladi',
        holat: 'TOLIQ',
        dalil: [
          t(J, 'Воқеага боғланмаган далил АЛОҲИДА белгиланади'),
          t(J, 'Боғланмаган далил ЎЗИ боғланиб қолмайди'),
        ],
      },
    ],
  },

  /* ═══════════════════════════ §4 ═══════════════════════════ */
  {
    raqam: 4,
    sarlavha: '"Tasdiqlangan" natijaning ishonchliligi',
    bandlar: [
      {
        raqam: '4.1',
        matn: 'Qo‘lda yuklangan fayl rasmiy integratsiya natijasi bilan tenglashtirilmaydi',
        holat: 'TOLIQ',
        dalil: [
          t(D, 'Қўлда юкланган кўчирма АВТОМАТИК тасдиқланмайди'),
          t(J, 'Қўлда тасдиқ РАСМИЙ деб саналмайди'),
          t(J, 'Реестр юклаш ҚЎЛДА манба деб ёзади'),
        ],
      },
      {
        raqam: '4.2',
        matn: 'Manba tashkilot, hujjat sanasi, yuklovchi, import ID va faylning kriptografik izi (SHA-256) saqlanadi',
        holat: 'TOLIQ',
        dalil: [
          t(D, 'Қўлда юкланган кўчирма АВТОМАТИК тасдиқланмайди'),
          t(RY, 'Dalillar shu yuklash yozuvining id si va fayl izi bilan saqlanadi'),
          t(HT, '14d. Yozish: to\'g\'ri fayl bilan 200'),
        ],
      },
      {
        raqam: '4.3',
        matn: 'Fayl izi uning haqiqiyligini o‘zi tasdiqlamasligi hisobga olinadi',
        holat: 'TOLIQ',
        dalil: [
          t(D, 'Қўлда юкланган кўчирма АВТОМАТИК тасдиқланмайди'),
          t(RY, 'Interfeys: "Yozish" tugmasi serverdan kelgan'),
          k('prisma/schema.prisma', 'ҲАҚИҚИЙ'),
        ],
      },
      {
        raqam: '4.4',
        matn: 'Shaxs yoki ish beruvchi mos kelmasa — tekshiruv navbatiga yuboriladi',
        holat: 'TOLIQ',
        dalil: [
          t(D, 'Киритилган ҳужжат ТЕКШИРИШ навбатига тушади'),
          t(D, 'Иш жойи фарқи далилда ЁЗИБ қўйилади'),
          t(D, 'Бошқа туғилган санали одам «мос» деб ОЛИНМАЙДИ'),
        ],
      },
      {
        raqam: '4.5',
        matn: 'Davr mos kelmasa — tekshiruv navbatiga yuboriladi',
        holat: 'QISMAN',
        dalil: [t(D, 'Киритилган ҳужжат ТЕКШИРИШ навбатига тушади'), t(D, 'Муддат ишга кирган санадан ҳисобланади')],
        cheklov:
          'Reyestr ko‘chirmasi bitta sanaga tegishli (`reyestrSanasi`) va u dalilda saqlanadi; hujjat DAVRI (boshi–oxiri) bilan ishga kirish davrini avtomatik solishtirish yo‘q. Har qanday qo‘lda yuklangan dalil baribir tekshiruv navbatiga tushadi va odam ko‘radi.',
      },
      {
        raqam: '4.6',
        matn: 'Qo‘lda kiritilgan dalilni kiritgan xodim o‘zi tasdiqlamaydi',
        holat: 'TOLIQ',
        dalil: [
          t(D, 'Ўзи киритган далилни ўзи тасдиқлай олмаслиги ЙЎЛДА текширилади'),
          t(D, 'Бошқа одам тасдиқласа — ҳисобга ўтади'),
        ],
      },
      {
        raqam: '4.7',
        matn: 'Rasmiy avtomatik tasdiq faqat tekshirilgan integratsiya orqali beriladi',
        holat: 'TOLIQ',
        dalil: [t(J, 'ФАҚАТ расмий интеграция ЎЗИ тасдиқ'), t(J, 'Тахмин ҲЕЧ ҚАЧОН «расмий» деб чиқмайди')],
      },
      {
        raqam: '4.8',
        matn: 'Qaror o‘zgartirilganda oldingi qaror, sabab va tekshiruvchi tarixi saqlanadi',
        holat: 'TOLIQ',
        dalil: [
          t(M, 'Қарор ўзгарса, ОЛДИНГИСИ изоҳда сақланади'),
          t(M, 'Қарорни ЎЗГАРТИРИШ сабабсиз бўлмайди'),
          t(M, 'Тасдиқланган далилни оддий йўл билан ЎЗГАРТИРИБ бўлмайди'),
        ],
      },
      {
        raqam: '4.9',
        matn: '"Xodim bildirgan", "dalil kiritilgan", "tekshirilgan", "rad etilgan" holatlari farqlanadi',
        holat: 'TOLIQ',
        dalil: [
          t(J, 'Реестр — қўлда кўчирма, маҳалла — ходимнинг гапи'),
          t(J, 'Киритилган-у текширилмаган — «кутилмоқда»'),
          t(J, 'РАД ЭТИЛГАН далил «далилсиз» деб кўрсатилмайди'),
          t(J, 'Фақат ходимнинг гапи — далил эмас, хабар'),
        ],
      },
      {
        raqam: '4.10',
        matn: 'Hisobotdagi tasdiqlangan sonlar aynan shu qoidalarga tayanadi',
        holat: 'TOLIQ',
        dalil: [
          t(J, 'Ҳисобга ФАҚАТ тасдиқланган икки даража киради'),
          t(J, 'Ҳисобот таркиби жамга тўғри келади'),
          t(D, 'Жамланма туман ҳолати билан бир хил'),
          t(J, 'Брифинг расмий манба сонини АЛОҲИДА айтади'),
        ],
      },
    ],
  },

  /* ═══════════════════════════ §5 ═══════════════════════════ */
  {
    raqam: 5,
    sarlavha: 'Importni takrorlanish va yarim bajarilishdan himoya qilish',
    bandlar: [
      {
        raqam: '5.1',
        matn: 'Fayl ichidagi takrorlar oldindan aniqlanadi',
        holat: 'TOLIQ',
        dalil: [
          t(D, 'Файл ичидаги ТАКРОР сатр иккита далил ясамайди'),
          t(RY, 'Dalillar shu yuklash yozuvining id si va fayl izi bilan saqlanadi; takror (davom ettirish)'),
        ],
      },
      {
        raqam: '5.2',
        matn: 'Bazada biznes mazmuniga mos unique cheklov bor',
        holat: 'TOLIQ',
        dalil: [t(D, 'Базада ҳам ягоналик чегараси бор'), k('prisma/schema.prisma', '@@unique([ishsizId, turi, reyestrSanasi], name: "dalil_takrori")')],
      },
      {
        raqam: '5.3',
        matn: 'Bir fayl qayta yoki parallel yuklanganda takror dalil yaratilmaydi',
        holat: 'TOLIQ',
        dalil: [
          t(D, 'ПАРАЛЛЕЛ юклаш: бир вақтда 5 та бир хил кўчирма — БИТТА далил'),
          t(D, 'Ўша сана билан такрор юклаш нусха ясамайди'),
          t(HT, '14d. Yozish: to\'g\'ri fayl bilan 200'),
        ],
      },
      {
        raqam: '5.4',
        matn: 'Import jarayonining holati, sanog‘i va xatolari saqlanadi',
        holat: 'TOLIQ',
        dalil: [
          t(RY, 'XATO: yozish uzilsa holat XATO'),
          t(RY, "Jarayon sanog'i faqat YOZILMOQDA holatida yangilanadi"),
          t(HT, '14b. Reyestr "ko\'rish"'),
        ],
      },
      {
        raqam: '5.5',
        matn: 'Qisman bajarilgan import davom ettirilishi yoki xavfsiz qaytarilishi mumkin',
        holat: 'TOLIQ',
        dalil: [
          t(RY, 'TO\'XTAB QOLGAN yozish'),
          t(RY, 'XATO: yozish uzilsa holat XATO'),
          t(RY, 'TAKROR YOZISH: tugagan yuklashni qayta yozish takror yozmaydi'),
        ],
      },
      {
        raqam: '5.6',
        matn: 'Katta importlar cheklangan bo‘laklarda bajariladi',
        holat: 'QISMAN',
        dalil: [t(RY, 'sanoq bo\'laklarda yangilanadi'), t(RY, 'Satr chegarasi: xom satr 20 001 - rad')],
        cheklov:
          'Fayl 10 000 ma‘lumot satrigacha cheklangan, yozish har 200 satrda holatni yangilab turadi va uzilsa xavfsiz davom etadi. Lekin yozish BITTA so‘rovda ketma-ket bajariladi (fonli navbat/worker yo‘q): juda katta mos kelishlarda Vercel funksiyasi vaqt chegarasi (maxDuration) oshib uzilishi mumkin — u holda ma‘lumot buzilmaydi, 10 daqiqadan keyin yoki "xato" holatidan qayta bosib davom ettiriladi.',
      },
      {
        raqam: '5.7',
        matn: 'Fayl hajmidan tashqari satr, ustun va qayta ishlash resurslari ham cheklanadi',
        holat: 'TOLIQ',
        dalil: [
          t(RY, 'Satr chegarasi: xom satr 20 001 - rad'),
          t(RY, 'Ustun chegarasi: 101 ustunli satr - rad'),
          t(RY, 'HAQIQIY xlsx: juda keng diapazon'),
          t(PQ, 'reyestrniOqi: reader prototipni buzsa - fayl RAD'),
          t(HT, '14f. Reyestr resurs chegarasi'),
        ],
      },
      {
        raqam: '5.8',
        matn: '"Avval ko‘rish, keyin tasdiqlash" serverda import ID va fayl izi bilan bog‘lanadi; ko‘rilgan fayl o‘rniga boshqa fayl yozilmaydi',
        holat: 'TOLIQ',
        dalil: [
          t(RY, 'BOSHQA FAYL yozilmaydi'),
          t(RY, 'Boshqa sana bilan yozilmaydi'),
          t(RY, 'PARALLEL: bir yozuvga 8 ta bir vaqtdagi "yozish"'),
          t(HT, '14c. BOSHQA FAYL yozilmaydi'),
        ],
      },
      {
        raqam: '5.9',
        matn: 'Import sanasining kelajakda bo‘lishi kabi holatlar tekshiriladi',
        holat: 'TOLIQ',
        dalil: [t(RY, 'Sana: kelajak rad, juda eski (2020 dan oldin) rad'), t(HT, '14e. Reyestr sanasi qat\'iy')],
      },
      {
        raqam: '5.10',
        matn: 'Sana tekshiruvi: 31.02 mart oyiga o‘zgartirilmaydi; Excel va matnli sanalar, kabisa yili, vaqt mintaqasi sinalgan',
        holat: 'TOLIQ',
        dalil: [
          t(D, '31.02.2000 РАД ЭТИЛАДИ — мартга сурилмайди'),
          t(D, '29.02.2000 қабул қилинади — кабиса йили'),
          t(D, '29.02.2001 рад этилади — кабиса йили ЭМАС'),
          t(D, 'Маъносиз Excel рақами рад этилади'),
          t(D, 'Сана UTC да ясалади — вақт минтақаси силжитмайди'),
          t(RY, 'Sana: 31.02 martga SURILMAYDI'),
        ],
      },
    ],
  },

  /* ═══════════════════════════ §6 ═══════════════════════════ */
  {
    raqam: 6,
    sarlavha: 'Qoralamalar va oflayn navbat',
    bandlar: [
      {
        raqam: '6.1',
        matn: 'Har qoralama xodimning o‘zgarmas ID si va alohida qoralama ID si bilan saqlanadi',
        holat: 'TOLIQ',
        dalil: [t(N, 'Икки ходимнинг қораламаси бир-бирини БОСМАЙДИ'), t(N, 'Навбат ёзуви эгаси билан сақланади')],
      },
      {
        raqam: '6.2',
        matn: 'Bir xodimning bir nechta anketasi parallel saqlana oladi',
        holat: 'TOLIQ',
        dalil: [t(N, 'Битта ходим ИККИТА анкетани параллел сақлай олади')],
      },
      {
        raqam: '6.3',
        matn: 'O‘qish, o‘chirish, tiklash va yuborish egasi doirasida ishlaydi',
        holat: 'TOLIQ',
        dalil: [
          t(N, 'ФАҚАТ ўзиники юборилади — ҳамкасбники тегилмайди'),
          t(N, 'Ҳамкасбнинг қораламаси очилмайди'),
          t(N, 'Чиқишда ФАҚАТ ўзининг қораламаси ўчади'),
        ],
      },
      {
        raqam: '6.4',
        matn: 'Bir nechta brauzer oynasidagi yozuvlar bir-birini buzmaydi',
        holat: 'TOLIQ',
        dalil: [t(N, 'Битта ходим ИККИТА анкетани параллел сақлай олади'), t(I, 'Параллел таҳрир: версия билан')],
      },
      {
        raqam: '6.5',
        matn: 'Hisob almashganda boshqa foydalanuvchi navbati yuborilmaydi',
        holat: 'TOLIQ',
        dalil: [t(N, 'ФАҚАТ ўзиники юборилади — ҳамкасбники тегилмайди'), t(N, 'Эгасиз эски ёзув ҳеч кимнинг номидан жўнамайди')],
      },
      {
        raqam: '6.6',
        matn: 'Yuborish paytida hisob almashishi ham tekshiriladi',
        holat: 'TOLIQ',
        dalil: [t(I, 'Бошқа ходимнинг калити — бегона')],
      },
      {
        raqam: '6.7',
        matn: 'Egasiz eski yozuvlar boshqa hisobga jim biriktirilmaydi',
        holat: 'TOLIQ',
        dalil: [t(N, 'Ходим тасдиқласа, эгасиз ёзув уники бўлади'), t(N, 'Эгасиз эски ёзув ҳеч кимнинг номидан жўнамайди')],
      },
      {
        raqam: '6.8',
        matn: 'Saqlash muvaffaqiyatsiz bo‘lsa "saqlandi" deb yozilmaydi',
        holat: 'TOLIQ',
        dalil: [t(N, 'Saqlash MUVAFFAQIYATSIZ bo‘lsa "saqlandi" deb yozilmaydi')],
      },
      {
        raqam: '6.9',
        matn: 'Qoralamalarni ko‘rish, davom ettirish va boshqarish oynasi bor',
        holat: 'QISMAN',
        dalil: [t(N, 'Рўйхатда ФАҚАТ ўзининг қораламалари кўринади'), t(N, 'Рўйхат ЯНГИСИДАН эскисига тартибланади'), k('src/components/xatlov/xatlov-formasi.tsx', 'qoralamaniDavomEttir')],
        cheklov:
          'Ro‘yxatni tuzish, tartiblash, egalik va chekov mantig‘i kutubxona darajasida sinalgan; oynaning o‘zi (ko‘rinish, tugmalar) haqiqiy brauzerda avtomatik sinalmagan — kod darajasida ulangan.',
      },
      {
        raqam: '6.10',
        matn: 'Shaxsiy ma‘lumotning qurilmada saqlanish muddati va hajmi cheklanadi',
        holat: 'TOLIQ',
        dalil: [
          t(N, 'Эскирган қоралама ЎҚИШДА тушиб қолади'),
          t(N, 'Чегарадан ошган ЭНГ ЭСКИ қоралама тушиб қолади'),
          t(N, 'Чиқишда телефон хотираси тозаланади'),
        ],
      },
      {
        raqam: '6.11',
        matn: 'Saqlash texnologiyasini almashtirishning o‘zi xavfsizlik hisoblanmaydi',
        holat: 'QISMAN',
        dalil: [t(N, 'Чиқишда телефон хотираси тозаланади'), t(N, 'Эскирган қоралама ЎҚИШДА тушиб қолади'), t(N, 'Чегарадан ошган ЭНГ ЭСКИ қоралама тушиб қолади')],
        cheklov:
          'Qoralama va navbat localStorage da OCHIQ matnda turadi (shifrlash yo‘q). Himoya: egasi bo‘yicha ajratish, 7 kunlik muddat, 20 ta chegarasi, chiqishda tozalash, yuborilmaganini o‘chirmaslik. Qurilma o‘g‘irlansa va qulf bo‘lmasa, kutilgan muddat ichidagi matn o‘qilishi mumkin.',
      },
      {
        raqam: '6.12',
        matn: 'Xatolar ajratiladi: 401 qayta kirish, 403 huquq/hisob, 400/422 tuzatish, 409 ziddiyat, tarmoq/5xx keyinroq',
        holat: 'TOLIQ',
        dalil: [
          t(N, 'HTTP kodi beshta turga ajraladi'),
          t(N, 'Har tur uchun alohida matn bor'),
          t(N, '403: anketa navbatda QOLADI'),
          t(N, '400/422 "yaroqsiz" bo‘lib qoladi'),
        ],
      },
      {
        raqam: '6.13',
        matn: 'Qayta kirish talab qiladigan yozuv oddiy "yaroqsiz anketa"ga aylanmaydi',
        holat: 'TOLIQ',
        dalil: [t(N, '401: sessiya tugagan - anketa YAROQSIZ EMAS'), t(N, '401 o‘n marta ketma-ket kelsa ham anketa')],
      },
    ],
  },

  /* ═══════════════════════════ §7 ═══════════════════════════ */
  {
    raqam: 7,
    sarlavha: 'Idempotentlik va parallel tahrir',
    bandlar: [
      {
        raqam: '7.1',
        matn: 'Takror so‘rov kaliti aniq amal, foydalanuvchi va mazmun bilan bog‘lanadi',
        holat: 'TOLIQ',
        dalil: [t(I, 'Калит АМАЛ, ЭГАСИ ва ИЗ билан сақланади'), t(I, 'Майдонлар тартиби изни ЎЗГАРТИРМАЙДИ'), t(I, 'Мазмун ўзгарса — из ҳам ўзгаради')],
      },
      {
        raqam: '7.2',
        matn: 'Bir xil kalit va boshqa mazmun kelganda ziddiyat qaytadi',
        holat: 'TOLIQ',
        dalil: [t(I, 'Якуний икки марта, БОШҚА мазмун билан — ЗИДДИЯТ')],
      },
      {
        raqam: '7.3',
        matn: 'Qoralama → yakuniy o‘tish alohida tekshiriladigan holat o‘zgarishi; majburiy nazorat holati (4 qadam)',
        holat: 'TOLIQ',
        dalil: [
          t(I, 'ҚОРАЛАМА → ЯКУНИЙ: такрор ЭМАС, ёзув янгиланади'),
          t(I, 'ЯКУНИЙ → ҚОРАЛАМА тескари йўл йўқ — зиддият'),
          t(I, 'Қоралама → якуний, мазмун ЎЗГАРМАГАН бўлса ҳам — давом'),
        ],
      },
      {
        raqam: '7.4',
        matn: 'Kalit orqali topilgan yozuvning egasi va hududi tekshiriladi',
        holat: 'TOLIQ',
        dalil: [t(I, 'Бошқа ходимнинг калити — бегона'), t(HT, '9a. O\'z mahallasining xonadonini API orqali OCHADI')],
      },
      {
        raqam: '7.5',
        matn: 'Mavjud yozuv yangilanishi avtomatik ravishda xavfsiz idempotent amal deb hisoblanmaydi',
        holat: 'TOLIQ',
        dalil: [t(I, 'Йўл эрта қайтишни ТАШЛАГАН — қарор модулидан фойдаланади'), t(I, 'Калит топилмаса — янги ёзув')],
      },
      {
        raqam: '7.6',
        matn: 'Ikki xodim bir yozuvni tahrirlaganda keyingi saqlash oldingi o‘zgarishni jim o‘chirmaydi (versiya asosida ziddiyat)',
        holat: 'TOLIQ',
        dalil: [t(I, 'Параллел таҳрир: версия билан `updateMany` ва 409'), t(I, 'Форма версияни юборади ва жавобдан янгилайди')],
      },
      {
        raqam: '7.7',
        matn: 'Ziddiyatda ikkala versiya saqlanib, farqlarni ko‘rish imkoniyati bo‘ladi',
        holat: 'QISMAN',
        dalil: [t(N, 'ЗИДДИЯТ (409) ёзувни ЎЧИРМАЙДИ — иш йўқолмайди'), t(N, 'Зиддиятли ёзув автоматик қайта юборилмайди')],
        cheklov:
          'Ikkala versiya saqlanadi (xodimning anketasi telefonda, serverdagi yozuv bazada) va mavjud yozuvga havola beriladi, lekin ikki versiyani YONMA-YON FARQ (diff) ko‘rinishida ko‘rsatadigan ekran yo‘q — xodim ikkala yozuvni ochib qo‘lda solishtiradi.',
      },
    ],
  },

  /* ═══════════════════════════ §8 ═══════════════════════════ */
  {
    raqam: 8,
    sarlavha: 'Telegram webhook va xabarlar',
    bandlar: [
      {
        raqam: '8.1',
        matn: 'Webhook siri yo‘q bo‘lsa xizmat so‘rovni rad etadi',
        holat: 'TOLIQ',
        dalil: [t(W, "SIR YO'Q: yo'l 503 beradi")],
      },
      {
        raqam: '8.2',
        matn: 'Noto‘g‘ri sir bilan hech qanday biznes amali bajarilmaydi',
        holat: 'TOLIQ',
        dalil: [t(W, "SIR NOTO'G'RI yoki YO'Q"), t(W, "SIR TO'G'RI: kod ulanadi")],
      },
      {
        raqam: '8.3',
        matn: 'Ishga tushishda konfiguratsiya tekshiriladi',
        holat: 'QISMAN',
        dalil: [t(W, "TELEGRAM_BOT_TOKEN yo'q: yo'l 503 beradi"), t(V, 'Вебхук сири йўқ бўлса — ШОШИЛИНЧ деб белгиланади')],
        cheklov:
          'Tekshiruv ilova ishga tushishida emas, HAR SO‘ROVDA (sir yoki token yo‘q bo‘lsa 503) va administrator /tizim va /vazifalar sahifasida "shoshilinch" belgisi bilan bajariladi. Ilovaning o‘zi ishga tushishda to‘xtatilmaydi — aks holda Telegram sozlanmagani butun saytni yiqitgan bo‘lardi.',
      },
      {
        raqam: '8.4',
        matn: 'Telegram update_id bo‘yicha takror yangilanishlar aniqlanadi',
        holat: 'TOLIQ',
        dalil: [t(W, 'TAKROR YANGILANISH'), t(W, 'TAKROR "BOSHQA" update_id'), t(W, 'BIR VAQTDA 8 TA bir xil update')],
      },
      {
        raqam: '8.5',
        matn: 'Takror yuborilgan callback bir amalni ikki marta bajarmaydi',
        holat: 'TOLIQ',
        dalil: [t(W, 'TAKROR YANGILANISH'), t(JU, '2. Такрор босиш иккинчи хабар ярамайди')],
      },
      {
        raqam: '8.6',
        matn: 'Shaxsiy suhbat va guruh suhbati aniq ajratiladi',
        holat: 'TOLIQ',
        dalil: [t(W, 'GURUH suhbati'), t(W, 'GURUHDAGI TUGMA jim qoldiriladi')],
      },
      {
        raqam: '8.7',
        matn: 'Xodim hisobini bog‘lash va maxfiy amallar faqat shaxsiy suhbatda bajariladi',
        holat: 'TOLIQ',
        dalil: [t(W, 'GURUH suhbati'), t(W, 'GURUHDAGI TUGMA jim qoldiriladi')],
      },
      {
        raqam: '8.8',
        matn: 'Kodni hisobga bog‘lashda amal muddati, bir martalik foydalanish va urinishlar cheklovi bor',
        holat: 'TOLIQ',
        dalil: [
          t(W, 'KOD MUDDATI'),
          t(W, 'KOD BIR MARTALIK'),
          t(W, "KOD TERISH CHEGARASI: sakkiz noto'g'ri urinishdan keyin"),
          t(W, "KOD TERISH CHEGARASI faqat O'SHA chatga tegadi"),
        ],
      },
      {
        raqam: '8.9',
        matn: 'Foydalanuvchi yuborgan nom, izoh va boshqa dinamik matn HTML uchun xavfsizlantiriladi',
        holat: 'TOLIQ',
        dalil: [t(X, 'HTML белгилари хавфсизлантирилади'), t(MX, "HTML xavfsizlantiriladi (masul ismida <b>/<a>)")],
      },
      {
        raqam: '8.10',
        matn: 'Loglarga bot tokeni, webhook siri yoki ortiqcha shaxsiy ma‘lumot chiqarilmaydi',
        holat: 'TOLIQ',
        dalil: [
          t(MO, 'Tozalash: baza ulanish satri, bot tokeni (URL ichida)'),
          t(MO, 'Telegram yuborilmasa: xabar navbatda QOLADI'),
          t(MO, 'Xato jurnali: bazaga SIR TUSHMAYDI'),
        ],
      },
      {
        raqam: '8.11',
        matn: 'Qaror va bildirishnomalar doimiy navbat orqali yuboriladi',
        holat: 'TOLIQ',
        dalil: [t(X, 'Хабар навбатга тушади'), t(X, 'Муваффақиятли юборилса — ЮБОРИЛДИ, сана ёзилади')],
      },
      {
        raqam: '8.12',
        matn: 'Telegram ishlamasa xabar yo‘qolmaydi',
        holat: 'TOLIQ',
        dalil: [t(X, 'Хато бўлса хабар ЙЎҚОЛМАЙДИ — навбатда қолади'), t(X, 'Уч мартадан кейин ХАТО бўлади')],
      },
      {
        raqam: '8.13',
        matn: 'Qayta urinish, oxirgi xato va yetkazilish holati ko‘rinadi',
        holat: 'TOLIQ',
        dalil: [t(MO, "Navbat ko'rinishi"), t(MO, "Qayta urinish: faqat so'nggi 3 kundagi XATO xabarlar")],
      },
      {
        raqam: '8.14',
        matn: '"Navbatga qo‘yildi" va "yuborildi" farqlanadi',
        holat: 'TOLIQ',
        dalil: [t(X, 'Муваффақиятли юборилса — ЮБОРИЛДИ, сана ёзилади'), t(X, 'БЕКОР қилинган хабар «юборилган» деб ҳисобланмайди')],
      },
      {
        raqam: '8.15',
        matn: 'Yuborish muvaffaqiyatsiz bo‘lsa, ish beruvchiga "barcha xodimlarga xabar ketdi" deb yozilmaydi',
        holat: 'TOLIQ',
        dalil: [
          t(B, 'Ish beruvchiga YETKAZILISH haqida yolg\'on aytilmaydi'),
          t(YO, 'Telegramga yuborib bo‘lmasa — "yuborildi" yozilmaydi'),
        ],
      },
    ],
  },

  /* ═══════════════════════════ §9 ═══════════════════════════ */
  {
    raqam: 9,
    sarlavha: 'Sessiya va barcha sahifalar huquqi, login chegarasi',
    bandlar: [
      {
        raqam: '9.1',
        matn: '/tablo ham joriy bazaviy huquq va sessiya versiyasini tekshiradi',
        holat: 'TOLIQ',
        dalil: [t(HT, '10a. Nazorat: HOKIM /tablo ni ochadi'), t(HT, '10b. ROL TUSHIRILSA'), t(SS, 'Ҳеч бир саҳифа `joriySessiya()` ни чақирмайди')],
      },
      {
        raqam: '9.2',
        matn: 'Faqat (ilova) ichidagi emas, barcha himoyalangan sahifa va API yo‘llari auditdan o‘tkazilgan',
        holat: 'TOLIQ',
        dalil: [
          t(H, 'Ҳар саҳифада рол қўриқчиси бор'),
          t(H, 'Ҳар рол ва ҳар йўл: меню билан қўриқчи БИР ХИЛ жавоб беради'),
          t(HT, '9g. Mahalla xodimi bandlik markazi'),
        ],
      },
      {
        raqam: '9.3',
        matn: 'Rol pasaytirilganda eski ko‘rish huquqi qolmaydi',
        holat: 'TOLIQ',
        dalil: [t(HT, '10b. ROL TUSHIRILSA'), t(HT, '10c. HISOB O\'CHIRILSA')],
      },
      {
        raqam: '9.4',
        matn: 'Mahalla almashganda eski hudud ochilmaydi',
        holat: 'TOLIQ',
        dalil: [t(SS, '`joriyXodim` рол ва маҳаллани БАЗАДАН олади'), t(HT, '9f. Mahallasiz YETTILIK'), t(HT, '9e. Simmetriya')],
      },
      {
        raqam: '9.5',
        matn: 'Parol o‘zgarganda barcha tegishli eski sessiyalar bekor qilinadi',
        holat: 'TOLIQ',
        dalil: [t(SS, 'Парол алмашганда авлод ошади — ҳар икки йўлда'), t(HT, '10d. SESSIYA AVLODI O\'ZGARSA')],
      },
      {
        raqam: '9.6',
        matn: 'v maydoni yo‘q eski formatdagi sessiyalar uchun aniq tugash siyosati bor',
        holat: 'TOLIQ',
        dalil: [t(SS, "Avlodi (v) YO'Q eski cookie TUGAGAN"), t(HT, '15c. Avlodi (v) YO\'Q eski formatdagi cookie TUGAGAN')],
      },
      {
        raqam: '9.7',
        matn: '"Ko‘rish rejimi"da o‘zgartirish amallari bajarilmaydi',
        holat: 'TOLIQ',
        dalil: [t(SS, 'Миддлевар кўриш режимида ёзишни тўсади'), t(SS, '`talabQil` ҳам тўсади — иккинчи қават')],
      },
      {
        raqam: '9.8',
        matn: 'Haqiqiy foydalanuvchi va ko‘rilayotgan foydalanuvchi auditda chalkashmaydi',
        holat: 'TOLIQ',
        dalil: [t(SS, 'Режим ёқилгани ҳам, ўчирилгани ҳам журналга тушади'), t(SS, 'Қобиқ ҳам чиқишда ҲАҚИҚИЙ ҳисобни ишлатади')],
      },
      {
        raqam: '9.9',
        matn: 'Muhim yozish amallarining haqiqiy bajaruvchisi serverda tekshiriladi',
        holat: 'TOLIQ',
        dalil: [t(SS, 'Режим йўли ҳуқуқни ҲАҚИҚИЙ ҳисоб бўйича текширади'), t(SS, 'Кўз фақат ADMIN учун ишлайди — рол БАЗАДАН текширилади')],
      },
      {
        raqam: '9.10',
        matn: 'Login rate limit server nusxalari o‘rtasida umumiy saqlashda (xotiradagi Map o‘rniga/ustiga)',
        holat: 'TOLIQ',
        dalil: [
          t(MO, 'Baza chegarasi: limit, qolgan, kutish vaqti'),
          t(MO, "Baza chegarasi: XOTIRA tozalansa ham BAZA ushlab turadi"),
          t(MO, 'Baza chegarasi: 12 ta PARALLEL urinish'),
        ],
      },
      {
        raqam: '9.11',
        matn: 'IP va hisob cheklovlari uyg‘unlashtirilgan',
        holat: 'TOLIQ',
        dalil: [t(SS, 'Чегара икки ўлчовда: ҳисоб ва IP'), t(SS, 'Ҳисоб чегараси БАЗАГА мурожаатдан ОЛДИН')],
      },
      {
        raqam: '9.12',
        matn: 'Umumiy internetdagi barcha xodimlar asossiz bloklanmaydi',
        holat: 'TOLIQ',
        dalil: [t(SS, 'Idora: 100 ta muvaffaqiyatli kirish'), t(HT, '15b. Idora: bir IP dan 70 ta muvaffaqiyatli kirish')],
      },
      {
        raqam: '9.13',
        matn: 'Cheklov xizmatidagi xatoda qanday ishlashi aniq belgilangan',
        holat: 'HUJJAT',
        dalil: [k('src/lib/kirish-chegarasi.ts', 'FAIL-OPEN emas'), k('src/lib/xabarnoma.ts', 'fail-closed'), t(W, 'baza xatosida RAD etiladi (fail-closed)')],
      },
      {
        raqam: '9.14',
        matn: 'Muvaffaqiyatli login boshqa hisoblar uchun himoyani asossiz tozalamaydi',
        holat: 'TOLIQ',
        dalil: [
          t(SS, "IP hisobi: muvaffaqiyat o'z urinishini QAYTARADI"),
          t(MO, 'Baza chegarasi: QAYTARISH faqat ENG OXIRGI urinishni'),
          t(HT, '15a. Login IP chegarasi: 59 ta xato urinishdan keyin'),
        ],
      },
    ],
  },

  /* ═══════════════════════════ §10 ═══════════════════════════ */
  {
    raqam: 10,
    sarlavha: 'Moderatsiyada qarama-qarshi qarorlarni to‘sish',
    bandlar: [
      {
        raqam: '10.1',
        matn: 'Qaror KUTILMOQDA holatidan atomar o‘tadi',
        holat: 'TOLIQ',
        dalil: [t(M, 'Иккита раҳбар бир вақтда: фақат БИТТА қарор ўтади'), t(M, 'Учала йўлда ҳам `updateMany` билан шартли ёзиш')],
      },
      {
        raqam: '10.2',
        matn: 'Birinchi qarordan keyin ikkinchisiga 409 yoki mos ziddiyat javobi beriladi',
        holat: 'TOLIQ',
        dalil: [t(M, 'Иккинчи қарорга КИМ ҳал қилгани айтилади'), t(M, 'Йўллар 409 ва тушунтириш қайтаради')],
      },
      {
        raqam: '10.3',
        matn: 'Qaror, audit hodisasi va xabar navbati imkon qadar bitta tranzaksiyada yoziladi',
        holat: 'QISMAN',
        dalil: [
          t(M, 'Қарор ва АУДИТ БИР транзакцияда'),
          t(M, 'Telegram orqali berilgan'),
        ],
        cheklov:
          'Qaror va audit yozuvi BITTA tranzaksiyada (ish beruvchi, e‘lon, dalil) — avval Telegram orqali berilgan qaror auditga umuman tushmasdi. Ish beruvchiga xabar tranzaksiyaga KIRMAYDI: ish beruvchi User emas va Xabarnoma navbati uni tashimaydi, xabar to‘g‘ridan-to‘g‘ri yuboriladi (yuborilmasa qaror kuchda qoladi). Dalil tasdiqlangach ish voqeasi holatini yangilash ham qasddan alohida: qaror yo‘qolmasin.',
      },
      {
        raqam: '10.4',
        matn: 'Qarorni o‘zgartirish alohida huquq va izoh bilan bajariladi',
        holat: 'TOLIQ',
        dalil: [t(M, 'Қарорни ЎЗГАРТИРИШ сабабсиз бўлмайди'), t(M, 'Тасдиқланган далилни оддий йўл билан ЎЗГАРТИРИБ бўлмайди')],
      },
      {
        raqam: '10.5',
        matn: 'Kim, qachon, nima sababdan qaror bergani saqlanadi',
        holat: 'TOLIQ',
        dalil: [t(M, 'Рад этилганда САБАБ сақланади'), t(M, 'Эълон рад этилганда САБАБ ва ким рад этгани сақланади'), t(M, 'Қарор ва АУДИТ БИР транзакцияда')],
      },
      {
        raqam: '10.6',
        matn: 'Dalillarni tasdiqlashda ham shu qoidalar ishlaydi',
        holat: 'TOLIQ',
        dalil: [t(M, 'Далил: иккита мутахассис бир вақтда — биттаси ўтади'), t(M, 'Қарор ва АУДИТ БИР транзакцияда')],
      },
      {
        raqam: '10.7',
        matn: 'Ish beruvchi va e‘lon moderatsiyasi alohida boshqariladi',
        holat: 'TOLIQ',
        dalil: [t(M, 'Эълон: иккита раҳбар бир вақтда — биттаси ўтади'), t(M, 'Иккита раҳбар бир вақтда: фақат БИТТА қарор ўтади'), t(B, 'Иш берувчи қўйган эълон МОДЕРАЦИЯ кутади')],
      },
      {
        raqam: '10.8',
        matn: 'Tasdiqlangan ish beruvchini keyinchalik vaqtincha cheklash va qayta tekshirish imkoniyati baholanadi',
        holat: 'HUJJAT',
        dalil: [k(AUDIT, 'Tasdiqlangan ish beruvchini vaqtincha cheklash')],
      },
    ],
  },

  /* ═══════════════════════════ §11 ═══════════════════════════ */
  {
    raqam: 11,
    sarlavha: 'Xodimlar uchun oilaviy rivojlanish rejasi',
    bandlar: [
      {
        raqam: '11.1',
        matn: 'Reja: boshlang‘ich holat va sana, oila bilan kelishilgan maqsad, resurslar, to‘siqlar, mas‘ul, muddat, keyingi aloqa sanasi',
        holat: 'TOLIQ',
        dalil: [
          t(R, 'Boshlang‘ich holat yozilmasa reja ochilmaydi'),
          t(R, 'Boshlang‘ich holat manbasi va sanasi matn bilan birga beriladi'),
          t(R, 'Maqsad yozilgan-u oila bilan KELISHILMAGAN'),
          t(R, 'Aloqa muddati: o‘tgan / bugun / yaqin'),
        ],
      },
      {
        raqam: '11.2',
        matn: 'Fuqaro fikri telefon/uchrashuv/tashrif orqali xodim tomonidan qayd etiladi; aloqa usuli, vaqt, kim yozgani ko‘rinadi',
        holat: 'TOLIQ',
        dalil: [t(R, 'Aloqa yoziladi: usul, vaqt, kim yozgani saqlanadi'), t(R, 'Aloqa usuli faqat telefon / uchrashuv / tashrif')],
      },
      {
        raqam: '11.3',
        matn: 'Xodim qaydi fuqaroning mustaqil elektron tasdig‘i deb ko‘rsatilmaydi',
        holat: 'TOLIQ',
        dalil: [t(R, 'Aloqa jadvalida "tasdiqlangan" turidagi maydon YO‘Q')],
      },
      {
        raqam: '11.4',
        matn: 'Transport, bolaga qarash, ish jadvali, ko‘nikma, mos ish sharoiti, asbob-uskuna va buyurtma yetishmasligi alohida to‘siqlar',
        holat: 'TOLIQ',
        dalil: [k('prisma/schema.prisma', 'BUYURTMA_YETISHMASLIGI'), k('prisma/schema.prisma', 'BOLAGA_QARASH'), t(R, 'Reja ochilganda tizim o‘zidan hech qanday qadam')],
      },
      {
        raqam: '11.5',
        matn: 'Har oilaga bir xil kurs yoki kredit tavsiya qilinmaydi',
        holat: 'TOLIQ',
        dalil: [t(R, 'Reja ochilganda tizim o‘zidan hech qanday qadam (kurs, kredit) yaratmaydi'), t(KU, 'Tavsiya FAQAT boshlanmagan kursga')],
      },
      {
        raqam: '11.6',
        matn: 'Mas‘ul xodim, tashkilot va muddat belgilanadi; reja mahalla chegarasida',
        holat: 'TOLIQ',
        dalil: [t(R, 'Mas‘ul xodim: faol bo‘lmagan, hokim va boshqa mahalla xodimi yaroqsiz'), t(R, 'Mahalla xodimi BOSHQA mahalla oilasining rejasiga KIRA OLMAYDI')],
      },
    ],
  },

  /* ═══════════════════════════ §12 ═══════════════════════════ */
  {
    raqam: 12,
    sarlavha: 'Bandlik va daromad natijalarini kuzatish (30/60/90)',
    bandlar: [
      {
        raqam: '12.1',
        matn: 'Uch oylik nazorat 30/60/90 kunlik kuzatuvga kengaytirilgan',
        holat: 'TOLIQ',
        dalil: [t(K, 'Muddat = ishga kirgan sana + 30/60/90 kun'), t(K, 'Bosqich holati: kutilmoqda / bugun / kechikdi / bajarildi')],
      },
      {
        raqam: '12.2',
        matn: 'Savollar: ish boshladimi, qolayaptimi, kelishilgan haq, sharoit, daromad, tugash sababi, qo‘shimcha yordam',
        holat: 'TOLIQ',
        dalil: [t(K, '"Ishdan ketgan" bo‘lsa SABAB va TUGASH SANASI shart'), k('prisma/schema.prisma', 'qoshimchaYordam KuzatuvJavobi'), k('prisma/schema.prisma', 'sharoitMos')],
      },
      {
        raqam: '12.3',
        matn: '"Noma‘lum", "xodim qayd etgan", "fuqaro bildirgan" va "tekshirilgan" ma‘lumotlar farqlanadi',
        holat: 'TOLIQ',
        dalil: [t(K, 'Javob manbasiz bo‘lmaydi'), t(K, '"Tekshirilgan" dalilsiz tanlanmaydi'), t(K, 'Tekshirilgan (dalilli) yozuvni pastroq daraja bilan QAYTA YOZIB bo‘lmaydi')],
      },
      {
        raqam: '12.4',
        matn: 'Noma‘lum daromad nolga aylantirilmaydi',
        holat: 'TOLIQ',
        dalil: [t(K, 'So‘m maydoni: bo‘sh = null'), t(K, 'Daromad rostdan 0 so‘m bo‘lsa'), t(K, 'Daromad ma’lumoti yo‘q bo‘lsa mediana NULL')],
      },
      {
        raqam: '12.5',
        matn: 'Ishga kirish sanasi, tasdiqlash sanasi va ma‘lumot kiritish sanasi ajratiladi',
        holat: 'TOLIQ',
        dalil: [t(K, 'Tekshiruv yoziladi: muddat, ma’lumot sanasi, kiritilgan sana')],
      },
      {
        raqam: '12.6',
        matn: 'Bir fuqaroning ish joyini almashtirishi yangi fuqaro sifatida sanalmaydi',
        holat: 'TOLIQ',
        dalil: [t(K, 'Ish almashtirgan fuqaro BIR marta sanaladi')],
      },
      {
        raqam: '12.7',
        matn: 'Ko‘rsatkichlarda hisoblash usuli, davr va ma‘lumot manbasi ko‘rinadi',
        holat: 'TOLIQ',
        dalil: [t(K, 'Kuzatuv bloki hisoblash usulini ko‘rsatadi'), t(K, 'Ko‘rsatkich bloki hisoblash usuli, davr, manba')],
      },
    ],
  },

  /* ═══════════════════════════ §13 ═══════════════════════════ */
  {
    raqam: 13,
    sarlavha: 'Ish beruvchi, kurslar va mahalliy buyurtmalar',
    bandlar: [
      {
        raqam: '13.1',
        matn: 'Botda ish beruvchi o‘z e‘lonlarini ko‘radi',
        holat: 'TOLIQ',
        dalil: [t(YO, '"Eʼlonlarim" faqat O‘Z e‘lonlarini ko‘rsatadi'), t(YO, 'Begona e‘lonni ko‘rib bo‘lmaydi')],
      },
      {
        raqam: '13.2',
        matn: 'E‘lonni yopish va muddati tugaganini bilish',
        holat: 'TOLIQ',
        dalil: [t(YO, 'Ish beruvchi FAQAT o‘z e‘lonini yopadi'), t(YO, 'Muddati tugab yopilgan e‘lon haqida xabar')],
      },
      {
        raqam: '13.3',
        matn: 'Muhim tahrirlar qayta moderatsiyaga yuboriladi',
        holat: 'TOLIQ',
        dalil: [t(YO, 'Maosh tahriri: qiymat qo‘llanadi VA e‘lon MODERATSIYAGA qaytadi')],
      },
      {
        raqam: '13.4',
        matn: 'Moderatsiya holati va sababi ko‘rinadi',
        holat: 'TOLIQ',
        dalil: [t(YO, 'Rad etilgan e‘londa SABAB ko‘rinadi'), t(B, 'Рад этиш сабаби сақланади ва иш берувчига кўринади')],
      },
      {
        raqam: '13.5',
        matn: 'Zarur huquqlar doirasida suhbat va ishga qabul natijasi bildiriladi',
        holat: 'TOLIQ',
        dalil: [t(YO, 'Ish beruvchi "ishga qabul" desa'), t(YO, 'Suhbat ketma-ketligi')],
      },
      {
        raqam: '13.6',
        matn: 'Xodimlar panelida vakansiya sifati va yangiligi nazorat qilinadi',
        holat: 'TOLIQ',
        dalil: [t(YO, '21 kundan beri tegilmagan e‘lon "yangilanmagan"'), t(YO, 'Maosh medianadan 4 baravar katta yoki kichik bo‘lsa "gumonli"')],
      },
      {
        raqam: '13.7',
        matn: 'Maosh, jadval, hudud, ko‘nikma va sharoit bo‘yicha moslikni tushuntirish',
        holat: 'TOLIQ',
        dalil: [t(MS, 'Кутган маоши таклифдан паст бўлса балл ошади'), t(MS, 'Маош фарқи катта бўлса огоҳлантириш ёзилади'), t(MS, 'Шу маҳалладаги номзод бошқа маҳалладагидан юқори')],
      },
      {
        raqam: '13.8',
        matn: 'Fuqaro ma‘lumoti ish beruvchiga zarur minimumda va tegishli ruxsat bilan beriladi',
        holat: 'TOLIQ',
        dalil: [t(YO, 'ROZILIKSIZ ma‘lumot yuborilmaydi'), t(YO, 'Ish beruvchi xabari FAQAT tanlangan maydonlarni oladi')],
      },
      {
        raqam: '13.9',
        matn: 'Shubhali yoki chalg‘ituvchi e‘lonlar tekshiriladi',
        holat: 'TOLIQ',
        dalil: [t(YO, 'Pul so‘raydigan ibora lotinda ham'), t(YO, 'Bir telefon ikki XIL korxona nomida')],
      },
      {
        raqam: '13.10',
        matn: 'Mavjud IT vaucher jarayonini buzmasdan kurs katalogi va yo‘llanmalar tartibga solinadi',
        holat: 'TOLIQ',
        dalil: [t(KU, 'IT-shaharcha vaucheri: faqat shu fuqaroning vaucheriga bog‘lanadi')],
      },
      {
        raqam: '13.11',
        matn: 'Qatnashish, tugatish, ko‘nikma, suhbat va ishga joylashish natijasi bog‘lanadi',
        holat: 'TOLIQ',
        dalil: [t(KU, 'Tamomladi: sana, davomat, sertifikat, olingan ko‘nikmalar saqlanadi'), t(KU, 'Ishga bog‘lash: kursdan KEYIN boshlangan ish bog‘lanadi'), t(KU, 'To‘ldirish: faqat tamomlaganlarga; suhbat')],
      },
      {
        raqam: '13.12',
        matn: 'Ish beruvchining haqiqiy talabiga mos kurslar ko‘rsatiladi',
        holat: 'TOLIQ',
        dalil: [t(KU, 'E‘longa mos kurslar: faqat boshlanmagan'), t(KU, 'Moslik: ko‘nikma e‘lon talabida uchrasa')],
      },
      {
        raqam: '13.13',
        matn: 'Ishga joylashish kafolati bo‘lmasa, kafolat deb yozilmaydi',
        holat: 'TOLIQ',
        dalil: [t(KU, '"kafolat" faqat inkor ogohlantirishida')],
      },
      {
        raqam: '13.14',
        matn: 'Kurs samaradorligi faqat o‘qiganlar soni bilan baholanmaydi',
        holat: 'TOLIQ',
        dalil: [t(KU, 'Ko‘rsatkich: tamomlash maxraji'), t(KU, 'Ko‘rsatkich: ish natijasi uch xil'), t(KU, 'Ko‘rsatkich: tamomlaganiga 60 kundan kam')],
      },
      {
        raqam: '13.15',
        matn: 'Mahalliy buyurtmalar: xodimlar boshqaradigan kichik pilot; ommaviy marketplace, fuqaro akkaunti va to‘lov tizimi qo‘shilmagan',
        holat: 'TOLIQ',
        dalil: [t(BU, 'to‘lov ustunlari yo‘q'), t(BU, 'Bajarilganda ikkala tasdiq NOMA‘LUM'), t(BU, 'Tasdiq darajasi: ikki tomonlama / nizo / bir tomonlama')],
      },
    ],
  },

  /* ═══════════════════════════ §14 ═══════════════════════════ */
  {
    raqam: 14,
    sarlavha: 'Murojaatlar va yordamlar katalogi',
    bandlar: [
      {
        raqam: '14.1',
        matn: 'Xodim telefon yoki tashrif orqali kelgan murojaatni qayd eta oladi (muammo, vaqt va kanal, mas‘ul, javob muddati, holat va tarix, natija, qayta ko‘rib chiqish sababi)',
        holat: 'TOLIQ',
        dalil: [
          t(MU, 'Yaratish: raqam M-YYYY-NNNN'),
          t(MU, 'Tarix to‘liq'),
          t(MU, 'Javob: natija turi va matni saqlanadi'),
          t(MU, 'Qayta ochish: sabab va yangi muddat majburiy'),
        ],
      },
      {
        raqam: '14.2',
        matn: 'Javobsiz va muddati o‘tgan murojaatlar ko‘rinadi va ogohlantiriladi',
        holat: 'TOLIQ',
        dalil: [t(MU, 'Muddat holati: kechikkan'), t(MX, 'Reja: KECHIKKAN - masulga VA faol rahbarlarga')],
      },
      {
        raqam: '14.3',
        matn: 'Yordamlar katalogi: dastur nomi, kimga mo‘ljallangani, talablar, hujjatlar, mas‘ul tashkilot, rasmiy manba, amal qilish muddati, oxirgi tekshirilgan sana',
        holat: 'TOLIQ',
        dalil: [
          t(Y, 'Sxema: rasmiy manba, nom, talab, masul tashkilot majburiy'),
          t(Y, 'Yaratish: manba va tekshirilgan sana saqlanadi'),
          k('prisma/schema.prisma', 'nishonGuruh'),
          k('prisma/schema.prisma', 'hujjatlar      String?'),
        ],
      },
      {
        raqam: '14.4',
        matn: 'Noma‘lum talab, subsidiya miqdori yoki integratsiya o‘ylab topilmaydi',
        holat: 'TOLIQ',
        dalil: [t(Y, 'Katalog BO‘SH boshlanadi: migratsiya, seed va kod hech qayerda tayyor dastur yozmaydi')],
      },
      {
        raqam: '14.5',
        matn: 'Eskirgan dastur faol tavsiya sifatida chiqmaydi',
        holat: 'TOLIQ',
        dalil: [t(Y, 'Dastur holati ustuvorligi'), t(Y, 'Tavsiya FAQAT "amalda"'), t(Y, 'Amaldagi dasturlar ro‘yxati: yopiq, muddati tugagan, eskirgan')],
      },
      {
        raqam: '14.6',
        matn: 'Amaldagi shartlar rasmiy manbadan tekshiriladi',
        holat: 'QISMAN',
        dalil: [t(Y, 'Tekshirish kerak: eskirgan / muddati tugagan-u yopilmagan'), t(Y, '"Manbadan tekshirildi" sanani va tekshirganni yangilaydi')],
        cheklov:
          'Katalog BO‘SH boshlanadi: dasturlarni va ularning shartlarini mas‘ul xodim rasmiy manbadan o‘zi kiritadi va "tekshirildi" sanasini belgilaydi; tizim eskirgan dasturni belgilaydi. Bu muhitda internetdagi rasmiy manbalarni tekshirib bo‘lmadi, shuning uchun hech qanday dastur sharti yoki subsidiya miqdori oldindan yozilmadi.',
      },
    ],
  },

  /* ═══════════════════════════ §15 ═══════════════════════════ */
  {
    raqam: 15,
    sarlavha: 'Har bir dashboardni qayta tartiblash',
    bandlar: [
      {
        raqam: '15.1',
        matn: 'Har bir rol (mahalla xodimi, bandlik mutaxassisi, bandlik rahbari, hokim, administrator) uchun alohida vazifalar taxtasi',
        holat: 'QISMAN',
        dalil: [t(V, 'Барча бешта рол учун тахта тузилади'), t(V, 'Ҳар ролнинг сарлавҳаси ҲАР ХИЛ — панел нусхаси эмас'), t(V, 'МФЙ ходими БОШҚА маҳалланинг ишини КЎРМАЙДИ')],
        cheklov:
          'Beshta rol uchun alohida taxta bor va mahalla chegarasi sinalgan. Lekin promptdagi ba‘zi aniq bloklar (mahalla xodimi uchun "bugungi tashriflar" va "oflayn navbat holati", bandlik mutaxassisi uchun "rejalashtirilgan suhbatlar") alohida blok sifatida yo‘q: oflayn navbat holati xatlov sahifasida alohida chiziq bo‘lib ko‘rinadi, suhbat/yo‘llanma holatlari ro‘yxatda.',
      },
      {
        raqam: '15.2',
        matn: 'Bandlik markazi: kuzatuv 30/60/90, javobsiz yo‘llanmalar, dalil navbati, e‘lon sifati; rahbar: moderatsiya, kechikayotgan xizmatlar',
        holat: 'TOLIQ',
        dalil: [t(K, 'Vazifalar taxtasida kuzatuv bloki'), t(YO, 'Vazifalar taxtasida "javobsiz yo‘llanma" va "e‘lon sifati" bloklari bor'), t(MU, 'Vazifalar taxtasi: "murojaatlar" bloki endi HAQIQIY')],
      },
      {
        raqam: '15.3',
        matn: 'Hokim: tasdiqlangan va xodim bildirgan natijalar, barqaror bandlik, daromad o‘zgarishi, resurs ehtiyoji — raqamlar izohlanadi',
        holat: 'TOLIQ',
        dalil: [t(HT, '12a. /panel HOKIM uchun: 9 ta asosiy raqamning har birida'), t(J, 'Брифинг расмий манба сонини АЛОҲИДА айтади'), t(MD, "Hokim jamlamani ko'radi")],
      },
      {
        raqam: '15.4',
        matn: 'Administrator: hisob va huquqlar, audit, integratsiyalar, cron va navbatlar, xatolar, zaxira holati',
        holat: 'TOLIQ',
        dalil: [t(V, 'Интеграция блокида КАЛИТНИНГ ўзи ҲЕЧ ҚАЧОН кўрсатилмайди'), t(MO, 'Vazifalar: "cron-holati" blogi'), t(MO, 'Vazifalar: "zaxira" blogi')],
      },
      {
        raqam: '15.5',
        matn: 'Mahallalar faqat anketalar soni bo‘yicha reyting qilinmaydi: aholi soni/xonadon, boshlang‘ich holat, ma‘lumot qamrovi, xizmat natijasi hisobga olinadi',
        holat: 'QISMAN',
        dalil: [t(V, 'Маҳалла рейтингида НИСБИЙ кўрсаткичлар бор'), t(V, 'Минг хонадонга нисбатан кўрсаткич ТЎҒРИ ҳисобланади'), t(A, '"reyting emas" izohi bor')],
        cheklov:
          'Mahalla solishtirishi NISBIY ko‘rsatkichlar bilan (xonadon soniga nisbatan foiz, 1000 xonadonga) va ma‘lumot qamrovi bilan beriladi; "reyting emas" izohi bilan. Boshlang‘ich holat (masalan, qashshoqlik darajasi) va xizmat natijasi bilan og‘irlangan yagona kompozit indeks YO‘Q — bu bilib turib qilinmadi: noto‘g‘ri og‘irlik adolatsiz reytingga olib keladi.',
      },
      {
        raqam: '15.6',
        matn: 'Oilalarni kamsituvchi ochiq reyting yaratilmaydi',
        holat: 'HUJJAT',
        dalil: [k(AUDIT, 'Oilalar bo‘yicha reyting YO‘Q'), t(A, 'PII: fuqaro ismi, telefoni, manzili, oila boshlig‘i')],
      },
    ],
  },

  /* ═══════════════════════════ §16 ═══════════════════════════ */
  {
    raqam: 16,
    sarlavha: 'Premium, rasmiy va futuristik dizayn',
    bandlar: [
      {
        raqam: '16.1',
        matn: 'Yagona rang/o‘lcham/bo‘shliq tokenlari; yorug‘ va qorong‘i mavzu',
        holat: 'TOLIQ',
        dalil: [t(DZ, 'Yorug‘ va qorong‘i mavzu ikkisi ham belgilangan')],
      },
      {
        raqam: '16.2',
        matn: 'Lotin va kirill alifbolari; alifbo aralashmasligi',
        holat: 'TOLIQ',
        dalil: [t(A, 'Matnlarda alifbo aralashmaydi: lotin alifbosida kirill harf YO‘Q'), k(S('alifbo'), 'ХУЛОСА ВА ТАВСИЯЛАР')],
      },
      {
        raqam: '16.3',
        matn: 'Mobilga mos jadvallar va katta bosish maydonlari',
        holat: 'TOLIQ',
        dalil: [t(DZ, 'Sensorli ekranda bosish maydoni kamida 44 piksel'), t(DZ, 'Chegara sichqonchali kompyuterga TEGMAYDI')],
      },
      {
        raqam: '16.4',
        matn: 'Yuklanish, bo‘sh, xato va muvaffaqiyat holatlari',
        holat: 'TOLIQ',
        dalil: [t(DZ, 'Xatolik sahifasi BOR va o‘zbekcha'), t(DZ, 'Yuklanish skeleti bor'), t(DZ, '404 sahifasi ham o‘zbekcha')],
      },
      {
        raqam: '16.5',
        matn: 'Formada xato maydoniga tez o‘tish',
        holat: 'TOLIQ',
        dalil: [t(DZ, 'Xato topilganda AYNAN o‘sha katakka o‘tiladi')],
      },
      {
        raqam: '16.6',
        matn: 'Ma‘lumot yo‘qolishidan himoya',
        holat: 'TOLIQ',
        dalil: [t(DZ, 'Xatolik ekranida ma‘lumot yo‘qolmagani aytiladi'), t(DZ, 'Anketa O‘RTASIDAN to‘ldirilsa ham saqlanadi')],
      },
      {
        raqam: '16.7',
        matn: 'Klaviatura va ekran o‘quvchi bilan ishlash; yetarli kontrast',
        holat: 'QISMAN',
        dalil: [t(DZ, 'Klaviatura fokusi ko‘rinadi'), t(DZ, 'Skelet ekran o‘quvchiga MATN bilan aytiladi')],
        cheklov:
          'Klaviatura fokusi, ekran o‘quvchi matnlari va diagramma ranglari kontrasti kod/hisob darajasida tekshirilgan. Haqiqiy ekran o‘quvchi (NVDA/TalkBack) bilan qo‘lda sinov va butun interfeys uchun avtomatik kontrast hisobi OLINMAGAN.',
      },
      {
        raqam: '16.8',
        matn: 'Animatsiyani kamaytirish sozlamasi hurmat qilinadi',
        holat: 'TOLIQ',
        dalil: [t(DZ, 'Skelet HARAKATNI KAMAYTIRISH sozlamasini hurmat qiladi'), k('src/app/globals.css', 'prefers-reduced-motion: reduce')],
      },
      {
        raqam: '16.9',
        matn: 'Holat rangdan tashqari matn va belgi orqali tushuntiriladi',
        holat: 'TOLIQ',
        dalil: [t(DZ, 'Holat rangdan TASHQARI matn bilan ham aytiladi'), t(V, 'Ҳолат ФАҚАТ ранг билан айтилмайди — матн ҳам бор')],
      },
      {
        raqam: '16.10',
        matn: 'Hisobotdagi raqam bosilganda hisoblash usuli, manbasi va ruxsat doirasidagi yozuvlar ochiladi',
        holat: 'TOLIQ',
        dalil: [
          t(DZ, 'Raqamning hisoblash usuli ochiladi'),
          t(DZ, 'Yozuvlarga havola RUXSAT doirasidagi sahifaga boradi'),
          t(HT, '12a. /panel HOKIM uchun'),
          t(HT, '12b. /panel BANDLIK RAHBARI uchun'),
          t(HT, '12c. /bandlik'),
        ],
      },
      {
        raqam: '16.11',
        matn: 'Qidiruv va tushunarli filtrlar; saqlangan filtrlar kerak bo‘lgan joylarda',
        holat: 'QISMAN',
        dalil: [t(QM, 'Қидирув бор ва иккала алифбода ишлайди'), t(QM, 'Танлов манзилда сақланади — ҳавола бошқа одамда ҳам очилади'), t(QM, 'МФЙ алмашганда давр йўқолмайди')],
        cheklov:
          'Qidiruv va filtrlar manzilda saqlanadi (havola boshqa odamda ham o‘sha holatda ochiladi, sahifalashda filtr yo‘qolmaydi). Foydalanuvchi o‘zi nom berib saqlaydigan "saqlangan filtrlar" ro‘yxati YO‘Q.',
      },
    ],
  },

  /* ═══════════════════════════ §17 ═══════════════════════════ */
  {
    raqam: 17,
    sarlavha: 'PWA va tezlik',
    bandlar: [
      {
        raqam: '17.1',
        matn: 'Manifest, ikonlar va service worker yakunlangan',
        holat: 'TOLIQ',
        dalil: [t(P, 'Manifest to‘g‘ri: nom, start_url, scope, display, ranglar'), t(P, 'Manifestda 192 va 512 ikonka + maskable bor'), t(P, 'Ikonka fayllarining HAQIQIY o‘lchami manifestdagiga teng')],
      },
      {
        raqam: '17.2',
        matn: 'Ilovani o‘rnatish va oflayn ochilish imkoniyati real tekshiriladi',
        holat: 'QISMAN',
        dalil: [t(P, 'Internet YO‘Q bo‘lsa — oflayn sahifa chiqadi'), t(P, 'O‘rnatishda oflayn sahifa keshga olinadi')],
        cheklov:
          'Service worker mantig‘i sinov muhitida (soxta fetch/cache bilan) har bir yo‘l uchun sinalgan. Haqiqiy telefon/Chrome da "Ilovani o‘rnatish" va oflayn ochilish QO‘LDA tekshirilmagan (bu muhitda brauzer ilovani o‘rnata olmaydi).',
      },
      {
        raqam: '17.3',
        matn: 'Shaxsiy sahifa va API javoblari umumiy keshga joylashtirilmaydi',
        holat: 'TOLIQ',
        dalil: [t(P, 'GET /api/* — worker UMUMAN aralashmaydi'), t(P, 'Sahifa ochish HAR DOIM tarmoqdan, keshga yozilmaydi'), t(P, 'RSC va ma‘lumot so‘rovlari')],
      },
      {
        raqam: '17.4',
        matn: 'Hisob almashganda keshlar aralashmaydi',
        holat: 'TOLIQ',
        dalil: [t(P, 'Oflayn sahifada shaxsiy ma‘lumot YO‘Q'), t(P, 'Worker `localStorage`ga (qoralama, navbat) UMUMAN tegmaydi'), t(N, 'Чиқишда телефон хотираси тозаланади')],
      },
      {
        raqam: '17.5',
        matn: 'Yangilanish paytida qoralama yo‘qolmaydi',
        holat: 'TOLIQ',
        dalil: [t(P, 'Yangilanish sahifani QAYTA YUKLAMAYDI (anketa o‘rtasida)')],
      },
      {
        raqam: '17.6',
        matn: 'Oflayn ishlaydigan va ishlamaydigan amallar aniq ko‘rsatiladi',
        holat: 'TOLIQ',
        dalil: [t(P, 'Oflayn sahifada nima ishlashi VA ishlamasligi yozilgan')],
      },
      {
        raqam: '17.7',
        matn: 'Katta ro‘yxatlar uchun server pagination',
        holat: 'TOLIQ',
        dalil: [t(SH, "sahifaChegarasi: skip/take to'g'ri"), t(SH, "/xonadonlar: \"Keyingi/Oldingi\" qidiruv"), t(V, 'Рўйхатлар ЧЕКЛАНГАН — бутун туман юкланмайди')],
      },
      {
        raqam: '17.8',
        matn: 'Zarur indekslar',
        holat: 'HUJJAT',
        dalil: [k('prisma/schema.prisma', '@@index([userId, holati])'), k('prisma/schema.prisma', '@@index([kalit, vaqt])')],
      },
      {
        raqam: '17.9',
        matn: 'Ortiqcha va takror so‘rovlarni kamaytirish',
        holat: 'TOLIQ',
        dalil: [t(T, 'Bazadagi natija: yangi SQL jamlanma = eski findMany usuli'), t(V, 'Сўровлар ПАРАЛЛЕЛ юборилади')],
      },
      {
        raqam: '17.10',
        matn: 'Katta hisobotlar uchun cheklangan yoki fonli qayta ishlash',
        holat: 'QISMAN',
        dalil: [t(V, 'Рўйхатлар ЧЕКЛАНГАН — бутун туман юкланмайди'), t(T, 'Butun tarix sanalarini tortadigan `findMany` QAYTMAGAN')],
        cheklov:
          'Hisobot ma‘lumoti SQL jamlanma va cheklangan ro‘yxatlar bilan olinadi; PDF/Excel faylini esa brauzer o‘zi yaratadi. Fonli (navbat/worker) hisobot yaratish YO‘Q — hozirgi hajmda kerak emas.',
      },
      {
        raqam: '17.11',
        matn: 'Grafiklar zarur paytda yuklanadi',
        holat: 'TOLIQ',
        dalil: [t(T, 'Kechiktirilgan diagramma: faqat TUR import qilinadi, bo‘lak dinamik'), t(T, 'Hech bir sahifa `grafiklar` ni to‘g‘ridan-to‘g‘ri import qilmaydi')],
      },
      {
        raqam: '17.12',
        matn: 'Sust internet va oddiy qurilmada o‘lchash; o‘lchovsiz "tezlashdi" deb hisobot bermaslik',
        holat: 'QISMAN',
        dalil: [t(T, 'CI qurishdan keyin hajm byudjetini tekshiradi'), k('scripts/hajm-byudjeti.ts', 'byudjet')],
        cheklov:
          'O‘lchanadigan narsa: sahifalar JavaScript hajmi (hajm byudjeti, CI da). Sust internetda va oddiy telefonda REAL yuklanish vaqti (Lighthouse/RUM) o‘lchanmagan, shuning uchun hech qayerda "tezlashdi" deb da‘vo qilinmaydi.',
      },
    ],
  },

  /* ═══════════════════════════ §18 ═══════════════════════════ */
  {
    raqam: 18,
    sarlavha: 'AI yordamchi (xodimlar va rahbarlar uchun)',
    bandlar: [
      {
        raqam: '18.1',
        matn: 'Fuqaro uchun chatbot yaratilmagan: agent faqat hokim, bandlik, rahbar va administratorga',
        holat: 'TOLIQ',
        dalil: [t(A, 'Agent faqat hokim, bandlik, rahbar, administratorga ochiq'), t(HT, '13a. Hudhud API kirishsiz yopiq'), t(HT, '13b. Mahalla xodimi (YETTILIK)')],
      },
      {
        raqam: '18.2',
        matn: 'Manbali xulosa; tavsiyada qaysi ma‘lumot ishlatilgani ko‘rinadi',
        holat: 'TOLIQ',
        dalil: [t(A, 'korsatkichlar (butun tuman): xatlovdan o‘tgan xonadon soni'), t(A, 'Sikl: model asbob chaqiradi → natija modelga qaytadi → yakuniy javob; manbalar')],
      },
      {
        raqam: '18.3',
        matn: 'Oilaviy reja takliflari',
        holat: 'QISMAN',
        dalil: [t(AI, 'Ҳар бир тавсияда масъул, муддат ва ўлчов талаб қилинади'), t(AI, 'Хулоса брифдан фойдаланади, эски қатор тўкишдан эмас')],
        cheklov:
          'AI hokim/rahbar uchun TUMAN va MAHALLA darajasidagi tavsiya beradi (har tavsiyada mas‘ul, muddat, o‘lchov). Alohida OILA uchun reja taklif qiladigan asbob yo‘q: agent oila/fuqaro ma‘lumotini ko‘rmaydi (shaxsiy ma‘lumotsiz qoida) — oilaviy reja xodim tomonidan tuziladi.',
      },
      {
        raqam: '18.4',
        matn: 'Mos vakansiya sabablarini tushuntirish',
        holat: 'QISMAN',
        dalil: [t(MS, 'Кутган маоши таклифдан паст бўлса балл ошади'), t(KU, 'Moslik: ko‘nikma e‘lon talabida uchrasa')],
        cheklov:
          'Moslik SABABLARI (maosh, hudud, ko‘nikma, tosiq) xodimlar panelida hisoblanadi va ko‘rsatiladi. Agentning o‘zida "nega bu nomzod mos?" asbobi yo‘q: bu fuqaro darajasidagi savol va agent fuqaro ma‘lumotini ko‘rmaydi.',
      },
      {
        raqam: '18.5',
        matn: 'Kechikkan jarayonlarni aniqlash',
        holat: 'TOLIQ',
        dalil: [t(A, 'Murojaat bor, lekin murojaatlar_holati faqat sonlar: muddati o‘tgan = 1'), t(A, 'Zaxira: "muddati o‘tgan murojaatlar"')],
      },
      {
        raqam: '18.6',
        matn: 'Hisobotni sodda tilda izohlash',
        holat: 'TOLIQ',
        dalil: [t(A, 'Zaxira: "xatlov qanday ketyapti?"'), t(A, 'Hisobot yuklash asbobi'), t(AI, 'Хулоса брифдан фойдаланади')],
      },
      {
        raqam: '18.7',
        matn: 'Ma‘lumot yetishmasa, bu aytiladi',
        holat: 'TOLIQ',
        dalil: [t(A, 'oila_bolimlari: bo‘lim nomi bo‘yicha jamlama; xatlov bo‘lmagan mahallada "yetishmayotgan"'), t(AI, 'Қамров паст бўлса ишончлилик ОГОҲЛАНТИРИЛАДИ')],
      },
      {
        raqam: '18.8',
        matn: 'Shaxsiy ma‘lumotlar tashqi modelga zaruratsiz yuborilmaydi',
        holat: 'TOLIQ',
        dalil: [t(A, 'PII: fuqaro ismi, telefoni, manzili, oila boshlig‘i'), t(A, 'Hisob matn SAQLAMAYDI'), t(AI, 'Брифга шахсий маълумот тушмайди')],
      },
      {
        raqam: '18.9',
        matn: 'AI matni tekshirilgan dalil sifatida hisoblanmaydi',
        holat: 'TOLIQ',
        dalil: [t(A, 'Taklif: asbob "amalni_taklif_qil" hali BAJARMAYDI'), t(A, 'Tasdiq: mavjud bo‘lmagan id — "topilmadi"; model YOZISH amalini o‘zi tasdiqlay olmaydi'), t(J, 'Тахмин ҲЕЧ ҚАЧОН «расмий» деб чиқмайди')],
      },
      {
        raqam: '18.10',
        matn: 'Yordamni rad etish yoki fuqaroni imkoniyatdan mahrum qilish qarorini AI chiqarmaydi',
        holat: 'TOLIQ',
        dalil: [t(A, 'Tizim ko‘rsatmasi: ism, rol, Toshkent sanasi'), t(A, 'Taklif: administrator ikkala amalni taklif qila oladi'), k(AGH, 'qaror')],
      },
      {
        raqam: '18.11',
        matn: 'Yozish amallari vakolatli xodim tasdig‘ini talab qiladi',
        holat: 'TOLIQ',
        dalil: [t(A, 'Tasdiq BIR MARTA'), t(A, 'Tasdiq: BOSHQA xodimning taklifini tasdiqlab bo‘lmaydi'), t(HT, '13i. Tasdiq oqimi HTTP orqali')],
      },
      {
        raqam: '18.12',
        matn: 'Xarajat limitlari va foydalanish hisobi bor',
        holat: 'TOLIQ',
        dalil: [t(A, 'Limit ATOMAR'), t(A, 'Oylik umumiy to‘siq'), t(A, 'Server ovoz limiti (soniya)'), t(HT, '13h. Daqiqalik chegara')],
      },
      {
        raqam: '18.13',
        matn: 'AI ishlamasa asosiy xizmatlar to‘xtamaydi',
        holat: 'TOLIQ',
        dalil: [t(A, 'Xizmat: model yiqilsa — qoidali rejim'), t(A, 'Xizmat: kalit yo‘q (model=null)'), t(HT, '13d. Hokim "xatlov qanday ketyapti"')],
      },
    ],
  },

  /* ═══════════════════════════ §19 ═══════════════════════════ */
  {
    raqam: 19,
    sarlavha: 'Monitoring, zaxira va kengayishga tayyorlik',
    bandlar: [
      {
        raqam: '19.1',
        matn: 'Cron oxirgi muvaffaqiyatli ishlagan vaqtini ko‘rsatadi',
        holat: 'TOLIQ',
        dalil: [t(MO, "ishlarHolati (baza): yozuv yo'q"), t(MO, "ishniBaholash: yozuv yo'q - HECH_QACHON")],
      },
      {
        raqam: '19.2',
        matn: 'Navbatdagi, xatodagi va qayta urinishdagi xabarlar ko‘rinadi',
        holat: 'TOLIQ',
        dalil: [t(MO, "Navbat ko'rinishi: kutilmoqda / qayta urinish / xato")],
      },
      {
        raqam: '19.3',
        matn: 'Importlar va muhim amallar uchun kuzatiladigan identifikatorlar bor',
        holat: 'TOLIQ',
        dalil: [t(MO, 'Kuzatiladigan iz: serverXatosi iz_ identifikator beradi'), t(RY, 'Ko\'rish: server yozuv yaratadi'), t(HT, '14b. Reyestr "ko\'rish"')],
      },
      {
        raqam: '19.4',
        matn: 'Xatolar maxfiy ma‘lumotlarsiz yig‘iladi',
        holat: 'TOLIQ',
        dalil: [t(MO, 'Xato jurnali: bazaga SIR TUSHMAYDI'), t(MO, 'Tozalash: baza ulanish satri, bot tokeni (URL ichida)')],
      },
      {
        raqam: '19.5',
        matn: 'Zaxira nusxadan tiklash alohida sinov muhitida tekshiriladi',
        holat: 'QISMAN',
        dalil: [t(Z, 'HAQIQIY TIKLASH: olingan nusxa alohida bazaga tiklanadi'), t(Z, "BO'SH / KESILGAN nusxa")],
        cheklov:
          'Mahalliy pg_dump → alohida bazaga pg_restore → qatorlar soni solishtirildi (haqiqiy tiklash sinaldi). PRODUCTION (Supabase) zaxirasidan tiklash hali SINALMAGAN: bu faqat egasi qiladigan ish va juda muhim — natijasi tizimdagi "zaxira" blokida yozib qo‘yiladi.',
      },
      {
        raqam: '19.6',
        matn: 'Ma‘lumot yo‘qotish (RPO) va xizmatni tiklash (RTO) maqsadlari hujjatlashtirilgan',
        holat: 'HUJJAT',
        dalil: [k(ZAX, 'RPO'), k(ZAX, 'RTO')],
      },
      {
        raqam: '19.7',
        matn: 'Boshqa tumanlarga chiqish: hudud bo‘yicha huquq chegarasi loyihalangan',
        holat: 'TOLIQ',
        dalil: [t(HU, "Hozirgi izolyatsiya o'zgarmagan"), t(HU, '"MAHALLA" jadvallarida haqiqatan'), k(TUMAN, 'tumanId')],
      },
      {
        raqam: '19.8',
        matn: 'Yangi tuman qo‘shilganda mavjud ma‘lumotlar ochilib qolmaydi',
        holat: 'QISMAN',
        dalil: [t(HU, "Har bir jadval hudud xaritasida TASNIFLANGAN"), k(TUMAN, 'Muhim')],
        cheklov:
          'Hozir tizim bitta tuman uchun; sxemada `tumanId` YO‘Q. Har bir jadval hudud xaritasida tasniflangan (yangi jadval qo‘shilsa sinov yiqiladi) va ko‘chish rejasi hujjatda (KOP-TUMAN.md), lekin yangi tuman qo‘shishdan oldin `tumanId` ko‘chirishi bajarilishi SHART — bajarilmaguncha yangi tuman qo‘shilmasin.',
      },
      {
        raqam: '19.9',
        matn: 'Bir tumanga tegishli sozlama va kataloglar aniqlangan',
        holat: 'TOLIQ',
        dalil: [t(HU, "Tuman sozlamalari ro'yxatidagi fayl/kataloglar mavjud")],
      },
      {
        raqam: '19.10',
        matn: 'Hozir zarur bo‘lmagan mikroservis yoki murakkab infratuzilma joriy qilinmagan',
        holat: 'HUJJAT',
        dalil: [k(TUMAN, 'Mikroservislar, xabar brokerlari, alohida API shlyuzlari — kerak emas')],
      },
    ],
  },

  /* ═══════════════════════════ §20 ═══════════════════════════ */
  {
    raqam: 20,
    sarlavha: 'Test va qabul qilish mezonlari',
    bandlar: [
      {
        raqam: '20.1',
        matn: 'Muhim jarayonlar haqiqiy xatti-harakat orqali tekshiriladi (faqat kodda so‘z borligi emas)',
        holat: 'TOLIQ',
        dalil: [t(RX, 'Hech bir holat FAQAT kod-grep bilan qoplanmagan'), t(HT, '14d. Yozish: to\'g\'ri fayl bilan 200')],
      },
      {
        raqam: '20.2',
        matn: '15 majburiy regressiya holati xaritalangan va himoyalangan',
        holat: 'TOLIQ',
        dalil: [t(RX, 'Hech bir holat FAQAT kod-grep bilan qoplanmagan'), k(RX, 'Parallel moderatorlardan faqat bittasining qarori')],
      },
      {
        raqam: '20.3',
        matn: 'Testlar production bazasida ishlatilmaydi; sinov ma‘lumotlari sun‘iy',
        holat: 'HUJJAT',
        dalil: [k(RY, 'Bu sinov FAQAT mahalliy bazada ishlaydi'), k(W, 'Bu sinov FAQAT mahalliy bazada ishlaydi'), k(HT, 'Sinov FAQAT mahalliy bazada ishlaydi')],
      },
      {
        raqam: '20.4',
        matn: 'Tashqi foydalanuvchilarga sinov xabari yuborilmaydi',
        holat: 'HUJJAT',
        dalil: [k(W, "Tashqi dunyo: sinov ichidan Telegram'ga HECH NIMA chiqmaydi"), k(HT, "AI kalitlari BO'SH")],
      },
      {
        raqam: '20.5',
        matn: 'TypeScript, lint, mavjud testlar, integratsion testlar va build natijalari ko‘rsatiladi',
        holat: 'HUJJAT',
        dalil: [k('scripts/ci-taqlid.sh', 'npx tsc --noEmit'), k('scripts/ci-taqlid.sh', 'npm run lint'), k(TOPSH, 'tekshirildi')],
      },
      {
        raqam: '20.6',
        matn: 'Bajarilmagan sinov "o‘tdi" deb yozilmaydi',
        holat: 'HUJJAT',
        dalil: [k(TOPSH, 'TEKSHIRILMAGAN'), k(AUDIT, 'Tekshirilmagan narsalar')],
      },
    ],
  },

  /* ═══════════════════════════ §21 ═══════════════════════════ */
  {
    raqam: 21,
    sarlavha: 'Ishni topshirish tartibi',
    bandlar: [
      {
        raqam: '21.1',
        matn: 'Har bosqich oxirida: nima topildi, tuzatildi, foydalanuvchi uchun nima o‘zgardi, qanday tekshirildi, qaysi cheklovlar qoldi, keyingi ustuvor ish',
        holat: 'HUJJAT',
        dalil: [k(TOPSH, 'Keyingi ustuvorlik'), k(TOPSH, 'Nima TEKSHIRILMAGAN'), k(AUDIT, 'Keyingi ustuvor ish')],
      },
      {
        raqam: '21.2',
        matn: 'Migratsiyalar mavjud ma‘lumotni saqlaydi; production bazasi reset qilinmaydi',
        holat: 'TOLIQ',
        dalil: [t(MG, 'Янги миграциялар ФАҚАТ ҚЎШАДИ'), t(MG, 'Қўриқчи фақат VERCEL_ENV=production да ишлайди'), t(D, 'Миграция ҲЕЧ НАРСА ЎЧИРМАЙДИ')],
      },
      {
        raqam: '21.3',
        matn: 'Production migratsiyasi va deploydan oldin tayyor o‘zgarishlar, tekshiruv natijalari hamda qaytarish rejasi taqdim etiladi',
        holat: 'HUJJAT',
        dalil: [k(TOPSH, 'Orqaga qaytarish'), k('hujjatlar/JOYLASHTIRISH.md', 'qaytarish')],
      },
      {
        raqam: '21.4',
        matn: 'Integratsiya kaliti yoki ruxsat yetishmasa, soxta integratsiya yozilmaydi — aniq aytiladi',
        holat: 'HUJJAT',
        dalil: [k(INT, 'OneID'), k(INT, 'kalit')],
      },
    ],
  },
];

void SN;
