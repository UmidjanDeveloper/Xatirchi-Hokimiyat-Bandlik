/**
 * ============================================================
 *  AI УЛАНИШИНИ ТЕКШИРИШ
 *
 *  Ишга тушириш:  npm run ai-tekshir
 *
 *  Калит тўғри қўйилганини, қайси моделлар мавжудлигини ва
 *  хулоса ҳақиқатан чиқаётганини кўрсатади.
 *
 *  Нега алоҳида буйруқ керак: илова калит нотўғри бўлса ҳам
 *  ИШЛАЙВЕРАДИ — хулоса қоида бўйича ҳисобланади ва ҳеч қандай
 *  хато кўринмайди. Бу атайлаб шундай (ходим ишдан тўхтамасин),
 *  аммо созлашда бу чалкаштиради: «калитни қўйдим, нега
 *  ўзгармади?» деган савол жавобсиз қоларди.
 * ============================================================
 */
import { envYukla } from './env-yukla';
import { joriyModel, joriyProvayder, kalitNiqobi, mavjudModellar, matnSoraBatafsil } from '../src/lib/ai';

envYukla();

const OK = '✓';
const XATO = '✗';
const OGOH = '!';

async function modellarniKorsat(): Promise<void> {
  const { modellar, xato } = await mavjudModellar();
  if (xato) {
    console.log(`  ${OGOH}  Модел рўйхатини олиб бўлмади: ${xato}`);
    return;
  }

  console.log(`  ${OK}  Калитингиз учун мавжуд моделлар (${modellar.length} та):`);
  for (const n of modellar.slice(0, 12)) console.log(`       ${n}`);
  if (modellar.length > 12) console.log(`       … яна ${modellar.length - 12} та`);

  const p = joriyProvayder();
  if (!p) return;
  const joriy = joriyModel(p);
  if (modellar.length && !modellar.includes(joriy)) {
    const ozgaruvchi = { groq: 'GROQ_MODEL', openai: 'OPENAI_MODEL', gemini: 'GEMINI_MODEL', anthropic: 'ANTHROPIC_MODEL' }[p];
    console.log(`\n  ${OGOH}  Созланган модел «${joriy}» бу рўйхатда ЙЎҚ.`);
    console.log(`       ${ozgaruvchi}="${modellar[0]}" деб қўйинг.`);
  }
}

async function main() {
  console.log('\n  AI УЛАНИШИНИ ТЕКШИРИШ\n');

  const provayder = joriyProvayder();

  if (!provayder) {
    console.log(`  ${XATO}  Калит топилмади.\n`);
    console.log('     Қуйидагилардан БИТТАСИНИ қўйинг:\n');
    console.log('       GROQ_API_KEY="gsk_..."    — Groq (текин даражаси бор)');
    console.log('       OPENAI_API_KEY="sk-..."   — OpenAI (пуллик)');
    console.log('       GEMINI_API_KEY="AIza..."  — Google Gemini');
    console.log('       ANTHROPIC_API_KEY="..."   — Anthropic Claude\n');
    console.log('     Маҳаллий синов учун: лойиҳа илдизидаги .env файлига.');
    console.log('     Ишлаб турган сайт учун: Vercel → Settings → Environment Variables.\n');
    console.log('     Калитсиз ҳам тизим ТЎЛИҚ ишлайди — хулоса белгиланган');
    console.log('     чегаралар бўйича ҳисобланади.\n');
    process.exit(1);
  }

  const model = joriyModel(provayder);
  console.log(`  ${OK}  Провайдер: ${provayder}`);
  console.log(`  ${OK}  Модел:     ${model}`);

  console.log(`  ${OK}  Калит:     ${kalitNiqobi()}\n`);

  if (provayder !== 'anthropic') {
    await modellarniKorsat();
    console.log('');
  }

  console.log('  Синов сўрови юборилмоқда…\n');

  const natija = await matnSoraBatafsil({
    tizim:
      'Сен Ўзбекистондаги бандлик таҳлилчисисан. ФАҚАТ кирилл ёзувидаги ўзбек тилида, фақат JSON қайтар.',
    savol:
      'Маълумот: маҳаллада 120 ишсиз, 18 таси ишга жойлашган.\n' +
      'Жавоб шакли: {"holat": "бир гап"}',
    maxTokens: 200,
  });

  if (!natija.matn) {
    console.log(`  ${XATO}  Жавоб келмади.\n`);
    console.log(`     Сабаби: ${natija.xato ?? 'номаълум'}\n`);
    if (/401|403|API_KEY|API key/i.test(natija.xato ?? '')) {
      console.log('     → Калит нотўғри ёки фаоллаштирилмаган.');
      console.log('       Groq:   https://console.groq.com/keys');
      console.log('       OpenAI: https://platform.openai.com/api-keys');
      console.log('       Gemini: https://aistudio.google.com/apikey\n');
    } else if (/404|not found/i.test(natija.xato ?? '')) {
      console.log(`     → «${model}» модели топилмади. Юқоридаги рўйхатдан танланг ва`);
      console.log(`       ${{ groq: 'GROQ_MODEL', openai: 'OPENAI_MODEL', gemini: 'GEMINI_MODEL', anthropic: 'ANTHROPIC_MODEL' }[provayder]} ўзгарувчисига ёзинг.\n`);
    } else if (/429|quota|RESOURCE_EXHAUSTED/i.test(natija.xato ?? '')) {
      console.log('     → Кунлик текин лимит тугаган. Эртага қайта уриниб кўринг.\n');
    }
    console.log('     Диққат: тизим бундай ҳолатда ҳам ИШЛАЙДИ — хулоса');
    console.log('     белгиланган чегаралар бўйича ҳисобланади.\n');
    process.exit(1);
  }

  console.log(`  ${OK}  Жавоб келди:\n`);
  console.log(
    natija.matn
      .trim()
      .split('\n')
      .map((s) => `       ${s}`)
      .join('\n')
  );

  const kirillmi = /[Ѐ-ӿ]/.test(natija.matn);
  console.log(
    `\n  ${kirillmi ? OK : OGOH}  Кирилл ёзуви: ${kirillmi ? 'ҳа' : 'ЙЎҚ — модел бошқа ёзувда жавоб берди'}`
  );

  console.log(`\n  ${OK}  AI хулосаси ишлайди.\n`);
}

void main();
