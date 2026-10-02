/**
 * ============================================================
 *  TELEGRAM WEBHOOK — HAQIQIY XULQ-ATVOR SINOVI
 *
 *  Ishga tushirish:  npx tsx scripts/webhook-sinov.ts
 *
 *  Yo'lning O'ZI (`POST`) chaqiriladi, bazadagi haqiqiy yozuvlar bilan;
 *  Telegram'ga chiqish (`fetch`) sinov ichida ushlanadi: HECH QANDAY tashqi
 *  xabar yuborilmaydi.
 *
 *  Bu yerda xato nimaga olib keladi:
 *   1. SIRSIZ / NOTO'G'RI SIRLI SO'ROV BIZNES AMAL BAJARSA - har kim sohta
 *      so'rov yuborib o'z chat ID sini xodim hisobiga ulab oladi.
 *   2. TAKROR KELGAN YANGILANISH QAYTA BAJARILSA - Telegram javob ololmasa
 *      shu update'ni qayta yuboradi (oddiy hol): bir tugma ikki marta ishlaydi.
 *   3. IKKI NUSXA BIR VAQTDA ISHLASA - "avval so'rash" usuli ikkalasiga ham
 *      "yo'q" deydi; faqat yozishdagi yagonalik chegarasi to'g'ri ishlaydi.
 * ============================================================
 */
import { envYukla } from './env-yukla';
envYukla();

import { execFileSync } from 'node:child_process';
import { readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { PrismaClient } from '@prisma/client';

const BOT_TOKENI = '123456789:AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw1';
const SIR = 'sinov-webhook-siri-0123456789abcdef';

type Sinov = { nomi: string; tekshir: () => Promise<boolean> };

const prisma = new PrismaClient();
const yuborilgan: { url: string; tana: string }[] = [];
const xodimlar: string[] = [];
const yangilanishlar: bigint[] = [];

let POST: (r: Request) => Promise<Response>;
let ulanishKodi: (userId: string) => Promise<string>;
let kodUrinishiniSana: (chatId: string, hozir?: Date) => Promise<{ ruxsat: boolean; kutishDaqiqa: number }>;
let KOD_URINISH_LIMITI = 0;
let kalitXeshi: (kalit: string) => string;
/** Kod urinishlari chegarasi uchun ishlatilgan chatlar - oxirida tozalanadi */
const kodChatlari: string[] = [];
const kodUrinishlari = (chat: number | string) =>
  prisma.kirishUrinishi.count({ where: { kalit: kalitXeshi(`telegram-kod:${chat}`) } });
const XATO_KOD = 'ABCDEF';

let hisob = 0;
const yangiId = () => {
  hisob++;
  /* Haqiqiy update_id lar bilan to'qnashmasin */
  const id = 900_000_000 + Math.floor(Math.random() * 90_000_000) + hisob;
  yangilanishlar.push(BigInt(id));
  return id;
};
const yangiChat = () => 700_000_000 + Math.floor(Math.random() * 90_000_000) + ++hisob;

async function xodimYarat(nom: string) {
  const x = await prisma.user.create({
    data: { username: `wh_${Date.now()}_${Math.floor(Math.random() * 1e6)}`, fullName: nom, passwordHash: 'x', rol: 'BANDLIK' },
    select: { id: true },
  });
  xodimlar.push(x.id);
  return x.id;
}

function sorov(tana: unknown, sir?: string) {
  return new Request('http://sinov.local/api/telegram/webhook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(sir !== undefined ? { 'x-telegram-bot-api-secret-token': sir } : {}) },
    body: typeof tana === 'string' ? tana : JSON.stringify(tana),
  });
}
const xabarTanasi = (updateId: number, chatId: number, matn: string) => ({
  update_id: updateId,
  message: { text: matn, chat: { id: chatId, type: 'private' }, from: { id: chatId } },
});
const satrSoni = (ids: bigint[]) => prisma.telegramYangilanish.count({ where: { updateId: { in: ids } } });

const SINOVLAR: Sinov[] = [
  {
    nomi: 'SIR YO\'Q: yo\'l 503 beradi, hech narsa yozmaydi va Telegram\'ga hech narsa yubormaydi (himoyasiz biznes amal yo\'q)',
    tekshir: async () => {
      const u = await xodimYarat('Sinov sirsiz');
      const kod = await ulanishKodi(u);
      const chat = yangiChat();
      const id = yangiId();
      const eski = process.env.TELEGRAM_WEBHOOK_SIRI;
      delete process.env.TELEGRAM_WEBHOOK_SIRI;
      yuborilgan.length = 0;
      const xom = console.error;
      console.error = () => {};
      let r;
      try {
        r = await POST(sorov(xabarTanasi(id, chat, kod), SIR));
      } finally {
        console.error = xom;
        process.env.TELEGRAM_WEBHOOK_SIRI = eski;
      }
      const x = await prisma.user.findUniqueOrThrow({ where: { id: u }, select: { telegramChatId: true, telegramKodi: true } });
      /* Qisqa sir (16 belgidan kam) ham sir emas */
      process.env.TELEGRAM_WEBHOOK_SIRI = 'qisqa';
      console.error = () => {};
      let r2;
      try {
        r2 = await POST(sorov(xabarTanasi(yangiId(), chat, kod), 'qisqa'));
      } finally {
        console.error = xom;
        process.env.TELEGRAM_WEBHOOK_SIRI = eski;
      }
      return (
        r.status === 503 && r2.status === 503 && yuborilgan.length === 0 && x.telegramChatId === null && x.telegramKodi === kod &&
        (await satrSoni([BigInt(id)])) === 0
      );
    },
  },
  {
    nomi: 'SIR NOTO\'G\'RI yoki YO\'Q (sarlavhasiz, boshqa uzunlik, bir belgi farqli): 200 "ok" (Telegram webhookni o\'chirmasin), lekin kod ulanmaydi, update yozilmaydi, xabar ketmaydi',
    tekshir: async () => {
      const u = await xodimYarat('Sinov notogri sir');
      const kod = await ulanishKodi(u);
      const chat = yangiChat();
      const id = yangiId();
      yuborilgan.length = 0;
      const variantlar: (string | undefined)[] = [undefined, '', 'boshqa', SIR.slice(0, -1), `${SIR}x`, `${SIR.slice(0, -1)}0`.replace(/.$/, SIR.endsWith('f') ? 'e' : 'f')];
      const holatlar: number[] = [];
      for (const v of variantlar) {
        const r = await POST(sorov(xabarTanasi(id, chat, kod), v));
        holatlar.push(r.status);
      }
      const x = await prisma.user.findUniqueOrThrow({ where: { id: u }, select: { telegramChatId: true, telegramKodi: true } });
      return holatlar.every((h) => h === 200) && yuborilgan.length === 0 && x.telegramChatId === null && x.telegramKodi === kod && (await satrSoni([BigInt(id)])) === 0;
    },
  },
  {
    nomi: 'SIR TO\'G\'RI: kod ulanadi (biznes amal), update yoziladi, ulanganlik haqida xabar ketadi',
    tekshir: async () => {
      const u = await xodimYarat('Sinov togri sir');
      const kod = await ulanishKodi(u);
      const chat = yangiChat();
      const id = yangiId();
      yuborilgan.length = 0;
      const r = await POST(sorov(xabarTanasi(id, chat, kod), SIR));
      const x = await prisma.user.findUniqueOrThrow({ where: { id: u }, select: { telegramChatId: true, telegramKodi: true } });
      return r.status === 200 && x.telegramChatId === String(chat) && x.telegramKodi === null && yuborilgan.length >= 1 && (await satrSoni([BigInt(id)])) === 1;
    },
  },
  {
    nomi: 'Buzuq tana (sir to\'g\'ri): 200, hech narsa yozilmaydi va yuborilmaydi',
    tekshir: async () => {
      yuborilgan.length = 0;
      const a = await POST(sorov('{buzuq json', SIR));
      const b = await POST(sorov({ update_id: 'matn' }, SIR));
      const c = await POST(sorov(null, SIR));
      return a.status === 200 && b.status === 200 && c.status === 200 && yuborilgan.length === 0;
    },
  },
  {
    nomi: 'TAKROR YANGILANISH: Telegram bir xil update_id ni qayta yuborsa - ikkinchi marta HECH NARSA bajarilmaydi (xabar ketmaydi, holat o\'zgarmaydi, qator bitta)',
    tekshir: async () => {
      const u = await xodimYarat('Sinov takror');
      const kod = await ulanishKodi(u);
      const chat = yangiChat();
      const id = yangiId();
      yuborilgan.length = 0;
      await POST(sorov(xabarTanasi(id, chat, kod), SIR));
      const birinchi = yuborilgan.length;
      /* Ulanish bekor qilinsa ham (xodim uzdi) - qayta yuborilgan eski update uni TIKLAMAYDI */
      await prisma.user.update({ where: { id: u }, data: { telegramChatId: null, telegramSana: null } });
      for (let i = 0; i < 3; i++) await POST(sorov(xabarTanasi(id, chat, kod), SIR));
      const x = await prisma.user.findUniqueOrThrow({ where: { id: u }, select: { telegramChatId: true } });
      return birinchi >= 1 && yuborilgan.length === birinchi && x.telegramChatId === null && (await satrSoni([BigInt(id)])) === 1;
    },
  },
  {
    nomi: 'TAKROR "BOSHQA" update_id bilan - alohida update sifatida ishlanadi (dedupe faqat BIR XIL update_id uchun)',
    tekshir: async () => {
      const chat = yangiChat();
      yuborilgan.length = 0;
      await POST(sorov(xabarTanasi(yangiId(), chat, '/start'), SIR));
      const n1 = yuborilgan.length;
      await POST(sorov(xabarTanasi(yangiId(), chat, '/start'), SIR));
      return n1 >= 1 && yuborilgan.length === n1 * 2;
    },
  },
  {
    nomi: 'BIR VAQTDA 8 TA bir xil update (ikki serverless nusxa): aynan BITTASI ishlanadi - bitta qator, bitta ulanish, xabar soni bitta ishlov bilan teng',
    tekshir: async () => {
      /* Nazorat: bitta ishlov necha xabar beradi */
      const nazoratXodim = await xodimYarat('Sinov nazorat');
      const nazoratKod = await ulanishKodi(nazoratXodim);
      yuborilgan.length = 0;
      await POST(sorov(xabarTanasi(yangiId(), yangiChat(), nazoratKod), SIR));
      const birIshlov = yuborilgan.length;

      const u = await xodimYarat('Sinov parallel');
      const kod = await ulanishKodi(u);
      const chat = yangiChat();
      const id = yangiId();
      yuborilgan.length = 0;
      await Promise.all(Array.from({ length: 8 }, () => POST(sorov(xabarTanasi(id, chat, kod), SIR))));
      const x = await prisma.user.findUniqueOrThrow({ where: { id: u }, select: { telegramChatId: true } });
      const qator = await satrSoni([BigInt(id)]);
      if (qator !== 1 || yuborilgan.length !== birIshlov) console.log('     qator:', qator, 'xabar:', yuborilgan.length, 'kutilgan:', birIshlov);
      return birIshlov >= 1 && qator === 1 && yuborilgan.length === birIshlov && x.telegramChatId === String(chat);
    },
  },
  {
    nomi: 'TELEGRAM_BOT_TOKEN yo\'q: yo\'l 503 beradi, hech narsa yozmaydi (token modul yuklanganda o\'qiladi - shuning uchun alohida jarayonda, tokensiz muhit bilan)',
    tekshir: async () => {
      const id = yangiId();
      const fayl = 'scripts/_vaqtincha-tokensiz.ts';
      writeFileSync(
        fayl,
        `import { POST } from '../src/app/api/telegram/webhook/route';
(async () => {
  const r = await POST(new Request('http://sinov.local/x', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-telegram-bot-api-secret-token': '${SIR}' }, body: JSON.stringify({ update_id: ${id}, message: { text: '/start', chat: { id: 1, type: 'private' } } }) }));
  console.log('HOLAT=' + r.status);
  process.exit(0);
})();
`
      );
      const env: Record<string, string | undefined> = { ...process.env, TELEGRAM_WEBHOOK_SIRI: SIR };
      delete env.TELEGRAM_BOT_TOKEN;
      let chiqish = '';
      try {
        chiqish = execFileSync('npx', ['tsx', fayl], { env: env as NodeJS.ProcessEnv, cwd: process.cwd(), encoding: 'utf8', timeout: 60_000 });
      } finally {
        unlinkSync(fayl);
      }
      return /HOLAT=503/.test(chiqish) && (await satrSoni([BigInt(id)])) === 0;
    },
  },
  {
    nomi: 'KOD TERISH CHEGARASI: sakkiz noto\'g\'ri urinishdan keyin TO\'G\'RI kod ham ulamaydi (kod tekshirilmaydi), "juda ko\'p urinish" deyiladi',
    tekshir: async () => {
      const u = await xodimYarat('Sinov kod chegarasi');
      const kod = await ulanishKodi(u);
      if (kod === XATO_KOD) return false;
      const chat = yangiChat();
      kodChatlari.push(String(chat));
      yuborilgan.length = 0;
      for (let i = 0; i < KOD_URINISH_LIMITI; i++) {
        await POST(sorov(xabarTanasi(yangiId(), chat, XATO_KOD), SIR));
      }
      const oldin = yuborilgan.length;
      const r = await POST(sorov(xabarTanasi(yangiId(), chat, kod), SIR));
      const x = await prisma.user.findUniqueOrThrow({ where: { id: u }, select: { telegramChatId: true, telegramKodi: true } });
      const oxirgi = yuborilgan[yuborilgan.length - 1]?.tana ?? '';
      return (
        r.status === 200 &&
        x.telegramChatId === null &&
        x.telegramKodi === kod &&
        yuborilgan.length === oldin + 1 &&
        oxirgi.includes('Жуда кўп уриниш')
      );
    },
  },
  {
    nomi: 'KOD TERISH CHEGARASI faqat O\'SHA chatga tegadi: bloklangan chatdan keyin boshqa chat o\'z kodi bilan ulanadi',
    tekshir: async () => {
      const bloklangan = yangiChat();
      kodChatlari.push(String(bloklangan));
      for (let i = 0; i < KOD_URINISH_LIMITI + 1; i++) {
        await POST(sorov(xabarTanasi(yangiId(), bloklangan, XATO_KOD), SIR));
      }
      const u = await xodimYarat('Sinov boshqa chat');
      const kod = await ulanishKodi(u);
      const chat = yangiChat();
      kodChatlari.push(String(chat));
      await POST(sorov(xabarTanasi(yangiId(), chat, kod), SIR));
      const x = await prisma.user.findUniqueOrThrow({ where: { id: u }, select: { telegramChatId: true } });
      return x.telegramChatId === String(chat);
    },
  },
  {
    nomi: 'Muvaffaqiyatli ulanishdan keyin FAQAT shu chatning urinishlari tozalanadi (boshqa chatniki saqlanadi)',
    tekshir: async () => {
      const u = await xodimYarat('Sinov tozalash');
      const kod = await ulanishKodi(u);
      const chat = yangiChat();
      const boshqa = yangiChat();
      kodChatlari.push(String(chat), String(boshqa));
      for (let i = 0; i < 3; i++) await POST(sorov(xabarTanasi(yangiId(), chat, XATO_KOD), SIR));
      for (let i = 0; i < 2; i++) await POST(sorov(xabarTanasi(yangiId(), boshqa, XATO_KOD), SIR));
      const oldin = await kodUrinishlari(chat);
      await POST(sorov(xabarTanasi(yangiId(), chat, kod), SIR));
      const x = await prisma.user.findUniqueOrThrow({ where: { id: u }, select: { telegramChatId: true } });
      return oldin === 3 && x.telegramChatId === String(chat) && (await kodUrinishlari(chat)) === 0 && (await kodUrinishlari(boshqa)) === 2;
    },
  },
  {
    nomi: 'Allaqachon ulangan xodim chegaradan keyin ham SAVOL bera oladi (olti harfli so\'z "juda ko\'p urinish"ga tushmaydi)',
    tekshir: async () => {
      const u = await xodimYarat('Sinov ulangan savol');
      const kod = await ulanishKodi(u);
      const chat = yangiChat();
      kodChatlari.push(String(chat));
      await POST(sorov(xabarTanasi(yangiId(), chat, kod), SIR));
      for (let i = 0; i < KOD_URINISH_LIMITI; i++) {
        await POST(sorov(xabarTanasi(yangiId(), chat, 'QAMRVZ'), SIR));
      }
      yuborilgan.length = 0;
      const r = await POST(sorov(xabarTanasi(yangiId(), chat, 'QAMRVZ'), SIR));
      return r.status === 200 && yuborilgan.length >= 1 && !yuborilgan.some((y) => y.tana.includes('Жуда кўп уриниш'));
    },
  },
  {
    nomi: 'Urinishlar oynasi o\'tgach (15 daqiqa) chegara ochiladi; baza xatosida RAD etiladi (fail-closed), o\'tkazib yuborilmaydi',
    tekshir: async () => {
      const chat = String(yangiChat());
      kodChatlari.push(chat);
      for (let i = 0; i < KOD_URINISH_LIMITI; i++) {
        const r = await kodUrinishiniSana(chat);
        if (!r.ruxsat) return false;
      }
      const tosildi = await kodUrinishiniSana(chat);
      const keyin = await kodUrinishiniSana(chat, new Date(Date.now() + 16 * 60_000));
      const kod = readFileSync('src/lib/xabarnoma.ts', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
      return (
        /* chegara qiymatining O'ZI (sinov mutatsiyalangan konstantaga tayanib qolmasin): kod 15 daqiqa, 8 urinish */
        KOD_URINISH_LIMITI === 8 &&
        !tosildi.ruxsat &&
        tosildi.kutishDaqiqa >= 1 &&
        keyin.ruxsat &&
        /catch \(e\) \{[^}]*ruxsat: false/.test(kod)
      );
    },
  },
  {
    nomi: 'GURUH suhbati: to\'g\'ri kod yozilsa ham ULANMAYDI (group, supergroup, turi kelmagan manfiy id) - kod saqlanadi, "shaxsiy suhbatda ishlaydi" deb tushuntiriladi',
    tekshir: async () => {
      const u = await xodimYarat('Sinov guruh');
      const kod = await ulanishKodi(u);
      const natijalar: boolean[] = [];
      for (const chat of [
        { id: -100_000_000 - Math.floor(Math.random() * 1e6), type: 'group' },
        { id: -100_000_000 - Math.floor(Math.random() * 1e6), type: 'supergroup' },
        { id: -100_000_000 - Math.floor(Math.random() * 1e6) },
      ]) {
        yuborilgan.length = 0;
        const r = await POST(sorov({ update_id: yangiId(), message: { text: kod, chat, from: { id: 1 } } }, SIR));
        natijalar.push(r.status === 200 && yuborilgan.length === 1 && yuborilgan[0].tana.includes('ШАХСИЙ'));
      }
      const x = await prisma.user.findUniqueOrThrow({ where: { id: u }, select: { telegramChatId: true, telegramKodi: true } });
      return natijalar.every(Boolean) && x.telegramChatId === null && x.telegramKodi === kod;
    },
  },
  {
    nomi: 'GURUHDAGI TUGMA jim qoldiriladi: guruh chatidan kelgan callback hech qanday amal bajarmaydi va hech narsa yubormaydi',
    tekshir: async () => {
      yuborilgan.length = 0;
      const guruh = -200_000_000 - Math.floor(Math.random() * 1e6);
      const r = await POST(
        sorov(
          {
            update_id: yangiId(),
            callback_query: { id: 'g1', data: 'm.menyu', from: { id: 5 }, message: { message_id: 1, chat: { id: guruh, type: 'supergroup' } } },
          },
          SIR
        )
      );
      return r.status === 200 && yuborilgan.length === 0;
    },
  },
  {
    nomi: 'KOD MUDDATI: 15 daqiqadan eski kod ulamaydi ("eskirgan"), kod yangilanmaydi/tozalanmaydi; 14 daqiqalik kod ulanadi',
    tekshir: async () => {
      const u = await xodimYarat('Sinov muddat');
      const kod = await ulanishKodi(u);
      const eski = new Date(Date.now() - 16 * 60_000);
      await prisma.user.update({ where: { id: u }, data: { telegramKodiVaqti: eski } });
      const chat = yangiChat();
      kodChatlari.push(String(chat));
      yuborilgan.length = 0;
      await POST(sorov(xabarTanasi(yangiId(), chat, kod), SIR));
      const eskirdi = await prisma.user.findUniqueOrThrow({ where: { id: u }, select: { telegramChatId: true, telegramKodi: true } });
      const xabar = yuborilgan[yuborilgan.length - 1]?.tana ?? '';

      await prisma.user.update({ where: { id: u }, data: { telegramKodiVaqti: new Date(Date.now() - 14 * 60_000) } });
      await POST(sorov(xabarTanasi(yangiId(), chat, kod), SIR));
      const ulandi = await prisma.user.findUniqueOrThrow({ where: { id: u }, select: { telegramChatId: true } });
      return eskirdi.telegramChatId === null && eskirdi.telegramKodi === kod && xabar.includes('эскирган') && ulandi.telegramChatId === String(chat);
    },
  },
  {
    nomi: 'KOD BIR MARTALIK: ulangandan keyin kod tozalanadi - ikkinchi chatdan o\'sha kod ulamaydi, birinchi ulanish buzilmaydi; nofaol hisobga ulanmaydi',
    tekshir: async () => {
      const u = await xodimYarat('Sinov bir martalik');
      const kod = await ulanishKodi(u);
      const birinchi = yangiChat();
      const ikkinchi = yangiChat();
      kodChatlari.push(String(birinchi), String(ikkinchi));
      await POST(sorov(xabarTanasi(yangiId(), birinchi, kod), SIR));
      yuborilgan.length = 0;
      await POST(sorov(xabarTanasi(yangiId(), ikkinchi, kod), SIR));
      const x = await prisma.user.findUniqueOrThrow({ where: { id: u }, select: { telegramChatId: true, telegramKodi: true } });
      const javob = yuborilgan[yuborilgan.length - 1]?.tana ?? '';

      const n = await xodimYarat('Sinov nofaol');
      const nk = await ulanishKodi(n);
      await prisma.user.update({ where: { id: n }, data: { faol: false } });
      const uchinchi = yangiChat();
      kodChatlari.push(String(uchinchi));
      await POST(sorov(xabarTanasi(yangiId(), uchinchi, nk), SIR));
      const y = await prisma.user.findUniqueOrThrow({ where: { id: n }, select: { telegramChatId: true } });
      return x.telegramChatId === String(birinchi) && x.telegramKodi === null && javob.includes('Код топилмади') && y.telegramChatId === null;
    },
  },
];

async function main() {
  const url = process.env.DATABASE_URL ?? '';
  if (!/@(localhost|127\.0\.0\.1)[:/]/.test(url)) {
    console.error('Bu sinov FAQAT mahalliy bazada ishlaydi.');
    process.exit(2);
  }

  /* Tashqi dunyo: sinov ichidan Telegram'ga HECH NIMA chiqmaydi */
  process.env.TELEGRAM_BOT_TOKEN = BOT_TOKENI;
  process.env.TELEGRAM_WEBHOOK_SIRI = SIR;
  const asl = globalThis.fetch;
  globalThis.fetch = (async (u: unknown, init?: { body?: unknown }) => {
    yuborilgan.push({ url: String(u), tana: String(init?.body ?? '') });
    return new Response(JSON.stringify({ ok: true, result: {} }), { status: 200 });
  }) as typeof fetch;

  ({ POST } = await import('../src/app/api/telegram/webhook/route'));
  ({ ulanishKodi, kodUrinishiniSana, KOD_URINISH_LIMITI } = await import('../src/lib/xabarnoma'));
  ({ kalitXeshi } = await import('../src/lib/maxfiy'));

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

  globalThis.fetch = asl;
  await prisma.telegramYangilanish.deleteMany({ where: { updateId: { in: yangilanishlar } } });
  await prisma.kirishUrinishi.deleteMany({ where: { kalit: { in: kodChatlari.map((c) => kalitXeshi(`telegram-kod:${c}`)) } } });
  await prisma.xabarnoma.deleteMany({ where: { userId: { in: xodimlar } } });
  await prisma.botSuhbati.deleteMany({ where: { userId: { in: xodimlar } } });
  await prisma.user.deleteMany({ where: { id: { in: xodimlar } } });
  console.log(`\n${SINOVLAR.length - xato}/${SINOVLAR.length} o'tdi`);
  await prisma.$disconnect();
  process.exit(xato ? 1 : 0);
}

main();
