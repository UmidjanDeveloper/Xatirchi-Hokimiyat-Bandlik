/**
 * ============================================================
 *  ДУБЛИКАТ АНИҚЛАШ СИНОВИ
 *
 *  Ишга тушириш:  npx tsx scripts/dublikat-sinov.ts
 *
 *  Бу ерда хато ИККИ ТОМОНГА ҳам қиммат:
 *
 *    Топилмаса — бир одам икки марта рўйхатда қолади, ишсизлар
 *    сони ошиб кўринади, нафақа икки марта берилиши мумкин.
 *
 *    Ортиқча топилса — ходим ҳар хатловда сохта огоҳлантириш
 *    кўради ва бир ҳафтадан кейин уларга умуман қарамай
 *    қўяди. Шунда ҲАҚИҚИЙ дубликат ҳам эътиборсиз ўтади.
 *
 *  Иккови ҳам исмни ЯГОНА кўринишга келтиришга боғлиқ —
 *  синовнинг асосий қисми шу ерда.
 * ============================================================
 */
import { ismKaliti, telefonKaliti } from '../src/lib/dublikat';

type Sinov = { nomi: string; tekshir: () => boolean };

const SINOVLAR: Sinov[] = [
  /* ── Алифбо ── */
  {
    /*
     * Энг муҳими. Битта ходим кириллда, бошқаси лотинда
     * ёзади — иккови БИР одам. Бу текширилмаса, дубликат
     * аниқлаш умуман ишламайди.
     */
    nomi: 'Кирилл ва лотин ёзув бир хил калит беради',
    tekshir: () => ismKaliti('Тошматов Акрам') === ismKaliti('Toshmatov Akram'),
  },
  {
    nomi: 'Кирилл «ў» ва лотин «oʻ» бир хил',
    tekshir: () => ismKaliti('Тўраев Ўткир') === ismKaliti('Toʻrayev Oʻtkir'),
  },
  {
    nomi: 'Кирилл «ғ», «қ», «ҳ» ҳам ўгирилади',
    tekshir: () => ismKaliti('Ғаниев Қодир Ҳасанович') === ismKaliti('Gʻaniyev Qodir Hasanovich'),
  },

  /* ── Апостроф ── */
  {
    /*
     * Ходим апострофни беш хил белги билан қўяди: клавиатура,
     * телефон, нусха кўчириш — ҳар бири бошқасини беради.
     */
    nomi: 'Беш хил апостроф бир хил калит беради',
    tekshir: () => {
      const a = ismKaliti("Sa'dulla Nu'monov");
      return (
        ismKaliti('Sa’dulla Nu’monov') === a &&
        ismKaliti('Saʻdulla Nuʻmonov') === a &&
        ismKaliti('Sa`dulla Nu`monov') === a &&
        ismKaliti('Sa´dulla Nu´monov') === a
      );
    },
  },

  /* ── Бўш жой ва ҳарф катталиги ── */
  {
    nomi: 'Иккита бўш жой биттага тенг',
    tekshir: () => ismKaliti('Aliyev  Anvar') === ismKaliti('Aliyev Anvar'),
  },
  {
    nomi: 'Бош ва охиридаги бўш жой ҳисобга олинмайди',
    tekshir: () => ismKaliti('  Aliyev Anvar  ') === ismKaliti('Aliyev Anvar'),
  },
  {
    nomi: 'Катта-кичик ҳарф аҳамиятсиз',
    tekshir: () => ismKaliti('ALIYEV anvar') === ismKaliti('Aliyev Anvar'),
  },
  {
    nomi: 'Тире ва нуқта ҳам бўш жойга айланади',
    tekshir: () => ismKaliti('Aliyev-Anvar') === ismKaliti('Aliyev Anvar'),
  },

  /* ── БОШҚА одамлар аралашмаслиги ── */
  {
    /*
     * Ортиқча топилиши ҳам хато. Ходим сохта огоҳлантиришга
     * кўникса, ҳақиқийсини ҳам ўтказиб юборади.
     */
    nomi: 'Бошқа исм бошқа калит беради',
    tekshir: () => ismKaliti('Aliyev Anvar') !== ismKaliti('Aliyev Akmal'),
  },
  {
    nomi: 'Фақат отаси исми фарқ қилса ҳам — бошқа одам',
    tekshir: () =>
      ismKaliti('Aliyev Anvar Baxtiyorovich') !== ismKaliti('Aliyev Anvar Soatovich'),
  },
  {
    nomi: 'Отасининг исми йўқ ёзув — тўлиғи билан бир хил эмас',
    tekshir: () => ismKaliti('Aliyev Anvar') !== ismKaliti('Aliyev Anvar Soatovich'),
  },
  {
    nomi: 'Бўш матн бўш калит беради, қуламайди',
    tekshir: () => ismKaliti('') === '' && ismKaliti('   ') === '',
  },

  /* ── Телефон ── */
  {
    nomi: 'Телефон турли форматда — бир хил калит',
    tekshir: () => {
      const a = telefonKaliti('+998901234567');
      return (
        telefonKaliti('998901234567') === a &&
        telefonKaliti('90 123 45 67') === a &&
        telefonKaliti('(90) 123-45-67') === a
      );
    },
  },
  {
    nomi: 'Тўлиқсиз телефон калит бермайди',
    tekshir: () => telefonKaliti('12345') === null && telefonKaliti('') === null,
  },
  {
    nomi: 'Телефон йўқ бўлса null',
    tekshir: () => telefonKaliti(null) === null,
  },
  {
    nomi: 'Бошқа телефон бошқа калит',
    tekshir: () => telefonKaliti('+998901234567') !== telefonKaliti('+998907654321'),
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
  console.log(`${ok ? 'OK  ' : 'XATO'} ${s.nomi}`);
}
console.log(`\n${SINOVLAR.length - xato}/${SINOVLAR.length} o'tdi`);
process.exit(xato ? 1 : 0);
