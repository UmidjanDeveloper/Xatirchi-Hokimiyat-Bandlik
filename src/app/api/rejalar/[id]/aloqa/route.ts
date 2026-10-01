import { NextResponse } from 'next/server';
import { jurnal, talabQil } from '@/lib/api-auth';
import {
  AloqaSxemasi,
  RejaXatosi,
  aloqaVaqtiYaroqlimi,
  aloqaYozish,
  keyingiSanaYaroqlimi,
  rejaniOl,
  sanaOrali,
} from '@/lib/oila-rejasi';

const ROLLAR = ['YETTILIK', 'BANDLIK', 'BANDLIK_RAHBAR', 'ADMIN'] as const;

/**
 * Oila bilan aloqani qayd etish: usul, vaqt, kim bilan, mazmun, fuqaro
 * fikri. Yozuvchi sessiyadan olinadi - uni so'rovda berib bo'lmaydi.
 */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const q = await talabQil([...ROLLAR]);
  if (q instanceof NextResponse) return q;

  const natija = AloqaSxemasi.safeParse(await request.json().catch(() => null));
  if (!natija.success) {
    return NextResponse.json(
      { xabar: natija.error.issues[0]?.message ?? 'Маълумот нотўғри' },
      { status: 400 }
    );
  }
  const d = natija.data;

  if (!aloqaVaqtiYaroqlimi(d.aloqaVaqti)) {
    return NextResponse.json(
      { xabar: 'Алоқа вақти келажакда бўлиши мумкин эмас — бу ўтган алоқа ёзуви' },
      { status: 400 }
    );
  }
  if (d.keyingiAloqaSanasi) {
    if (!keyingiSanaYaroqlimi(d.keyingiAloqaSanasi)) {
      return NextResponse.json({ xabar: 'Кейинги алоқа санаси ҳаддан ташқари узоқ' }, { status: 400 });
    }
    if (sanaOrali(d.keyingiAloqaSanasi, d.aloqaVaqti) < 0) {
      return NextResponse.json(
        { xabar: 'Кейинги алоқа санаси ўтган алоқадан олдин бўлиши мумкин эмас' },
        { status: 400 }
      );
    }
  }

  try {
    const reja = await rejaniOl(params.id, q.sessiya);
    const a = await aloqaYozish(reja.id, q.sessiya.userId, {
      usul: d.usul,
      aloqaVaqti: d.aloqaVaqti,
      kimBilan: d.kimBilan,
      mazmun: d.mazmun,
      fuqaroFikri: d.fuqaroFikri,
      keyingiAloqaSanasi: d.keyingiAloqaSanasi ?? undefined,
    });
    if (!a.takror) {
      await jurnal(q.sessiya.userId, 'YARATISH', {
        obyektTuri: 'OilaAloqasi',
        obyektId: a.id,
        izoh: d.usul,
      });
    }
    return NextResponse.json({ ok: true, id: a.id, takror: a.takror });
  } catch (e) {
    if (e instanceof RejaXatosi) {
      const holat = { TOPILMADI: 404, RUXSAT: 403, MAVJUD: 409, YOPIQ: 409, NOTOGRI: 400 }[e.kod];
      return NextResponse.json({ xabar: e.message }, { status: holat });
    }
    throw e;
  }
}
