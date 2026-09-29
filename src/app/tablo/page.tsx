import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AlifboProvider } from '@/components/alifbo/alifbo-provider';
import { TabloEkrani } from '@/components/tablo/tablo-ekrani';
import { alifboServer } from '@/lib/alifbo-server';
import { joriySessiya, tahlilKoradi } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { tabloMalumoti } from '@/lib/tablo-malumoti';

/**
 * ============================================================
 *  ЙЎЛАКДАГИ ТАБЛО
 *
 *  ── Нега алоҳида саҳифа, панелнинг бир бўлими эмас ──
 *
 *  Панел ЎҚИЛАДИ: ҳоким столга ўтиради, филтр танлайди,
 *  жадвални очади. Табло эса КЎРИЛАДИ: одам ёнидан ўтиб
 *  кетаётган бўлади.
 *
 *  Иккита вазифа битта саҳифага сиғмайди. Панелдаги менюни,
 *  фильтрни ва жадвалларни телевизорга чиқарсак, экраннинг
 *  ярмини тўрт метр наридан ўқиб бўлмайдиган ёзув эгаллайди.
 *  Шунинг учун табло ўз саҳифасида ва қобиқсиз — меню ҳам,
 *  колонтитул ҳам йўқ.
 *
 *  ── Нега барибир сессия сўралади ──
 *
 *  Экранда исм-шариф ёки хонадон маълумоти йўқ, фақат туман
 *  кесимидаги сон бор. Шунга қарамай саҳифа очиқ эмас:
 *  ҳокимликнинг ички кўрсаткичи интернетда ҳар кимга
 *  кўринадиган бўлиб қолмаслиги керак.
 *
 *  Амалда бу тўсиқ эмас: телевизорга уланган компьютерда
 *  сессия бир марта очилади ва ўн икки соат — бутун иш куни
 *  — туради.
 * ============================================================
 */

export const metadata: Metadata = {
  title: 'Ахборот таблоси',
};

/* Табло ҳар доим жонли маълумот кўрсатади — статик кеш йўқ */
export const dynamic = 'force-dynamic';

export default async function TabloSahifasi() {
  const sessiya = joriySessiya();
  if (!sessiya) redirect('/kirish?keyin=/tablo');
  if (!tahlilKoradi(sessiya.rol)) redirect('/');

  /*
   * Ходим ишдан бўшатилган бўлса, cookie ҳали яроқли бўлса
   * ҳам кирмайди. `(ilova)` қобиғидаги текширувнинг айни
   * ўзи — табло ундан ташқарида турганидан кейин бу ерда
   * такрорланиши шарт.
   */
  const user = await prisma.user.findUnique({
    where: { id: sessiya.userId },
    select: { faol: true },
  });
  if (!user?.faol) redirect('/kirish');

  const tablo = await tabloMalumoti();

  return (
    <AlifboProvider boshlangich={alifboServer()}>
      <TabloEkrani tablo={tablo} />
    </AlifboProvider>
  );
}
