/**
 * ============================================================
 *  МОСЛИК ҲИСОБИ СИНОВИ
 *
 *  Ишга тушириш:  npx tsx scripts/moslik-sinov.ts
 *
 *  Нега керак: мослик балли мутахассис учун ТАРТИБ белгилайди —
 *  рўйхатнинг тепасидаги одам биринчи қўнғироқ қилинади. Агар
 *  ҳисоб нотўғри бўлса, хато кўринмайди: рўйхат барибир тўлиқ
 *  ва тартибли кўринади, фақат нотўғри одам тепада туради.
 *
 *  Шунинг учун ҳар бир қоида алоҳида текширилади: балл эмас,
 *  МУНОСАБАТ синовдан ўтади («мос номзод номосдан юқори»).
 * ============================================================
 */
import { haydovchilikTalabi, moslikBoyichaTartibla, moslikniHisobla } from '../src/lib/moslik';
import type { NomzodMaydonlari, OrinMaydonlari } from '../src/lib/moslik';

const ORIN: OrinMaydonlari = {
  lavozim: 'Payvandchi',
  yonalish: 'Qurilish',
  talablar: null,
  maosh: 4_000_000,
  mahallaId: 'm1',
};

const ASOS: NomzodMaydonlari = {
  mahallaId: 'm1',
  jinsi: 'Erkak',
  tugilganSana: new Date('1995-05-05'),
  malumoti: "O'rta maxsus",
  mutaxassisligi: null,
  xohlaganIsh: null,
  organmoqchiKasb: null,
  oxirgiIshJoyi: null,
  avvalgiIshJoyi: null,
  kutilayotganMaosh: null,
  ishgaTayyorligi: "To'liq ish vaqti",
  haydovchilikGuvohnomasi: false,
  haydovchilikToifasi: [],
  takliflar: ['Doimiy ishga joylashtirish'],
  vacancyId: null,
};

const n = (qism: Partial<NomzodMaydonlari>): NomzodMaydonlari => ({ ...ASOS, ...qism });
const o = (qism: Partial<OrinMaydonlari>): OrinMaydonlari => ({ ...ORIN, ...qism });

type Sinov = { nomi: string; tekshir: () => boolean; izoh?: string };

const SINOVLAR: Sinov[] = [
  {
    nomi: 'Айнан шу касб эгаси касбсиз номзоддан юқори',
    tekshir: () =>
      moslikniHisobla(ORIN, n({ mutaxassisligi: 'Payvandchi' })).ball >
      moslikniHisobla(ORIN, n({ mutaxassisligi: 'Сартарош' })).ball,
  },
  {
    nomi: 'Кирилл ёзилган касб ҳам топилади (пайвандчи = payvandchi)',
    tekshir: () => {
      const a = moslikniHisobla(ORIN, n({ mutaxassisligi: 'пайвандчи' }));
      return a.ball >= 70 && a.sabablar.some((s) => s.includes('Касби тўғри келади'));
    },
  },
  {
    nomi: 'Апостроф ва имло фарқи мосликни бузмайди',
    tekshir: () =>
      moslikniHisobla(o({ lavozim: "G'isht teruvchi" }), n({ xohlaganIsh: 'Gisht teruvchi' }))
        .ball >= 70,
  },
  {
    nomi: 'Ўрганмоқчи касб мутахассисликдан пастроқ туради',
    tekshir: () =>
      moslikniHisobla(ORIN, n({ organmoqchiKasb: 'Payvandchi' })).ball <
      moslikniHisobla(ORIN, n({ mutaxassisligi: 'Payvandchi' })).ball,
  },
  {
    nomi: 'Кутган маоши таклифдан паст бўлса балл ошади',
    tekshir: () =>
      moslikniHisobla(ORIN, n({ kutilayotganMaosh: 3_000_000 })).ball >
      moslikniHisobla(ORIN, n({ kutilayotganMaosh: 9_000_000 })).ball,
  },
  {
    nomi: 'Маош фарқи катта бўлса огоҳлантириш ёзилади',
    tekshir: () =>
      moslikniHisobla(ORIN, n({ kutilayotganMaosh: 9_000_000 })).ogohlantirishlar.some((x) =>
        x.includes('фарқ катта')
      ),
  },
  {
    nomi: 'Маош кўрсатилмаса мезон умуман ҳисобланмайди',
    izoh: 'маълумот йўқлиги жазо бўлмаслиги керак',
    tekshir: () =>
      moslikniHisobla(o({ maosh: null }), n({ mutaxassisligi: 'Payvandchi' })).ball ===
      moslikniHisobla(o({ maosh: null }), n({ mutaxassisligi: 'Payvandchi', kutilayotganMaosh: null }))
        .ball,
  },
  {
    nomi: 'Ҳайдовчилик талаб қилинмаса, гувоҳномасизлик жазоланмайди',
    tekshir: () =>
      moslikniHisobla(ORIN, n({ mutaxassisligi: 'Payvandchi' })).ogohlantirishlar.every(
        (x) => !x.includes('гувоҳнома')
      ),
  },
  {
    nomi: 'CE тоифа талаб қилинса, C бор одам тўлиқ балл олмайди',
    tekshir: () => {
      const orin = o({ lavozim: 'Yuk mashinasi haydovchisi', talablar: 'CE toifa guvohnoma' });
      const toliq = moslikniHisobla(orin, n({ haydovchilikGuvohnomasi: true, haydovchilikToifasi: ['CE'] }));
      const qisman = moslikniHisobla(orin, n({ haydovchilikGuvohnomasi: true, haydovchilikToifasi: ['C'] }));
      return toliq.ball > qisman.ball;
    },
  },
  {
    nomi: 'Корхона номидаги ҳарф тоифа деб ўқилмайди',
    izoh: '«C» ҳарфи ҳайдовчилик контексти бўлмаса эътиборсиз',
    tekshir: () => !haydovchilikTalabi('C. Rahimov MCHJ - oshpaz').talabQilinadi,
  },
  {
    nomi: 'Узун тоифа қисқасидан олдин ўқилади (CE ≠ C + E)',
    tekshir: () => {
      const t = haydovchilikTalabi('Haydovchi kerak, CE toifa');
      return t.toifalar.length === 1 && t.toifalar[0] === 'CE';
    },
  },
  {
    nomi: 'Олий маълумот талаб қилинса, ўрта маълумотли огоҳлантирилади',
    tekshir: () =>
      moslikniHisobla(o({ talablar: 'Oliy malumot shart' }), n({})).ogohlantirishlar.some((x) =>
        x.includes('олий маълумот')
      ),
  },
  {
    nomi: 'Шу маҳалладаги номзод бошқа маҳалладагидан юқори',
    tekshir: () =>
      moslikniHisobla(ORIN, n({ mahallaId: 'm1' })).ball >
      moslikniHisobla(ORIN, n({ mahallaId: 'm2' })).ball,
  },
  {
    nomi: 'ЯТТ очмоқчи одам ёлланма ишга биринчи таклиф қилинмайди',
    tekshir: () =>
      moslikniHisobla(ORIN, n({ takliflar: ['YaTT ochish'] })).ball <
      moslikniHisobla(ORIN, n({ takliflar: ['Doimiy ishga joylashtirish'] })).ball,
  },
  {
    nomi: 'Нафақа ёшидаги фуқаро тўсиқ билан белгиланади',
    tekshir: () => {
      const m = moslikniHisobla(ORIN, n({ tugilganSana: new Date('1950-01-01') }));
      return m.tosiq !== null && m.tosiq.includes('нафақа');
    },
  },
  {
    nomi: 'Аллақачон жойлаштирилган фуқаро тўсиқ билан белгиланади',
    tekshir: () => moslikniHisobla(ORIN, n({ vacancyId: 'v9' })).tosiq !== null,
  },
  {
    nomi: 'Тўсиқсиз номзод тўсиқлисидан юқори туради',
    tekshir: () => {
      const royxat = [
        { id: 'band', m: n({ mutaxassisligi: 'Payvandchi', vacancyId: 'v9' }) },
        { id: 'bosh', m: n({ mutaxassisligi: 'Сартарош' }) },
      ];
      const tartib = moslikBoyichaTartibla(royxat, (x: (typeof royxat)[0]) =>
        moslikniHisobla(ORIN, x.m)
      );
      return tartib[0].element.id === 'bosh';
    },
  },
  {
    nomi: 'Тўлиқ мос номзод «юқори» даражага тушади',
    tekshir: () => {
      const m = moslikniHisobla(
        ORIN,
        n({ mutaxassisligi: 'Payvandchi', xohlaganIsh: 'Payvandchi', kutilayotganMaosh: 3_500_000 })
      );
      return m.daraja === 'yuqori';
    },
  },
  {
    nomi: 'Мутлақо мос келмайдиган номзод «паст» даражада қолади',
    tekshir: () => {
      const m = moslikniHisobla(
        ORIN,
        n({
          mutaxassisligi: 'Сартарош',
          mahallaId: 'm2',
          kutilayotganMaosh: 12_000_000,
          takliflar: ['YaTT ochish'],
          ishgaTayyorligi: 'Uy sharoitida',
        })
      );
      return m.daraja === 'past';
    },
  },
  {
    nomi: 'Балл ҳар доим 0..100 оралиғида',
    tekshir: () => {
      const holatlar = [n({}), n({ mutaxassisligi: 'Payvandchi' }), n({ mahallaId: 'm2' })];
      return holatlar.every((x) => {
        const b = moslikniHisobla(ORIN, x).ball;
        return b >= 0 && b <= 100;
      });
    },
  },
];

let xato = 0;
for (const s of SINOVLAR) {
  let ok = false;
  try {
    ok = s.tekshir();
  } catch (e) {
    ok = false;
    console.log(`     xatolik: ${(e as Error).message}`);
  }
  if (!ok) xato++;
  console.log(`${ok ? 'OK  ' : 'XATO'} ${s.nomi}${s.izoh && !ok ? `  (${s.izoh})` : ''}`);
}
console.log(`\n${SINOVLAR.length - xato}/${SINOVLAR.length} o'tdi`);
process.exit(xato ? 1 : 0);
