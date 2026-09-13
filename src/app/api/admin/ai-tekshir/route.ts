import { NextResponse } from 'next/server';
import { jurnal, talabQil } from '@/lib/api-auth';
import {
  geminiModellari,
  joriyModel,
  joriyProvayder,
  kalitNiqobi,
  matnSoraBatafsil,
} from '@/lib/ai';

/**
 * ============================================================
 *  AI УЛАНИШИНИ БРАУЗЕРДАН ТЕКШИРИШ
 *
 *  `npm run ai-tekshir` буйруғининг айнан ўзи, фақат терминал
 *  талаб қилмайди. Сабаби амалий: калитни Vercel га қўядиган
 *  одам одатда браузерда ишлайди ва унда лойиҳанинг локал
 *  нусхаси бўлмаслиги мумкин.
 *
 *  Нега умуман керак: илова калит нотўғри бўлса ҳам ИШЛАЙВЕРАДИ
 *  — хулоса жимгина қоида бўйича ҳисобланади ва ҳеч қандай хато
 *  кўринмайди. Бу атайлаб шундай (ходим ишдан тўхтамасин), аммо
 *  созлаш пайтида чалкаштиради.
 *
 *  ── Хавфсизлик ──
 *
 *  Фақат АДМИНИСТРАТОР. Калитнинг ЎЗИ ҳеч қачон қайтарилмайди —
 *  фақат ниқобланган боши ва охири: диагностика саҳифаси
 *  браузерда очилади ва экран суратга олиниши мумкин.
 * ============================================================
 */

export const maxDuration = 30;

export async function POST() {
  const q = await talabQil(['ADMIN']);
  if (q instanceof NextResponse) return q;

  const provayder = joriyProvayder();

  if (!provayder) {
    return NextResponse.json({
      sozlangan: false,
      xabar:
        'AI калити созланмаган. Vercel → Settings → Environment Variables да GEMINI_API_KEY ёки ANTHROPIC_API_KEY қўшинг ва қайта деплой қилинг.',
    });
  }

  const model = joriyModel(provayder);

  // Gemini да мавжуд моделлар рўйхати — «модел топилмади» да керак
  const modellar =
    provayder === 'gemini' ? (await geminiModellari()).modellar : [];

  const natija = await matnSoraBatafsil({
    tizim:
      'Сен Ўзбекистондаги бандлик таҳлилчисисан. ФАҚАТ кирилл ёзувидаги ўзбек тилида, фақат JSON қайтар.',
    savol:
      'Маълумот: маҳаллада 120 ишсиз, 18 таси ишга жойлашган.\n' +
      'Жавоб шакли: {"holat": "бир гап"}',
    maxTokens: 200,
  });

  await jurnal(q.sessiya.userId, 'KORISH', {
    obyektTuri: 'Sozlama',
    izoh: `AI текшируви: ${provayder}/${model} — ${natija.matn ? 'ишлади' : 'ишламади'}`,
  });

  return NextResponse.json({
    sozlangan: true,
    provayder,
    model,
    kalit: kalitNiqobi(),
    modellar,
    /*
     * Созланган модел рўйхатда йўқ бўлса — энг кўп учрайдиган
     * хато шу, ва уни олдиндан айтиб қўйиш керак.
     */
    modelMosmi: modellar.length === 0 ? null : modellar.includes(model),
    ok: natija.matn !== null,
    javob: natija.matn?.trim().slice(0, 400) ?? null,
    kirillmi: natija.matn ? /[Ѐ-ӿ]/.test(natija.matn) : null,
    xato: natija.xato ?? null,
  });
}
