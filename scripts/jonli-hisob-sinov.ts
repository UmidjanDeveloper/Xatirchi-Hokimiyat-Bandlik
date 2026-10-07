import { envYukla } from './env-yukla';
envYukla();
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { prisma } from '../src/lib/prisma';
import { kalitXeshi } from '../src/lib/maxfiy';
import { bazaChegarasiBandQil, bazaBandiniQaytar } from '../src/lib/kirish-chegarasi';

async function main() {
  const k = `jonli-band-sinov:${randomUUID()}`, boshqa = `${k}:boshqa`;
  try {
    const parallel = await Promise.all(Array.from({ length: 3 }, () => bazaChegarasiBandQil(k, 2, 60_000)));
    assert.equal(parallel.filter((n) => n.allowed).length, 2, 'parallel requests cannot overspend');
    const [a, b] = parallel.filter((n) => n.allowed);
    await bazaBandiniQaytar(boshqa, a.bandId!);
    assert.equal((await bazaChegarasiBandQil(k, 2, 60_000)).allowed, false, 'another key cannot refund it');
    await bazaBandiniQaytar(k, a.bandId!); await bazaBandiniQaytar(k, a.bandId!);
    assert.ok(await prisma.kirishUrinishi.findUnique({ where: { id: b.bandId! } }), 'other successful attempt remains');
    const c = await bazaChegarasiBandQil(k, 2, 60_000);
    assert.equal(c.allowed, true, 'failed request frees its own slot');
    assert.equal((await bazaChegarasiBandQil(k, 2, 60_000)).allowed, false);
    console.log('5/5 real database reservation/refund/concurrency checks passed.');
  } finally {
    await prisma.kirishUrinishi.deleteMany({ where: { kalit: { in: [kalitXeshi(k), kalitXeshi(boshqa)] } } });
    await prisma.$disconnect();
  }
}
main().catch((e) => { console.error(e); process.exitCode = 1; });
