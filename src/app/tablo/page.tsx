import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AlifboProvider } from '@/components/alifbo/alifbo-provider';
import { TabloEkrani } from '@/components/tablo/tablo-ekrani';
import { alifboServer } from '@/lib/alifbo-server';
import { tahlilKoradi } from '@/lib/auth';
import { joriyXodim } from '@/lib/sahifa-auth';
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
  /*
   * ── НЕГА `joriyXodim()` ──
   *
   * Аввал бу ерда `joriySessiya()` турарди ва рол COOKIE'дан
   * ўқиларди. Яъни табло `(ilova)` қобиғидаги текширувдан
   * ТАШҚАРИДА қолган эди:
   *
   *   · роли пасайтирилган ходим таблони очаверарди;
   *   · парол алмашганда эски cookie бу ерда ҳамон ишларди
   *     (`sessiyaVersiyasi` текширилмасди).
   *
   * Табло — бутун туманнинг жонли рақамлари. Уни қолдириб
   * кетиш «ҳамма саҳифа базадан текширилади» деган гапни
   * ёлғонга чиқарарди.
   *
   * `joriyXodim()` учовини бирда қилади: ҳисоб фаоллиги,
   * БАЗАДАГИ рол ва сессия авлоди.
   */
  const xodim = await joriyXodim();
  if (!xodim) redirect('/kirish?keyin=/tablo');
  if (!tahlilKoradi(xodim.rol)) redirect('/');

  const tablo = await tabloMalumoti();

  return (
    <AlifboProvider boshlangich={alifboServer()}>
      <TabloEkrani tablo={tablo} />
    </AlifboProvider>
  );
}
