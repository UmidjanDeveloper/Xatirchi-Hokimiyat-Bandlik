/**
 * ============================================================
 *  GPT PROMPTINING 21 BO'LIMI — DALILGA ASOSLANGAN AUDIT (MASHINA TEKSHIRADI)
 *
 *  Ishga tushirish:  npx tsx scripts/gpt-talablari-sinov.ts
 *  Hujjat uchun jadval:  npx tsx scripts/gpt-talablari-sinov.ts --md
 *
 *  Prompt har bandni "tasdiqlandi / qisman / to'liq / qo'shimcha tekshiruv"
 *  deb belgilashni va "faqat kodda kerakli so'z borligini tekshiradigan
 *  testlar bilan cheklanmaslikni" talab qiladi. Bu fayl:
 *
 *   1. har bir BAND uchun holatni yozadi: TOLIQ / QISMAN / HUJJAT
 *      (HUJJAT - talab hujjat yoki baholash ekanini bildiradi);
 *   2. har bir holatga DALIL ulaydi: sinov nomi (fayl + nomning bir qismi)
 *      yoki hujjat/kodning aniq iborasi;
 *   3. yiqiladi, agar:
 *      - dalil ko'rsatilgan sinov o'sha faylda YO'Q (o'chirilgan yoki nomi o'zgargan);
 *      - sinov fayli `npm run sinov` zanjirida (yoki `sinov:http` da) YO'Q -
 *        ya'ni dalil hech qachon ishga tushmaydi;
 *      - TOLIQ band uchun kamida bitta HAQIQIY xulq-atvor sinovi yo'q
 *        (faqat hujjat/kod iborasi yetarli emas);
 *      - QISMAN band uchun cheklov (nima qilinmagani) yozilmagan;
 *      - 21 bo'limning birortasi yo'q yoki bo'sh.
 *
 *  Bu fayl sinovlarning O'ZI o'tganini tekshirmaydi: ularni `npm run sinov` va
 *  `npm run sinov:http` bajaradi. Bu yerda faqat "talab -> dalil" xaritasi
 *  va uning butunligi tekshiriladi. Bajarilmagan sinov "o'tdi" deb yozilmaydi.
 * ============================================================
 */
import { existsSync, readFileSync } from 'node:fs';
import { BOLIMLAR, type Band, type Bolim } from './gpt-talablari-xaritasi';

const AUDIT_HUJJATI = 'hujjatlar/GPT-TALABLARI-AUDITI.md';
const matn = (yol: string) => readFileSync(yol, 'utf8');

/**
 * Sinov nomlari manba faylda `\'` bilan yozilgan bo'lishi mumkin ('to\'g\'ri').
 * Solishtirish uchun ikkala tomondan teskari chiziq olib tashlanadi.
 */
const tekis = (m: string) => m.replace(/\\(['"`])/g, '$1');

/** `npm run sinov` va `npm run sinov:http` zanjiridagi fayllar */
function zanjirdagilar(): Set<string> {
  const p = JSON.parse(matn('package.json')) as { scripts: Record<string, string> };
  const hammasi = `${p.scripts.sinov} && ${p.scripts['sinov:http']}`;
  const topilgan = new Set<string>();
  for (const m of hammasi.matchAll(/scripts\/[\w.-]+\.ts/g)) topilgan.add(m[0]);
  return topilgan;
}

interface Xato {
  band: string;
  sabab: string;
}

function tekshir(bolimlar: Bolim[]): { xatolar: Xato[]; hisob: Record<string, number> } {
  const xatolar: Xato[] = [];
  const zanjir = zanjirdagilar();
  const hisob: Record<string, number> = { TOLIQ: 0, QISMAN: 0, HUJJAT: 0, dalil: 0 };

  /* 1. 21 bo'lim bor va bo'sh emas */
  for (let n = 1; n <= 21; n++) {
    const b = bolimlar.find((x) => x.raqam === n);
    if (!b) xatolar.push({ band: `§${n}`, sabab: 'bo‘lim xaritada YO‘Q' });
    else if (b.bandlar.length === 0) xatolar.push({ band: `§${n}`, sabab: 'bo‘lim bo‘sh' });
  }

  const raqamlar = new Set<string>();
  for (const bolim of bolimlar) {
    for (const band of bolim.bandlar) {
      if (raqamlar.has(band.raqam)) xatolar.push({ band: band.raqam, sabab: 'band raqami takrorlangan' });
      raqamlar.add(band.raqam);
      if (!band.raqam.startsWith(`${bolim.raqam}.`)) {
        xatolar.push({ band: band.raqam, sabab: `band §${bolim.raqam} ichida turibdi, raqami mos emas` });
      }
      hisob[band.holat] += 1;

      if (band.dalil.length === 0) xatolar.push({ band: band.raqam, sabab: 'dalil ko‘rsatilmagan' });
      if (band.holat === 'QISMAN' && !(band.cheklov && band.cheklov.trim().length >= 30)) {
        xatolar.push({ band: band.raqam, sabab: 'QISMAN band uchun cheklov (nima qilinmagani) yozilmagan' });
      }
      if (band.holat !== 'QISMAN' && band.cheklov) {
        xatolar.push({ band: band.raqam, sabab: 'cheklov faqat QISMAN bandda bo‘ladi' });
      }

      let xulqSinovi = false;
      for (const d of band.dalil) {
        hisob.dalil += 1;
        if (!existsSync(d.fayl)) {
          xatolar.push({ band: band.raqam, sabab: `fayl yo‘q: ${d.fayl}` });
          continue;
        }
        const m = tekis(matn(d.fayl));
        if (d.nomi !== undefined) {
          /* Nom `nomi:` qatorida bo'lishi shart: izohdagi iborani "sinov" deb sanamaslik uchun */
          const qidirilgan = tekis(d.nomi);
          const sinovNomidami = m.split('\n').some((q) => /\bnomi\s*:/.test(q) && q.includes(qidirilgan));
          if (!sinovNomidami) xatolar.push({ band: band.raqam, sabab: `sinov nomi topilmadi (nomi: qatorida): ${d.fayl} -> "${d.nomi}"` });
          if (d.fayl.startsWith('scripts/') && d.fayl.endsWith('.ts') && !zanjir.has(d.fayl)) {
            xatolar.push({ band: band.raqam, sabab: `${d.fayl} npm run sinov / sinov:http zanjirida YO‘Q (dalil hech qachon ishlamaydi)` });
          }
          if (sinovNomidami) xulqSinovi = true;
        }
        if (d.kod !== undefined && !m.includes(tekis(d.kod))) {
          xatolar.push({ band: band.raqam, sabab: `ibora topilmadi: ${d.fayl} -> "${d.kod}"` });
        }
        if (d.nomi === undefined && d.kod === undefined) {
          xatolar.push({ band: band.raqam, sabab: `${d.fayl}: na nomi, na kodi ko‘rsatilgan` });
        }
      }
      if (band.holat === 'TOLIQ' && !xulqSinovi) {
        xatolar.push({ band: band.raqam, sabab: 'TOLIQ band uchun haqiqiy xulq-atvor sinovi (nomi bilan) yo‘q' });
      }
    }
  }
  return { xatolar, hisob };
}

const HOLAT_NOMI = { TOLIQ: 'To‘liq', QISMAN: 'Qisman', HUJJAT: 'Hujjat/baholash' } as const;

function markdown(bolimlar: Bolim[]): string {
  const q: string[] = [];
  for (const b of bolimlar) {
    q.push(`### §${b.raqam}. ${b.sarlavha}`, '', '| Band | Talab | Holat | Dalil |', '|---|---|---|---|');
    for (const band of b.bandlar) {
      const dalil = band.dalil
        .map((d) => {
          const nom = d.nomi !== undefined ? `sinov: «${d.nomi}»` : `ibora: «${d.kod}»`;
          return `\`${d.fayl}\` — ${nom}`;
        })
        .join('<br>');
      const holat = HOLAT_NOMI[band.holat] + (band.cheklov ? `<br><sub>Cheklov: ${band.cheklov}</sub>` : '');
      q.push(`| ${band.raqam} | ${band.matn} | ${holat} | ${dalil} |`);
    }
    q.push('');
  }
  return q.join('\n');
}

function main() {
  if (process.argv.includes('--md')) {
    console.log(markdown(BOLIMLAR));
    return;
  }

  const { xatolar, hisob } = tekshir(BOLIMLAR);
  const jami = hisob.TOLIQ + hisob.QISMAN + hisob.HUJJAT;

  const aniq = (nomi: string, ok: boolean) => console.log(`${ok ? 'OK  ' : 'XATO'} ${nomi}`);
  aniq('21 bo‘limning hammasi xaritada bor va bo‘sh emas', !xatolar.some((x) => /^§\d+$/.test(x.band)));
  aniq('Har bir dalil ko‘rsatilgan faylda mavjud (sinov nomi yoki ibora)', !xatolar.some((x) => /topilmadi|fayl yo‘q|ko‘rsatilmagan/.test(x.sabab)));
  aniq('Dalil bo‘lgan har bir sinov fayli npm run sinov / sinov:http zanjirida', !xatolar.some((x) => /zanjirida/.test(x.sabab)));
  aniq('Har bir TO‘LIQ bandda haqiqiy xulq-atvor sinovi bor (faqat kod/hujjat iborasi emas)', !xatolar.some((x) => /TOLIQ band/.test(x.sabab)));
  aniq('Har bir QISMAN bandda cheklov yozilgan (nima qilinmagani)', !xatolar.some((x) => /cheklov/.test(x.sabab)));
  aniq('Band raqamlari noyob va o‘z bo‘limiga mos', !xatolar.some((x) => /takrorlangan|mos emas/.test(x.sabab)));

  /* Hujjat xaritadan chiqarilgan jadvalni o'z ichiga olishi shart (eskirib qolmasin) */
  if (existsSync(AUDIT_HUJJATI)) {
    const h = matn(AUDIT_HUJJATI);
    const yoq = BOLIMLAR.flatMap((b) => b.bandlar).filter((band) => !h.includes(`| ${band.raqam} |`));
    aniq('Audit hujjati xaritaning HAR BIR bandini o‘z ichiga oladi (`--md` dan chiqarilgan jadval yangi)', yoq.length === 0);
    for (const band of yoq) console.log(`     ${band.raqam}: hujjatda jadval qatori yo‘q — \`npx tsx scripts/gpt-talablari-sinov.ts --md\` bilan yangilang`);
    if (yoq.length > 0) process.exitCode = 1;
  }

  for (const x of xatolar) console.log(`     ${x.band}: ${x.sabab}`);
  console.log(
    `\n${jami} band: ${hisob.TOLIQ} to'liq, ${hisob.QISMAN} qisman, ${hisob.HUJJAT} hujjat/baholash; ${hisob.dalil} dalil`
  );
  console.log(xatolar.length === 0 ? "o'tdi" : `${xatolar.length} nuqson topildi`);
  process.exit(xatolar.length === 0 && !process.exitCode ? 0 : 1);
}

main();
