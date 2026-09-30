import { NextResponse } from 'next/server';
import { jurnal, talabQil } from '@/lib/api-auth';
import { reyestrniOqi } from '@/lib/reyestr-fayl';
import { reyestrniSolishtir, reyestrniYukla } from '@/lib/reyestr-import';
import { tasdiqHisobi } from '@/lib/joylashuv-dalili';

/**
 * ============================================================
 *  РЕЕСТР КЎЧИРМАСИНИ ЮКЛАШ
 *
 *  ── Икки қадам: аввал КЎРИШ, кейин ЁЗИШ ──
 *
 *  Биринчи сўров ҳеч нарса ёзмайди: у фақат солиштиради ва
 *  натижани қайтаради — нечтаси мос келди, нечтаси шубҳали,
 *  нечтаси топилмади.
 *
 *  Администратор шуни КЎРГАНДАН кейин «ёз» тугмасини босади.
 *
 *  Бир қадамда ёзиб юбориш хавфли: солиштириш Ф.И.Ш. бўйича
 *  кетади ва хато қилиши мумкин. Хато далил эса йўқ далилдан
 *  ЁМОНРОҚ — у рақамни тўғри кўрсатади, аслида эса ёлғон.
 * ============================================================
 */

export const dynamic = 'force-dynamic';

/** Файл ҳажми чегараси — туман бўйича кўчирма бир неча минг сатр */
const ENG_KATTA_BAYT = 8 * 1024 * 1024;

export async function POST(request: Request) {
  /*
   * Фақат администратор ва бандлик раҳбари.
   *
   * Кўчирма бутун туман бўйича ва унда бегона фуқароларнинг
   * исми бор — маҳалла ходимига очиқ бўлмаслиги керак.
   */
  const q = await talabQil(['ADMIN', 'BANDLIK_RAHBAR']);
  if (q instanceof NextResponse) return q;

  let forma: FormData;
  try {
    forma = await request.formData();
  } catch {
    return NextResponse.json({ ok: false, xabar: 'Faylni oʻqib boʻlmadi' }, { status: 400 });
  }

  const fayl = forma.get('fayl');
  if (!(fayl instanceof File)) {
    return NextResponse.json({ ok: false, xabar: 'Fayl yuborilmadi' }, { status: 400 });
  }
  if (fayl.size > ENG_KATTA_BAYT) {
    return NextResponse.json(
      { ok: false, xabar: 'Fayl juda katta — 8 MB gacha boʻlsin' },
      { status: 400 }
    );
  }

  const oqildi = reyestrniOqi(await fayl.arrayBuffer());
  if (!oqildi.ok) {
    return NextResponse.json({ ok: false, xabar: oqildi.sabab }, { status: 400 });
  }
  if (oqildi.satrlar.length === 0) {
    return NextResponse.json(
      { ok: false, xabar: 'Faylda maʼlumot topilmadi' },
      { status: 400 }
    );
  }

  const yoz = forma.get('yoz') === '1';

  /*
   * Кўчирма қайси санага тегишли.
   *
   * Берилмаса — бугун. Сана далилда сақланади: битта одамга
   * ҳар ойда янги кўчирма келади ва улар бир-бирининг устига
   * ёзилмаслиги керак.
   */
  const xomSana = String(forma.get('sana') ?? '').trim();
  const sana = xomSana ? new Date(xomSana) : new Date();
  if (Number.isNaN(sana.getTime())) {
    return NextResponse.json({ ok: false, xabar: 'Sana notoʻgʻri' }, { status: 400 });
  }

  try {
    const natija = yoz
      ? await reyestrniYukla(oqildi.satrlar, { kiritganId: q.sessiya.userId, reyestrSanasi: sana })
      : await reyestrniSolishtir(oqildi.satrlar);

    if (yoz) {
      await jurnal(q.sessiya.userId, 'OZGARTIRISH', {
        obyektTuri: 'JoylashuvDalili',
        obyektId: sana.toISOString().slice(0, 10),
        izoh: `Реестр кўчирмаси: ${natija.jami} сатр, ${natija.mos.length - natija.takror} та далил ёзилди`,
      });
    }

    return NextResponse.json({
      ok: true,
      yozildi: yoz,
      ustunlar: oqildi.ustunlar,
      natija: {
        jami: natija.jami,
        mos: natija.mos.length,
        boshqaIshJoyi: natija.mos.filter((m) => m.boshqaIshJoyi).length,
        yangiTopilgan: natija.yangiTopilgan,
        shubhali: natija.shubhali,
        tekshirilsin: natija.tekshirilsin,
        topilmadi: natija.topilmadi.length,
        takror: natija.takror,
      },
      hisob: await tasdiqHisobi(),
    });
  } catch (e) {
    console.error('Reyestrni solishtirib bolmadi:', e);
    return NextResponse.json(
      { ok: false, xabar: 'Solishtirib boʻlmadi' },
      { status: 500 }
    );
  }
}
