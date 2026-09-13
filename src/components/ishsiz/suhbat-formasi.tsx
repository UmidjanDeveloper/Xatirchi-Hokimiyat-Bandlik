'use client';

import { useAlifbo } from '@/components/alifbo/alifbo-provider';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Save } from 'lucide-react';
import {
  BANDLIK_TAKLIFI,
  HAYDOVCHILIK_TOIFASI,
  ISHGA_TAYYORLIK,
  JINS,
  MALUMOT,
  MOLIYA_TURI,
  NOGIRONLIK_GURUHI,
  OILAVIY_HOLAT,
} from '@/lib/constants';
import { ismTekshir, telefonTekshir } from '@/lib/inson-tekshiruvi';
import {
  Bolim,
  HaYoqMaydoni,
  KopTanlovMaydoni,
  MatnMaydoni,
  PulMaydoni,
  RaqamMaydoni,
  SanaMaydoni,
  TanlovMaydoni,
  ToliqKeng,
} from '@/components/xatlov/maydonlar';

export interface SuhbatHolati {
  fish: string;
  telefon: string;
  jinsi: string;
  oilaviyHolat: string | null;
  farzandlarSoni: number | '';
  millati: string;
  tugilganSana: string;
  malumoti: string | null;
  mutaxassisligi: string;
  sogliqHolati: string;
  nogironlik: boolean;
  nogironlikGuruhi: string | null;
  yashashManzili: string;

  kasbHunarEhtiyoji: boolean;
  organmoqchiKasb: string;
  ishTajribasiYil: number | '';
  avvalgiIshJoyi: string;
  oxirgiIshJoyi: string;
  ishdanBoshaganSana: string;
  xohlaganIsh: string;
  kutilayotganMaosh: number | '';
  ishgaTayyorligi: string | null;
  haydovchilikGuvohnomasi: boolean;
  haydovchilikToifasi: string[];
  imtiyozEhtiyoji: boolean;
  imtiyozTuri: string[];

  takliflar: string[];
  taklifIzohi: string;
  xulosa: string;

  ishJoyi: string;
  ishLavozimi: string;
  ishgaKirganSana: string;
  radSababi: string;
}

export function SuhbatFormasi({
  id,
  boshlangich,
  elongaBoglangan = false,
}: {
  id: string;
  boshlangich: SuhbatHolati;
  /**
   * Fuqaro e'lon orqali joylashtirilganmi.
   *
   * Shunda ish joyi va lavozim e'londan keladi va bu yerda
   * TAHRIRLANMAYDI: ikki joyda ikki xil yozilsa, bitta korxona
   * hisobotda ikkiga bo'linib ketardi. Server ham shu qoidani
   * qaytaradi - forma yuborgan matnni e'tiborsiz qoldiradi.
   */
  elongaBoglangan?: boolean;
}) {
  const { t: tr } = useAlifbo();

  const router = useRouter();
  const [h, setH] = useState(boshlangich);
  const [xatolar, setXatolar] = useState<Record<string, string>>({});
  const [serverXatosi, setServerXatosi] = useState<string | null>(null);
  const [saqlanmoqda, setSaqlanmoqda] = useState(false);
  const [saqlandi, setSaqlandi] = useState(false);

  function yangila<K extends keyof SuhbatHolati>(kalit: K, qiymat: SuhbatHolati[K]) {
    setH((o) => ({ ...o, [kalit]: qiymat }));
    setSaqlandi(false);
    setXatolar((o) => {
      if (!o[kalit as string]) return o;
      const y = { ...o };
      delete y[kalit as string];
      return y;
    });
  }

  async function yubor() {
    if (saqlanmoqda) return;

    const xt: Record<string, string> = {};

    const ism = ismTekshir(h.fish, tr('Ф.И.Ш.'));
    if (!ism.ok) xt.fish = ism.xabar ?? tr('Ф.И.Ш. нотўғри');

    if (h.telefon.trim()) {
      const tel = telefonTekshir(h.telefon);
      if (!tel.ok) xt.telefon = tel.xabar ?? tr('Телефон рақами нотўғри');
    }

    if (h.nogironlik && !h.nogironlikGuruhi) {
      xt.nogironlikGuruhi = tr('Ногиронлик гуруҳини танланг');
    }

    /*
     * Ishga joylashtirilgan deb belgilash uchun ish joyi SHART.
     * Bu bo'lmasa hisobot "joylashtirildi" deb ko'rsatadi, lekin
     * qayerga joylashtirilgani ma'lum bo'lmaydi va tekshirib
     * bo'lmaydi - hokim panelidagi eng muhim raqam ishonchsiz
     * bo'lib qoladi.
     */
    if (h.ishLavozimi.trim() && !h.ishJoyi.trim()) {
      xt.ishJoyi = tr('Лавозим ёзилган — иш жойини ҳам кўрсатинг');
    }

    if (Object.keys(xt).length > 0) {
      setXatolar(xt);
      return;
    }

    setSaqlanmoqda(true);
    setServerXatosi(null);

    try {
      const javob = await fetch(`/api/ishsizlar/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...h,
          farzandlarSoni: h.farzandlarSoni === '' ? null : h.farzandlarSoni,
          ishTajribasiYil: h.ishTajribasiYil === '' ? null : h.ishTajribasiYil,
          kutilayotganMaosh: h.kutilayotganMaosh === '' ? null : h.kutilayotganMaosh,
          tugilganSana: h.tugilganSana || null,
          ishdanBoshaganSana: h.ishdanBoshaganSana || null,
          ishgaKirganSana: h.ishgaKirganSana || null,
          telefon: h.telefon || null,
          millati: h.millati || null,
          mutaxassisligi: h.mutaxassisligi || null,
          sogliqHolati: h.sogliqHolati || null,
          yashashManzili: h.yashashManzili || null,
          organmoqchiKasb: h.organmoqchiKasb || null,
          avvalgiIshJoyi: h.avvalgiIshJoyi || null,
          oxirgiIshJoyi: h.oxirgiIshJoyi || null,
          xohlaganIsh: h.xohlaganIsh || null,
          taklifIzohi: h.taklifIzohi || null,
          xulosa: h.xulosa || null,
          ishJoyi: h.ishJoyi || null,
          ishLavozimi: h.ishLavozimi || null,
          radSababi: h.radSababi || null,
        }),
      });

      const natija = await javob.json().catch(() => ({}));
      if (!javob.ok) {
        setServerXatosi(natija.xabar ?? tr('Сақлаб бўлмади'));
        return;
      }

      setSaqlandi(true);
      router.refresh();
    } catch {
      setServerXatosi(tr('Алоқа йўқ. Қайта уриниб кўринг.'));
    } finally {
      setSaqlanmoqda(false);
    }
  }

  return (
    <div className="space-y-4">
      {serverXatosi && <div className="quti-xato">{tr(serverXatosi)}</div>}
      {saqlandi && <div className="quti-ok">{tr('Сақланди.')}</div>}

      {/* ── 4. Shaxsiy ma'lumot ── */}
      <Bolim raqam="4" sarlavha={tr("Ишсиз фуқаро тўғрисида маълумот")}>
        <MatnMaydoni
          yorliq={tr("Ф.И.Ш.")}
          majburiy
          qiymat={h.fish}
          ozgardi={(q) => yangila('fish', q)}
          xato={xatolar.fish}
        />
        <MatnMaydoni
          yorliq={tr("Телефон рақами")}
          turi="tel"
          qiymat={h.telefon}
          ozgardi={(q) => yangila('telefon', q)}
          xato={xatolar.telefon}
        />

        <TanlovMaydoni
          yorliq={tr("Жинси")}
          variantlar={JINS}
          qiymat={h.jinsi}
          ozgardi={(q) => yangila('jinsi', q ?? 'Erkak')}
        />
        <TanlovMaydoni
          yorliq={tr("Оилавий ҳолати")}
          variantlar={OILAVIY_HOLAT}
          qiymat={h.oilaviyHolat}
          ozgardi={(q) => yangila('oilaviyHolat', q)}
        />

        <RaqamMaydoni
          yorliq={tr("Фарзандлари сони")}
          qiymat={h.farzandlarSoni}
          ozgardi={(q) => yangila('farzandlarSoni', q)}
          max={20}
        />
        <MatnMaydoni
          yorliq={tr("Миллати")}
          qiymat={h.millati}
          ozgardi={(q) => yangila('millati', q)}
        />

        <SanaMaydoni
          yorliq={tr("Туғилган санаси")}
          qiymat={h.tugilganSana}
          ozgardi={(q) => yangila('tugilganSana', q)}
          eng_erta="1940-01-01"
          eng_kech="2010-12-31"
        />
        <TanlovMaydoni
          yorliq={tr("Маълумоти")}
          variantlar={MALUMOT}
          qiymat={h.malumoti}
          ozgardi={(q) => yangila('malumoti', q)}
        />

        <MatnMaydoni
          yorliq={tr("Мутахассислиги")}
          qiymat={h.mutaxassisligi}
          ozgardi={(q) => yangila('mutaxassisligi', q)}
        />
        <MatnMaydoni
          yorliq={tr("Соғлиғи ҳолати")}
          qiymat={h.sogliqHolati}
          ozgardi={(q) => yangila('sogliqHolati', q)}
        />

        <HaYoqMaydoni
          yorliq={tr("Ногиронлиги")}
          qiymat={h.nogironlik}
          ozgardi={(q) => yangila('nogironlik', q)}
        />

        {h.nogironlik && (
          <TanlovMaydoni
            yorliq={tr("Ногиронлик гуруҳи")}
            majburiy
            variantlar={NOGIRONLIK_GURUHI}
            qiymat={h.nogironlikGuruhi}
            ozgardi={(q) => yangila('nogironlikGuruhi', q)}
            xato={xatolar.nogironlikGuruhi}
          />
        )}

        <ToliqKeng>
          <MatnMaydoni
            yorliq={tr("Яшаш манзили (рўйхатда турган)")}
            qiymat={h.yashashManzili}
            ozgardi={(q) => yangila('yashashManzili', q)}
          />
        </ToliqKeng>
      </Bolim>

      {/* ── Mehnat tajribasi va istaklari ── */}
      <Bolim
        raqam="4.10"
        sarlavha={tr("Иш тажрибаси ва истаклари")}
        izoh={tr("Бу бўлимдаги «қайси касбни ўрганиш истаги» ва «қандай ишда ишлашни хоҳлайди» жавоблари курс очиш ва мослаштириш қарорларига асос бўлади.")}
      >
        <HaYoqMaydoni
          yorliq={tr("Касб-ҳунар ёки қайта тайёрлашга эҳтиёжи")}
          qiymat={h.kasbHunarEhtiyoji}
          ozgardi={(q) => yangila('kasbHunarEhtiyoji', q)}
        />

        {h.kasbHunarEhtiyoji && (
          <MatnMaydoni
            yorliq={tr("Қайси касбни ўрганиш истаги")}
            izoh={tr("Аниқ касб ёзинг")}
            qiymat={h.organmoqchiKasb}
            ozgardi={(q) => yangila('organmoqchiKasb', q)}
            placeholder={tr("масалан: пайвандчи")}
          />
        )}

        <RaqamMaydoni
          yorliq={tr("Иш тажрибаси")}
          qiymat={h.ishTajribasiYil}
          ozgardi={(q) => yangila('ishTajribasiYil', q)}
          max={60}
          qadam={0.5}
          birlik={tr("йил")}
        />

        <MatnMaydoni
          yorliq={tr("Охирги иш жойи")}
          qiymat={h.oxirgiIshJoyi}
          ozgardi={(q) => yangila('oxirgiIshJoyi', q)}
        />

        <SanaMaydoni
          yorliq={tr("Ишдан бўшаган санаси")}
          qiymat={h.ishdanBoshaganSana}
          ozgardi={(q) => yangila('ishdanBoshaganSana', q)}
        />

        <ToliqKeng>
          <MatnMaydoni
            yorliq={tr("Аввал қаерда ва қандай лавозимда ишлаган")}
            koptator
            qiymat={h.avvalgiIshJoyi}
            ozgardi={(q) => yangila('avvalgiIshJoyi', q)}
          />
        </ToliqKeng>

        <MatnMaydoni
          yorliq={tr("Қандай ишда ишлашни хоҳлайди")}
          izoh={tr("Касби ёки йўналиши")}
          qiymat={h.xohlaganIsh}
          ozgardi={(q) => yangila('xohlaganIsh', q)}
        />

        <PulMaydoni
          yorliq={tr("Кутилаётган иш ҳақи")}
          qiymat={h.kutilayotganMaosh}
          ozgardi={(q) => yangila('kutilayotganMaosh', q)}
        />

        <TanlovMaydoni
          yorliq={tr("Ишлашга тайёрлиги")}
          variantlar={ISHGA_TAYYORLIK}
          qiymat={h.ishgaTayyorligi}
          ozgardi={(q) => yangila('ishgaTayyorligi', q)}
        />

        <HaYoqMaydoni
          yorliq={tr("Ҳайдовчилик гувоҳномаси")}
          qiymat={h.haydovchilikGuvohnomasi}
          ozgardi={(q) => yangila('haydovchilikGuvohnomasi', q)}
        />

        {h.haydovchilikGuvohnomasi && (
          <ToliqKeng>
            <KopTanlovMaydoni
              yorliq={tr("Тоифаси")}
              variantlar={HAYDOVCHILIK_TOIFASI}
              qiymatlar={h.haydovchilikToifasi}
              ozgardi={(q) => yangila('haydovchilikToifasi', q)}
            />
          </ToliqKeng>
        )}

        <ToliqKeng>
          <HaYoqMaydoni
            yorliq={tr("Имтиёз ёки субсидияга эҳтиёжи")}
            izoh={tr("Асбоб-ускуна, кредит, субсидия, грант ва бошқалар")}
            qiymat={h.imtiyozEhtiyoji}
            ozgardi={(q) => yangila('imtiyozEhtiyoji', q)}
          />
        </ToliqKeng>

        {h.imtiyozEhtiyoji && (
          <ToliqKeng>
            <KopTanlovMaydoni
              yorliq={tr("Қандай кўмак керак")}
              variantlar={MOLIYA_TURI}
              qiymatlar={h.imtiyozTuri}
              ozgardi={(q) => yangila('imtiyozTuri', q)}
            />
          </ToliqKeng>
        )}
      </Bolim>

      {/* ── 5. Bandlik takliflari ── */}
      <Bolim
        raqam="5"
        sarlavha={tr("Бандлигини таъминлаш бўйича таклифлар")}
        izoh={tr("Таклиф белгиланиши билан фуқаронинг ҳолати «Таклиф берилди» га ўтади.")}
      >
        <ToliqKeng>
          <KopTanlovMaydoni
            yorliq={tr("Таклиф этилаётган йўл(лар)")}
            variantlar={BANDLIK_TAKLIFI}
            qiymatlar={h.takliflar}
            ozgardi={(q) => yangila('takliflar', q)}
          />
        </ToliqKeng>

        <ToliqKeng>
          <MatnMaydoni
            yorliq={tr("Таклиф изоҳи")}
            koptator
            qiymat={h.taklifIzohi}
            ozgardi={(q) => yangila('taklifIzohi', q)}
          />
        </ToliqKeng>

        <ToliqKeng>
          <MatnMaydoni
            yorliq={tr("ХУЛОСА")}
            izoh={tr("Фуқаронинг бандлигини таъминлаш учун нима қилиш керак")}
            koptator
            qiymat={h.xulosa}
            ozgardi={(q) => yangila('xulosa', q)}
          />
        </ToliqKeng>
      </Bolim>

      {/* ── Natija ── */}
      <Bolim
        raqam="6"
        sarlavha={tr("Натижа")}
        izoh={
          elongaBoglangan
            ? tr("Фуқаро эълон орқали жойлаштирилган — иш жойи ва лавозим эълондан келади.")
            : tr("Иш жойи ёзилиши билан ҳолат «Жойлаштирилди» га ўтади — бу ҳоким панелидаги асосий кўрсаткич.")
        }
      >
        {elongaBoglangan ? (
          <ToliqKeng>
            <div className="quti-ok">
              {tr('Иш жойи:')} <b>{h.ishJoyi}</b>
              {h.ishLavozimi ? ` — ${h.ishLavozimi}` : ''}
              <p className="mt-1 text-xs">
                {tr('Ўзгартириш учун юқоридаги «Иш ўрни» бўлимидан жойлаштиришни бекор қилинг.')}
              </p>
            </div>
          </ToliqKeng>
        ) : (
          <>
            <MatnMaydoni
              yorliq={tr("Иш жойи (корхона номи)")}
              qiymat={h.ishJoyi}
              ozgardi={(q) => yangila('ishJoyi', q)}
              xato={xatolar.ishJoyi}
            />
            <MatnMaydoni
              yorliq={tr("Лавозими")}
              qiymat={h.ishLavozimi}
              ozgardi={(q) => yangila('ishLavozimi', q)}
            />
          </>
        )}
        <SanaMaydoni
          yorliq={tr("Ишга кирган санаси")}
          qiymat={h.ishgaKirganSana}
          ozgardi={(q) => yangila('ishgaKirganSana', q)}
        />
        {!elongaBoglangan && (
          <MatnMaydoni
            yorliq={tr("Рад этган бўлса — сабаби")}
            qiymat={h.radSababi}
            ozgardi={(q) => yangila('radSababi', q)}
          />
        )}
      </Bolim>

      <div className="karta sticky bottom-0 flex items-center gap-2 p-3 sm:p-4">
        <button
          type="button"
          onClick={yubor}
          disabled={saqlanmoqda}
          className="flex items-center gap-1.5 tugma-asosiy rounded-md px-5 py-2.5 text-sm font-semibold"
        >
          {saqlanmoqda ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {tr('Сақлаш')}
        </button>
      </div>
    </div>
  );
}
