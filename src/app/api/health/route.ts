import { NextResponse } from 'next/server';

/**
 * Jarayon tirik: bazaga tegmaydi, hech qanday ma'lumot chiqarmaydi.
 * Sessiyasiz ochiladi (middleware: SALOMATLIK_YOLLARI).
 */
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
}
