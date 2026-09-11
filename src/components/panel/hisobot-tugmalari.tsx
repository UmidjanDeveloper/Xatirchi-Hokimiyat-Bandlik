'use client';

import { useState } from 'react';
import { FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import { useAlifbo } from '@/components/alifbo/alifbo-provider';
import { lotinga } from '@/lib/alifbo';
import type { TahlilNatijasi } from '@/lib/tahlil';
import { ISHSIZ_HOLATI } from '@/lib/ishsiz-holati';

/**
 * ============================================================
 *  HISOBOT TUGMALARI
 *
 *  PDF - yig'ilishga olib boriladi, o'qiladi, imzolanadi.
 *  Excel - ustida ishlanadi: viloyatga yuboriladi, boshqa
 *  jadvalga ko'chiriladi, o'z hisob-kitobi qilinadi.
 *
 *  Ikkalasi ham TANLANGAN ALIFBODA chiqadi. Hujjat kirillda
 *  kerak bo'lsa, saytni kirillga o'tkazib bosiladi - bu
 *  hokimiyat yozishmasida muhim, chunki rasmiy hujjatlar hali
 *  ko'pincha kirillda yuritiladi.
 *
 *  Og'ir kutubxonalar (jspdf ~250 KB, xlsx ~400 KB) faqat tugma
 *  bosilganda yuklanadi. Statik import qilinsa, hisobot
 *  olmaydigan xodim ham ularni har kirganda yuklab olardi.
 * ============================================================
 */
export function HisobotTugmalari({
  tahlil,
  kim,
}: {
  tahlil: TahlilNatijasi;
  /** Hisobot poyida ko'rinadi: kim tayyorlagani */
  kim: string;
}) {
  const { t: tr, alifbo } = useAlifbo();
  const [ishlayapti, setIshlayapti] = useState<'pdf' | 'excel' | null>(null);
  const [xato, setXato] = useState<string | null>(null);

  const bosh = tahlil.jami;
  const sana = new Date().toISOString().slice(0, 10);
  const qoshimcha = alifbo === 'lot' ? '' : '-kirill';

  /** Matnni joriy alifboga o'giradi (server matni doim kirillda) */
  const a = (s: string) => (alifbo === 'lot' ? lotinga(s) : s);

  const foiz = (qism: number, butun: number) =>
    butun > 0 ? Math.round((qism / butun) * 1000) / 10 : 0;

  const kpi = [
    {
      nomi: a('Хатловдан ўтган хонадон'),
      qiymat: bosh.xatlovXonadon.toLocaleString('ru-RU'),
      izoh: `${bosh.bazaXonadon.toLocaleString('ru-RU')} ${a('тадан')} · ${foiz(bosh.xatlovXonadon, bosh.bazaXonadon)}%`,
    },
    {
      nomi: a('Аниқланган ишсиз'),
      qiymat: bosh.aniqlangan.toLocaleString('ru-RU'),
      izoh: `${a('рўйхатда')} ${bosh.bazaIshsiz.toLocaleString('ru-RU')} ${a('та')}`,
    },
    {
      nomi: a('Ишга жойлаштирилган'),
      qiymat: bosh.joylashtirilgan.toLocaleString('ru-RU'),
      izoh: `${a('аниқланганларнинг')} ${foiz(bosh.joylashtirilgan, bosh.aniqlangan)}%`,
    },
    {
      nomi: a('Таклифдан бош тортган'),
      qiymat: bosh.radEtgan.toLocaleString('ru-RU'),
      izoh: a('алоҳида ишлаш талаб қилинади'),
    },
  ];

  const mahallaQatorlari = tahlil.qamrov.map((m) => ({
    nomi: a(m.nomiKirill),
    bazaXonadon: m.bazaXonadon,
    xatlovXonadon: m.xatlovXonadon,
    qamrovFoizi: m.qamrovFoizi,
    bazaIshsiz: m.bazaIshsiz,
    aniqlangan: m.aniqlangan,
    joylashtirilgan: m.joylashtirilgan,
    natijaFoizi: m.natijaFoizi,
  }));

  const voronkaQatorlari = tahlil.voronka.map((v) => ({
    bosqich: a(ISHSIZ_HOLATI[v.holati]?.kirill ?? v.holati),
    soni: v.soni,
    foiz: v.foiz,
  }));

  const toifaQatorlari = [
    { nomi: a('Аёллар дафтари'), soni: tahlil.toifalar.ayollarDaftari },
    { nomi: a('Ижтимоий реестр'), soni: tahlil.toifalar.ijtimoiyReestr },
    { nomi: a('Миграциядан қайтган'), soni: tahlil.toifalar.migratsiyadanQaytgan },
    { nomi: a('Олий битирувчи'), soni: tahlil.toifalar.oliyBitiruvchi },
    { nomi: a('Ўрта махсус битирувчи'), soni: tahlil.toifalar.ortaMaxsusBitiruvchi },
  ].filter((x) => x.soni > 0);

  async function pdfOl() {
    setXato(null);
    setIshlayapti('pdf');
    try {
      const { pdfYasa } = await import('@/lib/hisobot-pdf');
      await pdfYasa(
        {
          sarlavha: a('Аҳоли бандлиги — таҳлилий ҳисобот'),
          ostSarlavha: a('Хатирчи тумани ҳокимлиги · Навоий вилояти'),
          tayyorlagan: a(kim),
          kpi,
          jadvallar: [
            {
              sarlavha: a('Ишсизлар билан иш — босқичлар'),
              izoh: a('Ҳар босқичда нечта фуқаро турибди ва бу рўйхатдаги ишсизларнинг неча фоизи'),
              ustunlar: [
                { sarlavha: a('Босқич') },
                { sarlavha: a('Сони'), raqamli: true, eni: 24 },
                { sarlavha: a('Улуши, %'), raqamli: true, eni: 24 },
              ],
              qatorlar: voronkaQatorlari.map((v) => [v.bosqich, v.soni, `${v.foiz}%`]),
            },
            ...(toifaQatorlari.length
              ? [
                  {
                    sarlavha: a('Ишсизлар таркиби'),
                    izoh: a('Тоифалар кесишади — бир киши бир нечта тоифага кириши мумкин'),
                    ustunlar: [
                      { sarlavha: a('Тоифа') },
                      { sarlavha: a('Сони'), raqamli: true, eni: 28 },
                    ],
                    qatorlar: toifaQatorlari.map((x) => [x.nomi, x.soni.toLocaleString('ru-RU')]),
                  },
                ]
              : []),
            {
              sarlavha: a('Маҳаллалар кесимида'),
              izoh: a('Қамров — рўйхатдаги ишсизлардан нечтаси хатловдан ўтгани. Натижа — нечтаси ишга жойлашгани.'),
              ustunlar: [
                { sarlavha: a('МФЙ') },
                { sarlavha: a('Хонадон'), raqamli: true },
                { sarlavha: a('Хатлов'), raqamli: true },
                { sarlavha: a('Қамров'), raqamli: true },
                { sarlavha: a('Ишсиз'), raqamli: true },
                { sarlavha: a('Аниқл.'), raqamli: true },
                { sarlavha: a('Жойл.'), raqamli: true },
                { sarlavha: a('Натижа'), raqamli: true },
              ],
              qatorlar: mahallaQatorlari.map((m) => [
                m.nomi, m.bazaXonadon, m.xatlovXonadon, `${m.qamrovFoizi}%`,
                m.bazaIshsiz, m.aniqlangan, m.joylashtirilgan, `${m.natijaFoizi}%`,
              ]),
            },
          ],
        },
        `bandlik-hisobot-${sana}${qoshimcha}.pdf`
      );
    } catch (e) {
      setXato(e instanceof Error ? e.message : tr('Ҳисобот тайёрланмади'));
    } finally {
      setIshlayapti(null);
    }
  }

  async function excelOl() {
    setXato(null);
    setIshlayapti('excel');
    try {
      const { excelYasa } = await import('@/lib/hisobot-excel');
      await excelYasa(
        {
          lotin: alifbo === 'lot',
          sarlavha: a('Аҳоли бандлиги — таҳлилий ҳисобот'),
          ostSarlavha: a('Хатирчи тумани ҳокимлиги · Навоий вилояти'),
          kpi: kpi.map((k) => ({ nomi: k.nomi, qiymat: k.qiymat })),
          voronka: voronkaQatorlari,
          mahallalar: mahallaQatorlari,
          toifalar: toifaQatorlari,
          dinamika: tahlil.dinamika.map((d) => ({
            yorliq: a(d.yorliq),
            aniqlangan: d.aniqlangan,
            joylashtirilgan: d.joylashtirilgan,
          })),
        },
        `bandlik-hisobot-${sana}${qoshimcha}.xlsx`
      );
    } catch (e) {
      setXato(e instanceof Error ? e.message : tr('Ҳисобот тайёрланмади'));
    } finally {
      setIshlayapti(null);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={pdfOl}
          disabled={ishlayapti !== null}
          className="flex items-center gap-2 rounded-md border border-line bg-surface px-3 py-2 text-xs font-semibold text-ink transition-colors hover:border-accent hover:text-accent disabled:opacity-60"
        >
          {ishlayapti === 'pdf' ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <FileText className="h-4 w-4" aria-hidden="true" />
          )}
          {tr('PDF ҳисобот')}
        </button>

        <button
          type="button"
          onClick={excelOl}
          disabled={ishlayapti !== null}
          className="flex items-center gap-2 rounded-md border border-line bg-surface px-3 py-2 text-xs font-semibold text-ink transition-colors hover:border-accent hover:text-accent disabled:opacity-60"
        >
          {ishlayapti === 'excel' ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
          )}
          {tr('Excel ҳисобот')}
        </button>
      </div>

      {xato && (
        <p className="text-xs text-danger" role="alert">
          {xato}
        </p>
      )}

      <p className="text-[11px] leading-relaxed text-ink-faint">
        {tr('Ҳисобот ҳозирги алифбода тайёрланади. Кириллда керак бўлса — юқоридаги тугмадан алифбони алмаштириб, қайтадан босинг.')}
      </p>
    </div>
  );
}
