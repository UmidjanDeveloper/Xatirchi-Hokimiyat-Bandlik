/**
 * ============================================================
 *  PROTOTIP IFLOSLANISHIGA QARSHI QO'RIQCHI — SINOV
 *
 *  Ishga tushirish:  npx tsx scripts/prototip-qoriqchi-sinov.ts
 *  (bazaga ulanmaydi)
 *
 *  Bu yerda xato nimaga olib keladi:
 *   1. Iflos prototip TIKLANMASA - butun server jarayonida har obyekt
 *      "admin" bo'lib qoladi (keyingi so'rovlar ham).
 *   2. Reader XATO tashlab, oldin prototipni buzgan bo'lsa-yu, xato
 *      "buzuq fayl" deb ko'milsa - hujum izi yo'qoladi.
 *   3. Qo'riqchi ODDIY faylni ham rad etsa - reyestr yuklash buziladi
 *      (xatlov paytida eng yomon natija).
 *   4. Reader almashtirilmaydigan bo'lsa, bu qo'riqchi sinovdan o'tmaydi
 *      (shuning uchun reyestrniOqi ga ixtiyoriy reader beriladi).
 * ============================================================
 */
import * as XLSX from 'xlsx';
import { readFileSync } from 'node:fs';
import { prototipQoriqchisi } from '../src/lib/prototip-qoriqchi';
import { reyestrniOqi, type VaraqOqiydigan } from '../src/lib/reyestr-fayl';

type Sinov = { nomi: string; tekshir: () => Promise<boolean> | boolean };
const bosh = (): ArrayBuffer => new ArrayBuffer(8);
const oqi = (y: string) => readFileSync(y, 'utf8');

/** Sinov oxirida iflos qolsa - boshqa sinovlarni ham buzmasin */
const tozalash = () => {
  for (const k of ['polluted', 'admin', 'yangiMetod']) {
    delete (Object.prototype as Record<string, unknown>)[k];
    delete (Array.prototype as unknown as Record<string, unknown>)[k];
  }
};

const oddiyXlsx = (): ArrayBuffer => {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      ['Ташкилот номи', 'Ходимлар сони'],
      ['Тест МЧЖ', 12],
    ]),
    'Варақ1'
  );
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
};

const SINOVLAR: Sinov[] = [
  {
    nomi: 'Oddiy ish: prototip o\'zgarmasa - natija qaytadi, iflos bo\'sh',
    tekshir: () => {
      const q = prototipQoriqchisi(() => 42);
      return q.natija === 42 && q.iflos.length === 0 && !('xato' in q);
    },
  },
  {
    nomi: 'Object.prototype ga YANGI kalit qo\'shilsa: iflos hisobotda, kalit O\'CHIRILGAN (boshqa obyektlar toza)',
    tekshir: () => {
      const q = prototipQoriqchisi(() => {
        (Object.prototype as Record<string, unknown>).polluted = 'ha';
        return 1;
      });
      const toza = ({} as Record<string, unknown>).polluted === undefined && !('polluted' in {});
      tozalash();
      return q.iflos.some((x) => x.startsWith('Object.polluted')) && toza;
    },
  },
  {
    nomi: 'Mavjud metod ALMASHTIRILSA (toString, hasOwnProperty): asl funksiya qaytadi',
    tekshir: () => {
      const asl = Object.prototype.hasOwnProperty;
      const q = prototipQoriqchisi(() => {
        (Object.prototype as unknown as Record<string, unknown>).hasOwnProperty = () => true;
      });
      const qaytdi = Object.prototype.hasOwnProperty === asl;
      Object.defineProperty(Object.prototype, 'hasOwnProperty', { value: asl, writable: true, configurable: true, enumerable: false });
      return qaytdi && q.iflos.some((x) => x.startsWith('Object.hasOwnProperty'));
    },
  },
  {
    nomi: 'Mavjud metod O\'CHIRILSA (delete Array.prototype.map): asl holatga qaytadi',
    tekshir: () => {
      const asl = Array.prototype.map;
      const q = prototipQoriqchisi(() => {
        delete (Array.prototype as unknown as Record<string, unknown>).map;
      });
      const qaytdi = Array.prototype.map === asl && typeof [].map === 'function';
      return qaytdi && q.iflos.some((x) => x.startsWith("Array.map (o'chirildi)"));
    },
  },
  {
    nomi: 'Getter orqali o\'zgartirish ham ushlanadi (accessor tavsifi solishtiriladi)',
    tekshir: () => {
      const q = prototipQoriqchisi(() => {
        Object.defineProperty(Object.prototype, 'admin', { get: () => true, configurable: true, enumerable: false });
      });
      const toza = ({} as Record<string, unknown>).admin === undefined;
      tozalash();
      return toza && q.iflos.some((x) => x.startsWith('Object.admin'));
    },
  },
  {
    nomi: 'Mavjud ACCESSOR (get/set) almashtirilsa - qiymat bir xil bo\'lsa ham ushlanadi va asl getter qaytadi',
    tekshir: () => {
      const g1 = () => 1;
      const g2 = () => 2;
      Object.defineProperty(Map.prototype, 'sinovAccessor', { get: g1, configurable: true, enumerable: false });
      const q = prototipQoriqchisi(() => {
        Object.defineProperty(Map.prototype, 'sinovAccessor', { get: g2, configurable: true, enumerable: false });
      });
      const d = Object.getOwnPropertyDescriptor(Map.prototype, 'sinovAccessor');
      const qaytdi = d?.get === g1;
      delete (Map.prototype as unknown as Record<string, unknown>).sinovAccessor;
      return qaytdi && q.iflos.some((x) => x.startsWith("Map.sinovAccessor (o'zgardi)"));
    },
  },
  {
    nomi: 'Setter qo\'shilsa/almashtirilsa ham ushlanadi (set tavsifi solishtiriladi)',
    tekshir: () => {
      const s1 = (_v: unknown) => {};
      const s2 = (_v: unknown) => {};
      Object.defineProperty(Map.prototype, 'sinovSetter', { get: () => 1, set: s1, configurable: true, enumerable: false });
      const q = prototipQoriqchisi(() => {
        Object.defineProperty(Map.prototype, 'sinovSetter', { get: Object.getOwnPropertyDescriptor(Map.prototype, 'sinovSetter')!.get, set: s2, configurable: true, enumerable: false });
      });
      const qaytdi = Object.getOwnPropertyDescriptor(Map.prototype, 'sinovSetter')?.set === s1;
      delete (Map.prototype as unknown as Record<string, unknown>).sinovSetter;
      return qaytdi && q.iflos.some((x) => x.startsWith("Map.sinovSetter (o'zgardi)"));
    },
  },
  {
    nomi: 'Boshqa prototiplar ham kuzatiladi: Array, String, Function, Map',
    tekshir: () => {
      const q = prototipQoriqchisi(() => {
        (Array.prototype as unknown as Record<string, unknown>).yangiMetod = 1;
        (String.prototype as unknown as Record<string, unknown>).yangiMetod = 1;
        (Function.prototype as unknown as Record<string, unknown>).yangiMetod = 1;
        (Map.prototype as unknown as Record<string, unknown>).yangiMetod = 1;
      });
      const toza = [Array, String, Function, Map].every((P) => !('yangiMetod' in P.prototype));
      for (const P of [Array, String, Function, Map]) delete (P.prototype as unknown as Record<string, unknown>).yangiMetod;
      return toza && ['Array', 'String', 'Function', 'Map'].every((n) => q.iflos.some((x) => x.startsWith(`${n}.yangiMetod`)));
    },
  },
  {
    nomi: 'Ish XATO tashlasa: xato YUTILMAYDI (qaytariladi), prototip baribir tiklanadi va ifloslanish hisobotga KIRADI',
    tekshir: () => {
      const q = prototipQoriqchisi(() => {
        (Object.prototype as Record<string, unknown>).polluted = 1;
        throw new Error('buzuq fayl');
      });
      const toza = ({} as Record<string, unknown>).polluted === undefined;
      tozalash();
      return 'xato' in q && (q.xato as Error).message === 'buzuq fayl' && toza && q.iflos.length === 1;
    },
  },
  {
    nomi: 'Xato tashlasa-yu prototip o\'zgarmasa: iflos bo\'sh (oddiy buzuq fayl "xavfli" deb belgilanmaydi)',
    tekshir: () => {
      const q = prototipQoriqchisi(() => {
        throw new Error('oddiy xato');
      });
      return 'xato' in q && q.iflos.length === 0;
    },
  },
  {
    nomi: 'undefined tashlansa ham "xato bor" deb sanaladi (xato qiymati bo\'sh bo\'lsa-da jim qolmaydi)',
    tekshir: () => {
      const q = prototipQoriqchisi(() => {
        // eslint-disable-next-line no-throw-literal
        throw undefined;
      });
      return 'xato' in q;
    },
  },
  {
    nomi: 'Asinxron ish (Promise qaytarsa) RAD etiladi: sinxron oldin/keyin solishtirish aniq bo\'lishi uchun',
    tekshir: () => {
      const q = prototipQoriqchisi(() => Promise.resolve(1) as unknown);
      return 'xato' in q && /sinxron/.test(String((q.xato as Error).message));
    },
  },
  /* ══ reyestrniOqi bilan birga ══ */
  {
    nomi: 'reyestrniOqi: ODDIY xlsx fayl o\'qiladi (qo\'riqchi yuklashni buzmaydi)',
    tekshir: () => {
      const o = reyestrniOqi(oddiyXlsx());
      return o.ok === true && o.satrlar.length >= 0 && !('xavfli' in o);
    },
  },
  {
    nomi: 'reyestrniOqi: reader prototipni buzsa - fayl RAD, "xavfli" ro\'yxati bor, prototip toza',
    tekshir: () => {
      const buzuvchi: VaraqOqiydigan = () => {
        (Object.prototype as Record<string, unknown>).polluted = 'ha';
        return [['a']];
      };
      const o = reyestrniOqi(bosh(), buzuvchi);
      const toza = ({} as Record<string, unknown>).polluted === undefined;
      tozalash();
      return o.ok === false && Array.isArray(o.xavfli) && o.xavfli.length === 1 && /хавфли/.test(o.sabab) && toza;
    },
  },
  {
    nomi: 'reyestrniOqi: reader prototipni buzib KEYIN xato tashlasa ham - "xavfli" deb ko\'rsatiladi (oddiy "o\'qib bo\'lmadi" emas)',
    tekshir: () => {
      const buzuvchi: VaraqOqiydigan = () => {
        (Object.prototype as Record<string, unknown>).polluted = 'ha';
        throw new Error('portladi');
      };
      const o = reyestrniOqi(bosh(), buzuvchi);
      tozalash();
      return o.ok === false && Array.isArray(o.xavfli) && o.xavfli.length === 1;
    },
  },
  {
    nomi: 'reyestrniOqi: oddiy o\'qish xatosi - "o\'qib bo\'lmadi", xavfli belgisi YO\'Q',
    tekshir: () => {
      const o = reyestrniOqi(bosh(), () => {
        throw new Error('buzuq');
      });
      return o.ok === false && o.xavfli === undefined && /ўқиб бўлмади/.test(o.sabab);
    },
  },
  {
    nomi: 'reyestrniOqi: varaq yo\'q (null) - "варақ йўқ"',
    tekshir: () => {
      const o = reyestrniOqi(bosh(), () => null);
      return o.ok === false && /варақ йўқ/.test(o.sabab) && o.xavfli === undefined;
    },
  },
  {
    nomi: 'Haqiqiy kutubxona: tasodifiy chiqindi baytlar - xatosiz (rad yoki bo\'sh), prototip o\'zgarmaydi',
    tekshir: () => {
      const oldin = Object.getOwnPropertyNames(Object.prototype).sort().join(',');
      let ok = true;
      for (let i = 0; i < 40; i++) {
        const b = new Uint8Array(200 + i * 37).map((_, j) => (j * 31 + i * 17) % 256);
        try {
          reyestrniOqi(b.buffer);
        } catch {
          ok = false;
        }
      }
      const keyin = Object.getOwnPropertyNames(Object.prototype).sort().join(',');
      return ok && oldin === keyin;
    },
  },
  /* ══ kod sinovi ══ */
  {
    nomi: 'Kod: api/reyestr "xavfli" faylni serverXatosi orqali jurnalga yozadi (urinish /tizim da ko\'rinadi)',
    tekshir: () => {
      const k = oqi('src/app/api/reyestr/route.ts');
      return /if \(!oqildi\.ok && oqildi\.xavfli\) \{\s*(\/\*[^\n]*\*\/\s*)?await serverXatosi\('api:reyestr-xavfli-fayl'/.test(k);
    },
  },
  {
    nomi: 'Kod: reyestrniOqi qo\'riqchisiz xlsx\'ni to\'g\'ridan-to\'g\'ri chaqirmaydi (XLSX.read faqat reader ichida)',
    tekshir: () => {
      const k = oqi('src/lib/reyestr-fayl.ts');
      const oqishlar = k.match(/XLSX\.read\(/g) ?? [];
      return oqishlar.length === 1 && /prototipQoriqchisi\(\(\) => oqiydigan\(bayt\)\)/.test(k);
    },
  },
  {
    nomi: 'Tiklab bo\'lmaydigan (non-configurable) qo\'shilgan kalit: jim qolmaydi, "TIKLANMADI" deb hisobotga yoziladi',
    tekshir: () => {
      const q = prototipQoriqchisi(() => {
        Object.defineProperty(Set.prototype, 'qotganKalit', { value: 1, configurable: false, enumerable: false });
      });
      /* o'chirib bo'lmaydi: shuning uchun ENG OXIRGI sinov va zararsiz nom (Set.qotganKalit) */
      return q.iflos.some((x) => x.includes('TIKLANMADI'));
    },
  },
];

async function main() {
  let xato = 0;
  for (const s of SINOVLAR) {
    let ok = false;
    try {
      ok = await s.tekshir();
    } catch (e) {
      console.log(`     xatolik: ${(e as Error).message}`);
    }
    if (!ok) xato++;
    console.log(`${ok ? 'OK  ' : 'XATO'} ${s.nomi}`);
  }
  console.log(`\n${SINOVLAR.length - xato}/${SINOVLAR.length} o'tdi`);
  process.exit(xato ? 1 : 0);
}

main();
