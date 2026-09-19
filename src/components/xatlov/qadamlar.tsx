'use client';

import { useAlifbo } from '@/components/alifbo/alifbo-provider';

import { Plus, Trash2, UserPlus, Users } from 'lucide-react';
import {
  CHET_EL_DAVLATI,
  CHET_EL_SHAHRI,
  CHORVA_TURI,
  DAROMAD_MANBAI,
  GAZ_TURI,
  HA_YOQ,
  HAYDOVCHILIK_TOIFASI,
  HUNAR_TURI,
  ICHIMLIK_SUVI,
  JINS,
  KAMBAGALLIK_SABABI,
  MABLAG_YONALISHI,
  MALUMOT,
  MOLIYA_TURI,
  INFRATUZILMA_MUAMMOSI,
  OILADAGI_ORNI,
  PASSIV_BIRLIGI,
  TOMORQA_FOYDALANISH,
  PASSIV_DAROMAD_TURI,
  UY_HOLATI,
  VALYUTA,
  itYonalishimi,
  itKasbimi,
  ORGANMOQCHI_KASBLAR,
  KASB_BOSHQA,
  kirillcha,
  shaharlarRoyxati,
} from '@/lib/constants';
import {
  BelgiMaydoni,
  Bolim,
  HaYoqMaydoni,
  KopTanlovMaydoni,
  MatnMaydoni,
  PulMaydoni,
  RaqamMaydoni,
  SanaMaydoni,
  TanlovMaydoni,
  ToliqKeng,
  YoshOgohlantirishi,
} from './maydonlar';
import { ShaxsRoyxati } from './shaxs-royxati';
import { ImzoMaydoni } from './imzo-maydoni';
import { bosIshsiz, type IshsizQatori, type XatlovHolati } from './holat';

export interface QadamProps {
  h: XatlovHolati;
  yangila: <K extends keyof XatlovHolati>(kalit: K, qiymat: XatlovHolati[K]) => void;
  xatolar: Record<string, string>;
}

/** Maydon nomiga tegishli xatoni oladi */
const x = (xatolar: Record<string, string>, maydon: string) => xatolar[maydon];

// ═════════════════════════════════════════════════════════════
//  1-QADAM: XONADON
// ═════════════════════════════════════════════════════════════

export function QadamXonadon({ h, yangila, xatolar }: QadamProps) {
  const { t: tr } = useAlifbo();

  return (
    <Bolim
      raqam="1"
      sarlavha={tr("Хонадон ва оила бошлиғи")}
      izoh={tr("Манзил ва оила бошлиғи такрор хатловни аниқлашда ишлатилади — уларни аниқ ёзинг.")}
    >
      <ToliqKeng>
        <MatnMaydoni
          yorliq={tr("Хонадон манзили")}
          izoh={tr("Кўча ва уй рақами")}
          majburiy
          qiymat={h.manzil}
          ozgardi={(q) => yangila('manzil', q)}
          xato={x(xatolar, 'manzil')}
          placeholder={tr("Навоий кўчаси, 12-уй")}
        />
      </ToliqKeng>

      <MatnMaydoni
        yorliq={tr("Оила бошлиғининг Ф.И.Ш.")}
        majburiy
        qiymat={h.oilaBoshligi}
        ozgardi={(q) => yangila('oilaBoshligi', q)}
        xato={x(xatolar, 'oilaBoshligi')}
      />

      {/*
        Jinsi MAJBURIY: nafaqa yoshi ayol va erkak uchun har xil
        (55 va 60), ya'ni busiz yosh tekshiruvi ishlamaydi.
      */}
      <TanlovMaydoni
        yorliq={tr("Жинси")}
        majburiy
        variantlar={JINS}
        qiymat={h.oilaBoshligiJinsi}
        ozgardi={(q) => yangila('oilaBoshligiJinsi', q)}
        xato={x(xatolar, 'oilaBoshligiJinsi')}
      />

      {/*
        ТУҒИЛГАН САНА — тўлиқ сана, фақат йил эмас.

        Илгари бу ерда йил, ишсиз фуқарода эса тўлиқ сана
        сўраларди — бир тушунча икки шаклда. Ходим оила бошлиғини
        ишсизлар рўйхатига ҳам қўшганда санани қайтадан териши
        керак бўларди.

        `tugilganYili` алоҳида терилмайди: у санадан ОЛИНАДИ.
        Бир тушунчани икки жойда сўраш — улар бир-бирига мос
        келмаслигининг энг осон йўли.
      */}
      <SanaMaydoni
        yorliq={tr("Туғилган санаси")}
        majburiy
        qiymat={h.oilaBoshligiTugilganSana}
        ozgardi={(q) => {
          yangila('oilaBoshligiTugilganSana', q);
          yangila('tugilganYili', q ? Number(q.slice(0, 4)) : '');
        }}
        eng_erta="1920-01-01"
        eng_kech={new Date().toLocaleDateString('en-CA')}
        xato={x(xatolar, 'oilaBoshligiTugilganSana') ?? x(xatolar, 'tugilganYili')}
      />

      {/*
        Telefon ham majburiy. Usiz bandlik markazi fuqaroga
        qo'ng'iroq qila olmaydi - ya'ni butun xatlov behuda ketadi.
      */}
      <MatnMaydoni
        yorliq={tr("Телефон рақами")}
        turi="tel"
        majburiy
        qiymat={h.telefon}
        ozgardi={(q) => yangila('telefon', q)}
        xato={x(xatolar, 'telefon')}
        placeholder="+998 __ ___ __ __"
      />

      {/* Yosh va jinsga qarab bandlik imkoniyati haqida ogohlantirish */}
      <ToliqKeng>
        <YoshOgohlantirishi
          tugilganYili={h.tugilganYili}
          jinsi={h.oilaBoshligiJinsi}
        />
      </ToliqKeng>

      <RaqamMaydoni
        yorliq={tr("Оиладаги умумий аъзолар сони")}
        majburiy
        qiymat={h.jamiAzo}
        ozgardi={(q) => yangila('jamiAzo', q)}
        max={50}
        birlik={tr("киши")}
        xato={x(xatolar, 'jamiAzo')}
      />

      {/*
        Yagona ixtiyoriy raqam: bolasiz oila bor va uni
        "to'ldirilmagan" deb hisoblash xato bo'lardi. 0 to'g'ri
        javob, hokim panelida u "yo'q" deb ko'rsatiladi.
      */}
      <RaqamMaydoni
        yorliq={tr("Шу жумладан, болалар сони")}
        majburiy
        izoh={tr("18 ёшгача — болалар бўлмаса 0 ёзинг")}
        qiymat={h.bolalarSoni}
        ozgardi={(q) => yangila('bolalarSoni', q)}
        max={30}
        birlik={tr("киши")}
        xato={x(xatolar, 'bolalarSoni')}
      />

      {/*
        ── ЁШ ГУРУҲЛАРИ ──

        «12 та бола» деган рақамдан чора чиқмайди. 0-3 ёшдаги
        бола онасини уйда ушлаб туради — унга боғча ўрни керак.
        3-17 боғча ва мактаб қамрови масаласи. 18 дан катта
        фарзанд эса аслида ИШСИЗ ФУҚАРО ва бандлик марказининг
        иши — у «бола» устунида яшириниб қолмаслиги керак.
      */}
      <RaqamMaydoni
        yorliq={tr("Шундан: 0—3 ёшда")}
        majburiy
        izoh={tr("Боғча ёшига етмаган — она уйда банд бўлади")}
        qiymat={h.bolalar0_3Yosh}
        ozgardi={(q) => yangila('bolalar0_3Yosh', q)}
        max={20}
        birlik={tr("бола")}
        xato={x(xatolar, 'bolalar0_3Yosh')}
      />

      <RaqamMaydoni
        yorliq={tr("Шундан: 3—17 ёшда")}
        majburiy
        izoh={tr("Боғча ва мактаб қамрови шу гуруҳга тегишли")}
        qiymat={h.bolalar3_17Yosh}
        ozgardi={(q) => yangila('bolalar3_17Yosh', q)}
        max={30}
        birlik={tr("бола")}
        xato={x(xatolar, 'bolalar3_17Yosh')}
      />

      <ToliqKeng>
        <RaqamMaydoni
          yorliq={tr("18 ёшдан катта фарзандлар")}
          majburiy
          izoh={tr("Улар «бола» эмас — ишсиз бўлса, VII қадамда алоҳида ёзилади")}
          qiymat={h.bolalar18Yoshdan}
          ozgardi={(q) => yangila('bolalar18Yoshdan', q)}
          max={30}
          birlik={tr("киши")}
          xato={x(xatolar, 'bolalar18Yoshdan')}
        />
      </ToliqKeng>
    </Bolim>
  );
}

// ═════════════════════════════════════════════════════════════
//  2-QADAM: I. MEHNAT VA BANDLIK
// ═════════════════════════════════════════════════════════════

export function QadamMehnat({ h, yangila, xatolar }: QadamProps) {
  const { t: tr } = useAlifbo();

  return (
    <>
      <Bolim
        raqam="I"
        sarlavha={tr("Меҳнат ва бандлик масалалари")}
        izoh={tr("Рақамлар бир-бирига мос келиши шарт: ишлайдиган + ишсиз ≤ меҳнатга лаёқатли. Меҳнатга лаёқатсизлар бу тенгламага кирмайди — улар алоҳида ёзилади.")}
      >
        <RaqamMaydoni
          yorliq={tr("Меҳнатга лаёқатли фуқаролар сони")}
          izoh={tr("16–60/55 ёшдаги")}
          majburiy
          qiymat={h.mehnatgaLayoqatli}
          ozgardi={(q) => yangila('mehnatgaLayoqatli', q)}
          max={40}
          birlik={tr("киши")}
          xato={x(xatolar, 'mehnatgaLayoqatli')}
        />

        <RaqamMaydoni
          yorliq={tr("Шулардан ишлайдиганлар сони")}
          majburiy
          qiymat={h.ishlaydiganlar}
          ozgardi={(q) => yangila('ishlaydiganlar', q)}
          max={40}
          birlik={tr("киши")}
          xato={x(xatolar, 'ishlaydiganlar')}
        />

        <RaqamMaydoni
          yorliq={tr("А) Давлат корхоналарида")}
          qiymat={h.davlatKorxonada}
          ozgardi={(q) => yangila('davlatKorxonada', q)}
          max={40}
          birlik={tr("киши")}
          xato={x(xatolar, 'davlatKorxonada')}
        />

        <RaqamMaydoni
          yorliq={tr("Б) Хўжалик юритувчи субъектларда")}
          qiymat={h.xususiySektorda}
          ozgardi={(q) => yangila('xususiySektorda', q)}
          max={40}
          birlik={tr("киши")}
          xato={x(xatolar, 'xususiySektorda')}
        />

        <RaqamMaydoni
          yorliq={tr("Шулардан ишсизлар сони")}
          izoh={tr("Ҳар бири учун кейинги қадамда анкета тўлдирилади")}
          majburiy
          qiymat={h.ishsizlarSoni}
          ozgardi={(q) => yangila('ishsizlarSoni', q)}
          max={40}
          birlik={tr("киши")}
          xato={x(xatolar, 'ishsizlarSoni')}
        />

        {/*
          ── МЕҲНАТГА ЛАЁҚАТСИЗЛАР ──

          Дала талаби. Хонадонда иш ёшидаги одам бор эди: илгари
          ногиронлиги бўлган, ҳозир расман йўқ, аммо ўзини
          меҳнатга лаёқатсиз деб ҳисоблайди ва ишламайди.

          Ходим уни «лаёқатлилар» дан чиқариб, «ишсизлар» га
          қўшди — анкета эса рад этди: «ишлайдиган (1) ва ишсиз
          (1) жами 2, лаёқатлилар сонидан (1) кўп». Одам бор
          эди, ёзадиган катак йўқ эди.

          Бу катак ўша. У бандлик тенгламасига КИРМАЙДИ:
          лаёқатсиз одам ишсиз эмас, чунки иш қидирмайди.
          Бандлик маркази унга иш таклиф қилмайди — унга
          ижтимоий ёрдам керак.
        */}
        <RaqamMaydoni
          yorliq={tr("Меҳнатга лаёқатсизлар сони")}
          izoh={tr("Иш ёшида, аммо ишлай олмайди: ногиронлик, сурункали касаллик ёки шу каби сабабга кўра. Ишсизлар сонига КИРМАЙДИ")}
          qiymat={h.mehnatgaLayoqatsiz}
          ozgardi={(q) => yangila('mehnatgaLayoqatsiz', q)}
          max={40}
          birlik={tr("киши")}
          xato={x(xatolar, 'mehnatgaLayoqatsiz')}
        />

        <RaqamMaydoni
          yorliq={tr("Боғча кутаётган аёллар")}
          izoh={tr("3 ёшгача бола тарбиясидаги, боласини боғчага берса ишлашга тайёр")}
          qiymat={h.bogchaKutayotganAyollar}
          ozgardi={(q) => yangila('bogchaKutayotganAyollar', q)}
          max={20}
          birlik={tr("киши")}
          xato={x(xatolar, 'bogchaKutayotganAyollar')}
        />

        <RaqamMaydoni
          yorliq={tr("Қанча вақтдан буён ишсиз")}
          izoh={tr("Энг узоқ муддат")}
          qiymat={h.ishsizlikMuddatiOy}
          ozgardi={(q) => yangila('ishsizlikMuddatiOy', q)}
          max={600}
          birlik={tr("ой")}
          xato={x(xatolar, 'ishsizlikMuddatiOy')}
        />

        {/*
          ── ОЛИБ ТАШЛАНГАН УЧТА САВОЛ ──

          «Иш турига истак», «Касб-ҳунарга ўқишни истайдими?» ва
          «Қайси йўналишга қизиқади?» шу ерда турарди.

          Учови ҳам ИШСИЗ ФУҚАРО анкетасида — аниқроқ шаклда —
          қайтадан сўраларди: «Қайси йўналишда ишлашни истайди»,
          «Касб-ҳунарга ўқиш истаги борми», «Қайси касбни
          ўрганиш истаги бор» (31 та касб рўйхатидан).

          Хонадон даражасидаги жавобдан чора чиқмасди: «бу
          оилада кимдир ўқимоқчи» деган гап билан ҳеч кимни
          курсга ёзиб бўлмайди. Фуқаро даражасидагиси эса
          ваучер занжирини бевосита очади.

          Устунлар базада қолди — эски хатловлардаги жавоблар
          ҳисоботда кўринаверади.
        */}
        <ToliqKeng>
          <MatnMaydoni
            yorliq={tr("Бандлигини таъминлаш бўйича аниқ таклиф(лар)")}
            koptator
            qiymat={h.bandlikTakliflari}
            ozgardi={(q) => yangila('bandlikTakliflari', q)}
          />
        </ToliqKeng>
      </Bolim>
    </>
  );
}

// ═════════════════════════════════════════════════════════════
//  3-QADAM: II. TADBIRKORLIK + III. DAROMAD
// ═════════════════════════════════════════════════════════════

export function QadamTadbirkorlik({ h, yangila, xatolar }: QadamProps) {
  const { t: tr } = useAlifbo();

  return (
    <>
      <Bolim
        raqam="II"
        sarlavha={tr("Тадбиркорлик ва кредит-субсидияга эҳтиёж")}
        izoh={tr("Бу бўлимдаги маблағ рақами туман бюджет режасига тўғридан-тўғри киради.")}
      >
        <ToliqKeng>
          <HaYoqMaydoni
            yorliq={tr("Тадбиркорлик фаолиятини бошлаш ёки кенгайтириш истаги")}
            majburiy
            qiymat={h.tadbirkorlikIstagi}
            ozgardi={(q) => yangila('tadbirkorlikIstagi', q)}
            xato={x(xatolar, 'tadbirkorlikIstagi')}
          />
        </ToliqKeng>

        {h.tadbirkorlikIstagi && (
          <ToliqKeng>
            <KopTanlovMaydoni
              yorliq={tr("Қайси соҳада?")}
              variantlar={MABLAG_YONALISHI}
              qiymatlar={h.tadbirkorlikSohasi}
              ozgardi={(q) => yangila('tadbirkorlikSohasi', q)}
            />
          </ToliqKeng>
        )}

        <ToliqKeng>
          <HaYoqMaydoni
            yorliq={tr("Имтиёзли кредит, субсидия ёки ссудага эҳтиёж мавжудми")}
            majburiy
            qiymat={h.moliyaEhtiyoji}
            ozgardi={(q) => yangila('moliyaEhtiyoji', q)}
            xato={x(xatolar, 'moliyaEhtiyoji')}
          />
        </ToliqKeng>

        {h.moliyaEhtiyoji && (
          <>
            <ToliqKeng>
              <KopTanlovMaydoni
                yorliq={tr("Қандай кўмак керак?")}
                variantlar={MOLIYA_TURI}
                qiymatlar={h.moliyaTuri}
                ozgardi={(q) => yangila('moliyaTuri', q)}
              />
            </ToliqKeng>

            <PulMaydoni
              yorliq={tr("Талаб этиладиган маблағ миқдори")}
              majburiy
              qiymat={h.talabQilinganMablag}
              ozgardi={(q) => yangila('talabQilinganMablag', q)}
              xato={x(xatolar, 'talabQilinganMablag')}
            />

            <div className="sm:col-span-1">
              <KopTanlovMaydoni
                yorliq={tr("Маблағни сарфлаш йўналиши")}
                variantlar={MABLAG_YONALISHI}
                qiymatlar={h.mablagYonalishi}
                ozgardi={(q) => {
                  yangila('mablagYonalishi', q);
                  if (!q.includes('Boshqa')) yangila('mablagYonalishiBoshqa', '');
                }}
              />
            </div>

            {/*
              «Бошқа» танланиб, нимаси ёзилмаса — банд ҳисоботда
              «Бошқа: 47 хонадон» бўлиб чиқади ва ундан ҳеч
              қандай қарор чиқмайди. Бу рақам туман бюджет
              режасига тўғридан-тўғри кирар экан, у аниқ бўлиши
              шарт.
            */}
            {h.mablagYonalishi.includes('Boshqa') && (
              <ToliqKeng>
                <MatnMaydoni
                  yorliq={tr("«Бошқа» — маблағ қайси йўналишга сарфланади")}
                  izoh={tr("Аниқ ёзинг: бу рақам туман бюджет режасига киради")}
                  majburiy
                  qiymat={h.mablagYonalishiBoshqa}
                  ozgardi={(q) => yangila('mablagYonalishiBoshqa', q)}
                  xato={x(xatolar, 'mablagYonalishiBoshqa')}
                />
              </ToliqKeng>
            )}
          </>
        )}
      </Bolim>

      {/*
        ЧЕТ ЭЛДАГИ МЕҲНАТ — алоҳида бўлим.
        Бу савол «Даромад» бўлимидан ОЛДИН турибди, чунки ундаги
        «ойлик даромад» рақами шу ердаги пулни ҳам ўз ичига олиши
        керак. Акс ҳолда хонадон «даромади йўқ» бўлиб кўринади-ю,
        аслида ҳар ой Россиядан бир неча миллион сўм келиб туради.
      */}
      <Bolim
        raqam={tr("II-Б")}
        sarlavha={tr("Чет элдаги меҳнат ва пул ўтказмаси")}
        izoh={tr("Оила аъзоси чет элда ишласа, ундан келадиган пул ҳам оила даромади ҳисобланади.")}
      >
        <ToliqKeng>
          <HaYoqMaydoni
            yorliq={tr("Оила аъзоларидан бирортаси ҳозир чет элда ишлайдими")}
            majburiy
            qiymat={h.chetElMehnati}
            ozgardi={(q) => {
              yangila('chetElMehnati', q);
              // «Йўқ»га қайтарилса, олдин киритилган жавоблар тозаланади:
              // акс ҳолда кўринмайдиган майдонлар базага кетиб қолади.
              if (!q) {
                yangila('chetElIshchilar', '');
                yangila('chetElDavlatlari', []);
                yangila('chetElBoshqaDavlat', '');
                yangila('chetElOylikPul', '');
              }
            }}
            xato={x(xatolar, 'chetElMehnati')}
          />
        </ToliqKeng>

        {h.chetElMehnati && (
          <>
            <RaqamMaydoni
              yorliq={tr("Чет элда ишлаётганлар сони")}
              majburiy
              min={1}
              max={30}
              qiymat={h.chetElIshchilar}
              ozgardi={(q) => yangila('chetElIshchilar', q)}
              xato={x(xatolar, 'chetElIshchilar')}
              birlik={tr("киши")}
            />

            {/*
              ── ВАЛЮТА ──

              Оила қайси пулда олса шунда айтади: Россиядан
              кўпинча доллар, Польшадан евро. Илгари ҳаммаси
              «сўм» деб ёзиларди ва ҳисоботда 500 (доллар) билан
              5 000 000 (сўм) бир устунга қўшилиб кетарди.

              Сақлашда қиймат сўмга келтирилиб ҳам ёзилади —
              ҳисобот ўшандан ўқийди.
            */}
            <PulMaydoni
              yorliq={tr("Ойига оилага юборадиган пул")}
              izoh={tr("Оила айтган миқдор — валютасини пастда белгиланг")}
              majburiy
              qiymat={h.chetElOylikPul}
              ozgardi={(q) => yangila('chetElOylikPul', q)}
              birlik={VALYUTA.find((v) => v.qiymat === h.chetElValyuta)?.kirill}
              xato={x(xatolar, 'chetElOylikPul')}
            />

            <TanlovMaydoni
              yorliq={tr("Қайси валютада")}
              majburiy
              variantlar={VALYUTA}
              qiymat={h.chetElValyuta}
              ozgardi={(q) => yangila('chetElValyuta', q)}
              xato={x(xatolar, 'chetElValyuta')}
            />

            <ToliqKeng>
              <KopTanlovMaydoni
                yorliq={tr("Қайси давлат(лар)да")}
                izoh={tr("Бир нечта аъзо турли давлатда бўлса, ҳаммасини белгиланг.")}
                majburiy
                variantlar={CHET_EL_DAVLATI}
                qiymatlar={h.chetElDavlatlari}
                ozgardi={(q) => {
                  yangila('chetElDavlatlari', q);
                  if (!q.includes('Boshqa')) yangila('chetElBoshqaDavlat', '');
                }}
                xato={x(xatolar, 'chetElDavlatlari')}
              />
            </ToliqKeng>

            {/*
              ── ШАҲАРЛАР ──

              «Россияда 340 киши» деган рақамдан чора чиқмайди.
              «Москвада 120, Сургутда 45» эса чиқади: консуллик,
              меҳнат миграцияси агентлиги ва диаспора билан иш
              айнан ШАҲАР даражасида юритилади.

              Рўйхат ФАҚАТ белгиланган давлатлар бўйича очилади —
              70 та шаҳарни бирдан кўрсатиш ходимни чалғитарди.
            */}
            {shaharlarRoyxati(h.chetElDavlatlari.filter((d) => CHET_EL_SHAHRI[d])).length > 0 && (
              <ToliqKeng>
                <KopTanlovMaydoni
                  yorliq={tr("Қайси шаҳар(лар)да")}
                  izoh={tr("Аниқ шаҳар маълум бўлса белгиланг — билмаса, бўш қолдиринг")}
                  variantlar={shaharlarRoyxati(
                    h.chetElDavlatlari.filter((d) => CHET_EL_SHAHRI[d])
                  )}
                  qiymatlar={h.chetElShaharlari}
                  ozgardi={(q) => yangila('chetElShaharlari', q)}
                />
              </ToliqKeng>
            )}

            {h.chetElDavlatlari.includes('Boshqa') && (
              <>
                <MatnMaydoni
                  yorliq={tr("«Бошқа давлат» — қайси давлат")}
                  izoh={tr("Рўйхатда йўқ давлат номини ёзинг.")}
                  majburiy
                  qiymat={h.chetElBoshqaDavlat}
                  ozgardi={(q) => yangila('chetElBoshqaDavlat', q)}
                  xato={x(xatolar, 'chetElBoshqaDavlat')}
                />

                <MatnMaydoni
                  yorliq={tr("Ўша давлатда қайси шаҳар")}
                  izoh={tr("Билмаса бўш қолдиринг")}
                  qiymat={h.chetElBoshqaShahar}
                  ozgardi={(q) => yangila('chetElBoshqaShahar', q)}
                  xato={x(xatolar, 'chetElBoshqaShahar')}
                />
              </>
            )}
          </>
        )}
      </Bolim>

      <Bolim raqam="III" sarlavha={tr("Даромад манбалари ва камбағалликка тушиш сабаблари")}>
        <PulMaydoni
          yorliq={tr("Оиланинг ойлик умумий даромади")}
          majburiy
          qiymat={h.oylikDaromad}
          ozgardi={(q) => yangila('oylikDaromad', q)}
          xato={x(xatolar, 'oylikDaromad')}
        />

        <div />

        <ToliqKeng>
          <KopTanlovMaydoni
            yorliq={tr("Мавжуд даромад манбалари")}
            variantlar={DAROMAD_MANBAI}
            qiymatlar={h.daromadManbalari}
            ozgardi={(q) => yangila('daromadManbalari', q)}
          />
        </ToliqKeng>

        <ToliqKeng>
          <KopTanlovMaydoni
            yorliq={tr("Камбағаллик қаторига тушишининг асосий сабаб(лар)и")}
            variantlar={KAMBAGALLIK_SABABI}
            qiymatlar={h.kambagallikSabablari}
            ozgardi={(q) => yangila('kambagallikSabablari', q)}
          />
        </ToliqKeng>

        <ToliqKeng>
          <MatnMaydoni
            yorliq={tr("Даромадни кўпайтириш имкониятлари")}
            koptator
            qiymat={h.daromadImkoniyati}
            ozgardi={(q) => yangila('daromadImkoniyati', q)}
          />
        </ToliqKeng>
      </Bolim>
    </>
  );
}

// ═════════════════════════════════════════════════════════════
//  4-QADAM: IV. BOLALAR + V. SOG'LIQ
// ═════════════════════════════════════════════════════════════

export function QadamBolalarSogliq({ h, yangila, xatolar }: QadamProps) {
  const { t: tr } = useAlifbo();

  return (
    <>
      <Bolim raqam="IV" sarlavha={tr("Болалар таълими ва ривожланиши")}>
        <RaqamMaydoni
          yorliq={tr("Мактабгача ёшдаги болалар сони")}
          majburiy
          qiymat={h.maktabgachaYoshdagi}
          ozgardi={(q) => yangila('maktabgachaYoshdagi', q)}
          max={20}
          birlik={tr("бола")}
          xato={x(xatolar, 'maktabgachaYoshdagi')}
        />

        <RaqamMaydoni
          yorliq={tr("Шулардан боғчага қатнайдиганлар")}
          majburiy
          qiymat={h.maktabgachaQamrovda}
          ozgardi={(q) => yangila('maktabgachaQamrovda', q)}
          max={20}
          birlik={tr("бола")}
          xato={x(xatolar, 'maktabgachaQamrovda')}
        />

        <RaqamMaydoni
          yorliq={tr("Мактаб ёшидаги болалар сони")}
          majburiy
          qiymat={h.maktabYoshdagi}
          ozgardi={(q) => yangila('maktabYoshdagi', q)}
          max={20}
          birlik={tr("бола")}
          xato={x(xatolar, 'maktabYoshdagi')}
        />

        <RaqamMaydoni
          yorliq={tr("Шулардан мактабга қатнайдиганлар")}
          majburiy
          qiymat={h.maktabQamrovda}
          ozgardi={(q) => yangila('maktabQamrovda', q)}
          max={20}
          birlik={tr("бола")}
          xato={x(xatolar, 'maktabQamrovda')}
        />

        <RaqamMaydoni
          yorliq={tr("Тўгарак ёки спорт секциясига жалб этилганлар")}
          qiymat={h.togarakQamrovi}
          ozgardi={(q) => yangila('togarakQamrovi', q)}
          max={20}
          birlik={tr("бола")}
          xato={x(xatolar, 'togarakQamrovi')}
        />

        <MatnMaydoni
          yorliq={tr("Жалб этилмаган бўлса — сабаби")}
          qiymat={h.togarakSababi}
          ozgardi={(q) => yangila('togarakSababi', q)}
        />

        <ToliqKeng>
          <MatnMaydoni
            yorliq={tr("Боғчага қамраб олинмаган бўлса — сабаби")}
            qiymat={h.maktabgachaQamrovsizSababi}
            ozgardi={(q) => yangila('maktabgachaQamrovsizSababi', q)}
          />
        </ToliqKeng>
      </Bolim>

      <Bolim raqam="V" sarlavha={tr("Соғлиқни сақлаш ва тиббий ёрдамга эҳтиёж")}>
        <ToliqKeng>
          <HaYoqMaydoni
            yorliq={tr("Оилада узоқ муддатли даволанишга муҳтож аъзо мавжудми")}
            majburiy
            qiymat={h.uzoqDavolanish}
            ozgardi={(q) => yangila('uzoqDavolanish', q)}
            xato={x(xatolar, 'uzoqDavolanish')}
          />
        </ToliqKeng>

        {h.uzoqDavolanish && (
          <ToliqKeng>
            <MatnMaydoni
              yorliq={tr("Ким ва қандай ташхис билан")}
              majburiy
              koptator
              qiymat={h.uzoqDavolanishIzoh}
              ozgardi={(q) => yangila('uzoqDavolanishIzoh', q)}
              xato={x(xatolar, 'uzoqDavolanishIzoh')}
            />
          </ToliqKeng>
        )}

        {/*
          Бу учтаси илгари ҲАР хонадондан сўраларди. Амалда улар
          фақат узоқ даволанишга муҳтож аъзо бор оилада маъно
          касб этади — қолган хонадонларда ходим учта бўш
          майдонни бекорга босиб ўтарди.
        */}
        {h.uzoqDavolanish && (
          <>
            <MatnMaydoni
              yorliq={tr("Дори-дармон ёки тиббий буюмларга эҳтиёж")}
              qiymat={h.doriEhtiyoji}
              ozgardi={(q) => yangila('doriEhtiyoji', q)}
            />

            <MatnMaydoni
              yorliq={tr("Профилактик кўрик ёки реабилитацияга эҳтиёж")}
              qiymat={h.tibbiyXizmatEhtiyoji}
              ozgardi={(q) => yangila('tibbiyXizmatEhtiyoji', q)}
            />

            <MatnMaydoni
              yorliq={tr("Охирги тиббий кўрикдан ўтган вақти")}
              qiymat={h.oxirgiTibbiyKorik}
              ozgardi={(q) => yangila('oxirgiTibbiyKorik', q)}
              placeholder={tr("масалан: 2026 йил март")}
            />
          </>
        )}
      </Bolim>
    </>
  );
}

// ═════════════════════════════════════════════════════════════
//  5-QADAM: VI. UY-JOY + VII. IJTIMOIY HIMOYA + VIII. HUJJATLAR
// ═════════════════════════════════════════════════════════════

export function QadamUyJoy({ h, yangila, xatolar }: QadamProps) {
  const { t: tr } = useAlifbo();

  return (
    <>
      <Bolim raqam="VI" sarlavha={tr("Уй-жой ва коммунал шароит")}>
        <TanlovMaydoni
          yorliq={tr("Уй-жойнинг ҳолати")}
          majburiy
          variantlar={UY_HOLATI}
          qiymat={h.uyHolati}
          ozgardi={(q) => yangila('uyHolati', q)}
          xato={x(xatolar, 'uyHolati')}
        />

        <TanlovMaydoni
          yorliq={tr("Ичимлик суви таъминоти")}
          majburiy
          variantlar={ICHIMLIK_SUVI}
          qiymat={h.ichimlikSuvi}
          ozgardi={(q) => yangila('ichimlikSuvi', q)}
          xato={x(xatolar, 'ichimlikSuvi')}
        />

        <HaYoqMaydoni
          yorliq={tr("Электр энергияси")}
          majburiy
          qiymat={h.elektr}
          ozgardi={(q) => yangila('elektr', q)}
          xato={x(xatolar, 'elektr')}
        />

        <HaYoqMaydoni
          yorliq={tr("Газ таъминоти")}
          majburiy
          qiymat={h.gaz}
          ozgardi={(q) => yangila('gaz', q)}
          xato={x(xatolar, 'gaz')}
        />

        {/*
          Gaz turi muhim: markazlashgan quvur bor joyda muammo
          bosim yoki qarzdorlik bo'ladi, balon bilan yashaydigan
          oilada esa har oy pul topish. Chora-tadbir ham shunga
          qarab boshqacha bo'ladi.
        */}
        {h.gaz && (
          <TanlovMaydoni
            yorliq={tr("Газ тури")}
            majburiy
            variantlar={GAZ_TURI}
            qiymat={h.gazTuri}
            ozgardi={(q) => yangila('gazTuri', q)}
            xato={x(xatolar, 'gazTuri')}
          />
        )}

        <HaYoqMaydoni
          yorliq={tr("Суғориш суви таъминоти")}
          majburiy
          qiymat={h.sugorishSuvi}
          ozgardi={(q) => yangila('sugorishSuvi', q)}
          xato={x(xatolar, 'sugorishSuvi')}
        />

        <HaYoqMaydoni
          yorliq={tr("Канализация тизими")}
          majburiy
          qiymat={h.kanalizatsiya}
          ozgardi={(q) => yangila('kanalizatsiya', q)}
          xato={x(xatolar, 'kanalizatsiya')}
        />

      </Bolim>

      <Bolim raqam="VII" sarlavha={tr("Ижтимоий ҳимояга муҳтож оила аъзолари")}>
        <ToliqKeng>
          <HaYoqMaydoni
            yorliq={tr("Ногиронлиги бўлган шахс(лар) мавжудми")}
            majburiy
            qiymat={h.nogironlikBor}
            ozgardi={(q) => yangila('nogironlikBor', q)}
            xato={x(xatolar, 'nogironlikBor')}
          />
        </ToliqKeng>

        {h.nogironlikBor && (
          <ToliqKeng>
            <ShaxsRoyxati
              yorliq={tr("Ногиронлиги бўлган шахслар")}
              izoh={tr("Ҳар бири учун Ф.И.Ш. ва оиладаги ўрни — чора-тадбир кимга тегишли экани аниқ бўлиши учун")}
              qatorlar={h.nogironShaxslar}
              ozgardi={(q) => yangila('nogironShaxslar', q)}
              guruhSora
              xato={x(xatolar, 'nogironShaxslar')}
            />
          </ToliqKeng>
        )}

        <HaYoqMaydoni
          yorliq={tr("Ёлғиз яшовчи кекса(лар) мавжудми")}
          majburiy
          qiymat={h.yolgizKeksa}
          ozgardi={(q) => {
            yangila('yolgizKeksa', q);
            // «Йўқ»га қайтарилса рўйхат тозаланади. Иккита
            // чақирув ХАВФСИЗ: `yangila` функционал `setH`
            // ишлатади ва калитлар ҳар хил.
            if (!q) yangila('yolgizKeksaShaxslar', []);
          }}
          xato={x(xatolar, 'yolgizKeksa')}
        />

        {/*
          Ногиронлик ва парваришдаги каби — ИСМ сўралади.
          «Ҳа, бор» деган белгидан «Инсон» маркази ҳеч кимни
          топа олмайди: рўйхат исмсиз бўлса, уни қайта йиғиш
          учун яна эшикма-эшик юриш керак бўлади.
        */}
        {h.yolgizKeksa && (
          <ToliqKeng>
            <ShaxsRoyxati
              yorliq={tr("Ёлғиз яшовчи кексалар")}
              izoh={tr("Ҳар бири учун Ф.И.Ш. ва оиладаги ўрни")}
              qatorlar={h.yolgizKeksaShaxslar}
              ozgardi={(q) => yangila('yolgizKeksaShaxslar', q)}
            />
          </ToliqKeng>
        )}

        <HaYoqMaydoni
          yorliq={tr("Парваришга муҳтож шахс(лар) мавжудми")}
          majburiy
          qiymat={h.parvarishgaMuhtoj}
          ozgardi={(q) => yangila('parvarishgaMuhtoj', q)}
          xato={x(xatolar, 'parvarishgaMuhtoj')}
        />

        {h.parvarishgaMuhtoj && (
          <>
            <ToliqKeng>
              <ShaxsRoyxati
                yorliq={tr("Парваришга муҳтож шахслар")}
                izoh={tr("Ҳар бири учун Ф.И.Ш. ва оиладаги ўрни")}
                qatorlar={h.parvarishShaxslar}
                ozgardi={(q) => yangila('parvarishShaxslar', q)}
              />
            </ToliqKeng>

            <ToliqKeng>
              <MatnMaydoni
                yorliq={tr("Ким томонидан парвариш қилинмоқда")}
                izoh={tr("Парваришчи оила аъзоси бўлса, у иш билан банд бўла олмайди — бу ҳам бандлик масаласи")}
                qiymat={h.parvarishIzoh}
                ozgardi={(q) => yangila('parvarishIzoh', q)}
              />
            </ToliqKeng>
          </>
        )}
      </Bolim>

      <Bolim raqam="VIII" sarlavha={tr("Ҳужжатлаштириш ва ижтимоий хизматлар")}>
        <ToliqKeng>
          <HaYoqMaydoni
            yorliq={tr("Оила аъзоларининг шахсни тасдиқловчи ҳужжатлари тўлиқми")}
            majburiy
            izoh={tr("Паспорт, туғилганлик тўғрисида гувоҳнома ва бошқалар")}
            qiymat={h.hujjatlarToliq}
            ozgardi={(q) => yangila('hujjatlarToliq', q)}
            xato={x(xatolar, 'hujjatlarToliq')}
          />
        </ToliqKeng>

        {!h.hujjatlarToliq && (
          <ToliqKeng>
            <MatnMaydoni
              yorliq={tr("Кимнинг қайси ҳужжати йўқ")}
              qiymat={h.hujjatIzoh}
              ozgardi={(q) => yangila('hujjatIzoh', q)}
            />
          </ToliqKeng>
        )}

      </Bolim>
    </>
  );
}

// ═════════════════════════════════════════════════════════════
//  6-QADAM: IX. TOMORQA, CHORVA VA HUNARMANDCHILIK
//
//  Ilgari bu qadamda X bo'lim ham bor edi - "mahalla hududidagi
//  tadbirkorlik subyektlari". U olib tashlandi (bo'sh ish o'rinlari
//  alohida reestrda yuritiladi), shuning uchun qadam nomi ham
//  o'zgartirildi.
// ═════════════════════════════════════════════════════════════

export function QadamYerChorva({ h, yangila, xatolar }: QadamProps) {
  const { t: tr } = useAlifbo();

  return (
    <>
      <Bolim raqam="IX" sarlavha={tr("Томорқа, ер, чорвачилик ва ҳунармандчилик")}>
        <ToliqKeng>
          <HaYoqMaydoni
            yorliq={tr("Томорқа ер майдони мавжудми")}
            majburiy
            qiymat={h.tomorqaBor}
            ozgardi={(q) => yangila('tomorqaBor', q)}
            xato={x(xatolar, 'tomorqaBor')}
          />
        </ToliqKeng>

        {h.tomorqaBor && (
          <>
            <RaqamMaydoni
              yorliq={tr("Экин экиладиган майдон")}
              izoh={tr("Уй турган жойни ҳисобламанг — фақат экин экса бўладиган қисми")}
              majburiy
              qiymat={h.ekinMaydoni}
              ozgardi={(q) => yangila('ekinMaydoni', q)}
              max={10000}
              qadam={0.01}
              birlik={tr("сотих")}
              xato={x(xatolar, 'ekinMaydoni')}
            />

            {/*
              Майдон сони ЕТМАЙДИ: ўша 10 сотих тўлиқ экилган
              ҳам, йиллаб ташлаб қўйилган ҳам бўлиши мумкин.
              Икковига бошқа-бошқа чора керак.

              Баҳо кесмага ҳам тушади — кейинги йил ўша хонадонга
              борилганда «ўтган сафар ёмон эди» деб кўрсатилади.
            */}
            <ToliqKeng>
              <TanlovMaydoni
                yorliq={tr("Томорқадан фойдаланиш даражаси")}
                izoh={tr("Ер бор-йўқлиги эмас, ИШЛАТИЛАЁТГАНИ муҳим. Бу баҳо хонадон тарихида сақланади ва кейинги хатловда таққосланади.")}
                majburiy
                variantlar={TOMORQA_FOYDALANISH}
                qiymat={h.tomorqaFoydalanish}
                ozgardi={(q) => yangila('tomorqaFoydalanish', q)}
                xato={x(xatolar, 'tomorqaFoydalanish')}
              />
            </ToliqKeng>
          </>
        )}

        {/*
          Томорқадан ТАШҚАРИ ер: қариндошдан қолган, маҳалладан
          ажратилган, вақтинча берилган. Ижара эмас (у пастда
          алоҳида сўралади), лекин унда ҳам экин экса бўлади —
          демак режага киради.
        */}
        <ToliqKeng>
          <HaYoqMaydoni
            yorliq={tr("Қўшимча фойдаланувдаги ер майдони борми")}
            izoh={tr("Томорқадан ташқари, оила фойдаланаётган бошқа ер")}
            majburiy
            qiymat={h.qoshimchaYerBor}
            ozgardi={(q) => {
              yangila('qoshimchaYerBor', q);
              if (!q) yangila('qoshimchaYerMaydoni', '');
            }}
            xato={x(xatolar, 'qoshimchaYerBor')}
          />
        </ToliqKeng>

        {h.qoshimchaYerBor && (
          <RaqamMaydoni
            yorliq={tr("Қўшимча ер майдони")}
            majburiy
            qiymat={h.qoshimchaYerMaydoni}
            ozgardi={(q) => yangila('qoshimchaYerMaydoni', q)}
            max={100000}
            qadam={0.01}
            birlik={tr("сотих")}
            xato={x(xatolar, 'qoshimchaYerMaydoni')}
          />
        )}

        {/*
          Chorvachilik alohida savol bo'ldi. Ilgari erkin matn edi
          va "bor", "2 ta sigir", "yo'q" kabi turli javoblar
          tushardi - ularni sanab bo'lmasdi.
        */}
        <ToliqKeng>
          <HaYoqMaydoni
            yorliq={tr("Чорвачилик ёки паррандачилик мавжудми")}
            majburiy
            qiymat={h.chorvaBor}
            ozgardi={(q) => yangila('chorvaBor', q)}
            xato={x(xatolar, 'chorvaBor')}
          />
        </ToliqKeng>

        {h.chorvaBor && (
          <>
            <ToliqKeng>
              <KopTanlovMaydoni
                yorliq={tr("Қайси турлари")}
                majburiy
                izoh={tr("Бир нечтасини белгилаш мумкин")}
                variantlar={CHORVA_TURI}
                qiymatlar={h.chorvaTurlari}
                ozgardi={(q) => {
                  yangila('chorvaTurlari', q);
                  // Белгиланмаган турнинг сони ҳам тушади
                  if (!q.includes('Yirik shoxli')) yangila('yirikShoxliSoni', '');
                  if (!q.includes('Mayda shoxli')) yangila('maydaShoxliSoni', '');
                  if (!q.includes('Parranda')) yangila('parrandaSoni', '');
                }}
                xato={x(xatolar, 'chorvaTurlari')}
              />
            </ToliqKeng>

            {/*
              ── БОШ СОНИ ──

              «Чорваси бор» белгисидан режа чиқмайди: 2 та товуқ
              ҳам, 40 та қорамол ҳам бир хил кўринади. Субсидия,
              ем-хашак ёрдами ва сут йиғиш пункти очиш қарори
              эса айнан бош сонига қараб чиқарилади.

              Майдон фақат ЎША тур белгиланганда очилади.
            */}
            {h.chorvaTurlari.includes('Yirik shoxli') && (
              <RaqamMaydoni
                yorliq={tr("Йирик шохли — бош сони")}
                majburiy
                min={1}
                max={500}
                qiymat={h.yirikShoxliSoni}
                ozgardi={(q) => yangila('yirikShoxliSoni', q)}
                birlik={tr("бош")}
                xato={x(xatolar, 'yirikShoxliSoni')}
              />
            )}

            {h.chorvaTurlari.includes('Mayda shoxli') && (
              <RaqamMaydoni
                yorliq={tr("Майда шохли — бош сони")}
                majburiy
                min={1}
                max={2000}
                qiymat={h.maydaShoxliSoni}
                ozgardi={(q) => yangila('maydaShoxliSoni', q)}
                birlik={tr("бош")}
                xato={x(xatolar, 'maydaShoxliSoni')}
              />
            )}

            {h.chorvaTurlari.includes('Parranda') && (
              <RaqamMaydoni
                yorliq={tr("Парранда — бош сони")}
                majburiy
                min={1}
                max={10000}
                qiymat={h.parrandaSoni}
                ozgardi={(q) => yangila('parrandaSoni', q)}
                birlik={tr("бош")}
                xato={x(xatolar, 'parrandaSoni')}
              />
            )}
          </>
        )}

        <ToliqKeng>
          <HaYoqMaydoni
            yorliq={tr("Ҳунармандчилик ёки уй шароитида ишлаб чиқариш борми")}
            majburiy
            qiymat={h.hunarmandBor}
            ozgardi={(q) => yangila('hunarmandBor', q)}
            xato={x(xatolar, 'hunarmandBor')}
          />
        </ToliqKeng>

        {h.hunarmandBor && (
          <ToliqKeng>
            <KopTanlovMaydoni
              yorliq={tr("Қайси йўналиш")}
              izoh={tr("Рўйхатдан белгиланг — ёзиш шарт эмас")}
              variantlar={HUNAR_TURI}
              qiymatlar={h.hunarTurlari}
              ozgardi={(q) => yangila('hunarTurlari', q)}
              xato={x(xatolar, 'hunarTurlari')}
            />
          </ToliqKeng>
        )}

        {/*
          Matn maydoni FAQAT "Boshqa" belgilanganda ochiladi.
          Aks holda xodim ro'yxatdan tanlagan narsani yana qo'lda
          yozishga urinardi va ma'lumot ikki joyda ikki xil bo'lardi.
        */}
        {h.hunarmandBor && h.hunarTurlari.includes('Boshqa') && (
          <ToliqKeng>
            <MatnMaydoni
              yorliq={tr("«Бошқа» — қайси ҳунар")}
              majburiy
              qiymat={h.hunarmandchilik}
              ozgardi={(q) => yangila('hunarmandchilik', q)}
              xato={x(xatolar, 'hunarmandchilik')}
            />
          </ToliqKeng>
        )}

        {/*
          «Ушбу йўналишларни ривожлантириш учун зарур кўмак»
          олиб ташланди: у II-бўлимдаги «Қандай кўмак керак?»
          саволининг айнан ўзи эди — бир хил рўйхат (MOLIYA_TURI),
          бир хил маъно. Оила иккита жойда иккита ҳар хил жавоб
          берарди ва қайси бири ҳақиқий экани номаълум қоларди.

          II-бўлимдагиси қолдирилди, чунки унда миқдор ва
          сарфлаш йўналиши ҳам бор.
        */}

        <ToliqKeng>
          <HaYoqMaydoni
            yorliq={tr("Иссиқхонага талаби")}
            majburiy
            qiymat={h.issiqxonaTalabi}
            ozgardi={(q) => yangila('issiqxonaTalabi', q)}
            xato={x(xatolar, 'issiqxonaTalabi')}
          />
        </ToliqKeng>

        {h.issiqxonaTalabi && (
          <RaqamMaydoni
            yorliq={tr("Иссиқхона майдони")}
            qiymat={h.issiqxonaMaydoni}
            ozgardi={(q) => yangila('issiqxonaMaydoni', q)}
            max={10000}
            qadam={0.01}
            birlik={tr("сотих")}
            xato={x(xatolar, 'issiqxonaMaydoni')}
          />
        )}

        <ToliqKeng>
          <HaYoqMaydoni
            yorliq={tr("Оила аъзоларида ижара ер мавжудми")}
            majburiy
            qiymat={h.ijaraYer}
            ozgardi={(q) => yangila('ijaraYer', q)}
            xato={x(xatolar, 'ijaraYer')}
          />
        </ToliqKeng>

        {h.ijaraYer && (
          <RaqamMaydoni
            yorliq={tr("Ижара ер майдони")}
            majburiy
            qiymat={h.ijaraYerMaydoni}
            ozgardi={(q) => yangila('ijaraYerMaydoni', q)}
            max={100000}
            qadam={0.01}
            birlik={tr("гектар")}
            xato={x(xatolar, 'ijaraYerMaydoni')}
          />
        )}
      </Bolim>

    </>
  );
}

// ═════════════════════════════════════════════════════════════
//  7-QADAM: ISHSIZLAR + XI. XULOSA
// ═════════════════════════════════════════════════════════════

/**
 * Ёзилган касбдан ТАНЛОВ қийматини топади.
 *
 * Иккита ҳолат бор:
 *   1. Рўйхатдан танланган — қиймат айнан рўйхатда бор.
 *   2. «Бошқа» билан ёзилган — рўйхатда йўқ.
 *
 * Иккинчи ҳолатда танлов «Бошқа» да туради ва матн катаги
 * очиқ қолади. Шу туфайли эски (эркин матнли) ёзувлар ҳам
 * тўғри очилади: улар рўйхатда бўлмаса, «Бошқа» бўлиб
 * кўринади ва йўқолмайди.
 */
function kasbTanlovi(kasb: string | null | undefined): string | null {
  if (!kasb) return null;
  return ORGANMOQCHI_KASBLAR.some((k) => k.qiymat === kasb) ? kasb : KASB_BOSHQA;
}

export function QadamIshsizlar({ h, yangila, xatolar }: QadamProps) {
  const { t: tr } = useAlifbo();

  const kutilgan = h.ishsizlarSoni === '' ? 0 : h.ishsizlarSoni;
  const kiritilgan = h.ishsizlar.length;

  /**
   * Bitta shaxs qatorini yangilaydi.
   *
   * DIQQAT: o'zgarishlar BITTA obyektda beriladi, ketma-ket
   * ikki chaqiruvda emas.
   *
   * Sababi jiddiy edi. Bu funksiya yangi massivni `h.ishsizlar`
   * dan quradi, `h` esa render paytidagi qiymat. Bitta
   * ishlov ichida ikki marta chaqirilsa, ikkinchisi O'SHA
   * eski massivdan qurar va birinchisining o'zgarishini yo'q
   * qilardi.
   *
   * Amalda bu shunday ko'rinardi: xodim "дастурчи" deb yozib,
   * keyin "тикувчилик" ga tuzatadi - maydon esa "дастурчи"
   * bo'lib qolaverardi va IT-shaharcha vaucheri taklifi
   * ekranda turaverardi. Xodim uni o'chira olmasdi.
   */
  function qatorYangila(qatorId: string, ozgarish: Partial<IshsizQatori>) {
    yangila(
      'ishsizlar',
      h.ishsizlar.map((p) => (p.qatorId === qatorId ? { ...p, ...ozgarish } : p))
    );
  }

  return (
    <>
      <section className="karta space-y-4 p-4 sm:p-5">
        <div>
          <h2 className="bolim-sarlavha">
            <span className="bolim-raqam">
              <Users className="h-4 w-4" />
            </span>
            <span>{tr('Ҳар бир ишсиз фуқаро бўйича маълумот')}</span>
          </h2>
          <p className="mt-2 text-xs text-ink-faint">
            {tr('Бу ерда фақат асосий маълумот ёзилади. Тўлиқ анкетани бандлик маркази мутахассиси суҳбат пайтида тўлдиради.')}
          </p>
        </div>

        {/*
          Kiritilgan qatorlar soni I bo'limdagi raqam bilan mos kelishi
          shart. Bu bog'lanish butun platformani ushlab turadi: ishsizlar
          soni faqat raqam bo'lib qolsa, bandlik markazi kim bilan
          ishlashini bilmaydi.
        */}
        <div
          className={
            kutilgan === kiritilgan && kutilgan > 0
              ? 'quti-ok'
              : kutilgan === 0 && kiritilgan === 0
                ? 'rounded-md bg-surface-muted px-3.5 py-3 text-sm text-ink-muted'
                : 'quti-ogoh'
          }
        >
          {tr('I бўлимда')} <b>{kutilgan}</b> {tr('та ишсиз кўрсатилган, бу ерда')}{' '}
          <b>{kiritilgan}</b> {tr('тасининг маълумоти киритилган.')}
          {kutilgan !== kiritilgan && tr(' Улар тенг бўлиши керак.')}
        </div>

        {x(xatolar, 'ishsizlar') && <div className="quti-xato">{x(xatolar, 'ishsizlar')}</div>}

        <div className="space-y-4">
          {h.ishsizlar.map((p, i) => (
            <div key={p.qatorId} className="rounded-md border border-line bg-surface-muted p-3.5">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-semibold text-ink">{i + 1}{tr('-ишсиз фуқаро')}</span>
                <button
                  type="button"
                  onClick={() =>
                    yangila(
                      'ishsizlar',
                      h.ishsizlar.filter((y) => y.qatorId !== p.qatorId)
                    )
                  }
                  aria-label={tr(`${i + 1}-фуқарони рўйхатдан олиб ташлаш`)}
                  className="flex h-9 w-9 items-center justify-center rounded-md text-ink-faint transition-colors hover:bg-danger-bg hover:text-danger"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="grid gap-3.5 sm:grid-cols-2">
                <MatnMaydoni
                  yorliq={tr("Ф.И.Ш.")}
                  majburiy
                  qiymat={p.fish}
                  ozgardi={(q) => qatorYangila(p.qatorId, { fish: q })}
                  xato={x(xatolar, `ishsiz.${i}.fish`)}
                />

                <MatnMaydoni
                  yorliq={tr("Телефон рақами")}
                  turi="tel"
                  qiymat={p.telefon ?? ''}
                  ozgardi={(q) => qatorYangila(p.qatorId, { telefon: q })}
                  xato={x(xatolar, `ishsiz.${i}.telefon`)}
                />

                <TanlovMaydoni
                  yorliq={tr("Жинси")}
                  majburiy
                  variantlar={JINS}
                  qiymat={p.jinsi}
                  ozgardi={(q) => qatorYangila(p.qatorId, { jinsi: q ?? 'Erkak' })}
                />

                {/*
                  ТУҒИЛГАН САНА — мажбурий.

                  Илгари бу майдон УМУМАН сўралмасди, ҳолбуки
                  базада устун бор эди. Натижада иккита нарса
                  ишламай турарди: ҳисоботдаги ёш гуруҳлари бўш
                  чиқарди, ва ёш текшируви (16 ёшгача, аёл 55,
                  эркак 60) фақат оила бошлиғига қўлланарди —
                  ишсизларга эса қўлланмасди.

                  Энг эрта сана 1920 йил: ундан олдин туғилган
                  одам бўлиши мумкин эмас ва бу теришдаги хатони
                  тутади.
                */}
                <SanaMaydoni
                  yorliq={tr("Туғилган санаси")}
                  majburiy
                  qiymat={p.tugilganSana}
                  ozgardi={(q) => qatorYangila(p.qatorId, { tugilganSana: q })}
                  eng_erta="1920-01-01"
                  eng_kech={new Date().toLocaleDateString('en-CA')}
                  xato={x(xatolar, `ishsiz.${i}.tugilganSana`)}
                />

                {/*
                  Ёш баҳоси ходим АНКЕТАНИ ТЎЛДИРАЁТГАНДА
                  кўринади, юборгандан кейин эмас. Бу ТЎСИҚ эмас:
                  нафақа ёшидаги одам ҳам рўйхатга олинади,
                  шунчаки бандлик маркази унга иш топиб бера
                  олмайди ва бошқа чора керак бўлади.
                */}
                <div className="sm:col-span-2">
                  <YoshOgohlantirishi
                    tugilganYili={
                      p.tugilganSana ? Number(p.tugilganSana.slice(0, 4)) : ''
                    }
                    jinsi={p.jinsi}
                  />
                </div>

                <TanlovMaydoni
                  yorliq={tr("Маълумоти")}
                  variantlar={MALUMOT}
                  qiymat={p.malumoti ?? null}
                  ozgardi={(q) => qatorYangila(p.qatorId, { malumoti: q })}
                />

                <MatnMaydoni
                  yorliq={tr("Мавжуд малака / мутахассислиги")}
                  qiymat={p.mutaxassisligi ?? ''}
                  ozgardi={(q) => qatorYangila(p.qatorId, { mutaxassisligi: q })}
                />

                <RaqamMaydoni
                  yorliq={tr("Иш тажрибаси")}
                  qiymat={p.ishTajribasiYil}
                  ozgardi={(q) => qatorYangila(p.qatorId, { ishTajribasiYil: q })}
                  max={60}
                  qadam={0.5}
                  birlik={tr("йил")}
                />

                <MatnMaydoni
                  yorliq={tr("Қайси йўналишда ишлашни истайди")}
                  qiymat={p.xohlaganIsh ?? ''}
                  ozgardi={(q) => qatorYangila(p.qatorId, { xohlaganIsh: q })}
                />

                <PulMaydoni
                  yorliq={tr("Қаноатлантирадиган иш ҳақи")}
                  qiymat={p.kutilayotganMaosh}
                  ozgardi={(q) => qatorYangila(p.qatorId, { kutilayotganMaosh: q })}
                />

                {/*
                  ── ҲАЙДОВЧИЛИК ГУВОҲНОМАСИ ──

                  Бўш иш ўринларининг сезиларли қисми — ҳайдовчи:
                  юк ташиш, автобус, трактор. Тоифасиз «прававси
                  бор» деган маълумотдан фойда йўқ: юк машинаси
                  эълонига C керакми, CE ми — шуни билмасдан
                  одам таклиф қилиб бўлмайди.
                */}
                <div className="sm:col-span-2">
                  <HaYoqMaydoni
                    yorliq={tr("Ҳайдовчилик гувоҳномаси борми")}
                    qiymat={p.haydovchilikGuvohnomasi ?? false}
                    ozgardi={(q) =>
                      qatorYangila(p.qatorId, {
                        haydovchilikGuvohnomasi: q,
                        // «Йўқ»га қайтарилса, тоифалар тозаланади
                        ...(q ? {} : { haydovchilikToifasi: [] }),
                      })
                    }
                  />
                </div>

                {p.haydovchilikGuvohnomasi && (
                  <div className="sm:col-span-2">
                    <KopTanlovMaydoni
                      yorliq={tr("Қайси тоифалар")}
                      izoh={tr("Гувоҳномада очиқ турган ҳамма тоифани белгиланг")}
                      majburiy
                      variantlar={HAYDOVCHILIK_TOIFASI}
                      qiymatlar={p.haydovchilikToifasi ?? []}
                      ozgardi={(q) => qatorYangila(p.qatorId, { haydovchilikToifasi: q })}
                      xato={x(xatolar, `ishsiz.${i}.haydovchilikToifasi`)}
                    />
                  </div>
                )}

                <div className="sm:col-span-2">
                  <HaYoqMaydoni
                    yorliq={tr("Касб-ҳунарга ўқиш истаги борми")}
                    qiymat={p.kasbHunarEhtiyoji ?? false}
                    ozgardi={(q) =>
                      qatorYangila(p.qatorId, {
                        kasbHunarEhtiyoji: q,
                        ...(q ? {} : { organmoqchiKasb: '', itShaharchaVaucheri: false }),
                      })
                    }
                  />
                </div>

                {/*
                  ── КАСБ: ЁЗИШ ЭМАС, ТАНЛАШ ──

                  Илгари бу эркин матн эди ва базада «дастурчи»,
                  «Дастурчи», «дастурлаш», «программист» бўлиб
                  ёзиларди. Курс очиш қарори эса САНОҚҚА таянади
                  — ҳар хил ёзилганини санаб бўлмайди.

                  Рўйхат тепасида IT касблари туради: улар
                  ваучер занжирини очади ва ходим уларни кўриб
                  турсин.

                  «Бошқа» танланса — эркин матн катаги очилади.
                  Рўйхат ҳеч қачон тўлиқ бўлмайди ва фуқарони
                  энг яқин нотўғри вариантга мажбурлаш
                  маълумотни бузарди.
                */}
                {p.kasbHunarEhtiyoji && (
                  <div className="sm:col-span-2 space-y-3">
                    <TanlovMaydoni
                      yorliq={tr("Қайси касбни ўрганиш истаги бор")}
                      izoh={tr("Рўйхатдан танланг — курс очиш қарори шу саноққа таянади")}
                      majburiy
                      variantlar={ORGANMOQCHI_KASBLAR}
                      qiymat={kasbTanlovi(p.organmoqchiKasb)}
                      ozgardi={(q) =>
                        qatorYangila(p.qatorId, {
                          /*
                            «Бошқа» танланса, матн катаги бўш
                            очилсин — эски танловнинг номи
                            ичида қолиб кетмасин.
                          */
                          organmoqchiKasb: q === KASB_BOSHQA ? '' : (q ?? ''),
                          boshqaKasbmi: q === KASB_BOSHQA,
                          ...(q && itKasbimi(q) ? {} : { itShaharchaVaucheri: false }),
                        })
                      }
                      xato={x(xatolar, `ishsiz.${i}.organmoqchiKasb`)}
                    />

                    {/*
                      Матн катаги иккита ҳолатда очилади:
                      ходим ҳозир «Бошқа» ни танлаганда, ва
                      ЭСКИ ёзув очилганда — унда касб эркин
                      матн бўлган ва рўйхатда йўқ.
                    */}
                    {(p.boshqaKasbmi ||
                      kasbTanlovi(p.organmoqchiKasb) === KASB_BOSHQA) && (
                      <MatnMaydoni
                        yorliq={tr("Касб номини ёзинг")}
                        izoh={tr("Аниқ ёзинг — бу ном ҳисоботга тушади")}
                        majburiy
                        qiymat={p.organmoqchiKasb ?? ''}
                        ozgardi={(q) =>
                          qatorYangila(p.qatorId, {
                            organmoqchiKasb: q,
                            /* Ёзилган матн IT бўлса — ваучер занжири барибир очилади */
                            ...(itYonalishimi(q) ? {} : { itShaharchaVaucheri: false }),
                          })
                        }
                        placeholder={tr("масалан: қувурчи, темирчи")}
                      />
                    )}
                  </div>
                )}

                {/*
                  ── IT-ШАҲАРЧА ВАУЧЕРИ ──

                  Бу блок ФАҚАТ IT касби ёзилганда очилади ва
                  ходимга нима дейишни айтиб туради. Сабаби: IT
                  нинг йўли бошқа. Касб-ҳунар курси туманда
                  очилади ва гуруҳ тўлишини кутади; IT-шаҳарчага
                  эса битта одамни ҳам ҳозир йўналтириш мумкин.
                  Ходим буни билмаса, IT ўрганмоқчи одам «курс
                  гуруҳи тўлмади» деб ойлаб кутиб ўтираверади.
                */}
                {p.kasbHunarEhtiyoji &&
                  (itKasbimi(p.organmoqchiKasb) || itYonalishimi(p.organmoqchiKasb)) && (
                  <div className="sm:col-span-2 space-y-2.5 rounded-md border border-accent bg-accent-soft p-3.5">
                    <p className="text-xs text-ink-muted">
                      {tr('Бу — IT йўналиши. Фуқарони туманда курс кутишга қолдирмасдан, IT-шаҳарча дастурига ВАУЧЕР билан йўналтириш мумкин: гуруҳ тўлиши шарт эмас, битта одам ҳам юборилади. Ваучерни бандлик маркази расмийлаштиради.')}
                    </p>
                    <HaYoqMaydoni
                      yorliq={tr("IT-шаҳарча ваучери ҳақида айтилди ва йўналтирилдими")}
                      qiymat={p.itShaharchaVaucheri ?? false}
                      ozgardi={(q) => qatorYangila(p.qatorId, { itShaharchaVaucheri: q })}
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => yangila('ishsizlar', [...h.ishsizlar, bosIshsiz()])}
            className="flex items-center justify-center gap-2 rounded-md border border-dashed border-line-strong px-4 py-3 text-sm font-medium text-ink-muted transition-colors hover:border-accent hover:text-accent"
          >
            <Plus className="h-4 w-4" />
            {tr('Ишсиз фуқаро қўшиш')}
          </button>

          {/*
            ── ОИЛА БОШЛИҒИ ҲАМ ИШСИЗ ──

            Оила бошлиғининг исми, жинси, телефони ва туғилган
            санаси 1-қадамда аллақачон терилган. Агар у ҳам ишсиз
            бўлса, ходим шу маълумотни ҚАЙТАДАН теришга мажбур
            эди — занжир айнан шу ерда узиларди.

            Тугма фақат маълумот бор ва у рўйхатда ЙЎҚ бўлганда
            кўринади: акс ҳолда ходим уни икки марта босиб,
            рўйхатда бир одам икки марта пайдо бўларди.
          */}
          {h.oilaBoshligi.trim().length >= 2 &&
            !h.ishsizlar.some(
              (p) => nomKaliti(p.fish) === nomKaliti(h.oilaBoshligi)
            ) && (
              <button
                type="button"
                onClick={() =>
                  yangila('ishsizlar', [
                    ...h.ishsizlar,
                    {
                      ...bosIshsiz(),
                      fish: h.oilaBoshligi.trim(),
                      jinsi: h.oilaBoshligiJinsi ?? 'Erkak',
                      telefon: h.telefon,
                      tugilganSana: h.oilaBoshligiTugilganSana,
                    },
                  ])
                }
                className="flex items-center justify-center gap-2 rounded-md border border-dashed border-accent/60 px-4 py-3 text-sm font-medium text-accent transition-colors hover:bg-accent/5"
              >
                <UserPlus className="h-4 w-4" />
                {tr('Оила бошлиғи ҳам ишсиз')}
              </button>
            )}
        </div>
      </section>

    </>
  );
}

// ═════════════════════════════════════════════════════════════
//  OXIRGI QADAM: XI. XULOSA + XII. ROZILIK VA IMZO
// ═════════════════════════════════════════════════════════════

export function QadamXulosa({ h, yangila, xatolar }: QadamProps) {
  const { t: tr } = useAlifbo();

  return (
    <>
      {/*
        ── ПАССИВ ДАРОМАД ВОСИТАСИ ──

        Иш ўрни ва тадбиркорликдан ФАРҚЛИ учинчи йўл.

        Оилада ёши катта, соғлиғи заиф ёки бола парвариши билан
        банд аъзо бўлади — уни ишга жойлаштириб бўлмайди ва у
        ҳар қандай бандлик рўйхатида «имконсиз» бўлиб туради.

        Савол АТАЙЛАБ «сизда нима бор» эмас, «сизга НИМА БЕРСАК
        даромад топа оласиз» тарзида қўйилган. Биринчисига
        берилган жавоб билан ҳеч ким ҳеч нима қила олмайди;
        иккинчиси эса тўғридан-тўғри таъминот рўйхатига
        айланади — қайси маҳаллада нечта оила айнан нимани
        сўраган.

        Рўйхат ҲОКИМ берган.
      */}
      <Bolim
        raqam="X"
        sarlavha={tr("Қўшимча даромад воситаси")}
        izoh={tr("Оилага қайси восита берилса, у доимий даромад топа олади. Ишга жойлаштириб бўлмайдиган аъзоси бор оила учун кўпинча ягона реал йўл.")}
      >
        <ToliqKeng>
          <HaYoqMaydoni
            yorliq={tr("Оила қўшимча даромад хоҳлайдими")}
            majburiy
            qiymat={h.passivDaromadIstagi}
            ozgardi={(q) => {
              yangila('passivDaromadIstagi', q);
              if (!q) {
                yangila('passivDaromadTurlari', []);
                yangila('passivDaromadIzohi', '');
              }
            }}
            xato={x(xatolar, 'passivDaromadIstagi')}
          />
        </ToliqKeng>

        {h.passivDaromadIstagi && (
          <>
            <ToliqKeng>
              <KopTanlovMaydoni
                yorliq={tr("Қайси восита керак")}
                izoh={tr("Бир нечтасини белгилаш мумкин. Рўйхатда йўқ бўлса — «Бошқа» ни белгилаб, пастда ўз вариантини ёзинг.")}
                majburiy
                variantlar={PASSIV_DAROMAD_TURI}
                qiymatlar={h.passivDaromadTurlari}
                ozgardi={(q) => {
                  yangila('passivDaromadTurlari', q);
                  if (!q.includes('Boshqa')) yangila('passivDaromadIzohi', '');
                  // Белгиси олинган воситанинг миқдори ҳам тушади
                  yangila(
                    'passivDaromadSonlari',
                    Object.fromEntries(
                      Object.entries(h.passivDaromadSonlari).filter(([t]) => q.includes(t))
                    )
                  );
                }}
                xato={x(xatolar, 'passivDaromadTurlari')}
              />
            </ToliqKeng>

            {/*
              ── МИҚДОР ──

              Ҳар бир танланган восита учун алоҳида майдон.
              Миқдорни каталогга ёзиб қўйиб бўлмайди: битта
              оилага 20 та товуқ етади, иккинчисида катта ҳовли
              бор ва 300 тасини боқа олади.

              Ҳисобот шу сонларни ҚЎШАДИ: «нечта оила товуқ
              сўраган» дан ташқари «жами нечта товуқ керак»
              деган рақам чиқади — таъминот режаси айнан
              ўшандан тузилади.
            */}
            {h.passivDaromadTurlari.map((tur) => (
              <RaqamMaydoni
                key={tur}
                yorliq={`${tr(kirillcha(PASSIV_DAROMAD_TURI, tur))} — ${tr('қанча керак')}`}
                majburiy
                min={1}
                max={100000}
                qiymat={h.passivDaromadSonlari[tur] ?? ''}
                ozgardi={(q) =>
                  yangila('passivDaromadSonlari', { ...h.passivDaromadSonlari, [tur]: q })
                }
                birlik={tr(PASSIV_BIRLIGI[tur] ?? 'дона')}
                xato={x(xatolar, `passivSoni.${tur}`)}
              />
            ))}

            {/*
              «Бошқа» белгиланса, фуқаронинг ЎЗ варианти
              мажбурий. Акс ҳолда таъминот рўйхатида «Бошқа: 38
              хонадон» деган банд қолади ва ундан ҳеч нарса
              буюртма қилиб бўлмайди.
            */}
            {h.passivDaromadTurlari.includes('Boshqa') && (
              <ToliqKeng>
                <MatnMaydoni
                  yorliq={tr("«Бошқа» — фуқаронинг ўз варианти")}
                  izoh={tr("Қайси восита кераклигини аниқ ёзинг. Битта вариант такрорланаверса, у кейинги йил рўйхатга қўшилади.")}
                  majburiy
                  qiymat={h.passivDaromadIzohi}
                  ozgardi={(q) => yangila('passivDaromadIzohi', q)}
                  xato={x(xatolar, 'passivDaromadIzohi')}
                />
              </ToliqKeng>
            )}
          </>
        )}
      </Bolim>

      {/*
        ── МАҲАЛЛА ИНФРАТУЗИЛМАСИ ──

        Анкетанинг қолган ҳамма бўлими ХОНАДОН ҳақида: шу оилада
        газ борми, шу оиланинг даромади қанча.

        Аммо оилани камбағалликдан чиқаришга тўсқинлик қиладиган
        нарса кўпинча хонадонда эмас, КЎЧАДА туради: йўл йўқ —
        маҳсулот бозорга чиқмайди; боғча йўқ — аёл ишга
        чиқолмайди; интернет йўқ — масофадан ишлаш мумкин эмас.

        40 000 хонадондан йиғилганда бу туман учун тайёр
        инвестиция режаси бўлади: қайси маҳаллада нечта оила
        айнан шу нарсани кўрсатган.
      */}
      <Bolim
        raqam="XI"
        sarlavha={tr("Маҳалладаги зарурий инфратузилма ва муаммолар")}
        izoh={tr("Фуқаронинг ЎЗ сўзи билан: маҳаллада нима етишмайди. Бу бўлим хонадон эмас, КЎЧА ҳақида.")}
      >
        <ToliqKeng>
          <KopTanlovMaydoni
            yorliq={tr("Маҳаллада қайси инфратузилма етишмайди ёки ярамайди")}
            izoh={tr("Оила кўрсатган ҳамма муаммони белгиланг. Йўқ бўлса — бўш қолдиринг.")}
            variantlar={INFRATUZILMA_MUAMMOSI}
            qiymatlar={h.infratuzilmaMuammolari}
            ozgardi={(q) => {
              yangila('infratuzilmaMuammolari', q);
              if (!q.includes('Boshqa')) yangila('infratuzilmaBoshqa', '');
            }}
          />
        </ToliqKeng>

        {h.infratuzilmaMuammolari.includes('Boshqa') && (
          <ToliqKeng>
            <MatnMaydoni
              yorliq={tr("«Бошқа» — қайси муаммо")}
              izoh={tr("Рўйхатда йўқ муаммони ёзинг. Битта муаммо такрорланаверса, у рўйхатга қўшилади.")}
              majburiy
              qiymat={h.infratuzilmaBoshqa}
              ozgardi={(q) => yangila('infratuzilmaBoshqa', q)}
              xato={x(xatolar, 'infratuzilmaBoshqa')}
            />
          </ToliqKeng>
        )}

        <ToliqKeng>
          <MatnMaydoni
            yorliq={tr("Фуқаронинг изоҳи — ўз сўзи билан")}
            izoh={tr("Юқорида сўралмаган ҳар қандай муаммо шу ерга: маҳалладаги камчилик, уй-жой муаммоси, хизматлардан фойдаланишдаги тўсиқ. Аниқ жой ва ҳолат билан: «Навоий кўчасининг 300 метри йўқ», «боғчада навбат 2 йил».")}
            koptator
            qiymat={h.infratuzilmaIzohi}
            ozgardi={(q) => yangila('infratuzilmaIzohi', q)}
          />
        </ToliqKeng>
      </Bolim>

      {/*
        ── РОЗИЛИК ВА ИМЗО ──

        Анкетанинг ЭНГ ОХИРИДА туради ва бу тасодифий эмас:
        фуқаро нимага рози бўлаётганини билиши учун аввал
        саволларни кўриши керак. Бошида қўйилса, у ҳали нима
        сўралишини билмай туриб рози бўларди.

        Розилик ва имзосиз ЯКУНИЙ ЮБОРИШ тугмаси очилмайди.
        Қоралама сақлашга эса шарт эмас — ходим анкетани бир
        неча марта келиб тўлдириши мумкин ва имзо охирида,
        фуқаронинг ўзи олдида қўйилади.
      */}
      <Bolim raqam="XII" sarlavha={tr("Розилик ва имзо")}>
        <ToliqKeng>
          <div className="space-y-4">
            <div className="quti-ogoh text-xs leading-relaxed">
              {tr('Бу бўлим фуқаронинг ўзи олдида тўлдирилади. Матнни ўқиб беринг ва имзони фуқаронинг ЎЗИ қўйсин.')}
            </div>

            <BelgiMaydoni
              yorliq={tr('Фуқаро маълумотлари йиғилишига ва улар камбағалликни қисқартириш дастури доирасида ишлатилишига розилик берди')}
              izoh={tr('Маълумотлар фақат давлат органлари томонидан, шу дастур доирасида ишлатилади. Учинчи шахсларга берилмайди.')}
              qiymat={h.rozilikBerdi}
              ozgardi={(q) => yangila('rozilikBerdi', q)}
              xato={x(xatolar, 'rozilikBerdi')}
            />

            <ImzoMaydoni
              qiymat={h.imzoYoli}
              ozgardi={(q) => yangila('imzoYoli', q)}
              xato={x(xatolar, 'imzoYoli')}
            />
          </div>
        </ToliqKeng>
      </Bolim>
    </>
  );
}

/**
 * Исм бўйича таққослаш калити.
 *
 * Апостроф ва қўшимча бўшлиқлар олиб ташланади: «Ўрақулов
 * Умиджон» ва «Ўрақулов  Умиджон» бир хил одам.
 */
function nomKaliti(ism: string): string {
  return ism
    .toLowerCase()
    .replace(/[\u2018\u2019\u02BB\u02BC`\u00B4\u2032']/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * ============================================================
 *  ҚАДАМЛАР ТАРТИБИ
 *
 *  Тартиб ЎЗГАРТИРИЛДИ ва сабаби муҳим.
 *
 *  Илгари ишсиз фуқаролар ЭНГ ОХИРГИ қадамда сўраларди: аввал
 *  хонадон, меҳнат, тадбиркорлик, болалар, уй-жой, ер-чорва —
 *  олти қадам, кейин «энди ишсизлар кимлар?». Ҳолбуки 2-қадамда
 *  «нечта ишсиз бор» деб сўралган эди. Яъни САВОЛ ва унинг
 *  ДАВОМИ орасида тўртта алоқасиз қадам турарди.
 *
 *  Амалда бу нимага олиб келади: ходим ҳам, оила ҳам чарчаган
 *  пайтда — анкетанинг охирида — платформанинг ЭНГ МУҲИМ
 *  маълумотига етиб келади. Ишсиз фуқаронинг исми, касби,
 *  прававси, нима ўрганмоқчилиги — бандлик маркази фақат
 *  шулар билан ишлайди. Қолган ҳамма нарса (газ, сув, томорқа)
 *  — чора-тадбир учун керак, аммо ИШГА ЖОЙЛАШТИРИШ учун эмас.
 *
 *  Энди «нечта ишсиз» ва «улар кимлар» ЁНМА-ЁН туради:
 *  2-қадамда рақам, 3-қадамда шахслар. Форма ҳам ўша ерда
 *  иккови тенглигини текширади — ходим бир экранда кўради.
 *
 *  Хулоса ва имзо эса алоҳида, ЭНГ ОХИРГИ қадамга ажратилди:
 *  фуқаро нимага рози бўлаётганини билиши учун аввал ҳамма
 *  саволни кўриши керак.
 * ============================================================
 */
/*
 * Ҳар қадам ЎЗ майдонларини санаб туради.
 *
 * Илгари бу рўйхат бошқа файлда, алоҳида массивда эди. Тартиб
 * ўзгарганда иккисини БИРГА ўзгартириш керак бўларди — эсдан
 * чиқса, «Юбориш» босилганда ходим нотўғри қадамга олиб
 * борилар, экранда эса ҳеч қандай қизил белги кўринмасди:
 * хато бошқа қадамда қолиб кетган бўларди. Энди тартиб ва
 * майдонлар БИТТА жойда — улар ажралиб кета олмайди.
 */
export const QADAMLAR = [
  {
    nomi: 'Хонадон',
    komponent: QadamXonadon,
    maydonlar: [
      'mahallaId',
      'manzil',
      'oilaBoshligi',
      'oilaBoshligiJinsi',
      'tugilganYili',
      'telefon',
      'jamiAzo',
      'bolalarSoni',
      'bolalar0_3Yosh',
      'bolalar3_17Yosh',
      'bolalar18Yoshdan',
    ],
  },
  {
    nomi: 'Меҳнат ва бандлик',
    komponent: QadamMehnat,
    maydonlar: [
      'mehnatgaLayoqatli',
      'ishlaydiganlar',
      'davlatKorxonada',
      'xususiySektorda',
      'ishsizlarSoni',
      'mehnatgaLayoqatsiz',
      'bogchaKutayotganAyollar',
      'ishsizlikMuddatiOy',
    ],
  },
  { nomi: 'Ишсиз фуқаролар', komponent: QadamIshsizlar, maydonlar: ['ishsizlar'] },
  {
    nomi: 'Тадбиркорлик ва даромад',
    komponent: QadamTadbirkorlik,
    maydonlar: [
      'tadbirkorlikIstagi',
      'moliyaEhtiyoji',
      'chetElMehnati',
      'talabQilinganMablag',
      'oylikDaromad',
      'chetElIshchilar',
      'chetElDavlatlari',
      'chetElBoshqaDavlat',
      'chetElOylikPul',
      'chetElValyuta',
      'chetElBoshqaShahar',
      'mablagYonalishiBoshqa',
    ],
  },
  {
    nomi: 'Болалар ва соғлиқ',
    komponent: QadamBolalarSogliq,
    maydonlar: [
      'uzoqDavolanish',
      'maktabgachaYoshdagi',
      'maktabgachaQamrovda',
      'maktabYoshdagi',
      'maktabQamrovda',
      'togarakQamrovi',
      'uzoqDavolanishIzoh',
    ],
  },
  {
    nomi: 'Уй-жой ва ижтимоий ҳимоя',
    komponent: QadamUyJoy,
    maydonlar: [
      'uyHolati',
      'ichimlikSuvi',
      'elektr',
      'gaz',
      'sugorishSuvi',
      'kanalizatsiya',
      'nogironlikBor',
      'yolgizKeksa',
      'parvarishgaMuhtoj',
      'hujjatlarToliq','nogironlikIzoh', 'nogironShaxslar', 'parvarishShaxslar'],
  },
  {
    nomi: 'Ер, чорва ва ҳунармандчилик',
    komponent: QadamYerChorva,
    maydonlar: [
      'tomorqaBor',
      'tomorqaFoydalanish',
      'qoshimchaYerBor',
      'qoshimchaYerMaydoni',
      'chorvaBor',
      'hunarmandBor',
      'issiqxonaTalabi',
      'ijaraYer',
      'ekinMaydoni',
      'chorvaTurlari',
      'hunarTurlari',
      'hunarmandchilik',
      'issiqxonaMaydoni',
      'ijaraYerMaydoni',
      'yirikShoxliSoni',
      'maydaShoxliSoni',
      'parrandaSoni',
    ],
  },
  {
    nomi: 'Хулоса ва имзо',
    komponent: QadamXulosa,
    maydonlar: [
      'passivDaromadIstagi',
      'passivDaromadTurlari',
      'passivDaromadIzohi',
      'infratuzilmaBoshqa',
      'rozilikBerdi',
      'imzoYoli',
    ],
  },
] as const;
