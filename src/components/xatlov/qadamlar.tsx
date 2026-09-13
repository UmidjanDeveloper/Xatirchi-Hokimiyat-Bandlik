'use client';

import { useAlifbo } from '@/components/alifbo/alifbo-provider';

import { Plus, Trash2, UserPlus, Users } from 'lucide-react';
import {
  CHET_EL_DAVLATI,
  CHORVA_TURI,
  DAROMAD_MANBAI,
  GAZ_TURI,
  HA_YOQ,
  HAYDOVCHILIK_TOIFASI,
  HUNAR_TURI,
  ICHIMLIK_SUVI,
  ISH_TURI_ISTAGI,
  JINS,
  KAMBAGALLIK_SABABI,
  KASB_YONALISHI,
  MABLAG_YONALISHI,
  MALUMOT,
  MOLIYA_TURI,
  OILADAGI_ORNI,
  UY_HOLATI,
  itYonalishimi,
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
        izoh={tr("18 ёшгача — болалар бўлмаса 0 ёзинг")}
        qiymat={h.bolalarSoni}
        ozgardi={(q) => yangila('bolalarSoni', q)}
        max={30}
        birlik={tr("киши")}
        xato={x(xatolar, 'bolalarSoni')}
      />
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
        izoh={tr("Рақамлар бир-бирига мос келиши шарт: ишлайдиган + ишсиз ≤ меҳнатга лаёқатли.")}
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

        <TanlovMaydoni
          yorliq={tr("Иш турига бўлган истак")}
          variantlar={ISH_TURI_ISTAGI}
          qiymat={h.ishTuriIstagi}
          ozgardi={(q) => yangila('ishTuriIstagi', q)}
        />

        <ToliqKeng>
          <HaYoqMaydoni
            yorliq={tr("Касб-ҳунар ёки тадбиркорликка ўқишни истайдими?")}
            qiymat={h.kasbHunarIstagi}
            ozgardi={(q) => yangila('kasbHunarIstagi', q)}
          />
        </ToliqKeng>

        {h.kasbHunarIstagi && (
          <ToliqKeng>
            <KopTanlovMaydoni
              yorliq={tr("Қайси йўналишга қизиқади?")}
              variantlar={KASB_YONALISHI}
              qiymatlar={h.kasbHunarYonalishi}
              ozgardi={(q) => yangila('kasbHunarYonalishi', q)}
            />
          </ToliqKeng>
        )}

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
            qiymat={h.tadbirkorlikIstagi}
            ozgardi={(q) => yangila('tadbirkorlikIstagi', q)}
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
            qiymat={h.moliyaEhtiyoji}
            ozgardi={(q) => yangila('moliyaEhtiyoji', q)}
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
                ozgardi={(q) => yangila('mablagYonalishi', q)}
              />
            </div>
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
        raqam="II-Б"
        sarlavha={tr("Чет элдаги меҳнат ва пул ўтказмаси")}
        izoh={tr("Оила аъзоси чет элда ишласа, ундан келадиган пул ҳам оила даромади ҳисобланади.")}
      >
        <ToliqKeng>
          <HaYoqMaydoni
            yorliq={tr("Оила аъзоларидан бирортаси ҳозир чет элда ишлайдими")}
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

            <PulMaydoni
              yorliq={tr("Ойига оилага юборадиган пул")}
              izoh={tr("Тахминий миқдор — сўмда. Доллар бўлса, жорий курс бўйича ҳисобланади.")}
              majburiy
              qiymat={h.chetElOylikPul}
              ozgardi={(q) => yangila('chetElOylikPul', q)}
              xato={x(xatolar, 'chetElOylikPul')}
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

            {h.chetElDavlatlari.includes('Boshqa') && (
              <ToliqKeng>
                <MatnMaydoni
                  yorliq={tr("«Бошқа давлат» — қайси давлат")}
                  izoh={tr("Рўйхатда йўқ давлат номини ёзинг.")}
                  majburiy
                  qiymat={h.chetElBoshqaDavlat}
                  ozgardi={(q) => yangila('chetElBoshqaDavlat', q)}
                  xato={x(xatolar, 'chetElBoshqaDavlat')}
                />
              </ToliqKeng>
            )}
          </>
        )}
      </Bolim>

      <Bolim raqam="III" sarlavha={tr("Даромад манбалари ва камбағалликка тушиш сабаблари")}>
        <PulMaydoni
          yorliq={tr("Оиланинг ойлик умумий даромади")}
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
          qiymat={h.maktabgachaYoshdagi}
          ozgardi={(q) => yangila('maktabgachaYoshdagi', q)}
          max={20}
          birlik={tr("бола")}
          xato={x(xatolar, 'maktabgachaYoshdagi')}
        />

        <RaqamMaydoni
          yorliq={tr("Шулардан боғчага қатнайдиганлар")}
          qiymat={h.maktabgachaQamrovda}
          ozgardi={(q) => yangila('maktabgachaQamrovda', q)}
          max={20}
          birlik={tr("бола")}
          xato={x(xatolar, 'maktabgachaQamrovda')}
        />

        <RaqamMaydoni
          yorliq={tr("Мактаб ёшидаги болалар сони")}
          qiymat={h.maktabYoshdagi}
          ozgardi={(q) => yangila('maktabYoshdagi', q)}
          max={20}
          birlik={tr("бола")}
          xato={x(xatolar, 'maktabYoshdagi')}
        />

        <RaqamMaydoni
          yorliq={tr("Шулардан мактабга қатнайдиганлар")}
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
            qiymat={h.uzoqDavolanish}
            ozgardi={(q) => yangila('uzoqDavolanish', q)}
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
          variantlar={UY_HOLATI}
          qiymat={h.uyHolati}
          ozgardi={(q) => yangila('uyHolati', q)}
        />

        <TanlovMaydoni
          yorliq={tr("Ичимлик суви таъминоти")}
          variantlar={ICHIMLIK_SUVI}
          qiymat={h.ichimlikSuvi}
          ozgardi={(q) => yangila('ichimlikSuvi', q)}
        />

        <HaYoqMaydoni
          yorliq={tr("Электр энергияси")}
          qiymat={h.elektr}
          ozgardi={(q) => yangila('elektr', q)}
        />

        <HaYoqMaydoni
          yorliq={tr("Газ таъминоти")}
          qiymat={h.gaz}
          ozgardi={(q) => yangila('gaz', q)}
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
          qiymat={h.sugorishSuvi}
          ozgardi={(q) => yangila('sugorishSuvi', q)}
        />

        <HaYoqMaydoni
          yorliq={tr("Канализация тизими")}
          qiymat={h.kanalizatsiya}
          ozgardi={(q) => yangila('kanalizatsiya', q)}
        />

        <ToliqKeng>
          <MatnMaydoni
            yorliq={tr("Мавжуд бошқа муаммолар")}
            koptator
            qiymat={h.boshqaMuammolar}
            ozgardi={(q) => yangila('boshqaMuammolar', q)}
          />
        </ToliqKeng>
      </Bolim>

      <Bolim raqam="VII" sarlavha={tr("Ижтимоий ҳимояга муҳтож оила аъзолари")}>
        <ToliqKeng>
          <HaYoqMaydoni
            yorliq={tr("Ногиронлиги бўлган шахс(лар) мавжудми")}
            qiymat={h.nogironlikBor}
            ozgardi={(q) => yangila('nogironlikBor', q)}
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
            />
          </ToliqKeng>
        )}

        <HaYoqMaydoni
          yorliq={tr("Ёлғиз яшовчи кекса(лар) мавжудми")}
          qiymat={h.yolgizKeksa}
          ozgardi={(q) => yangila('yolgizKeksa', q)}
        />

        <HaYoqMaydoni
          yorliq={tr("Парваришга муҳтож шахс(лар) мавжудми")}
          qiymat={h.parvarishgaMuhtoj}
          ozgardi={(q) => yangila('parvarishgaMuhtoj', q)}
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
            izoh={tr("Паспорт, туғилганлик тўғрисида гувоҳнома ва бошқалар")}
            qiymat={h.hujjatlarToliq}
            ozgardi={(q) => yangila('hujjatlarToliq', q)}
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

        <ToliqKeng>
          <MatnMaydoni
            yorliq={tr("Ижтимоий хизматлардан фойдаланишдаги тўсиқлар")}
            koptator
            qiymat={h.xizmatTosiqlari}
            ozgardi={(q) => yangila('xizmatTosiqlari', q)}
          />
        </ToliqKeng>
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
            qiymat={h.tomorqaBor}
            ozgardi={(q) => yangila('tomorqaBor', q)}
          />
        </ToliqKeng>

        {h.tomorqaBor && (
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
        )}

        {/*
          Chorvachilik alohida savol bo'ldi. Ilgari erkin matn edi
          va "bor", "2 ta sigir", "yo'q" kabi turli javoblar
          tushardi - ularni sanab bo'lmasdi.
        */}
        <ToliqKeng>
          <HaYoqMaydoni
            yorliq={tr("Чорвачилик ёки паррандачилик мавжудми")}
            qiymat={h.chorvaBor}
            ozgardi={(q) => yangila('chorvaBor', q)}
          />
        </ToliqKeng>

        {h.chorvaBor && (
          <ToliqKeng>
            <KopTanlovMaydoni
              yorliq={tr("Қайси турлари")}
              izoh={tr("Бир нечтасини белгилаш мумкин")}
              variantlar={CHORVA_TURI}
              qiymatlar={h.chorvaTurlari}
              ozgardi={(q) => yangila('chorvaTurlari', q)}
              xato={x(xatolar, 'chorvaTurlari')}
            />
          </ToliqKeng>
        )}

        <ToliqKeng>
          <HaYoqMaydoni
            yorliq={tr("Ҳунармандчилик ёки уй шароитида ишлаб чиқариш борми")}
            qiymat={h.hunarmandBor}
            ozgardi={(q) => yangila('hunarmandBor', q)}
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

        <ToliqKeng>
          <KopTanlovMaydoni
            yorliq={tr("Ушбу йўналишларни ривожлантириш учун зарур кўмак")}
            variantlar={MOLIYA_TURI}
            qiymatlar={h.zarurKomak}
            ozgardi={(q) => yangila('zarurKomak', q)}
          />
        </ToliqKeng>

        <ToliqKeng>
          <HaYoqMaydoni
            yorliq={tr("Иссиқхонага талаби")}
            qiymat={h.issiqxonaTalabi}
            ozgardi={(q) => yangila('issiqxonaTalabi', q)}
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
            qiymat={h.ijaraYer}
            ozgardi={(q) => yangila('ijaraYer', q)}
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

export function QadamIshsizlar({ h, yangila, xatolar }: QadamProps) {
  const { t: tr } = useAlifbo();

  const kutilgan = h.ishsizlarSoni === '' ? 0 : h.ishsizlarSoni;
  const kiritilgan = h.ishsizlar.length;

  function qatorYangila<K extends keyof IshsizQatori>(
    qatorId: string,
    kalit: K,
    qiymat: IshsizQatori[K]
  ) {
    yangila(
      'ishsizlar',
      h.ishsizlar.map((p) => (p.qatorId === qatorId ? { ...p, [kalit]: qiymat } : p))
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
                  ozgardi={(q) => qatorYangila(p.qatorId, 'fish', q)}
                  xato={x(xatolar, `ishsiz.${i}.fish`)}
                />

                <MatnMaydoni
                  yorliq={tr("Телефон рақами")}
                  turi="tel"
                  qiymat={p.telefon ?? ''}
                  ozgardi={(q) => qatorYangila(p.qatorId, 'telefon', q)}
                  xato={x(xatolar, `ishsiz.${i}.telefon`)}
                />

                <TanlovMaydoni
                  yorliq={tr("Жинси")}
                  majburiy
                  variantlar={JINS}
                  qiymat={p.jinsi}
                  ozgardi={(q) => qatorYangila(p.qatorId, 'jinsi', q ?? 'Erkak')}
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
                  ozgardi={(q) => qatorYangila(p.qatorId, 'tugilganSana', q)}
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
                  ozgardi={(q) => qatorYangila(p.qatorId, 'malumoti', q)}
                />

                <MatnMaydoni
                  yorliq={tr("Мавжуд малака / мутахассислиги")}
                  qiymat={p.mutaxassisligi ?? ''}
                  ozgardi={(q) => qatorYangila(p.qatorId, 'mutaxassisligi', q)}
                />

                <RaqamMaydoni
                  yorliq={tr("Иш тажрибаси")}
                  qiymat={p.ishTajribasiYil}
                  ozgardi={(q) => qatorYangila(p.qatorId, 'ishTajribasiYil', q)}
                  max={60}
                  qadam={0.5}
                  birlik={tr("йил")}
                />

                <MatnMaydoni
                  yorliq={tr("Қайси йўналишда ишлашни истайди")}
                  qiymat={p.xohlaganIsh ?? ''}
                  ozgardi={(q) => qatorYangila(p.qatorId, 'xohlaganIsh', q)}
                />

                <PulMaydoni
                  yorliq={tr("Қаноатлантирадиган иш ҳақи")}
                  qiymat={p.kutilayotganMaosh}
                  ozgardi={(q) => qatorYangila(p.qatorId, 'kutilayotganMaosh', q)}
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
                    ozgardi={(q) => {
                      qatorYangila(p.qatorId, 'haydovchilikGuvohnomasi', q);
                      if (!q) qatorYangila(p.qatorId, 'haydovchilikToifasi', []);
                    }}
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
                      ozgardi={(q) => qatorYangila(p.qatorId, 'haydovchilikToifasi', q)}
                      xato={x(xatolar, `ishsiz.${i}.haydovchilikToifasi`)}
                    />
                  </div>
                )}

                <div className="sm:col-span-2">
                  <HaYoqMaydoni
                    yorliq={tr("Касб-ҳунарга ўқиш истаги борми")}
                    qiymat={p.kasbHunarEhtiyoji ?? false}
                    ozgardi={(q) => {
                      qatorYangila(p.qatorId, 'kasbHunarEhtiyoji', q);
                      if (!q) {
                        qatorYangila(p.qatorId, 'organmoqchiKasb', '');
                        qatorYangila(p.qatorId, 'itShaharchaVaucheri', false);
                      }
                    }}
                  />
                </div>

                {p.kasbHunarEhtiyoji && (
                  <div className="sm:col-span-2">
                    <MatnMaydoni
                      yorliq={tr("Қайси касбни ўрганиш истаги бор")}
                      izoh={tr("Аниқ касб ёзинг — курс очиш қарори шунга таянади")}
                      majburiy
                      qiymat={p.organmoqchiKasb ?? ''}
                      ozgardi={(q) => {
                        qatorYangila(p.qatorId, 'organmoqchiKasb', q);
                        if (!itYonalishimi(q)) qatorYangila(p.qatorId, 'itShaharchaVaucheri', false);
                      }}
                      xato={x(xatolar, `ishsiz.${i}.organmoqchiKasb`)}
                      placeholder={tr("масалан: пайвандчи, тикувчи, дастурчи")}
                    />
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
                {p.kasbHunarEhtiyoji && itYonalishimi(p.organmoqchiKasb) && (
                  <div className="sm:col-span-2 space-y-2.5 rounded-md border border-accent bg-accent-soft p-3.5">
                    <p className="text-xs text-ink-muted">
                      {tr('Бу — IT йўналиши. Фуқарони туманда курс кутишга қолдирмасдан, IT-шаҳарча дастурига ВАУЧЕР билан йўналтириш мумкин: гуруҳ тўлиши шарт эмас, битта одам ҳам юборилади. Ваучерни бандлик маркази расмийлаштиради.')}
                    </p>
                    <HaYoqMaydoni
                      yorliq={tr("IT-шаҳарча ваучери ҳақида айтилди ва йўналтирилдими")}
                      qiymat={p.itShaharchaVaucheri ?? false}
                      ozgardi={(q) => qatorYangila(p.qatorId, 'itShaharchaVaucheri', q)}
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
            эди — зanжир айнан шу ерда узиларди.

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

      <Bolim raqam="XI" sarlavha={tr("Хулоса")}>
        <ToliqKeng>
          <MatnMaydoni
            yorliq={tr("Оиланинг камбағалликдан чиқарилиши бўйича умумий хулоса")}
            koptator
            qiymat={h.umumiyXulosa}
            ozgardi={(q) => yangila('umumiyXulosa', q)}
          />
        </ToliqKeng>
      </Bolim>

      {/*
        ── РОЗИЛИК ВА ИМЗО ──

        Анкетанинг ЭНГ ОХИРИДА туради ва бу тасодифий эмас:
        фуқаро нимага рози бўлаётганини билиши учун аввал
        саволларни кўриши керак. Бошида қўйилса, у ҳали нима
        сўралишини билмай туриб рози бўларди.

        Роzилик ва имзосиз ЯКУНИЙ ЮБОРИШ тугмаси очилмайди.
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

export const QADAMLAR = [
  { nomi: 'Хонадон', komponent: QadamXonadon },
  { nomi: 'Меҳнат ва бандлик', komponent: QadamMehnat },
  { nomi: 'Тадбиркорлик ва даромад', komponent: QadamTadbirkorlik },
  { nomi: 'Болалар ва соғлиқ', komponent: QadamBolalarSogliq },
  { nomi: 'Уй-жой ва ижтимоий ҳимоя', komponent: QadamUyJoy },
  { nomi: 'Ер, чорва ва ҳунармандчилик', komponent: QadamYerChorva },
  { nomi: 'Ишсизлар ва хулоса', komponent: QadamIshsizlar },
] as const;
