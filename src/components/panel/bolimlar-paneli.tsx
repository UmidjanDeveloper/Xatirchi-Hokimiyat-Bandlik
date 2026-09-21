import {
  Baby,
  Briefcase,
  Building2,
  Coins,
  FileCheck2,
  GraduationCap,
  HeartPulse,
  Home,
  Plane,
  Shield,
  Sprout,
  Wrench,
} from 'lucide-react';
import { matnchi } from '@/lib/alifbo-server';
import type { BolimlarTahlili, UlushQatori } from '@/lib/bolimlar-tahlili';
import {
  CHET_EL_DAVLATI,
  CHORVA_TURI,
  GAZ_TURI,
  HUNAR_TURI,
  ICHIMLIK_SUVI,
  INFRATUZILMA_MUAMMOSI,
  KAMBAGALLIK_SABABI,
  MABLAG_YONALISHI,
  MOLIYA_TURI,
  PASSIV_DAROMAD_TURI,
  TOMORQA_FOYDALANISH,
  UY_HOLATI,
  DAROMAD_MANBAI,
  kirillcha,
  type Variant,
} from '@/lib/constants';

/**
 * ============================================================
 *  ХАТЛОВ БЎЛИМЛАРИ — ПАНЕЛДАГИ КЎРИНИШИ
 *
 *  ── Иккита қоида ──
 *
 *  1. ҲАР РАҚАМНИНГ МАХРАЖИ БОР. «412 та бола» — ҳокимга
 *     ҳеч нима демайди. «1 500 хонадондаги 412 та бола»
 *     дейилса, у дарҳол «демак ҳар тўртинчи оилада» деб
 *     ўқийди ва қарор қила олади.
 *
 *  2. ҲЕЧ БИР РАҚАМ HOVER ОРТИДА ЯШИРИНМАЙДИ. Ҳоким панелни
 *     йиғилишда проекторда ёки телефонда очади — сичқонча
 *     йўқ. Шунинг учун диаграмма кутубхонаси ишлатилмаган:
 *     ҳар устуннинг ёнида сони ва фоизи ОЧИҚ ёзилган.
 *
 *  ── Нега бўлимлар тартиби анкетадагидек ──
 *
 *  Ходим анкетани I дан XII гача тўлдиради. Панелда ҳам худди
 *  шу тартиб: йиғилишда «тўққизинчи бўлимдаги томорқа» деб
 *  айтилса, ҳоким уни қидириб ўтирмайди.
 * ============================================================
 */

const raqam = (n: number) => n.toLocaleString('ru-RU');

const pul = (som: number) =>
  som >= 1_000_000_000
    ? `${(som / 1_000_000_000).toFixed(1)} млрд`
    : som >= 1_000_000
      ? `${(som / 1_000_000).toFixed(1)} млн`
      : raqam(som);

const foiz = (qism: number, butun: number): number =>
  butun > 0 ? Math.round((qism / butun) * 1000) / 10 : 0;

/**
 * Вариант номини панел учун қисқартиради.
 *
 * Каталогдаги баъзи вариант ИККИ қисмдан иборат: номи ва
 * ходимга тушунтириш. Масалан «Аъло — ер тўлиқ экилган, ҳосил
 * олинади». Анкетада тушунтириш зарур — ходим дала шароитида
 * баҳо бериши керак. Панелда эса у фақат жой эгаллайди ва
 * ёрлиқ «Аъло — ер тўлиқ экилган, ҳо…» бўлиб кесилиб қоларди,
 * яъни энг керакли сўз кўринарди-ю, қолгани ахлат эди.
 *
 * Тире олдидаги қисм — вариантнинг ўз номи, шу қолдирилади.
 */
const qisqaNom = (nom: string): string => nom.split(' — ')[0];

/* Бўлимлар рўйхати — юқоридаги ўтиш тугмалари шундан чиқади */
const BOLIMLAR = [
  { id: 'bolim-oila', raqam: '0', nomi: 'Оила таркиби' },
  { id: 'bolim-mehnat', raqam: 'I', nomi: 'Меҳнат ва бандлик' },
  { id: 'bolim-tadbirkorlik', raqam: 'II', nomi: 'Тадбиркорлик' },
  { id: 'bolim-chet-el', raqam: 'II-Б', nomi: 'Чет эл' },
  { id: 'bolim-daromad', raqam: 'III', nomi: 'Даромад' },
  { id: 'bolim-talim', raqam: 'IV', nomi: 'Болалар таълими' },
  { id: 'bolim-soglik', raqam: 'V', nomi: 'Соғлиқ' },
  { id: 'bolim-uy-joy', raqam: 'VI', nomi: 'Уй-жой' },
  { id: 'bolim-ijtimoiy', raqam: 'VII-VIII', nomi: 'Ижтимоий ҳимоя' },
  { id: 'bolim-yer', raqam: 'IX', nomi: 'Ер ва чорва' },
  { id: 'bolim-qoshimcha', raqam: 'X', nomi: 'Қўшимча даромад' },
  { id: 'bolim-infratuzilma', raqam: 'XI', nomi: 'Инфратузилма' },
  { id: 'bolim-rozilik', raqam: 'XII', nomi: 'Розилик' },
];

export function BolimlarPaneli({
  b,
  qamrovNomi,
}: {
  b: BolimlarTahlili;
  qamrovNomi: string;
}) {
  const tr = matnchi();

  /*
   * ── ХАТЛОВ БОШЛАНМАГАН ──
   *
   * Нол хонадонда ҳар бир фоиз нол бўлади ва ўн учта бўш
   * карточка ҳокимга «тизим ишламаяпти» деб кўринади. Бу
   * ҳолатда битта РОСТ ГАП кўпроқ фойда беради.
   */
  if (b.xonadon === 0) {
    return (
      <section className="karta p-4 sm:p-5">
        <h2 className="text-sm font-bold text-ink">
          {tr('Хатлов бўлимлари бўйича таҳлил')}
        </h2>
        <p className="quti-ogoh mt-3 text-sm leading-relaxed">
          {tr(
            'Бу ерда анкетанинг ўн икки бўлими бўйича жамланма чиқади: болалар ёши, чет элдаги оила аъзолари ва улар юборадиган пул, боғча ва мактаб қамрови, уй-жой шароити, томорқа ва чорва. Ҳозирча биронта хатлов якунланмаган — биринчи анкета юборилиши билан рақамлар шу ерда пайдо бўлади.'
          )}
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Сарлавҳа ва бўлимларга ўтиш ── */}
      <section className="karta p-4 sm:p-5">
        <h2 className="text-sm font-bold text-ink">
          {tr('Хатлов бўлимлари бўйича таҳлил')}
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-ink-faint">
          {tr(qamrovNomi)} {tr('·')} {raqam(b.xonadon)}{' '}
          {tr(
            'та якунланган хатлов асосида. Қуйидаги барча фоиз шу сондан ҳисобланган — база рўйхатидан эмас.'
          )}
        </p>

        <nav className="mt-3 flex flex-wrap gap-1.5">
          {BOLIMLAR.map((x) => (
            <a
              key={x.id}
              href={`#${x.id}`}
              className="rounded-full border border-line px-2.5 py-1 text-[11px] font-medium text-ink-muted transition-colors hover:border-accent hover:bg-accent-soft hover:text-ink"
            >
              <span className="raqam text-ink-faint">{x.raqam}</span> {tr(x.nomi)}
            </a>
          ))}
        </nav>
      </section>

      {/* ══ 0. ОИЛА ТАРКИБИ ══ */}
      <Bolim
        id="bolim-oila"
        raqam="0"
        ikonka={<Baby className="h-4 w-4" />}
        sarlavha="Хонадон ва оила таркиби"
        izoh="Болаларнинг ёш гуруҳи — боғча, мактаб ва бандлик режаси шундан чиқади"
      >
        <Tasma>
          <Raqam nomi="Жами оила аъзоси" qiymat={raqam(b.oila.jamiAzo)}
            izoh={`Ўртача ${b.oila.ortachaHajm} киши`} />
          <Raqam nomi="Жами фарзанд" qiymat={raqam(b.oila.bolalarSoni)}
            izoh={`Аҳолининг ${foiz(b.oila.bolalarSoni, b.oila.jamiAzo)}%`} />
          <Raqam
            nomi="17 ёшгача бола"
            qiymat={raqam(b.oila.bolalar0_3 + b.oila.bolalar3_17)}
            izoh="Боғча, мактаб ва тиббиёт режаси учун"
          />
          <Raqam nomi="Аёл оила бошлиғи" qiymat={raqam(b.oila.ayolBoshliq)}
            izoh={`Хонадонларнинг ${foiz(b.oila.ayolBoshliq, b.xonadon)}%`} />
        </Tasma>

        <Ulush
          sarlavha="Болалар ёш гуруҳлари бўйича"
          maxraj={b.oila.bolalarSoni}
          maxrajNomi="жами фарзанддан"
          qatorlar={[
            { qiymat: '0–3 ёш', soni: b.oila.bolalar0_3 },
            { qiymat: '3–17 ёш', soni: b.oila.bolalar3_17 },
            { qiymat: '18 ёшдан катта', soni: b.oila.bolalar18Dan },
          ]}
        />
      </Bolim>

      {/* ══ I. МЕҲНАТ ══ */}
      <Bolim
        id="bolim-mehnat"
        raqam="I"
        ikonka={<Briefcase className="h-4 w-4" />}
        sarlavha="Меҳнат ва бандлик"
        izoh="Хатлов катакларидан — рўйхатдаги ишсизлар билан аралаштирманг"
      >
        <Tasma>
          <Raqam nomi="Меҳнатга лаёқатли" qiymat={raqam(b.mehnat.layoqatli)}
            izoh={`Аҳолининг ${foiz(b.mehnat.layoqatli, b.oila.jamiAzo)}%`} />
          <Raqam nomi="Ишлаётган" qiymat={raqam(b.mehnat.ishlaydigan)}
            izoh={`Лаёқатлиларнинг ${foiz(b.mehnat.ishlaydigan, b.mehnat.layoqatli)}%`}
            holat="yaxshi" />
          <Raqam nomi="Ишсиз" qiymat={raqam(b.mehnat.ishsiz)}
            izoh={`Лаёқатлиларнинг ${foiz(b.mehnat.ishsiz, b.mehnat.layoqatli)}%`}
            holat="ogoh" />
          <Raqam nomi="Меҳнатга лаёқатсиз" qiymat={raqam(b.mehnat.layoqatsiz)}
            izoh="Ишсиз эмас — ижтимоий ёрдам керак" />
          <Raqam nomi="Боғча кутаётган аёл" qiymat={raqam(b.mehnat.bogchaKutayotgan)}
            izoh="Боғча очилса ишга тайёр" holat="ogoh" />
          <Raqam nomi="Касб ўрганмоқчи оила" qiymat={raqam(b.mehnat.kasbIstagi)}
            izoh={`Хонадонларнинг ${foiz(b.mehnat.kasbIstagi, b.xonadon)}%`} />
        </Tasma>

        <Ulush
          sarlavha="Ишлаётганлар қаерда банд"
          maxraj={b.mehnat.ishlaydigan}
          maxrajNomi="ишлаётгандан"
          qatorlar={[
            { qiymat: 'Давлат корхонасида', soni: b.mehnat.davlatda },
            { qiymat: 'Хусусий секторда', soni: b.mehnat.xususiyda },
          ]}
        />
      </Bolim>

      {/* ══ II. ТАДБИРКОРЛИК ══ */}
      <Bolim
        id="bolim-tadbirkorlik"
        raqam="II"
        ikonka={<Building2 className="h-4 w-4" />}
        sarlavha="Тадбиркорлик ва кредит-субсидия"
        izoh="Талаб қилинган маблағ ва йўналишлар юқоридаги «Бюджет талаби» блокида"
      >
        <Tasma>
          <Raqam nomi="Тадбиркорлик истаги" qiymat={raqam(b.tadbirkorlik.istagi)}
            izoh={`Хонадонларнинг ${foiz(b.tadbirkorlik.istagi, b.xonadon)}%`} />
          <Raqam nomi="Молиявий эҳтиёж" qiymat={raqam(b.tadbirkorlik.moliyaEhtiyoji)}
            izoh={`Хонадонларнинг ${foiz(b.tadbirkorlik.moliyaEhtiyoji, b.xonadon)}%`} />
          <Raqam nomi="Иссиқхона талаби" qiymat={raqam(b.tadbirkorlik.issiqxonaTalabi)}
            izoh={`Жами ${raqam(b.tadbirkorlik.issiqxonaMaydoni)} сотих`} />
          <Raqam nomi="Ижара ери бор" qiymat={raqam(b.tadbirkorlik.ijaraYer)}
            izoh={`Жами ${raqam(b.tadbirkorlik.ijaraYerMaydoni)} гектар`} />
        </Tasma>

        <div className="grid gap-4 sm:grid-cols-2">
          <Ulush sarlavha="Қайси соҳада тадбиркорлик қилмоқчи"
            qatorlar={b.tadbirkorlik.sohalar} katalog={MABLAG_YONALISHI}
            maxraj={b.tadbirkorlik.istagi} maxrajNomi="истак билдирган оиладан" />
          <Ulush sarlavha="Қандай молиявий ёрдам керак"
            qatorlar={b.tadbirkorlik.moliyaTuri} katalog={MOLIYA_TURI}
            maxraj={b.tadbirkorlik.moliyaEhtiyoji} maxrajNomi="эҳтиёжи бор оиладан" />
        </div>
      </Bolim>

      {/* ══ II-Б. ЧЕТ ЭЛ ══ */}
      <Bolim
        id="bolim-chet-el"
        raqam="II-Б"
        ikonka={<Plane className="h-4 w-4" />}
        sarlavha="Чет элдаги меҳнат ва пул ўтказмаси"
        izoh="Оила бюджетига ТАШҚАРИДАН кирадиган пул — камбағаллик баҳосини тубдан ўзгартиради"
      >
        <Tasma>
          <Raqam nomi="Чет элда аъзоси бор оила" qiymat={raqam(b.chetEl.oila)}
            izoh={`Хонадонларнинг ${foiz(b.chetEl.oila, b.xonadon)}%`} />
          <Raqam nomi="Чет элдаги фуқаро" qiymat={raqam(b.chetEl.ishchi)}
            izoh="Ишлаётган ва ўқиётганлар" />
          <Raqam nomi="Ойига кирадиган пул" qiymat={`${pul(b.chetEl.oylikSom)} сўм`}
            izoh={`${raqam(b.chetEl.pulliOila)} та оила суммани кўрсатган`}
            holat="yaxshi" />
          <Raqam nomi="Йилига" qiymat={`${pul(b.chetEl.oylikSom * 12)} сўм`}
            izoh="Ойлик сумма × 12" holat="yaxshi" />
        </Tasma>

        {/*
          Ўртача — ойлик пулни АЙТГАН оилага бўлинади, чет элда
          аъзоси бор барча оилага эмас: айтмаган оилани нол деб
          қўшсак, ўртача сунъий равишда пасайиб кетарди.
        */}
        {b.chetEl.pulliOila > 0 && (
          <p className="text-xs text-ink-muted">
            {tr('Бир оилага ўртача ойига')}{' '}
            <b className="raqam text-ink">
              {pul(Math.round(b.chetEl.oylikSom / b.chetEl.pulliOila))} {tr('сўм')}
            </b>
            {b.chetEl.oila > b.chetEl.pulliOila && (
              <>
                {' · '}
                <span className="text-warn">
                  {raqam(b.chetEl.oila - b.chetEl.pulliOila)}{' '}
                  {tr('та оила суммани айтмаган — ҳақиқий рақам бундан юқори')}
                </span>
              </>
            )}
          </p>
        )}

        <Ulush sarlavha="Қайси давлатларда" qatorlar={b.chetEl.davlatlar}
          katalog={CHET_EL_DAVLATI} maxraj={b.chetEl.oila} maxrajNomi="оиладан" />
      </Bolim>

      {/* ══ III. ДАРОМАД ══ */}
      <Bolim
        id="bolim-daromad"
        raqam="III"
        ikonka={<Coins className="h-4 w-4" />}
        sarlavha="Даромад ва камбағаллик сабаблари"
        izoh="Ойлик даромадни ҳар оила ҳам кўрсатмайди — маҳраж шунинг учун алоҳида"
      >
        <Tasma>
          <Raqam nomi="Даромадини кўрсатган оила" qiymat={raqam(b.daromad.oila)}
            izoh={`Хонадонларнинг ${foiz(b.daromad.oila, b.xonadon)}%`} />
          <Raqam nomi="Жами ойлик даромад" qiymat={`${pul(b.daromad.jami)} сўм`}
            izoh="Фақат кўрсатган оилалар бўйича" />
          <Raqam nomi="Бир оилага ўртача" qiymat={`${pul(b.daromad.ortacha)} сўм`}
            izoh="Ойига" />
          <Raqam nomi="Ўз таклифини ёзган" qiymat={raqam(b.daromad.imkoniyatYozgan)}
            izoh="«Даромадни кўпайтириш имконияти»" />
        </Tasma>

        <div className="grid gap-4 sm:grid-cols-2">
          <Ulush sarlavha="Даромад манбалари" qatorlar={b.daromad.manbalar}
            katalog={DAROMAD_MANBAI} maxraj={b.xonadon} maxrajNomi="хонадондан" />
          <Ulush sarlavha="Камбағалликка тушиш сабаблари" qatorlar={b.daromad.sabablar}
            katalog={KAMBAGALLIK_SABABI} maxraj={b.xonadon} maxrajNomi="хонадондан"
            xavfli />
        </div>
      </Bolim>

      {/* ══ IV. БОЛАЛАР ТАЪЛИМИ ══ */}
      <Bolim
        id="bolim-talim"
        raqam="IV"
        ikonka={<GraduationCap className="h-4 w-4" />}
        sarlavha="Болалар таълими ва ривожланиши"
        izoh="Қамровдан ташқаридаги ҳар бола — аниқ манзил, аниқ чора"
      >
        <div className="space-y-3">
          <Qamrov nomi="Боғча қамрови" qamrovda={b.talim.maktabgachaQamrovda}
            yoshdagi={b.talim.maktabgachaYoshdagi} />
          <Qamrov nomi="Мактаб қамрови" qamrovda={b.talim.maktabQamrovda}
            yoshdagi={b.talim.maktabYoshdagi} />
        </div>

        <Tasma>
          <Raqam nomi="Боғчага бормаётган бола"
            qiymat={raqam(Math.max(0, b.talim.maktabgachaYoshdagi - b.talim.maktabgachaQamrovda))}
            izoh={`${raqam(b.talim.maktabgachaYoshdagi)} та мактабгача ёшдагидан`}
            holat="xavf" />
          <Raqam nomi="Мактабга бормаётган бола"
            qiymat={raqam(Math.max(0, b.talim.maktabYoshdagi - b.talim.maktabQamrovda))}
            izoh={`${raqam(b.talim.maktabYoshdagi)} та мактаб ёшидагидан`}
            holat="xavf" />
          <Raqam nomi="Тўгаракка қатнайди" qiymat={raqam(b.talim.togarakQamrovi)}
            izoh={`17 ёшгача болаларнинг ${foiz(b.talim.togarakQamrovi, b.oila.bolalar0_3 + b.oila.bolalar3_17)}%`} />
        </Tasma>
      </Bolim>

      {/* ══ V. СОҒЛИҚ ══ */}
      <Bolim
        id="bolim-soglik"
        raqam="V"
        ikonka={<HeartPulse className="h-4 w-4" />}
        sarlavha="Соғлиқни сақлаш ва тиббий ёрдамга эҳтиёж"
        izoh="Узоқ даволаниш — оиланинг ишлашга қайтишини тўхтатиб турадиган асосий сабаблардан"
      >
        <Tasma>
          <Raqam nomi="Узоқ даволанишга муҳтож" qiymat={raqam(b.soglik.uzoqDavolanish)}
            izoh={`Хонадонларнинг ${foiz(b.soglik.uzoqDavolanish, b.xonadon)}%`}
            holat="xavf" />
          <Raqam nomi="Доимий дорига эҳтиёж" qiymat={raqam(b.soglik.doriKerak)}
            izoh={`Хонадонларнинг ${foiz(b.soglik.doriKerak, b.xonadon)}%`}
            holat="ogoh" />
          <Raqam nomi="Тиббий хизмат эҳтиёжи" qiymat={raqam(b.soglik.tibbiyKerak)}
            izoh={`Хонадонларнинг ${foiz(b.soglik.tibbiyKerak, b.xonadon)}%`}
            holat="ogoh" />
          <Raqam nomi="Охирги кўрикни ёзган" qiymat={raqam(b.soglik.korikYozgan)}
            izoh="Сана эркин матнда — рўйхат ҳисоботда" />
        </Tasma>
      </Bolim>

      {/* ══ VI. УЙ-ЖОЙ ══ */}
      <Bolim
        id="bolim-uy-joy"
        raqam="VI"
        ikonka={<Home className="h-4 w-4" />}
        sarlavha="Уй-жой ва коммунал шароит"
        izoh="Бу рақамлар туман инфратузилма режасига тўғридан-тўғри киради"
      >
        <Tasma>
          <Raqam nomi="Электр йўқ" qiymat={raqam(b.uyJoy.elektrYoq)}
            izoh={`${foiz(b.uyJoy.elektrYoq, b.xonadon)}%`}
            holat={b.uyJoy.elektrYoq > 0 ? 'xavf' : 'yaxshi'} />
          <Raqam nomi="Газ йўқ" qiymat={raqam(b.uyJoy.gazYoq)}
            izoh={`${foiz(b.uyJoy.gazYoq, b.xonadon)}%`}
            holat={b.uyJoy.gazYoq > 0 ? 'ogoh' : 'yaxshi'} />
          <Raqam nomi="Канализация йўқ" qiymat={raqam(b.uyJoy.kanalizatsiyaYoq)}
            izoh={`${foiz(b.uyJoy.kanalizatsiyaYoq, b.xonadon)}%`}
            holat={b.uyJoy.kanalizatsiyaYoq > 0 ? 'ogoh' : 'yaxshi'} />
          <Raqam nomi="Суғориш суви йўқ" qiymat={raqam(b.uyJoy.sugorishYoq)}
            izoh={`${foiz(b.uyJoy.sugorishYoq, b.xonadon)}%`}
            holat={b.uyJoy.sugorishYoq > 0 ? 'ogoh' : 'yaxshi'} />
        </Tasma>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Ulush sarlavha="Уй ҳолати" qatorlar={b.uyJoy.holati} katalog={UY_HOLATI}
            maxraj={b.xonadon} maxrajNomi="хонадондан" katalogTartibi />
          <Ulush sarlavha="Ичимлик суви" qatorlar={b.uyJoy.ichimlikSuvi}
            katalog={ICHIMLIK_SUVI} maxraj={b.xonadon} maxrajNomi="хонадондан" />
          <Ulush sarlavha="Газ тури" qatorlar={b.uyJoy.gazTuri} katalog={GAZ_TURI}
            maxraj={b.xonadon - b.uyJoy.gazYoq} maxrajNomi="гази бор хонадондан" />
        </div>
      </Bolim>

      {/* ══ VII-VIII. ИЖТИМОИЙ ҲИМОЯ ══ */}
      <Bolim
        id="bolim-ijtimoiy"
        raqam="VII-VIII"
        ikonka={<Shield className="h-4 w-4" />}
        sarlavha="Ижтимоий ҳимояга муҳтожлар ва ҳужжатлаштириш"
        izoh="Оила сони ва ШАХС сони бошқа-бошқа: бир хонадонда бир нечта муҳтож бўлиши мумкин"
      >
        <Tasma>
          <Raqam nomi="Ногиронлиги бор оила" qiymat={raqam(b.ijtimoiy.nogironOila)}
            izoh={`${raqam(b.ijtimoiy.nogironShaxs)} та шахс рўйхатга олинган`} />
          <Raqam nomi="Ёлғиз кекса бор оила" qiymat={raqam(b.ijtimoiy.yolgizKeksaOila)}
            izoh={`${raqam(b.ijtimoiy.yolgizKeksaShaxs)} та шахс рўйхатга олинган`} />
          <Raqam nomi="Парваришга муҳтож" qiymat={raqam(b.ijtimoiy.parvarishOila)}
            izoh={`${raqam(b.ijtimoiy.parvarishShaxs)} та шахс рўйхатга олинган`} />
          <Raqam nomi="Ҳужжати тўлиқ эмас" qiymat={raqam(b.hujjat.notoliq)}
            izoh={`Хонадонларнинг ${foiz(b.hujjat.notoliq, b.xonadon)}% — нафақа ва хизматга тўсиқ`}
            holat="xavf" />
        </Tasma>
      </Bolim>

      {/* ══ IX. ЕР, ЧОРВА, ҲУНАРМАНДЧИЛИК ══ */}
      <Bolim
        id="bolim-yer"
        raqam="IX"
        ikonka={<Sprout className="h-4 w-4" />}
        sarlavha="Томорқа, ер, чорвачилик ва ҳунармандчилик"
        izoh="Ер майдонининг ўзи етмайди — ундан ҚАНДАЙ фойдаланилаётгани ҳам шу ерда"
      >
        <Tasma>
          <Raqam nomi="Томорқаси бор оила" qiymat={raqam(b.yer.tomorqaOila)}
            izoh={`Хонадонларнинг ${foiz(b.yer.tomorqaOila, b.xonadon)}%`} />
          <Raqam nomi="Экин экиладиган майдон" qiymat={`${raqam(b.yer.ekinMaydoni)} сотих`}
            izoh={`Ўртача ${b.yer.tomorqaOila > 0 ? Math.round((b.yer.ekinMaydoni / b.yer.tomorqaOila) * 10) / 10 : 0} сотих`} />
          <Raqam nomi="Қўшимча ер олган" qiymat={raqam(b.yer.qoshimchaYerOila)}
            izoh={`Жами ${raqam(b.yer.qoshimchaYerMaydoni)} сотих`} />
          <Raqam nomi="Ҳунарманди бор оила" qiymat={raqam(b.yer.hunarmandOila)}
            izoh={`Хонадонларнинг ${foiz(b.yer.hunarmandOila, b.xonadon)}%`} />
        </Tasma>

        <Ulush
          sarlavha="Томорқадан фойдаланиш даражаси"
          qatorlar={b.yer.foydalanish}
          katalog={TOMORQA_FOYDALANISH}
          maxraj={b.yer.tomorqaOila}
          maxrajNomi="томорқаси бор оиладан"
          katalogTartibi
        />

        <Tasma>
          <Raqam nomi="Чорваси бор оила" qiymat={raqam(b.yer.chorvaOila)}
            izoh={`Хонадонларнинг ${foiz(b.yer.chorvaOila, b.xonadon)}%`} />
          <Raqam nomi="Йирик шохли" qiymat={raqam(b.yer.yirikShoxli)} izoh="Бош" />
          <Raqam nomi="Майда шохли" qiymat={raqam(b.yer.maydaShoxli)} izoh="Бош" />
          <Raqam nomi="Парранда" qiymat={raqam(b.yer.parranda)} izoh="Бош" />
        </Tasma>

        <div className="grid gap-4 sm:grid-cols-2">
          <Ulush sarlavha="Чорва турлари" qatorlar={b.yer.chorvaTurlari}
            katalog={CHORVA_TURI} maxraj={b.yer.chorvaOila} maxrajNomi="чорваси бор оиладан" />
          <Ulush sarlavha="Ҳунармандчилик турлари" qatorlar={b.yer.hunarTurlari}
            katalog={HUNAR_TURI} maxraj={b.yer.hunarmandOila} maxrajNomi="ҳунарманд оиладан" />
        </div>
      </Bolim>

      {/* ══ X. ҚЎШИМЧА ДАРОМАД ══ */}
      <Bolim
        id="bolim-qoshimcha"
        raqam="X"
        ikonka={<Wrench className="h-4 w-4" />}
        sarlavha="Қўшимча даромад воситаси"
        izoh="Оила ўзи хоҳлаган йўналиш — субсидия ва кўчат режасига асос"
      >
        <Tasma>
          <Raqam nomi="Қўшимча даромад хоҳлайди" qiymat={raqam(b.qoshimchaDaromad.istagi)}
            izoh={`Хонадонларнинг ${foiz(b.qoshimchaDaromad.istagi, b.xonadon)}%`} />
        </Tasma>

        <Ulush sarlavha="Қайси воситани танлаган" qatorlar={b.qoshimchaDaromad.turlari}
          katalog={PASSIV_DAROMAD_TURI} maxraj={b.qoshimchaDaromad.istagi}
          maxrajNomi="хоҳиш билдирган оиладан" />
      </Bolim>

      {/* ══ XI. ИНФРАТУЗИЛМА ══ */}
      <Bolim
        id="bolim-infratuzilma"
        raqam="XI"
        ikonka={<Building2 className="h-4 w-4" />}
        sarlavha="Маҳаллада зарур инфратузилма ва муаммолар"
        izoh="Оилалар ЎЗИ кўрсатган муаммо — сўровнома эмас, хатловда айтилгани"
      >
        <Ulush sarlavha="Энг кўп айтилган муаммолар" qatorlar={b.infratuzilma.muammolar}
          katalog={INFRATUZILMA_MUAMMOSI} maxraj={b.xonadon} maxrajNomi="хонадондан"
          xavfli soni={12} />
      </Bolim>

      {/* ══ XII. РОЗИЛИК ══ */}
      <Bolim
        id="bolim-rozilik"
        raqam="XII"
        ikonka={<FileCheck2 className="h-4 w-4" />}
        sarlavha="Розилик ва имзо"
        izoh="Ҳужжат сифати кўрсаткичи: имзосиз анкета юридик кучга эга эмас"
      >
        <Tasma>
          <Raqam nomi="Розилик берган" qiymat={raqam(b.rozilik.berdi)}
            izoh={`${raqam(b.xonadon)} тадан · ${foiz(b.rozilik.berdi, b.xonadon)}%`}
            holat={b.rozilik.berdi === b.xonadon ? 'yaxshi' : 'xavf'} />
          <Raqam nomi="Имзо қўйилган" qiymat={raqam(b.rozilik.imzoBor)}
            izoh={`${raqam(b.xonadon)} тадан · ${foiz(b.rozilik.imzoBor, b.xonadon)}%`}
            holat={b.rozilik.imzoBor === b.xonadon ? 'yaxshi' : 'xavf'} />
        </Tasma>
      </Bolim>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
 *  ҚУРИЛИШ ЭЛЕМЕНТЛАРИ
 * ═══════════════════════════════════════════════════════════ */

function Bolim({
  id,
  raqam: nomer,
  ikonka,
  sarlavha,
  izoh,
  children,
}: {
  id: string;
  raqam: string;
  ikonka: React.ReactNode;
  sarlavha: string;
  izoh: string;
  children: React.ReactNode;
}) {
  const tr = matnchi();

  return (
    /*
     * `scroll-mt-20` — юқоридаги ўтиш тугмаси босилганда бўлим
     * сарлавҳаси ёпишиб турган шапка остида қолиб кетмасин.
     */
    <section id={id} className="karta scroll-mt-20 p-4 sm:p-5">
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-accent-soft text-accent">
          {ikonka}
        </span>
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-ink">
            <span className="raqam mr-1.5 text-ink-faint">{nomer}.</span>
            {tr(sarlavha)}
          </h3>
          <p className="mt-0.5 text-xs leading-relaxed text-ink-faint">{tr(izoh)}</p>
        </div>
      </div>

      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

function Tasma({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid gap-2.5 grid-cols-2 lg:grid-cols-4">{children}</div>
  );
}

type Holat = 'odatiy' | 'yaxshi' | 'ogoh' | 'xavf';

const HOLAT_RANGI: Record<Holat, string> = {
  odatiy: 'text-ink',
  yaxshi: 'text-ok',
  ogoh: 'text-warn',
  xavf: 'text-danger',
};

function Raqam({
  nomi,
  qiymat,
  izoh,
  holat = 'odatiy',
}: {
  nomi: string;
  qiymat: string;
  izoh: string;
  holat?: Holat;
}) {
  const tr = matnchi();

  return (
    <div className="rounded-md border border-line p-3">
      <p className="text-[11px] font-medium leading-snug text-ink-faint">{tr(nomi)}</p>
      <p className={`raqam mt-1 text-lg font-bold ${HOLAT_RANGI[holat]}`}>{tr(qiymat)}</p>
      <p className="text-[11px] leading-snug text-ink-faint">{tr(izoh)}</p>
    </div>
  );
}

/**
 * Вариантлар рўйхати — ётиқ устунлар.
 *
 * `maxraj` мажбурий: фоизсиз рақам ҳокимга ярамайди. Агар
 * маҳраж нол бўлса, фоиз кўрсатилмайди — нолга бўлиш ўрнига
 * фақат сон қолади.
 */
function Ulush({
  sarlavha,
  qatorlar,
  katalog,
  maxraj,
  maxrajNomi,
  xavfli,
  katalogTartibi,
  soni = 8,
}: {
  sarlavha: string;
  qatorlar: UlushQatori[];
  katalog?: Variant[];
  maxraj: number;
  maxrajNomi: string;
  /** Муаммолар рўйхати — кўк эмас, огоҳлантирувчи рангда */
  xavfli?: boolean;
  /**
   * Каталог тартибида чизиш — БАҲО шкаласи учун.
   *
   * «Аъло, Яхши, Қониқарли, Ёмон» сонига қараб сараланса,
   * иккита тенг қиймат ўрин алмашиб, шкала бузилади ва
   * ҳоким «Ёмон» ни «Қониқарли» дан олдин кўради. Баҳо
   * шкаласи ҲАР ДОИМ яхшидан ёмонга қараб ўқилади.
   */
  katalogTartibi?: boolean;
  soni?: number;
}) {
  const tr = matnchi();

  if (qatorlar.length === 0) {
    return (
      <div>
        <p className="text-xs font-semibold text-ink">{tr(sarlavha)}</p>
        <p className="mt-1.5 text-xs text-ink-faint">{tr('Маълумот киритилмаган')}</p>
      </div>
    );
  }

  const tartiblangan = katalogTartibi && katalog
    ? [...qatorlar].sort(
        (a, b) =>
          katalog.findIndex((k) => k.qiymat === a.qiymat) -
          katalog.findIndex((k) => k.qiymat === b.qiymat)
      )
    : qatorlar;

  const royxat = tartiblangan.slice(0, soni);

  /*
   * ── МАҲРАЖДАН ОШИБ КЕТГАН ҚИЙМАТ ──
   *
   * Тагжавоб асосий саволга «Ҳа» деганлар сонидан кўп бўлиб
   * қолиши мумкин: хонадон таҳрир қилиниб, асосий савол «Йўқ»
   * га ўтса, эски жавоб массивда қолади. Сўров энди буни
   * дарвоза билан кесади, аммо панел жим қолмаслиги керак —
   * бир пайтлар «138,5%» деб ёзиб турарди ва буни фақат
   * тасодифан кўриб қолинди.
   *
   * Шунинг учун ошиб кетган ҳолат ЯШИРИЛМАЙДИ, айтилади.
   */
  const oshgan = royxat.some((q) => q.soni > maxraj) && maxraj > 0;

  /*
   * Устун кенглиги ЭНГ КАТТА қийматга нисбатан чизилади.
   *
   * Илгари бу ерда рўйхатнинг БИРИНЧИ қатори турарди — рўйхат ҳар доим
   * камайиб келади деган ишонч билан. Аммо болалар ёш гуруҳи
   * ТАБИИЙ тартибда берилади: 0-3, 3-17, 18 дан. Ўшанда
   * биринчи қатор энг кичиги (7 та) бўлиб чиқди ва қолган
   * иккови 385% ва 542% кенгликда, яъни ҳаммаси бир хил тўла
   * устун бўлиб кўринди. Рақамлар тўғри, диаграмма ёлғон эди.
   */
  const eng = Math.max(...royxat.map((q) => q.soni), 1);

  return (
    <div>
      <p className="text-xs font-semibold text-ink">{tr(sarlavha)}</p>
      <p className="mt-0.5 text-[11px] text-ink-faint">
        {raqam(maxraj)} {tr(maxrajNomi)}
        {oshgan && (
          <span className="text-warn">
            {' · '}
            {tr('баъзи жавоб маҳраждан кўп — эски анкета жавоби қолган бўлиши мумкин')}
          </span>
        )}
      </p>

      <div className="mt-2 space-y-1">
        {royxat.map((q) => {
          /*
           * Қисқартириш ФАҚАТ каталогдан келган номга
           * қўлланади. Қўлда берилган ёрлиқда тире БОШҚА
           * маънода бўлиши мумкин: «0 — 3 ёш» да у оралиқни
           * билдиради ва кесилса «0» бўлиб қоларди. Айнан
           * шундай бўлди ҳам.
           */
          const nomi = katalog ? qisqaNom(kirillcha(katalog, q.qiymat)) : q.qiymat;
          const ulush = maxraj > 0 ? foiz(q.soni, maxraj) : 0;

          return (
            <div
              key={q.qiymat}
              className="flex items-center gap-2 rounded px-1 py-0.5 transition-colors hover:bg-surface-muted"
            >
              <span className="w-28 shrink-0 truncate text-[11px] text-ink-muted sm:w-40">
                {tr(nomi)}
              </span>

              <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-surface-muted">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.max(2, (q.soni / eng) * 100)}%`,
                    background: xavfli ? 'var(--warn)' : 'var(--step-3)',
                  }}
                />
              </div>

              <span className="raqam w-8 shrink-0 text-right text-[11px] font-semibold text-ink">
                {raqam(q.soni)}
              </span>
              <span className="raqam w-11 shrink-0 text-right text-[11px] text-ink-faint">
                {maxraj > 0 ? `${ulush}%` : ''}
              </span>
            </div>
          );
        })}
      </div>

      {tartiblangan.length > soni && (
        <p className="mt-1 text-[11px] text-ink-faint">
          {tr('ва яна')} {raqam(tartiblangan.length - soni)} {tr('та вариант')}
        </p>
      )}
    </div>
  );
}

/**
 * Қамров чизиғи: «нечтадан нечтаси».
 *
 * Қолгани — қизил билан. Айнан у ҳокимга керак: боғча ёшидаги
 * 300 та боладан 120 таси қамровда бўлса, муаммо «120» эмас,
 * «180».
 */
function Qamrov({
  nomi,
  qamrovda,
  yoshdagi,
}: {
  nomi: string;
  qamrovda: number;
  yoshdagi: number;
}) {
  const tr = matnchi();
  const ulush = foiz(qamrovda, yoshdagi);
  const tashqarida = Math.max(0, yoshdagi - qamrovda);

  return (
    <div>
      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-xs font-semibold text-ink">{tr(nomi)}</span>
        <span className="raqam text-xs text-ink-faint">
          <b className="text-ink">{raqam(qamrovda)}</b> / {raqam(yoshdagi)} ·{' '}
          <b className={ulush >= 80 ? 'text-ok' : ulush >= 50 ? 'text-warn' : 'text-danger'}>
            {ulush}%
          </b>
        </span>
      </div>

      <div className="flex h-3 overflow-hidden rounded-full bg-surface-muted">
        <div
          className="h-full"
          style={{ width: `${ulush}%`, background: 'var(--step-3)' }}
          title={tr('Қамровда')}
        />
        {/*
          Икки бўлак орасида 2px тиниш: акс ҳолда кўк ва қизил
          бир-бирига ёпишиб, чегара кўринмай қолади.
        */}
        {tashqarida > 0 && ulush > 0 && <div className="h-full w-0.5 bg-surface" />}
        {tashqarida > 0 && (
          <div className="h-full flex-1" style={{ background: 'var(--danger)' }} />
        )}
      </div>

      {tashqarida > 0 && (
        <p className="mt-1 text-[11px] text-danger">
          {raqam(tashqarida)} {tr('таси қамровдан ташқарида')}
        </p>
      )}
    </div>
  );
}
