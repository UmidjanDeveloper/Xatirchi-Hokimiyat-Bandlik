import { hududBahosi } from './hudud-qidiruv';
import { yoshniBaho } from './bandlik-yoshi';
import { HAYDOVCHILIK_TOIFASI, KASB_YONALISHI, kirillcha } from './constants';

/**
 * ============================================================
 *  ЭЪЛОН ↔ ФУҚАРО МОСЛИГИ
 *
 *  Бандлик раҳбари бўш иш ўрнини қўйганда туғиладиган савол:
 *  «бу ўринга КИМ тўғри келади?» Илгари жавоб йўқ эди — мутахассис
 *  рўйхатни кўз билан кўриб чиқарди ва 60 нафар ишсиз бўлган
 *  маҳаллада бу амалда бажарилмас эди.
 *
 *  Бу файл шу саволни ҲИСОБЛАБ беради. Уч қоида:
 *
 *  1. ФАҚАТ ТЕГИШЛИ МЕЗОН САНАЛАДИ. Эълон ҳайдовчилик гувоҳномасини
 *     талаб қилмаса, гувоҳномаси йўқлиги учун ҳеч ким жазоланмайди.
 *     Шунинг учун балл «йиғилган / мумкин бўлган» нисбати сифатида
 *     ҳисобланади, қатъий 100 баллдан эмас.
 *
 *  2. ҲАР БИР БАЛЛ ТУШУНТИРИЛАДИ. Мутахассис «нега бу одам
 *     биринчи турибди» деб сўрайди — рўйхатда сабаблар ёзилган
 *     бўлади. Тушунтирилмайдиган тартиб — ишонилмайдиган тартиб.
 *
 *  3. БУ ТАВСИЯ, ҚАРОР ЭМАС. Тўсиқ (нафақа ёши, аллақачон
 *     жойлашган) кўрсатилади, лекин рўйхатдан ўчирилмайди:
 *     қарорни одам қабул қилади.
 * ============================================================
 */

/** Мослик ҳисоблаш учун эълондан керакли майдонлар */
export interface OrinMaydonlari {
  lavozim: string;
  yonalish: string | null;
  talablar: string | null;
  maosh: bigint | number | null;
  mahallaId: string;
}

/** Мослик ҳисоблаш учун фуқародан керакли майдонлар */
export interface NomzodMaydonlari {
  mahallaId: string;
  jinsi: string;
  tugilganSana: Date | string | null;
  malumoti: string | null;
  mutaxassisligi: string | null;
  xohlaganIsh: string | null;
  organmoqchiKasb: string | null;
  oxirgiIshJoyi: string | null;
  avvalgiIshJoyi: string | null;
  kutilayotganMaosh: bigint | number | null;
  ishgaTayyorligi: string | null;
  haydovchilikGuvohnomasi: boolean;
  haydovchilikToifasi: string[];
  takliflar: string[];
  vacancyId: string | null;
}

export type MoslikDarajasi = 'yuqori' | 'orta' | 'past';

export interface Moslik {
  /** 0 дан 100 гача — фақат ТЕГИШЛИ мезонлар бўйича */
  ball: number;
  daraja: MoslikDarajasi;
  /** Нега мос келади — кирилл матн */
  sabablar: string[];
  /** Нимага эътибор бериш керак — кирилл матн */
  ogohlantirishlar: string[];
  /** Жиддий тўсиқ бўлса — кирилл матн, акс ҳолда `null` */
  tosiq: string | null;
}

/**
 * Даража кўриниши — `tavsiyalar.ts` даги билан бир хил услубда:
 * ранг CSS токендан келади, Tailwind синфи орқали.
 */
export const MOSLIK_KORINISHI: Record<
  MoslikDarajasi,
  { nomi: string; sinf: string }
> = {
  yuqori: { nomi: 'Юқори мослик', sinf: 'bg-ok-bg text-ok' },
  orta: { nomi: 'Ўрта мослик', sinf: 'bg-warn-bg text-warn' },
  past: { nomi: 'Паст мослик', sinf: 'bg-surface-muted text-ink-faint' },
};

/** `bigint | number | null` ни оддий сонга келтиради */
function son(q: bigint | number | null | undefined): number | null {
  if (q == null) return null;
  const n = Number(q);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Маошни «2,5 млн» кўринишида ёзади */
function million(q: number): string {
  return `${(q / 1_000_000).toFixed(1).replace('.', ',')} млн`;
}

/**
 * Эълон ҳайдовчилик гувоҳномасини талаб қиладими — ва қайси тоифани.
 *
 * Матнда «B» ҳарфи ўзича учраши мумкин, шунинг учун аввал
 * ҲАЙДОВЧИЛИК КОНТЕКСТИ қидирилади («ҳайдовчи», «тоифа»,
 * «гувоҳнома», «права»). Контекст бўлмаса, тоифа ҳам изланмайди —
 * акс ҳолда «Ғ. Аҳмедов МЧЖ» даги «C» тоифа деб ўқиларди.
 */
export function haydovchilikTalabi(
  matn: string
): { talabQilinadi: boolean; toifalar: string[] } {
  const past = matn.toLowerCase();
  const kontekst =
    /ҳайдовчи|хайдовчи|haydovchi|шофёр|shofyor|тоифа|toifa|гувоҳнома|guvohnoma|права|prava|категор/.test(
      past
    );
  if (!kontekst) return { talabQilinadi: false, toifalar: [] };

  const bor = new Set<string>();
  // Узун тоифа аввал текширилади: «CE» ни «C» деб ўқиб қўймаслик учун
  const tartib = [...HAYDOVCHILIK_TOIFASI].sort(
    (a, b) => b.qiymat.length - a.qiymat.length
  );
  let qoldiq = matn.toUpperCase();
  for (const t of tartib) {
    const naqsh = new RegExp(`(^|[^A-Z0-9])${t.qiymat}([^A-Z0-9]|$)`);
    if (naqsh.test(qoldiq)) {
      bor.add(t.qiymat);
      qoldiq = qoldiq.replace(naqsh, '$1 $2');
    }
  }
  return { talabQilinadi: true, toifalar: [...bor] };
}

/**
 * Икки матн қанчалик бир кассага тушишини баҳолайди (0..1).
 *
 * Таққослаш ФОНЕТИК калит орқали бажарилади, шунинг учун
 * «пайвандчи» билан «payvandchi» ва «Payvandchi (2-разряд)»
 * бир хил ишлайди.
 */
function matnMosligi(orin: string, nomzod: string | null): number {
  if (!nomzod || nomzod.trim().length < 3) return 0;
  const baho = hududBahosi(orin, nomzod);
  if (baho >= 90) return 1;
  if (baho >= 70) return 0.85;
  if (baho >= 55) return 0.6;
  if (baho >= 50) return 0.45;
  return 0;
}

interface Mezon {
  olingan: number;
  maksimal: number;
}

/**
 * Эълон билан фуқаро мослигини ҳисоблайди.
 *
 * @param o эълон майдонлари
 * @param n фуқаро майдонлари
 */
export function moslikniHisobla(o: OrinMaydonlari, n: NomzodMaydonlari): Moslik {
  const mezonlar: Mezon[] = [];
  const sabablar: string[] = [];
  const ogohlantirishlar: string[] = [];
  let tosiq: string | null = null;

  const qosh = (olingan: number, maksimal: number) =>
    mezonlar.push({ olingan, maksimal });

  /* ── 1. Касб мослиги (45) ──────────────────────────────────
     Энг кучли мезон. Фуқаронинг беш майдони эълон лавозими
     билан таққосланади, лекин ҳар бирининг ВАЗНИ ҳар хил:
     мутахассислиги — ҳужжат билан тасдиқланган, «ўрганмоқчи»
     эса ҳали ният.                                            */
  const manbalar: [string | null, number, string][] = [
    [n.mutaxassisligi, 1, 'мутахассислиги'],
    [n.xohlaganIsh, 1, 'хоҳлаган иши'],
    [n.oxirgiIshJoyi, 0.85, 'охирги иш жойи'],
    [n.avvalgiIshJoyi, 0.8, 'аввалги иш жойи'],
    [n.organmoqchiKasb, 0.7, 'ўрганмоқчи касби'],
  ];

  let engYaxshi = 0;
  let engYaxshiManba = '';
  for (const [matn, vazn, nomi] of manbalar) {
    const q = matnMosligi(o.lavozim, matn) * vazn;
    if (q > engYaxshi) {
      engYaxshi = q;
      engYaxshiManba = `${nomi} — «${matn}»`;
    }
  }
  qosh(45 * engYaxshi, 45);
  if (engYaxshi >= 0.8) {
    sabablar.push(`Касби тўғри келади: ${engYaxshiManba}`);
  } else if (engYaxshi >= 0.4) {
    sabablar.push(`Касби яқин: ${engYaxshiManba}`);
  }

  /* ── 2. Йўналиш (15) ───────────────────────────────────────
     Каталогдаги йўналиш лавозимдан кенгроқ: «Қурилиш» ичига
     ғишт терувчи ҳам, сувоқчи ҳам киради. Лавозим тўғри
     келмаса ҳам, йўналиш мос бўлса — сухбатга таклиф қилишга
     арзийди.                                                  */
  if (o.yonalish) {
    const yonalishKirill = kirillcha(KASB_YONALISHI, o.yonalish);
    const yq = Math.max(
      matnMosligi(o.yonalish, n.mutaxassisligi),
      matnMosligi(o.yonalish, n.xohlaganIsh),
      matnMosligi(o.yonalish, n.organmoqchiKasb),
      matnMosligi(yonalishKirill, n.xohlaganIsh),
      matnMosligi(yonalishKirill, n.mutaxassisligi)
    );
    qosh(15 * yq, 15);
    if (yq >= 0.6) sabablar.push(`Йўналиши мос: ${yonalishKirill}`);
  }

  /* ── 3. Маош кутиши (15) ───────────────────────────────────
     Энг кўп учрайдиган рад сабаби шу: фуқаро 5 млн кутади,
     эълонда 2,5 млн. Буни СУҲБАТДАН ОЛДИН кўрсатиш керак,
     акс ҳолда икки томон ҳам вақтини йўқотади.                */
  const taklifMaosh = son(o.maosh);
  const kutish = son(n.kutilayotganMaosh);
  if (taklifMaosh && kutish) {
    if (kutish <= taklifMaosh) {
      qosh(15, 15);
      sabablar.push(
        `Кутган маоши (${million(kutish)}) таклифдан ошмайди`
      );
    } else if (kutish <= taklifMaosh * 1.2) {
      qosh(9, 15);
      ogohlantirishlar.push(
        `Кутган маоши ${million(kutish)} — таклифдан бироз юқори`
      );
    } else {
      qosh(0, 15);
      ogohlantirishlar.push(
        `Кутган маоши ${million(kutish)}, таклиф ${million(taklifMaosh)} — фарқ катта`
      );
    }
  }

  /* ── 4. Ҳайдовчилик гувоҳномаси (15) ──────────────────────
     Фақат эълон талаб қилганда ҳисобланади.                   */
  const talab = haydovchilikTalabi(`${o.lavozim} ${o.talablar ?? ''}`);
  if (talab.talabQilinadi) {
    if (!n.haydovchilikGuvohnomasi) {
      qosh(0, 15);
      ogohlantirishlar.push('Ҳайдовчилик гувоҳномаси йўқ — эълон талаб қилади');
    } else if (talab.toifalar.length === 0) {
      qosh(12, 15);
      sabablar.push('Ҳайдовчилик гувоҳномаси бор');
    } else {
      const bori = talab.toifalar.filter((t) => n.haydovchilikToifasi.includes(t));
      if (bori.length === talab.toifalar.length) {
        qosh(15, 15);
        sabablar.push(`Гувоҳнома тоифаси мос: ${bori.join(', ')}`);
      } else if (bori.length > 0) {
        qosh(9, 15);
        ogohlantirishlar.push(
          `${talab.toifalar.join(', ')} тоифа керак, фуқарода: ${bori.join(', ')}`
        );
      } else {
        qosh(3, 15);
        ogohlantirishlar.push(
          `${talab.toifalar.join(', ')} тоифа керак — фуқарода йўқ`
        );
      }
    }
  }

  /* ── 5. Маълумоти (10) ─────────────────────────────────────
     Фақат эълонда «олий маълумот» ёзилган бўлса.               */
  const talabMatni = (o.talablar ?? '').toLowerCase();
  if (/олий|oliy|бакалавр|bakalavr|магистр|magistr|диплом|diplom/.test(talabMatni)) {
    const oliymi = n.malumoti === 'Oliy' || n.malumoti === 'Tugallanmagan oliy';
    qosh(oliymi ? 10 : 0, 10);
    if (oliymi) sabablar.push('Олий маълумотли — эълон талабига мос');
    else ogohlantirishlar.push('Эълон олий маълумот талаб қилади');
  }

  /* ── 6. Ишга тайёрлиги (10) ────────────────────────────── */
  if (n.ishgaTayyorligi) {
    if (n.ishgaTayyorligi === "To'liq ish vaqti") {
      qosh(10, 10);
      sabablar.push('Тўлиқ иш вақтига тайёр');
    } else {
      qosh(4, 10);
      ogohlantirishlar.push(
        n.ishgaTayyorligi === 'Uy sharoitida'
          ? 'Фақат уй шароитида ишлашга тайёр'
          : 'Фақат қисман иш вақтига тайёр'
      );
    }
  }

  /* ── 7. Маҳалла (10) ───────────────────────────────────────
     Бир маҳалладаги одам учун йўл харажати ва вақти йўқ —
     амалда бу жойлашишнинг сақланиб қолишига энг кўп таъсир
     қиладиган омиллардан бири.                                */
  if (n.mahallaId === o.mahallaId) {
    qosh(10, 10);
    sabablar.push('Шу маҳалладан');
  } else {
    qosh(3, 10);
    ogohlantirishlar.push('Бошқа маҳалладан — қатнов масаласи');
  }

  /* ── 8. Бандлик истаги (10) ────────────────────────────────
     Анкетада «ЯТТ очиш» деб белгиланган одамга ёлланма иш
     таклиф қилиш — унинг режасини бузиш.                      */
  if (n.takliflar.length > 0) {
    const yollanma = n.takliflar.includes('Doimiy ishga joylashtirish');
    qosh(yollanma ? 10 : 3, 10);
    if (yollanma) sabablar.push('Доимий ишга жойлашишни хоҳлайди');
    else ogohlantirishlar.push('Анкетада бошқа йўл танланган (ЯТТ, ўқиш...)');
  }

  /* ── Тўсиқлар ─────────────────────────────────────────────
     Балл нолга туширилмайди: рўйхат барибир тартибли бўлиб
     турсин. Аммо тўсиқ кўзга ташланадиган қилиб қайтарилади.  */
  if (n.vacancyId) {
    tosiq = 'Аллақачон бошқа эълонга жойлаштирилган';
  } else {
    const sana = n.tugilganSana ? new Date(n.tugilganSana) : null;
    const yosh = yoshniBaho(
      sana && !Number.isNaN(sana.getTime()) ? sana.getFullYear() : null,
      n.jinsi
    );
    if (yosh && yosh.holati !== 'layoqatli') tosiq = yosh.xabar;
  }

  const maksimal = mezonlar.reduce((s, m) => s + m.maksimal, 0);
  const olingan = mezonlar.reduce((s, m) => s + m.olingan, 0);
  const ball = maksimal === 0 ? 0 : Math.round((olingan / maksimal) * 100);

  return {
    ball,
    daraja: ball >= 70 ? 'yuqori' : ball >= 45 ? 'orta' : 'past',
    sabablar,
    ogohlantirishlar,
    tosiq,
  };
}

/** Номзодларни мослиги бўйича тартиблайди — энг мос биринчи */
export function moslikBoyichaTartibla<T>(
  royxat: T[],
  moslik: (x: T) => Moslik
): { element: T; moslik: Moslik }[] {
  return royxat
    .map((element) => ({ element, moslik: moslik(element) }))
    .sort((a, b) => {
      // Тўсиғи борлар охирига тушади — балли юқори бўлса ҳам
      const at = a.moslik.tosiq ? 1 : 0;
      const bt = b.moslik.tosiq ? 1 : 0;
      if (at !== bt) return at - bt;
      return b.moslik.ball - a.moslik.ball;
    });
}
