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
import { joriyModel, joriyProvayder, matnSoraBatafsil } from '../src/lib/ai';

envYukla();

const OK = '✓';
const XATO = '✗';
const OGOH = '!';

async function geminiModellari(kalit: string): Promise<void> {
  try {
    const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models', {
      headers: { 'x-goog-api-key': kalit },
    });
    if (!r.ok) {
      const t = await r.text().catch(() => '');
      console.log(`  ${OGOH}  Модел рўйхатини олиб бўлмади (${r.status}): ${t.slice(0, 200)}`);
      return;
    }
    const d = (await r.json()) as {
      models?: { name?: string; supportedGenerationMethods?: string[] }[];
    };
    const mos = (d.models ?? [])
      .filter((m) => m.supportedGenerationMethods?.includes('generateContent'))
      .map((m) => (m.name ?? '').replace('models/', ''))
      .filter((n) => n.startsWith('gemini'));

    console.log(`  ${OK}  Калитингиз учун мавжуд моделлар (${mos.length} та):`);
    for (const n of mos.slice(0, 12)) console.log(`       ${n}`);
    if (mos.length > 12) console.log(`       … яна ${mos.length - 12} та`);

    const joriy = joriyModel('gemini');
    if (mos.length && !mos.includes(joriy)) {
      console.log(`\n  ${OGOH}  Созланган модел «${joriy}» бу рўйхатда ЙЎҚ.`);
      console.log(`       GEMINI_MODEL="${mos[0]}" деб қўйинг.`);
    }
  } catch (e) {
    console.log(`  ${OGOH}  Модел рўйхати: ${(e as Error).message}`);
  }
}

async function main() {
  console.log('\n  AI УЛАНИШИНИ ТЕКШИРИШ\n');

  const provayder = joriyProvayder();

  if (!provayder) {
    console.log(`  ${XATO}  Калит топилмади.\n`);
    console.log('     Қуйидагилардан БИТТАСИНИ қўйинг:\n');
    console.log('       GEMINI_API_KEY="..."      — Google Gemini');
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

  const kalit =
    provayder === 'gemini'
      ? (process.env.GEMINI_API_KEY as string)
      : (process.env.ANTHROPIC_API_KEY as string);
  console.log(`  ${OK}  Калит:     ${kalit.slice(0, 6)}…${kalit.slice(-4)} (${kalit.length} белги)\n`);

  if (provayder === 'gemini') {
    await geminiModellari(kalit);
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
      console.log('       Gemini учун: https://aistudio.google.com/apikey\n');
    } else if (/404|not found/i.test(natija.xato ?? '')) {
      console.log(`     → «${model}» модели топилмади. Юқоридаги рўйхатдан танланг`);
      console.log('       ва GEMINI_MODEL ўзгарувчисига ёзинг.\n');
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
