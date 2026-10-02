import { NextResponse } from 'next/server';
import { jurnal, talabQil } from '@/lib/api-auth';
import { izIdYarat, serverXatosi } from '@/lib/tizim-kuzatuvi';
import { reyestrniOqi } from '@/lib/reyestr-fayl';
import { reyestrniSolishtir, reyestrniYukla } from '@/lib/reyestr-import';
import { tasdiqHisobi } from '@/lib/joylashuv-dalili';
import {
  faylIziHisobla,
  korishniSaqla,
  oldingiYozilgan,
  reyestrSanasiniTekshir,
  yozishJarayoni,
  yozishXatosi,
  yozishniBoshla,
  yozishniTugat,
} from '@/lib/reyestr-yuklash';

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
 *
 *  ── Икки қадам СЕРВЕРДА боғланган (`reyestr-yuklash.ts`) ──
 *
 *  «Кўриш» файлнинг SHA-256 изини ҳисоблаб `ReyestrImport` ёзувини
 *  яратади ва `yuklashId` қайтаради. «Ёзиш» фақат шу `yuklashId`
 *  билан ва ФАЙЛНИНГ ЎЗИ билан ишлайди: из ва сана кўрилганидан
 *  фарқ қилса — 409, ёзилмайди. Бир файл икки марта ёзилмайди,
 *  узилган ёзиш хавфсиз давом этади.
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

  /* Fayl BIR marta o'qiladi: o'qish ham, SHA-256 izi ham aynan shu baytlardan */
  const bayt = await fayl.arrayBuffer();
  const oqildi = reyestrniOqi(bayt);
  if (!oqildi.ok && oqildi.xavfli) {
    /* Prototip ifloslanishi urinishi: administratorga /tizim da ko'rinadi */
    await serverXatosi('api:reyestr-xavfli-fayl', new Error(`Reyestr fayli prototiplarni o'zgartirdi: ${oqildi.xavfli.join(', ')}`));
  }
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
   * Берилмаса — бугун (Тошкент). Сана далилда сақланади: битта одамга
   * ҳар ойда янги кўчирма келади ва улар бир-бирининг устига
   * ёзилмаслиги керак.
   *
   * Сана ҚАТЪИЙ текширилади: 31.02 мартга сурилмайди, келажак ва
   * жуда эски сана рад этилади.
   */
  const sanaN = reyestrSanasiniTekshir(String(forma.get('sana') ?? ''));
  if (!sanaN.ok) {
    return NextResponse.json({ ok: false, xabar: sanaN.xabar }, { status: 400 });
  }
  const sana = sanaN.sana;

  /* Файлнинг криптографик изи: ҳақиқийлигини эмас, ЎЗГАРМАГАНИНИ кўрсатади */
  const faylIzi = faylIziHisobla(bayt);
  const manba = String(forma.get('manba') ?? '').trim().slice(0, 120);

  /*
   * Ҳар бир юклаш/солиштириш ЎЗ ИЗИ билан: администратор «iz_…» ни айтса,
   * журнал ёзуви ва хато жадвали шу билан топилади.
   */
  const izId = izIdYarat();

  /*
   * ── ЁЗИШ ҚАДАМИ: аввал кўриш ёзуви билан боғлаймиз ──
   *
   * Ёзиш `yuklashId` сиз ишламайди. Фойдаланувчи эски саҳифани очиб
   * қолган бўлса, аниқ хабар олади — жим ёзилмайди.
   */
  let yuklashId = '';
  let yozishManbasi: string | null = null;
  if (yoz) {
    yuklashId = String(forma.get('yuklashId') ?? '').trim();
    if (!yuklashId) {
      return NextResponse.json(
        { ok: false, xabar: 'Аввал «Солиштириб кўриш» ни босинг (саҳифани янгиланг)' },
        { status: 400 }
      );
    }
    const b = await yozishniBoshla({ yuklashId, userId: q.sessiya.userId, faylIzi, sana });
    if (!b.ok) {
      return NextResponse.json({ ok: false, xabar: b.xabar, kod: b.kod }, { status: b.status });
    }
    if (b.allaqachon) {
      /* Аввал ёзилган: такрор ёзилмайди, сақланган натижа қайтади */
      return NextResponse.json({
        ok: true,
        izId,
        yozildi: true,
        allaqachon: true,
        yuklashId: b.yuklash.id,
        faylIzi,
        yuklash: yuklashXulosasi(b.yuklash),
        hisob: await tasdiqHisobi(),
      });
    }
    yuklashId = b.yuklash.id;
    yozishManbasi = b.yuklash.manbaTashkilot;
  }

  try {
    if (!yoz) {
      const natija = await reyestrniSolishtir(oqildi.satrlar);
      const korish = await korishniSaqla({
        faylIzi,
        faylNomi: fayl.name,
        bayt: fayl.size,
        satrSoni: oqildi.satrlar.length,
        sana,
        manbaTashkilot: manba,
        userId: q.sessiya.userId,
      });
      const oldingi = await oldingiYozilgan(faylIzi, sana);

      return NextResponse.json({
        ok: true,
        izId,
        yozildi: false,
        yuklashId: korish.id,
        faylIzi,
        oldingiYozilgan: oldingi ? { id: oldingi.id, sana: oldingi.yozildiSana } : null,
        ustunlar: oqildi.ustunlar,
        natija: natijaXulosasi(natija),
        hisob: await tasdiqHisobi(),
      });
    }

    let natija;
    try {
      natija = await reyestrniYukla(oqildi.satrlar, {
        kiritganId: q.sessiya.userId,
        reyestrSanasi: sana,
        faylIzi,
        manbaTashkilot: yozishManbasi,
        yuklashIzi: yuklashId,
        bolak: (yozilgan, takror) => yozishJarayoni(yuklashId, yozilgan, takror),
      });
    } catch (e) {
      /*
       * Узилган ёзиш: ҳолат XATO. Ёзилганлари жойида; бир хил файл билан
       * қайта босилса давом этади ва такрор ёзмайди.
       */
      await yozishXatosi(yuklashId, e);
      throw e;
    }

    const ketdi = natija.mos.length - natija.takror;
    const tugadi = await yozishniTugat(yuklashId, { jami: natija.mos.length, yozilgan: ketdi, takror: natija.takror });

    await jurnal(q.sessiya.userId, 'OZGARTIRISH', {
      obyektTuri: 'JoylashuvDalili',
      obyektId: yuklashId,
      izoh: `[${izId}] Реестр кўчирмаси (юклаш ${yuklashId}, из ${faylIzi.slice(0, 12)}…): ${natija.jami} сатр, ${ketdi} та далил ёзилди`,
    });

    return NextResponse.json({
      ok: true,
      izId,
      yozildi: true,
      yuklashId,
      faylIzi,
      yuklash: yuklashXulosasi(tugadi),
      ustunlar: oqildi.ustunlar,
      natija: natijaXulosasi(natija),
      hisob: await tasdiqHisobi(),
    });
  } catch (e) {
    await serverXatosi('api:reyestr', e, izId);
    return NextResponse.json(
      {
        ok: false,
        xabar: yoz
          ? 'Yozish uzildi. Yozilganlari saqlandi; xuddi shu faylni qayta yozsangiz davom etadi (takror yozilmaydi)'
          : 'Solishtirib boʻlmadi',
        izId,
        ...(yoz ? { yuklashId } : {}),
      },
      { status: 500 }
    );
  }
}

/** Natijani brauzerga beriladigan shaklga keltiradi (shaxsiy maʼlumot faqat kerakli darajada) */
function natijaXulosasi(natija: Awaited<ReturnType<typeof reyestrniSolishtir>>) {
  return {
    jami: natija.jami,
    mos: natija.mos.length,
    boshqaIshJoyi: natija.mos.filter((m) => m.boshqaIshJoyi).length,
    yangiTopilgan: natija.yangiTopilgan,
    shubhali: natija.shubhali,
    tekshirilsin: natija.tekshirilsin,
    topilmadi: natija.topilmadi.length,
    takror: natija.takror,
  };
}

/** Yuklash yozuvining ochiq qismi */
function yuklashXulosasi(y: {
  id: string;
  holati: string;
  jami: number | null;
  yozilgan: number;
  takror: number;
  yozildiSana: Date | null;
}) {
  return {
    id: y.id,
    holati: y.holati,
    jami: y.jami,
    yozilgan: y.yozilgan,
    takror: y.takror,
    yozildiSana: y.yozildiSana,
  };
}
