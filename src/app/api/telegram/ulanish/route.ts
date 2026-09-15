import { NextResponse } from 'next/server';
import { talabQil } from '@/lib/api-auth';
import { ulanishKodi, ulanishniUz } from '@/lib/xabarnoma';

/*
 * ХОДИМНИНГ ЎЗ TELEGRAM ҲИСОБИНИ БОҒЛАШИ
 *
 * POST   — бир марталик код беради
 * DELETE — боғланишни узади
 *
 * Администратор бошқа ходимнинг чат ID сини кирита олмайди:
 * битта рақам хато терилса, хабар БЕГОНА одамга кетарди.
 * Шунинг учун ҳар ким фақат ЎЗИНИ боғлайди.
 */

export async function POST() {
  const q = await talabQil();
  if (q instanceof NextResponse) return q;

  const kod = await ulanishKodi(q.sessiya.userId);
  return NextResponse.json({ ok: true, kod });
}

export async function DELETE() {
  const q = await talabQil();
  if (q instanceof NextResponse) return q;

  await ulanishniUz(q.sessiya.userId);
  return NextResponse.json({ ok: true });
}
