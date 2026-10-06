'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mic, Send, Square, Trash2, Volume2, VolumeX, X, ExternalLink, Check, FileDown, Headphones } from 'lucide-react';
import { useAlifbo } from '@/components/alifbo/alifbo-provider';
import { salomMatni } from '@/lib/agent/matnlar';
import type { Amal, Manba } from '@/lib/agent/turlar';
import { Maskot, type MaskotHolati, type RobotKayfiyati } from './maskot';
import { ovozKirishMumkinmi, ovozliJavobMumkinmi, ovozniBoshla, type OvozBoshqaruvi, type OvozXatosi } from './ovoz';
import { javobniGapir, nutqniTayyorla, nutqniToxtat, nutqMuhitiniYop } from './nutq-ijrosi';
import { ENG_KOP_TARIX, ENG_UZUN_TARIX_XABARI, ENG_UZUN_XABAR } from '@/lib/agent/chegaralar';

/**
 * ============================================================
 *  HUDHUD: SUHBAT OYNASI
 *
 *  · Matn va ovoz: mikrofon tugmasi bosiladi → gapiriladi → matn
 *    tanilgach avtomatik yuboriladi. Mikrofon xatosi, to'xtatish, oyna
 *    yopilishi — har holda holat "tayyor"ga QAYTADI (qotib qolmaydi);
 *    iPhone'da ovoz server orqali matnga aylanadi (`ovoz.ts`).
 *  · Har javob ostida MANBA (qaysi ma'lumotdan) va izoh ("tasdiqlangan dalil
 *    emas"). Yozish amali — tasdiq kartasi: tugma bosilmaguncha bajarilmaydi.
 *  · Sahifani ochish buyrug'i darhol bajariladi (ovozli buyruq "bajarishi
 *    kerak"), lekin chip ham ko'rinadi: qayta ochish va nima bo'lgani ko'rinadi.
 *  · Holat matn bilan ham aytiladi (eshitmoqda / o'ylamoqda / gapirmoqda),
 *    ekran o'quvchi uchun jonli hudud (aria-live).
 *  · Muloqot faqat shu brauzer varag'ida (sessionStorage) turadi: yopilganda
 *    tozalanadi, serverda SAQLANMAYDI.
 * ============================================================
 */

interface Xabar {
  id: number;
  r: 'f' | 'a';
  matn: string;
  manbalar?: Manba[];
  amallar?: Amal[];
  izoh?: string;
  rejim?: 'ai' | 'qoida' | 'jarvis';
  kanal?: 'koala' | 'jarvis';
  xato?: boolean;
}

interface TasdiqHolati {
  [id: string]: { holat: 'kutmoqda' | 'band' | 'bajarildi' | 'rad' | 'xato'; matn?: string };
}

interface HolatMalumoti {
  ai: boolean;
  vazifa?: { kayfiyat: RobotKayfiyati; kechikkan: number; shoshilinch: number } | null;
  ovozServer: boolean;
  ovozChiqish?: boolean;
  jarvis?: boolean;
  limit: number;
  qolgan: number;
}

const TAKLIFLAR: Record<string, string[]> = {
  HOKIM: ['Хатлов қандай кетяпти?', 'Қайси маҳалла энг орқада?', 'Бугунги вазифаларим', 'Мурожаатлар ҳолати', 'Таҳлил панелини оч'],
  BANDLIK: ['Ишсизлар рўйхатини оч', 'Суҳбат кутаётган ишсизларни кўрсат', 'Муддати ўтган мурожаатлар', 'Бугунги вазифаларим'],
  BANDLIK_RAHBAR: ['Хатлов қандай кетяпти?', '12 ойдан ортиқ ишсизларни оч', 'Муддати ўтган мурожаатлар', 'Операцион панелни оч'],
  ADMIN: ['Тизим ҳолати қандай?', 'Хатоли хабарларни қайта юбор', 'Бошқарув панелини оч', 'Хатлов қандай кетяпти?'],
};

const ENG_KOP_SAQLASH = 24;
const SAQLASH_KALITI = 'hudhud:suhbat:';

const XATO_MATNI: Record<OvozXatosi, string> = {
  ruxsat: 'Микрофонга рухсат йўқ. Созламалардан рухсат беринг ёки ёзинг.',
  mikrofonYoq: 'Микрофон топилмади. Ёзинг.',
  mikrofonBand: 'Микрофон очилмади. Бошқа иловани ёпиб, қайта уриниб кўринг.',
  eshitilmadi: 'Овоз эшитилмади. Қайта айтинг.',
  qollanmaydi: 'Бу қурилмада овоз ишламайди. Ёзинг.',
  tarmoq: 'Овоз хизматига уланмади. Ёзинг.',
  server: 'Овоз матнга айланмади. Ёзинг.',
};

export default function AgentOynasi({
  ochiq,
  yopish,
  ism,
  rol,
  korish = false,
}: {
  ochiq: boolean;
  yopish: () => void;
  ism: string;
  rol: string;
  korish?: boolean;
}) {
  const { t, alifbo } = useAlifbo();
  const router = useRouter();

  const [suhbatTuri, setSuhbatTuri] = useState<'koala' | 'jarvis'>('koala');
  const [xabarlar, setXabarlar] = useState<Xabar[]>([]);
  const [tasdiq, setTasdiq] = useState<TasdiqHolati>({});
  const [matn, setMatn] = useState('');
  const [oraliq, setOraliq] = useState('');
  const [holat, setHolat] = useState<MaskotHolati>('tayyor');
  const [kayfiyat, setKayfiyat] = useState<RobotKayfiyati>('vazmin');
  const [ogizDarajasi, setOgizDarajasi] = useState(0);
  const [muvaffaqiyat, setMuvaffaqiyat] = useState(false);
  const [band, setBand] = useState(false);
  const [malumot, setMalumot] = useState<HolatMalumoti | null>(null);
  const [ovozliJavob, setOvozliJavob] = useState(true);
  const [uzbekOvozBor, setUzbekOvozBor] = useState(false);
  const [bildirish, setBildirish] = useState('');
  const [malumotTayyor, setMalumotTayyor] = useState(false);
  const [ishlov, setIshlov] = useState(false);
  const [nutqYuklanmoqda, setNutqYuklanmoqda] = useState(false);
  const [suhbatRejimi, setSuhbatRejimi] = useState(false);

  const royxat = useRef<HTMLDivElement>(null);
  const kiritish = useRef<HTMLTextAreaElement>(null);
  const tanish = useRef<OvozBoshqaruvi | null>(null);
  const mikRef = useRef<HTMLButtonElement>(null);
  /** `yubor` ishlayaptimi (state emas: bir zumda ham ko'rinishi kerak) */
  const bandRef = useRef(false);
  const idSanagich = useRef(0);
  const saqlashKaliti = `${SAQLASH_KALITI}${ism}:${rol}:${korish ? "korish" : "asosiy"}`;
  const xotiraRef = useRef<string | undefined>();
  const sorovRef = useRef<AbortController | null>(null);
  const sorovSoni = useRef(0);
  const suhbatRef = useRef(false);
  const ochiqRef = useRef(ochiq);
  ochiqRef.current = ochiq;
  const davomTaymeri = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mikrofonRef = useRef<() => void>(() => {});

  const toxtat = useCallback(() => {
    suhbatRef.current = false;
    setSuhbatRejimi(false);
    if (davomTaymeri.current) clearTimeout(davomTaymeri.current);
    sorovSoni.current++;
    sorovRef.current?.abort();
    sorovRef.current = null;
    tanish.current?.bekor();
    tanish.current = null;
    nutqniToxtat();
    bandRef.current = false;
    setBand(false);
    setIshlov(false);
    setNutqYuklanmoqda(false);
    setOraliq('');
    setOgizDarajasi(0);
    setHolat('tayyor');
  }, []);

  const davomEt = useCallback(() => {
    if (davomTaymeri.current) clearTimeout(davomTaymeri.current);
    if (!suhbatRef.current) return;
    davomTaymeri.current = setTimeout(() => {
      if (suhbatRef.current && ochiqRef.current && !document.hidden && !bandRef.current) mikrofonRef.current();
    }, 450);
  }, []);

  /* Salom (kod yozadi) + saqlangan suhbatni tiklash */
  useEffect(() => {
    let tiklandi: Xabar[] = [];
    try {
      const s = sessionStorage.getItem(saqlashKaliti);
      if (s) {
        const d: unknown = JSON.parse(s);
        if (Array.isArray(d)) tiklandi = d.filter((x): x is Xabar =>
          x && typeof x.id === 'number' && (x.r === 'f' || x.r === 'a') && typeof x.matn === 'string'
        ).slice(-ENG_KOP_SAQLASH);
      }
      xotiraRef.current = sessionStorage.getItem(`${saqlashKaliti}:xotira`) ?? undefined;
    } catch {
      /* sessionStorage yo'q yoki buzuq: salomdan boshlaymiz */
    }
    if (tiklandi.length > 0) {
      /* Salom doim hozirgi matn bilan: brauzerda saqlangan eski (uzun) salom qolib ketmasin */
      if (tiklandi[0].r === 'a' && /^(Хайрли|Xayrli)/.test(tiklandi[0].matn)) {
        tiklandi[0] = { ...tiklandi[0], matn: salomMatni(ism, new Date(), alifbo) };
      }
      idSanagich.current = Math.max(...tiklandi.map((x) => x.id)) + 1;
      setXabarlar(tiklandi);
    } else {
      setXabarlar([{ id: idSanagich.current++, r: 'a', matn: salomMatni(ism, new Date(), alifbo) }]);
    }
    try {
      setOvozliJavob(localStorage.getItem('hudhud:ovozli') !== '0');
    } catch {
      /* ruxsat yo'q */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(saqlashKaliti, JSON.stringify(xabarlar.slice(-ENG_KOP_SAQLASH)));
    } catch {
      /* joy yetmadi */
    }
  }, [xabarlar, saqlashKaliti]);

  /* Holat (AI sozlanganmi, limit) — oyna ochilganda */
  useEffect(() => {
    if (!ochiq) return;
    /* Mikrofon tugmasi holat kelguncha yopiq: iPhone'da server yo'li bor-yo'qligi ma'lum bo'lishi shart */
    const kutish = setTimeout(() => setMalumotTayyor(true), 3000);
    fetch('/api/agent/holat', { cache: 'no-store' })
      .then((r) => (r.ok ? (r.json() as Promise<HolatMalumoti>) : null))
      .then((d) => { if (d) { setMalumot(d); setKayfiyat(d.vazifa?.kayfiyat ?? 'vazmin'); } })
      .catch(() => {})
      .finally(() => {
        clearTimeout(kutish);
        setMalumotTayyor(true);
      });
    const fokus = setTimeout(() => {
      if (window.matchMedia('(pointer: fine)').matches) kiritish.current?.focus();
    }, 50);
    return () => { clearTimeout(fokus); clearTimeout(kutish); };
  }, [ochiq]);

  /* Oyna yopilsa yoki ilova fonga o'tsa: yozuv yuborilmasdan bekor qilinadi, mikrofon bo'shaydi */
  useEffect(() => {
    if (!ochiq) toxtat();
  }, [ochiq, toxtat]);

  useEffect(() => {
    const f = () => {
      if (document.hidden) toxtat();
    };
    document.addEventListener('visibilitychange', f);
    return () => {
      document.removeEventListener('visibilitychange', f);
      toxtat();
      nutqMuhitiniYop();
    };
  }, [toxtat]);

  /* Qurilmada o'zbekcha ovoz bormi (ovozlar kech yuklanishi mumkin) */
  useEffect(() => {
    const tekshir = () => setUzbekOvozBor(ovozliJavobMumkinmi());
    tekshir();
    if ('speechSynthesis' in window) {
      window.speechSynthesis.addEventListener('voiceschanged', tekshir);
      return () => window.speechSynthesis.removeEventListener('voiceschanged', tekshir);
    }
  }, []);

  useEffect(() => {
    royxat.current?.scrollTo({ top: royxat.current.scrollHeight, behavior: 'smooth' });
  }, [xabarlar, tasdiq, band]);

  useEffect(() => {
    if (!ochiq) return;
    const f = (e: KeyboardEvent) => e.key === 'Escape' && yopish();
    window.addEventListener('keydown', f);
    return () => window.removeEventListener('keydown', f);
  }, [ochiq, yopish]);

  const qosh = useCallback((x: Omit<Xabar, 'id'>) => {
    setXabarlar((o) => [...o, { ...x, kanal: suhbatTuri, id: idSanagich.current++ }]);
  }, [suhbatTuri]);

  const gapirish = useCallback((javob: string, tugadi?: () => void) => {
    javobniGapir(t(javob), {
      serverMumkin: Boolean(malumot?.ovozChiqish),
      onDaraja: setOgizDarajasi,
      onYuklash: () => { setNutqYuklanmoqda(true); setHolat('oylamoqda'); },
      onBoshlandi: () => { setNutqYuklanmoqda(false); setHolat('gapirmoqda'); },
      onXato: (xabar) => {
        suhbatRef.current = false;
        setSuhbatRejimi(false);
        setKayfiyat('xavotir');
        setBildirish(t(xabar));
      },
      onTugadi: () => {
        setNutqYuklanmoqda(false);
        setHolat((h) => (!bandRef.current && h !== 'eshitmoqda' ? 'tayyor' : h));
        tugadi?.();
        davomEt();
      },
    });
  }, [malumot?.ovozChiqish, t, davomEt]);

  /*
   * Hisobot: tugmalar turgan sahifani ochamiz (kerak bo'lsa), tugmalar paydo
   * bo'lishini kutamiz va sahifaga "hudhud:hisobot" voqeasini yuboramiz —
   * hisobot xuddi tugma bosilgandek (bir xil kod yo'li va huquq) tayyorlanadi.
   */
  const hisobotniBoshla = useCallback(
    async (a: Extract<Amal, { tur: 'hisobot' }>) => {
      const hozirgi = () => window.location.pathname + window.location.search;
      if (hozirgi() !== a.url) router.push(a.url);
      for (let i = 0; i < 60; i++) {
        if (hozirgi() === a.url && document.querySelector('[data-hisobot-tugmalari]')) break;
        await new Promise((r) => setTimeout(r, 200));
      }
      await new Promise((r) => setTimeout(r, 300));
      window.dispatchEvent(new CustomEvent('hudhud:hisobot', { detail: { turi: a.format } }));
    },
    [router]
  );

  const yubor = useCallback(
    async (xom: string) => {
      const savol = xom.trim();
      if (!savol || bandRef.current) return;
      if (davomTaymeri.current) clearTimeout(davomTaymeri.current);
      tanish.current?.bekor();
      nutqniToxtat();
      if (ovozliJavob) nutqniTayyorla();
      const ctrl = new AbortController();
      sorovRef.current = ctrl;
      const sorovId = ++sorovSoni.current;
      const kutish = setTimeout(() => ctrl.abort(), 55_000);
      bandRef.current = true;
      setBildirish('');
      setMatn('');
      setOraliq('');
      setMuvaffaqiyat(false);
      setKayfiyat(malumot?.vazifa?.kayfiyat ?? 'vazmin');
      setBand(true);
      setHolat('oylamoqda');
      setNutqYuklanmoqda(false);
      qosh({ r: 'f', matn: savol });

      /* Server tarixi: faqat oddiy matn (xato va salom xabarlari tushmaydi) */
      const tarix = xabarlar
        .filter((x) => !x.xato && (x.kanal ?? 'koala') === suhbatTuri && !(x.r === 'a' && /^(Хайрли|Xayrli)/.test(x.matn)))
        .slice(suhbatTuri === 'jarvis' ? -8 : -ENG_KOP_TARIX)
        .map((x) => ({ r: x.r, m: x.matn.slice(0, suhbatTuri === 'jarvis' ? 800 : ENG_UZUN_TARIX_XABARI) }));

      try {
        const r = await fetch(suhbatTuri === 'jarvis' ? '/api/agent/jarvis' : '/api/agent/suhbat', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ xabar: savol, tarix, ...(suhbatTuri === 'koala' ? { xotira: xotiraRef.current } : {}) }),
          signal: ctrl.signal,
        });
        if (r.status === 401) {
          window.location.href = '/kirish';
          return;
        }
        const d = (await r.json().catch(() => ({}))) as {
          javob?: string;
          xabar?: string;
          amallar?: Amal[];
          manbalar?: Manba[];
          izoh?: string;
          rejim?: 'ai' | 'qoida' | 'jarvis';
          qolgan?: number;
          xotira?: string;
        };
        if (sorovId !== sorovSoni.current || !ochiqRef.current) return;

        if (!r.ok || !d.javob) {
          setKayfiyat('xavotir');
          qosh({ r: 'a', matn: d.xabar ?? t('Жавоб олиб бўлмади. Бир оздан кейин қайта уриниб кўринг.'), xato: true });
          suhbatRef.current = false;
          setSuhbatRejimi(false);
          return;
        }

        qosh({ r: 'a', matn: d.javob, manbalar: d.manbalar, amallar: d.amallar, izoh: d.izoh, rejim: d.rejim });
        if (suhbatTuri === 'koala' && d.xotira) {
          xotiraRef.current = d.xotira;
          try { sessionStorage.setItem(`${saqlashKaliti}:xotira`, d.xotira); } catch { /* Joy yetmadi. */ }
        }
        if (suhbatTuri === 'koala' && typeof d.qolgan === 'number') setMalumot((m) => (m ? { ...m, qolgan: d.qolgan as number } : m));

        /* Ovozli buyruq BAJARILADI: hisobot yuklanadi */
        const hisobot = d.amallar?.find((a): a is Extract<Amal, { tur: 'hisobot' }> => a.tur === 'hisobot');
        if (hisobot) void hisobotniBoshla(hisobot);

        /* Ovozli buyruq BAJARILADI: sahifa ochiladi */
        const ochish = d.amallar?.find((a): a is Extract<Amal, { tur: 'ochish' }> => a.tur === 'ochish');
        if (ochish) {
          router.push(ochish.url);
        }
        const ochilgachYop = () => {
          if (ochish && window.innerWidth < 640 && !suhbatRef.current) yopish();
        };

        if (ovozliJavob && (uzbekOvozBor || malumot?.ovozChiqish)) gapirish(d.javob, ochilgachYop);
        else { ochilgachYop(); davomEt(); }
      } catch {
        if (sorovId !== sorovSoni.current || !ochiqRef.current) return;
        suhbatRef.current = false;
        setSuhbatRejimi(false);
        qosh({ r: 'a', matn: t('Алоқа узилди. Интернетни текшириб, қайта уриниб кўринг.'), xato: true });
      } finally {
        clearTimeout(kutish);
        if (sorovId === sorovSoni.current) {
          sorovRef.current = null;
          bandRef.current = false;
          setBand(false);
          setHolat((h) => (h === 'gapirmoqda' ? h : 'tayyor'));
        }
      }
    },
    [malumot?.vazifa?.kayfiyat, xabarlar, qosh, router, yopish, t, ovozliJavob, hisobotniBoshla, gapirish, davomEt, saqlashKaliti, suhbatTuri, uzbekOvozBor, malumot?.ovozChiqish]
  );

  /** Mikrofon kuchi → tugma atrofidagi halqa (gapirayotganingiz eshitilayotganini ko'rsatadi) */
  const darajaniYoz = (d: number) => {
    if (document.documentElement.dataset.fx === 'lite') return;
    mikRef.current?.style.setProperty('--daraja', d.toFixed(2));
  };

  const mikrofon = () => {
    if (holat === 'eshitmoqda') {
      tanish.current?.toxtat();
      return;
    }
    if (band || holat === 'oylamoqda') return;
    nutqniToxtat();
    nutqniTayyorla();
    setBildirish('');
    setOraliq('');
    setIshlov(false);
    setHolat('eshitmoqda');
    tanish.current = ovozniBoshla(
      {
        onOraliq: (m) => setOraliq(m),
        onYakuniy: (m) => {
          setOraliq('');
          void yubor(t(m));
        },
        onXato: (k, xabar) => {
          suhbatRef.current = false;
          setSuhbatRejimi(false);
          setBildirish(xabar ?? t(XATO_MATNI[k]));
        },
        onIshlov: () => {
          setIshlov(true);
          setHolat('oylamoqda');
        },
        onDaraja: darajaniYoz,
        /* HAR DOIM chaqiriladi: holat qotib qolmaydi. Savol yuborilgan bo'lsa (bandRef) "o'ylamoqda" qoladi */
        onTugadi: () => {
          setIshlov(false);
          setOraliq('');
          darajaniYoz(0);
          setHolat((h) => (h === 'eshitmoqda' || (h === 'oylamoqda' && !bandRef.current) ? 'tayyor' : h));
        },
      },
      Boolean(malumot?.ovozServer)
    );
  };
  mikrofonRef.current = mikrofon;

  const ovozTugmasi = () => {
    const yangi = !ovozliJavob;
    setOvozliJavob(yangi);
    try {
      localStorage.setItem('hudhud:ovozli', yangi ? '1' : '0');
    } catch {
      /* ruxsat yo'q */
    }
    if (!yangi) toxtat();
  };

  const tasdiqla = async (id: string, qaror: 'ha' | 'yoq') => {
    setTasdiq((o) => ({ ...o, [id]: { holat: 'band' } }));
    try {
      const r = await fetch('/api/agent/tasdiq', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id, qaror }),
      });
      const d = (await r.json().catch(() => ({}))) as { natija?: string; xabar?: string; holat?: string };
      if (r.ok) {
        const bajarildi = d.holat !== 'rad_etildi';
        setTasdiq((o) => ({ ...o, [id]: { holat: bajarildi ? 'bajarildi' : 'rad', matn: d.natija } }));
        setMuvaffaqiyat(bajarildi);
        setKayfiyat(bajarildi ? 'xursand' : malumot?.vazifa?.kayfiyat ?? 'vazmin');
      } else {
        setKayfiyat('xavotir');
        setTasdiq((o) => ({ ...o, [id]: { holat: 'xato', matn: d.xabar } }));
      }
    } catch {
      setKayfiyat('xavotir');
      setTasdiq((o) => ({ ...o, [id]: { holat: 'xato', matn: t('Алоқа узилди.') } }));
    }
  };

  const tozala = () => {
    toxtat();
    if (suhbatTuri === 'koala') xotiraRef.current = undefined;
    try {
      if (suhbatTuri === 'koala') sessionStorage.removeItem(`${saqlashKaliti}:xotira`);
    } catch {
      /* ruxsat yo'q */
    }
    setMuvaffaqiyat(false);
    setKayfiyat(malumot?.vazifa?.kayfiyat ?? 'vazmin');
    if (suhbatTuri === 'koala') setTasdiq({});
    const salom: Xabar = { id: idSanagich.current++, r: 'a', kanal: suhbatTuri, matn: suhbatTuri === 'koala' ? salomMatni(ism, new Date(), alifbo) : t('JARVIS суҳбати. Нимани билишни хоҳлайсиз?') };
    setXabarlar((old) => [...old.filter((x) => (x.kanal ?? 'koala') !== suhbatTuri), salom]);
  };

  if (!ochiq) return null;

  const mikrofonMumkin = ovozKirishMumkinmi(Boolean(malumot?.ovozServer));
  const nutqMumkin = uzbekOvozBor || Boolean(malumot?.ovozChiqish);
  const holatMatni =
    nutqYuklanmoqda ? 'Овоз тайёрланяпти…' : holat === 'eshitmoqda'
      ? 'Эшитяпман…'
      : holat === 'oylamoqda'
        ? ishlov
          ? 'Матнга айлантиряпман…'
          : 'Ўйлаяпман…'
        : holat === 'gapirmoqda'
          ? 'Гапиряпман…'
          : '';
  const korinadiganlar = xabarlar.filter((x) => (x.kanal ?? 'koala') === suhbatTuri);
  const takliflar = suhbatTuri === 'jarvis' ? ['Сунъий интеллект нима?', 'Ўзбек тилида суҳбатлашайлик', 'Инглиз тилини ўрганиш режасини туз'] : TAKLIFLAR[rol] ?? [];

  return (
    <section
      role="dialog"
      aria-label={t('Ҳамроҳ — овозли ёрдамчи')}
      className="karta fixed inset-x-2 bottom-2 z-50 flex h-[min(36rem,calc(100dvh-1rem))] flex-col overflow-hidden p-0 shadow-xl sm:inset-x-auto sm:bottom-4 sm:right-4 sm:w-[26rem]"
    >
      <header className="flex items-center gap-2 border-b border-line bg-elev px-3 py-2">
        <Maskot holat={holat} kayfiyat={kayfiyat} daraja={ogizDarajasi} olcham={80} sarlavha={t(holatMatni || 'Ёрдамчи робот')} />
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-bold text-ink">{t('Ҳамроҳ')}</h2>
          <p className="truncate text-[11px] text-ink-faint">
            {malumot
              ? malumot.ai
                ? t(`Сунъий интеллект · ${malumot.qolgan} та қолди`)
                : t('Оддий режим')
              : t('Овозли ёрдамчи')}
          </p>
        </div>
        <button
          type="button"
          disabled={!mikrofonMumkin || !malumotTayyor || !nutqMumkin || band}
          onClick={() => {
            if (suhbatRef.current) { toxtat(); return; }
            suhbatRef.current = true;
            setSuhbatRejimi(true);
            setOvozliJavob(true);
            mikrofon();
          }}
          title={t('Кетма-кет овозли суҳбат')}
          aria-label={t('Кетма-кет овозли суҳбат')}
          aria-pressed={suhbatRejimi}
          className={`flex h-9 w-9 items-center justify-center rounded-md disabled:opacity-40 ${suhbatRejimi ? 'bg-accent text-accent-contrast' : 'text-ink-muted hover:bg-surface-muted'}`}
        >
          <Headphones className="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={ovozTugmasi}
          disabled={!nutqMumkin}
          title={nutqMumkin ? t('Жавобни овозда ўқиш') : t('Ўзбекча овоз йўқ — жавоб ёзма')}
          aria-label={t('Жавобни овозда ўқиш')}
          aria-pressed={ovozliJavob && nutqMumkin}
          className="flex h-9 w-9 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink disabled:opacity-40"
        >
          {ovozliJavob && nutqMumkin ? <Volume2 className="h-4 w-4" aria-hidden="true" /> : <VolumeX className="h-4 w-4" aria-hidden="true" />}
        </button>
        <button
          type="button"
          onClick={tozala}
          aria-label={t('Суҳбатни тозалаш')}
          title={t('Суҳбатни тозалаш')}
          className="flex h-9 w-9 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={yopish}
          aria-label={t('Ёпиш')}
          className="flex h-9 w-9 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </header>
      <div className="border-b border-line bg-surface-muted px-4 py-2 text-xs text-ink-muted" role="status" aria-live="polite">
        {t(muvaffaqiyat ? 'Аъло, амал бажарилди!' : malumot?.vazifa?.kechikkan ? `Муддати ўтган вазифалар: ${malumot.vazifa.kechikkan}. Келинг, уларни ҳал қиламиз.` : kayfiyat === 'xavotir' ? 'Эътибор талаб қиладиган ҳолат бор. Бирга текширамиз.' : 'Сизни тинглашга ва ёрдам беришга тайёрман.')}
      </div>

      <div className="flex gap-2 border-b border-line px-3 py-2" role="group" aria-label={t('Ёрдамчи режими')}>
        {(['koala', 'jarvis'] as const).map((tur) => (
          <button key={tur} type="button" aria-pressed={suhbatTuri === tur}
            disabled={band || ishlov || holat === 'eshitmoqda' || (tur === 'jarvis' && !malumot?.jarvis)}
            title={tur === 'jarvis' && !malumot?.jarvis ? t('JARVIS сервери ҳали уланмаган') : undefined}
            className={`rounded-full border px-3 py-1 text-xs disabled:opacity-40 ${suhbatTuri === tur ? 'border-accent text-accent' : 'border-line text-ink-muted'}`}
            onClick={() => { toxtat(); setBildirish(''); setMatn(''); setSuhbatTuri(tur); }}>
            {tur === 'koala' ? t('Ҳамроҳ · платформа ва суҳбат') : malumotTayyor && !malumot?.jarvis ? t('JARVIS · уланмаган') : 'JARVIS'}
          </button>
        ))}
      </div>
      {korish && <p className="px-3 py-2 text-xs text-warn" data-korish-eslatma="ha">{t('Кўриш режими: Ҳамроҳ фақат ўқийди ва ёзиш амалларини таклиф қилмайди. Ўзгартириш учун ўз ҳисобингизга қайтинг.')}</p>}
      {suhbatTuri === 'jarvis' && <p className="px-3 py-2 text-xs text-warn">{t('Бу суҳбат JARVIS серверига юборилади. Фуқароларнинг шахсий маълумотларини киритманг. Платформа амаллари учун Ҳамроҳни танланг.')}</p>}
      <p className="px-3 py-1 text-[11px] text-ink-faint">{t('Ҳамроҳ — сунъий интеллект. Овозли жавоб ташқи хизматда тайёрланиши мумкин.')}</p>
      <div ref={royxat} className="flex-1 space-y-3 overflow-y-auto px-3 py-3" aria-live="polite" aria-relevant="additions">
        {korinadiganlar.map((x) => (
          <div key={x.id} className={x.r === 'f' ? 'flex justify-end' : 'flex justify-start'}>
            <div
              className={`max-w-[88%] rounded-lg px-3 py-2 text-sm leading-relaxed ${
                x.r === 'f' ? 'bg-accent text-accent-contrast' : x.xato ? 'quti-ogoh' : 'bg-surface-muted text-ink'
              }`}
            >
              <p className="whitespace-pre-wrap">{x.r === 'f' ? x.matn : t(x.matn)}</p>
              {x.r === 'a' && !x.xato && nutqMumkin && (
                <button type="button" disabled={band || holat === 'eshitmoqda'}
                  onClick={() => { nutqniTayyorla(); setBildirish(''); gapirish(x.matn); }}
                  aria-label={t('Жавобни қайта эшитиш')}
                  className="mt-1 inline-flex items-center gap-1 text-[11px] text-ink-faint hover:text-accent disabled:opacity-40">
                  <Volume2 className="h-3 w-3" aria-hidden="true" />{t('Тинглаш')}
                </button>
              )}

              {x.izoh && <p className="mt-1.5 text-[11px] text-warn">{t(x.izoh)}</p>}

              {x.manbalar && x.manbalar.length > 0 && (
                <p className="mt-1.5 text-[11px] text-ink-faint">
                  {t('Манба')}: {x.manbalar.map((m) => `${t(m.nom)} · ${new Date(m.vaqt).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}`).join('; ')}
                </p>
              )}

              {x.rejim === 'ai' && x.manbalar && x.manbalar.length > 0 && (
                <p className="mt-0.5 text-[11px] text-ink-faint">{t('Ҳамроҳ хулосаси — тасдиқланган далил эмас.')}</p>
              )}

              {x.amallar?.map((a) =>
                a.tur === 'hisobot' ? (
                  <button
                    key={`${a.format}${a.url}`}
                    type="button"
                    onClick={() => void hisobotniBoshla(a)}
                    className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-line bg-surface px-2.5 py-1.5 text-xs font-semibold text-accent hover:border-accent"
                  >
                    <FileDown className="h-3.5 w-3.5" aria-hidden="true" />
                    {a.format === 'pdf' ? 'PDF' : 'Excel'} {t('ҳисобот')}: {t('қайта юклаш')}
                  </button>
                ) : a.tur === 'ochish' ? (
                  <button
                    key={a.url}
                    type="button"
                    onClick={() => router.push(a.url)}
                    className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-line bg-surface px-2.5 py-1.5 text-xs font-semibold text-accent hover:border-accent"
                  >
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                    {t('Очилди')}: {t(a.nomi)}
                  </button>
                ) : (
                  <div key={a.id} className="mt-2 rounded-md border border-line bg-surface p-2.5 text-xs">
                    <p className="font-semibold text-ink">{t('Тасдиқлаш керак')}</p>
                    <p className="mt-1 text-ink-muted">{t(a.sarlavha)}</p>
                    {(() => {
                      const h = tasdiq[a.id];
                      if (h?.holat === 'bajarildi') return <p className="mt-2 flex items-center gap-1 font-semibold text-ok"><Check className="h-3.5 w-3.5" aria-hidden="true" />{t('Бажарилди')}: {t(h.matn ?? '')}</p>;
                      if (h?.holat === 'rad') return <p className="mt-2 text-ink-faint">{t('Бекор қилинди')}</p>;
                      if (h?.holat === 'xato') return <p className="mt-2 text-warn">{t(h.matn ?? 'Бажариб бўлмади')}</p>;
                      return (
                        <div className="mt-2 flex gap-2">
                          <button
                            type="button"
                            disabled={h?.holat === 'band'}
                            onClick={() => tasdiqla(a.id, 'ha')}
                            className="rounded-md bg-accent px-3 py-1.5 font-semibold text-accent-contrast disabled:opacity-50"
                          >
                            {t('Тасдиқлайман')}
                          </button>
                          <button
                            type="button"
                            disabled={h?.holat === 'band'}
                            onClick={() => tasdiqla(a.id, 'yoq')}
                            className="rounded-md border border-line px-3 py-1.5 text-ink-muted hover:text-ink disabled:opacity-50"
                          >
                            {t('Бекор қилиш')}
                          </button>
                        </div>
                      );
                    })()}
                  </div>
                )
              )}
            </div>
          </div>
        ))}

        {korinadiganlar.length <= 1 && takliflar.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {takliflar.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => void yubor(t(s))}
                className="rounded-full border border-line bg-surface px-3 py-1.5 text-xs text-ink-muted hover:border-accent hover:text-accent"
              >
                {t(s)}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-line bg-elev px-3 py-2">
        {(holatMatni || bildirish || oraliq) && (
          <p className={`mb-1.5 text-xs ${bildirish ? 'text-warn' : 'text-ink-faint'}`} role="status">
            {bildirish || (oraliq ? `«${oraliq}»` : t(holatMatni))}
          </p>
        )}
        <form
          className="flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void yubor(matn);
          }}
        >
          <button
            ref={mikRef}
            type="button"
            onClick={mikrofon}
            disabled={!mikrofonMumkin || !malumotTayyor || holat === 'oylamoqda'}
            aria-pressed={holat === 'eshitmoqda'}
            aria-label={holat === 'eshitmoqda' ? t('Тўхтатиш') : t('Овоз билан айтиш')}
            title={mikrofonMumkin ? (holat === 'eshitmoqda' ? t('Тўхтатиш') : t('Овоз билан айтиш')) : t('Бу қурилмада овоз ишламайди')}
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border transition-colors disabled:opacity-40 ${
              holat === 'eshitmoqda'
                ? 'mikrofon-faol border-accent bg-accent text-accent-contrast'
                : 'border-line bg-surface text-ink-muted hover:border-accent hover:text-accent'
            }`}
          >
            {holat === 'eshitmoqda' ? <Square className="h-4 w-4" aria-hidden="true" /> : <Mic className="h-5 w-5" aria-hidden="true" />}
          </button>
          <textarea
            ref={kiritish}
            value={matn}
            onChange={(e) => setMatn(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void yubor(matn);
              }
            }}
            rows={1}
            maxLength={ENG_UZUN_XABAR}
            placeholder={t('Ёзинг ёки микрофонни босинг')}
            aria-label={t('Ҳамроҳга савол ёки буйруқ')}
            className="max-h-24 min-h-[2.75rem] flex-1 resize-none rounded-md border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-accent"
          />
          <button
            type={band || holat === 'gapirmoqda' ? 'button' : 'submit'}
            onClick={band || holat === 'gapirmoqda' ? toxtat : undefined}
            disabled={!band && holat !== 'gapirmoqda' && matn.trim().length === 0}
            aria-label={band || holat === 'gapirmoqda' ? t('Жавобни тўхтатиш') : t('Юбориш')}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent text-accent-contrast transition-opacity disabled:opacity-40"
          >
            {band || holat === 'gapirmoqda' ? <Square className="h-4 w-4" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}
          </button>
        </form>
        {suhbatRejimi && <p className="mt-1 text-[11px] text-accent" role="status">{t('Овозли суҳбат ёқилган. Жавобдан сўнг яна эшитаман.')}</p>}
        <p className="mt-1.5 text-[10px] leading-snug text-ink-faint">
          {t('Овоз ташқи хизматда матнга айланади. Фуқаро исми ва телефонини айтманг.')}
        </p>
      </div>
    </section>
  );
}
