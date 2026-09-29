import { prisma } from './prisma';
import { xabarQoshish, type YangiXabar } from './xabarnoma';
import { KUN_MS, faolMahallalar, harakat, kunBoshi, tumanHolati } from './tuman-holati';
import { sanaUzun } from './hisobot/sana';

/**
 * ============================================================
 *  ҲОКИМНИНГ ЭРТАЛАБКИ БРИФИНГИ
 *
 *  ── Нега керак ──
 *
 *  Раҳбар тизимга КИРМАЙДИ. У кун бошида телефонини очади ва
 *  «нима бўлди» деб сўрайди. Агар жавоб учун сайтга кириб,
 *  панелни очиб, филтрни танлаш керак бўлса — у буни
 *  қилмайди, ходимдан оғзаки сўрайди.
 *
 *  Оғзаки жавоб эса ҳар доим яхши бўлиб чиқади.
 *
 *  Шунинг учун тизим ўзи айтади: ҳар куни эрталаб, сўрамасдан.
 *
 *  ── Нега «кеча» ва «жами» бирга ──
 *
 *  Фақат «жами» берилса — ҳаракат кўринмайди: 0,4% бугун ҳам
 *  0,4%. Фақат «кеча» берилса — миқёс кўринмайди: «12 та
 *  хатлов» кўп ёки озлигини айтмайди.
 *
 *  Иккови бирга турганда ҳар иккала савол ҳам жавоб топади.
 *
 *  ── Нега «эътибор» бўлими охирида ──
 *
 *  Раҳбар биринчи икки сатрни албатта ўқийди, охиригача эса
 *  ҳар доим ҳам етиб бормайди. Шунинг учун РАҚАМ тепада,
 *  ТАЛАБ пастда: рақам ўқилса, талаб ҳам ўқилади; тескариси
 *  эса ишламайди.
 * ============================================================
 */

function raqam(n: number): string {
  return n.toLocaleString('ru-RU').replace(/ /g, '\u00a0');
}

function foiz(qism: number, butun: number): string {
  if (butun <= 0) return '0%';
  const f = (qism / butun) * 100;
  return `${(Math.round(f * 10) / 10).toString().replace('.', ',')}%`;
}

/** Кечаги ўзгариш — ўсиш белгиси билан */
function ozgarish(n: number, birlik: string): string {
  return n > 0 ? `+${raqam(n)} ${birlik}` : `ўзгармади`;
}

/** Кеча энг кўп ишлаган нечта маҳалла номи билан айтилади */
const SAF_SONI = 3;

export interface Brifing {
  matn: string;
  /** Ҳеч нарса ўзгармаган бўлса ҳам юборилади — жимлик ҳам хабар */
  sana: Date;
}

/**
 * Брифинг матнини ясайди.
 *
 * Сана параметри синов учун: «кеча» ни аниқ белгилаб, натижани
 * текшириш мумкин бўлади.
 */
export async function brifingYasa(hozir: Date = new Date()): Promise<Brifing> {
  const bugunBoshi = kunBoshi(hozir);
  const kechaBoshi = new Date(bugunBoshi.getTime() - KUN_MS);

  /*
   * Учала сўров ҲАМ `tuman-holati` дан келади — табло ва
   * брифинг бир хил рақам кўрсатишининг ягона кафолати шу.
   */
  const [h, kecha, saf] = await Promise.all([
    tumanHolati(hozir),
    harakat(kechaBoshi, bugunBoshi),
    faolMahallalar(kechaBoshi, bugunBoshi, SAF_SONI),
  ]);

  /*
   * `toLocaleDateString('ru-RU')` ишлатилмайди — у «28 сентября»
   * деб РУСЧА қайтаради. Ундан ташқари у СЕРВЕРНИНГ вақт
   * минтақасини ўқийди: UTC да юрадиган серверда тонгги
   * оралиқ бир кун орқага силжирди.
   */
  const sana = sanaUzun(kechaBoshi, false);

  const satrlar: string[] = [
    '<b>Хатирчи бандлик — эрталабки маълумот</b>',
    `${sana} ҳолатига`,
    '',
    '<b>КЕЧА</b>',
    `• Хатлов: ${ozgarish(kecha.xatlov, 'хонадон')}`,
    `• Шахсий анкета: ${ozgarish(kecha.anketa, 'та')}`,
    `• Ишга жойлашган: ${ozgarish(kecha.joylashtirilgan, 'та')}`,
  ];

  if (kecha.radEtgan > 0) {
    satrlar.push(`• Таклифдан бош тортган: ${raqam(kecha.radEtgan)} та`);
  }

  if (saf.length > 0) {
    satrlar.push(
      '',
      'Энг фаол маҳаллалар:',
      ...saf.map((s, i) => `  ${i + 1}. ${s.nomiKirill} — ${raqam(s.xonadon)} хонадон`)
    );
  }

  satrlar.push(
    '',
    '<b>ЖАМИ</b>',
    `• Хатлов қамрови: ${raqam(h.xatlovXonadon)} / ${raqam(h.bazaXonadon)} · ${foiz(h.xatlovXonadon, h.bazaXonadon)}`,
    `• Хатлов топган ишсиз: ${raqam(h.topilganIshsiz)} та`,
    `• Шахсий анкетаси бор: ${raqam(h.anketa)} та`,
    `• Ишга жойлаштирилган: ${raqam(h.joylashtirilgan)} та`,
    `• Очиқ иш ўрни: ${raqam(h.ochiqOrin)} та`
  );

  /*
   * ── ЭЪТИБОР ТАЛАБ ҚИЛАДИГАНЛАР ──
   *
   * Фақат ҲАҚИҚАТАН муаммо бўлганлари ёзилади. Ҳар куни бир
   * хил рўйхат чиқса, раҳбар уни ўқимай қўяди — ва ўша куни
   * ҳақиқий муаммо ҳам ўтиб кетади.
   */
  const etibor: string[] = [];

  if (h.boshlamaganMahalla > 0) {
    etibor.push(
      `• <b>${raqam(h.boshlamaganMahalla)} та маҳалла</b> хатловни ҳали бошламаган (${h.jamiMahalla} тадан)`
    );
  }
  if (h.anketasiz > 0) {
    etibor.push(
      `• <b>${raqam(h.anketasiz)} та фуқаро</b> топилган, аммо шахсий анкетаси тўлдирилмаган — уларга таклиф бериб бўлмайди`
    );
  }
  if (h.ulanmaganXodim > 0) {
    etibor.push(
      `• <b>${raqam(h.ulanmaganXodim)} та ходим</b> ботга уланмаган — уларнинг маҳалласига эълон хабари бормайди`
    );
  }
  if (h.kechikkanTopshiriq > 0) {
    etibor.push(`• <b>${raqam(h.kechikkanTopshiriq)} та топшириқнинг</b> муддати ўтган`);
  }
  if (h.ochiqOrin === 0) {
    etibor.push('• Очиқ иш ўрни йўқ — таклиф қиладиган нарса қолмади');
  }

  if (etibor.length > 0) {
    satrlar.push('', '<b>ЭЪТИБОР</b>', ...etibor);
  } else {
    satrlar.push('', '<b>ЭЪТИБОР</b>', '• Алоҳида чора талаб қиладиган ҳолат йўқ.');
  }

  return { matn: satrlar.join('\n'), sana: kechaBoshi };
}

/**
 * Брифингни навбатга қўяди.
 *
 * Кимга: ҳоким, бандлик раҳбари ва администратор. Маҳалла
 * ходимига эмас — унга туман кесимидаги сон керак эмас, ўз
 * маҳалласи керак, ва у меню орқали кўради.
 */
export async function brifingniYubor(hozir: Date = new Date()): Promise<number> {
  const { matn } = await brifingYasa(hozir);

  const oluvchilar = await prisma.user.findMany({
    where: { rol: { in: ['HOKIM', 'BANDLIK_RAHBAR', 'ADMIN'] }, faol: true },
    select: { id: true },
  });
  if (oluvchilar.length === 0) return 0;

  const xabarlar: YangiXabar[] = oluvchilar.map((o) => ({
    userId: o.id,
    turi: 'ERTALABKI_BRIFING' as const,
    matn,
    bogliqTuri: 'Brifing',
    bogliqId: hozir.toISOString().slice(0, 10),
  }));

  return xabarQoshish(xabarlar);
}
