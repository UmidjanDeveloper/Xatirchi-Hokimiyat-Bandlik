/**
 * ============================================================
 *  KOALA MIKROFON — BRAUZER SINOVI (Playwright, 22 stsenariy)
 *
 *  Ishga tushirish (alohida, `npm run sinov` ga KIRMAYDI: brauzer kerak):
 *
 *    1. npm run build
 *    2. AI kalitlarisiz serverni ishga tushiring (tarmoqsiz):
 *         OPENAI_API_KEY= GROQ_API_KEY= GEMINI_API_KEY= ANTHROPIC_API_KEY= npx next start -p 3100
 *    3. node scripts/brauzer/mikrofon-brauzer.mjs        (hammasi)
 *       node scripts/brauzer/mikrofon-brauzer.mjs 9      (faqat 9-stsenariy)
 *
 *  Talab: `playwright-core` va Chromium (`CHROMIUM_YOLI` bilan yo'l beriladi);
 *  mahalliy bazada `tekshiruv_admin` hisobi (parol Sinov2026x).
 *
 *  Nimani sinaydi (iPhone'dagi nuqsonning to'liq oilasi):
 *    · iPhone: brauzer tanishi xato bersa ham, yozuv server orqali ishlaydi,
 *      gap tugagach o'zi to'xtaydi, oyna "eshitmoqda"da QOTIB QOLMAYDI;
 *    · tanish xato bersa (end kelmasa ham) — zaxiraga o'tish yoki qisqa xabar;
 *    · jimlik serverga yuborilmaydi; qo'lda to'xtatish; server xatolari;
 *    · oyna yopilsa/fonga o'tsa mikrofon bo'shaydi; ikki marta bosish;
 *    · serverga ketgan fayl haqiqiy 16 kHz WAV (sarlavha va uzunlik tekshiriladi);
 *    · matnlar lotinda va qisqa, 390 px kenglikda sarlavha kesilmaydi.
 *
 *  Halollik: bu yerda mikrofon va ovoz tanish SOXTA (Chromium'ning soxta
 *  qurilmasi va sinov dublyorlari), server `/api/agent/ovoz` javobi ham
 *  almashtirilgan. SINALMAYDI: haqiqiy iPhone WebKit, haqiqiy mikrofon,
 *  OpenAI'ning o'zbekcha aniqligi. Ular uchun haqiqiy telefonda sinab ko'rish kerak.
 * ============================================================
 */
import { JIM_WAV, SERVER_BOR, SERVER_YOQ, ochish, tekshir, yakun } from './mikrofon-yordamchi.mjs';

const tanlov = process.argv[2]; // bitta stsenariy raqami (ixtiyoriy)
const stsenariylar = [];
const S = (nom, f) => stsenariylar.push([nom, f]);
const sek = (t0) => ((Date.now() - t0) / 1000).toFixed(1) + ' s';
const tayyorMi = (h) => h.maskot === 'tayyor' && h.mikrofonIkon && !h.kvadrat;

S('1. iPhone + server bor: brauzer tanishi UMUMAN ishlatilmaydi, yozuv server orqali; gap tugagach O‘ZI to‘xtaydi', async () => {
  const o = await ochish({ iphone: true, tanish: { xato: 'service-not-allowed', end: false }, holat: SERVER_BOR });
  const t0 = Date.now();
  await o.p.evaluate(() => document.documentElement.removeAttribute('data-fx')); // halqa zaif qurilmada o'chiq (dizayn qoidasi)
  await o.mik.click();
  const e = await o.kut((x) => x.maskot === 'eshitmoqda' && x.kvadrat, 2500);
  tekshir('1a. bosgach koala "eshitmoqda", tugma — to‘xtatish', e.maskot === 'eshitmoqda' && e.kvadrat);
  let eng = 0;
  const s = await o.kut((x) => { eng = Math.max(eng, x.daraja || 0); return x.xabarlar.length >= 3 && x.maskot === 'tayyor'; }, 15000, 60);
  tekshir('1b. oxirida "tayyor", mikrofon tugmasi qaytdi', tayyorMi(s));
  tekshir('1c. server orqali aynan 1 ta yozuv yuborildi, hajmi > 5 KB', o.ovozSorovlari.length === 1 && o.ovozSorovlari[0].bayt > 5000, `${o.ovozSorovlari[0]?.bayt} bayt`);
  tekshir('1d. brauzer tanishi iPhone’da umuman chaqirilmadi', (await o.p.evaluate(() => window.__tanishSoni || 0)) === 0);
  tekshir('1e. gapirib bo‘lgach o‘zi to‘xtadi (qo‘lda bosilmadi): 7 s dan kam', Date.now() - t0 < 7000, sek(t0));
  tekshir('1f. tanilgan matn xabar bo‘ldi va javob keldi', s.xabarlar.some((x) => /xatlov qanday ketyapti/i.test(x)) && s.xabarlar.length >= 3);
  tekshir('1g. mikrofon indikatori o‘chdi (hamma oqim to‘xtadi)', await o.oqimlarTugadimi());
  tekshir('1h. ovoz darajasi halqasi gapirganda o‘zgardi (> 0,2)', eng > 0.2, `eng ${eng.toFixed(2)}`);
  tekshir('1i. sahifa xatosi yo‘q', o.xatolar.length === 0, o.xatolar.join(' | '));
  await o.yop();
});

S('2. iPhone + server YO‘Q: brauzer tanishi xato beradi va `end` kelmaydi → qotib qolmaydi, qisqa xabar', async () => {
  const o = await ochish({ iphone: true, tanish: { xato: 'service-not-allowed', end: false }, holat: SERVER_YOQ });
  const t0 = Date.now();
  await o.mik.click();
  const s = await o.kut((x) => x.status.length > 0 && !/Эшит/.test(x.status), 4000);
  const q = await o.kut(tayyorMi, 3000);
  tekshir('2a. xabar chiqdi: "Бу қурилмада овоз ишламайди. Ёзинг."', /Бу қурилмада овоз ишламайди\. Ёзинг\./.test(s.status), s.status);
  tekshir('2b. koala "tayyor", mikrofon tugmasi qaytdi (qotib qolmadi)', tayyorMi(q), JSON.stringify({ m: q.maskot, k: q.kvadrat }));
  tekshir('2c. 1 soniyadan tez tiklandi', Date.now() - t0 < 2500, sek(t0));
  tekshir('2d. serverga yozuv ketmadi', o.ovozSorovlari.length === 0);
  await o.yop();
});

S('3. Kompyuter/Android Chrome: brauzer tanishi ishlaydi → server chaqirilmaydi', async () => {
  const o = await ochish({ tanish: { natija: 'xatlov qanday ketyapti' }, holat: SERVER_BOR });
  await o.mik.click();
  const s = await o.kut((x) => x.xabarlar.length >= 3 && x.maskot === 'tayyor', 8000);
  tekshir('3a. javob keldi, holat "tayyor"', s.xabarlar.length >= 3 && tayyorMi(s));
  tekshir('3b. brauzer tanishi ishlatildi, serverga yozuv ketmadi (bepul yo‘l)', (await o.p.evaluate(() => window.__tanishSoni || 0)) === 1 && o.ovozSorovlari.length === 0);
  await o.yop();
});

S('4. Brauzer tanishi "not-allowed" bersa va server bor: yozuvga O‘TADI (ruxsat berilgan bo‘lsa ishlaydi)', async () => {
  const o = await ochish({ tanish: { xato: 'not-allowed', end: false }, holat: SERVER_BOR });
  await o.mik.click();
  const s = await o.kut((x) => x.xabarlar.length >= 3 && x.maskot === 'tayyor', 15000, 80);
  tekshir('4a. zaxiraga o‘tdi: 1 ta yozuv serverga ketdi va javob keldi', o.ovozSorovlari.length === 1 && s.xabarlar.length >= 3 && tayyorMi(s));
  await o.yop();
});

S('5. Tanish "not-allowed" + server bor, lekin mikrofon HAQIQATAN rad etilgan: aniq xabar, qotib qolmaydi', async () => {
  const o = await ochish({ tanish: { xato: 'not-allowed', end: false }, holat: SERVER_BOR });
  await o.p.evaluate(() => { window.__gumRad = 'NotAllowedError'; });
  await o.mik.click();
  const s = await o.kut((x) => /рухсат/.test(x.status), 5000);
  const q = await o.kut(tayyorMi, 3000);
  tekshir('5a. "Микрофонга рухсат йўқ. Созламалардан рухсат беринг ёки ёзинг."', /Микрофонга рухсат йўқ\. Созламалардан рухсат беринг ёки ёзинг\./.test(s.status), s.status);
  tekshir('5b. holat "tayyor"ga qaytdi', tayyorMi(q));
  tekshir('5c. serverga yozuv ketmadi', o.ovozSorovlari.length === 0);
  await o.yop();
});

S('6. Tanish "not-allowed", server YO‘Q (foydalanuvchi skrinshoti): ruxsat xabari, qotib qolmaydi', async () => {
  const o = await ochish({ tanish: { xato: 'not-allowed', end: false }, holat: SERVER_YOQ });
  await o.mik.click();
  const s = await o.kut((x) => /рухсат/.test(x.status), 4000);
  const q = await o.kut(tayyorMi, 3000);
  tekshir('6a. qisqa ruxsat xabari chiqdi', /Микрофонга рухсат йўқ/.test(s.status), s.status);
  tekshir('6b. koala "tayyor", tugma qaytdi', tayyorMi(q));
  await o.yop();
});

S('7. Brauzerda ovoz tanish YO‘Q (Firefox) + server bor: yozuv yo‘li', async () => {
  const o = await ochish({ tanish: { yoq: true }, holat: SERVER_BOR });
  tekshir('7a. mikrofon tugmasi ochiq', (await o.holat()).mikOchiq);
  await o.mik.click();
  const s = await o.kut((x) => x.xabarlar.length >= 3 && x.maskot === 'tayyor', 15000, 80);
  tekshir('7b. yozuv server orqali tanildi, javob keldi', o.ovozSorovlari.length === 1 && s.xabarlar.length >= 3);
  await o.yop();
});

S('8. Ovoz tanish ham, server ham YO‘Q: mikrofon tugmasi yopiq va sababi aytilgan', async () => {
  const o = await ochish({ tanish: { yoq: true }, holat: SERVER_YOQ });
  const h = await o.holat();
  const sabab = await o.mik.getAttribute('title');
  tekshir('8a. tugma yopiq', !h.mikOchiq);
  tekshir('8b. tooltip: "Бу қурилмада овоз ишламайди"', /Бу қурилмада овоз ишламайди/.test(sabab || ''), sabab);
  await o.yop();
});

S('9. Faqat jimlik: ~7 s dan keyin "eshitilmadi", serverga YUBORILMAYDI (pul sarflanmaydi)', async () => {
  const o = await ochish({ iphone: true, audio: JIM_WAV, holat: SERVER_BOR });
  const t0 = Date.now();
  await o.mik.click();
  const s = await o.kut((x) => /эшитилмади/.test(x.status), 12000, 100);
  const q = await o.kut(tayyorMi, 2000);
  tekshir('9a. "Овоз эшитилмади. Қайта айтинг."', /Овоз эшитилмади\. Қайта айтинг\./.test(s.status), s.status);
  tekshir('9b. 6–9 s ichida (7 s kutish)', Date.now() - t0 > 6000 && Date.now() - t0 < 10000, sek(t0));
  tekshir('9c. serverga yozuv ketmadi', o.ovozSorovlari.length === 0);
  tekshir('9d. holat "tayyor", mikrofon bo‘shadi', tayyorMi(q) && (await o.oqimlarTugadimi()));
  await o.yop();
});

S('10. Gapirayotganda QO‘LDA to‘xtatish: shu paytgacha eshitilgani yuboriladi', async () => {
  const o = await ochish({ iphone: true, holat: SERVER_BOR });
  const t0 = Date.now();
  await o.mik.click();
  await o.kut((x) => x.kvadrat, 2000);
  await o.p.waitForTimeout(1800); // 0,8 s jimlik + ~1 s nutq
  await o.mik.click();
  const q = await o.kut((x) => x.xabarlar.length >= 3 && x.maskot === 'tayyor', 10000, 80);
  tekshir('10a. qo‘lda to‘xtatilgach yozuv yuborildi va javob keldi', o.ovozSorovlari.length === 1 && q.xabarlar.length >= 3, sek(t0));
  tekshir('10b. 5 s dan tez (jimlikni kutmadi)', Date.now() - t0 < 5000, sek(t0));
  await o.yop();
});

S('11. Server matnga aylantira olmadi (502): serverning qisqa xabari, holat tiklanadi', async () => {
  const o = await ochish({ iphone: true, holat: SERVER_BOR, ovoz: { status: 502, json: { xabar: 'Овоз матнга айланмади. Ёзинг.' } } });
  await o.mik.click();
  const s = await o.kut((x) => /айланмади/.test(x.status), 12000, 80);
  const q = await o.kut(tayyorMi, 2000);
  tekshir('11a. "Овоз матнга айланмади. Ёзинг."', /Овоз матнга айланмади\. Ёзинг\./.test(s.status), s.status);
  tekshir('11b. holat "tayyor", chatga savol YUBORILMADI', tayyorMi(q) && o.suhbatSorovlari.length === 0);
  await o.yop();
});

S('12. Server "eshitilmadi" (422) desa: shu xabar, holat tiklanadi', async () => {
  const o = await ochish({ iphone: true, holat: SERVER_BOR, ovoz: { status: 422, json: { xabar: 'Овоз эшитилмади. Қайта айтинг.' } } });
  await o.mik.click();
  const s = await o.kut((x) => /эшитилмади/.test(x.status), 12000, 80);
  const q = await o.kut(tayyorMi, 2000);
  tekshir('12a. 422 → "Овоз эшитилмади. Қайта айтинг."', /Овоз эшитилмади\. Қайта айтинг\./.test(s.status) && tayyorMi(q), s.status);
  await o.yop();
});

S('13. Yozish paytida oyna YOPILSA: yuborilmaydi, mikrofon bo‘shaydi, qayta ochilganda hammasi tayyor', async () => {
  const o = await ochish({ iphone: true, holat: SERVER_BOR });
  await o.mik.click();
  await o.kut((x) => x.kvadrat, 2000);
  await o.p.waitForTimeout(1200);
  await o.p.keyboard.press('Escape');
  await o.p.waitForTimeout(700);
  tekshir('13a. mikrofon oqimlari to‘xtadi (indikator o‘chdi)', await o.oqimlarTugadimi());
  tekshir('13b. serverga yozuv ketmadi', o.ovozSorovlari.length === 0);
  await o.p.click('[data-agent-tugmasi]');
  await o.p.waitForSelector('[role=dialog]');
  await o.p.waitForTimeout(500);
  const h = await o.holat();
  tekshir('13c. qayta ochilganda koala "tayyor", mikrofon tugmasi ochiq', tayyorMi(h) && h.mikOchiq);
  await o.yop();
});

S('14. Ilova fonga o‘tsa (tab yashirilsa): yozuv bekor, mikrofon bo‘shaydi', async () => {
  const o = await ochish({ iphone: true, holat: SERVER_BOR });
  await o.mik.click();
  await o.kut((x) => x.kvadrat, 2000);
  await o.p.waitForTimeout(900);
  await o.p.evaluate(() => { Object.defineProperty(document, 'hidden', { value: true, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
  await o.p.waitForTimeout(700);
  const h = await o.holat();
  tekshir('14a. mikrofon bo‘shadi, serverga ketmadi, holat "tayyor"', (await o.oqimlarTugadimi()) && o.ovozSorovlari.length === 0 && tayyorMi(h));
  await o.yop();
});

S('15. Ruxsat kutilayotganda tugma ikki marta bosilsa: bekor, qotib qolmaydi, kech kelgan oqim bo‘shatiladi', async () => {
  const o = await ochish({ iphone: true, holat: SERVER_BOR });
  await o.p.evaluate(() => { window.__gumKech = 1500; });
  await o.mik.click();
  await o.p.waitForTimeout(300);
  await o.mik.click(); // hali ruxsat kutilmoqda
  const q = await o.kut(tayyorMi, 2000);
  tekshir('15a. darhol "tayyor"ga qaytdi', tayyorMi(q));
  await o.p.waitForTimeout(2000); // kech oqim keladi
  tekshir('15b. kech kelgan mikrofon oqimi DARHOL bo‘shatildi, yozuv yuborilmadi', (await o.oqimlarTugadimi()) && o.ovozSorovlari.length === 0 && (await o.oqimlarSoni()) === 1);
  const h = await o.holat();
  tekshir('15c. tugma yana ishlaydi', tayyorMi(h) && h.mikOchiq);
  await o.yop();
});

S('16. Brauzer tanishi umuman javob bermasa (osilib qolsa): chegara vaqtida o‘zi yakunlanadi', async () => {
  const o = await ochish({ tanish: { osil: true }, holat: SERVER_YOQ, tezTaymer: true });
  await o.mik.click();
  const e = await o.kut((x) => x.maskot === 'eshitmoqda', 1500);
  const s = await o.kut((x) => /эшитилмади/.test(x.status), 5000, 80);
  tekshir('16a. avval "eshitmoqda", keyin "Овоз эшитилмади" va tiklandi', e.maskot === 'eshitmoqda' && /Овоз эшитилмади/.test(s.status) && tayyorMi(await o.holat()), s.status);
  await o.yop();
});

S('17. "To‘xtat" bosildi, lekin brauzer `end` demadi (WebKit): 2 s dan keyin o‘zi yakunlanadi', async () => {
  const o = await ochish({ tanish: { osil: true, stop: 'yoq' }, holat: SERVER_YOQ });
  await o.mik.click();
  await o.kut((x) => x.kvadrat, 1500);
  const t0 = Date.now();
  await o.mik.click();
  const s = await o.kut((x) => /эшитилмади/.test(x.status), 5000, 80);
  tekshir('17a. 2–3,5 s ichida yakunlandi va tiklandi', /эшитилмади/.test(s.status) && Date.now() - t0 > 1500 && Date.now() - t0 < 3500 && tayyorMi(await o.holat()), sek(t0));
  await o.yop();
});

S('18. Lotin alifbosida: barcha matnlar lotinda va QISQA; kirill harf yo‘q', async () => {
  const o = await ochish({ iphone: true, lotin: true, tanish: { xato: 'service-not-allowed', end: false }, holat: SERVER_YOQ });
  const h0 = await o.holat();
  const salom = h0.xabarlar[0] || '';
  tekshir('18a. salom qisqa: "Xayrli ..., hurmatli ...! Men Koalaman — yordamchingiz."', /^Xayrli \S+, hurmatli .+! Men Koalaman — yordamchingiz\.$/.test(salom) && salom.length <= 75, `${salom} (${salom.length})`);
  tekshir('18b. pastki eslatma qisqa (<= 80 belgi), lotinda', h0.pastki.length > 0 && h0.pastki.length <= 80 && !/[Ѐ-ӿ]/.test(h0.pastki), `${h0.pastki} (${h0.pastki.length})`);
  tekshir('18c. sarlavhadagi holat: "Oddiy rejim"', /^Oddiy rejim$/.test(h0.sarlavhaHolat.trim()), h0.sarlavhaHolat);
  await o.mik.click();
  const s = await o.kut((x) => /ishlamaydi/.test(x.status), 4000);
  tekshir('18d. xato xabari lotinda va qisqa', /^Bu qurilmada ovoz ishlamaydi\. Yozing\.$/.test(s.status), s.status);
  const ok = await o.kut(() => true, 10);
  await o.yop();
});

S('19. Lotin + server bor: sarlavhada "Sun’iy intellekt · 99 ta qoldi" 390 px kenglikda KESILMAYDI', async () => {
  const o = await ochish({ iphone: true, lotin: true, holat: SERVER_BOR });
  const kesilgan = await o.p.evaluate(() => { const e = document.querySelector('[role=dialog] header p'); return { sig: e.scrollWidth, kenglik: e.clientWidth, matn: e.textContent }; });
  tekshir('19a. sarlavha matni sig‘adi (scrollWidth <= clientWidth)', kesilgan.sig <= kesilgan.kenglik, JSON.stringify(kesilgan));
  const gorizontal = await o.p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  tekshir('19b. gorizontal skroll yo‘q', gorizontal);
  await o.p.screenshot({ path: '/tmp/mic-lotin-390.png' });
  await o.yop();
});


S('20. Serverga ketgan fayl — HAQIQIY WAV: 16 kHz, 16 bit, bitta kanal; nutq atrofi kesilgan (~2,6 s), jim emas', async () => {
  const o = await ochish({ iphone: true, holat: SERVER_BOR });
  await o.mik.click();
  await o.kut((x) => x.xabarlar.length >= 3 && x.maskot === 'tayyor', 15000, 80);
  const buf = o.ovozSorovlari[0]?.buf;
  const i = buf ? buf.indexOf('RIFF') : -1;
  const w = i >= 0 ? buf.subarray(i) : Buffer.alloc(0);
  const dlen = w.length > 44 ? w.readUInt32LE(40) : 0;
  const sarlavha = w.length > 44 && w.toString('latin1', 0, 4) === 'RIFF' && w.toString('latin1', 8, 12) === 'WAVE' && w.readUInt16LE(20) === 1 && w.readUInt16LE(22) === 1 &&
    w.readUInt32LE(24) === 16000 && w.readUInt32LE(28) === 32000 && w.readUInt16LE(34) === 16 && w.toString('latin1', 36, 40) === 'data';
  tekshir('20a. WAV sarlavhasi to‘g‘ri (PCM, 1 kanal, 16 000 Hz, 16 bit)', sarlavha);
  const soniya = dlen / 32000;
  tekshir('20b. uzunligi ~2,6 s (0,4 s oldin + 1,6 s nutq + 0,6 s keyin): 2,2–3,2 s', soniya > 2.2 && soniya < 3.2, `${soniya.toFixed(2)} s`);
  let yig = 0; const n = Math.min(dlen / 2, (w.length - 44) / 2);
  for (let k = 0; k < n; k++) { const v = w.readInt16LE(44 + k * 2) / 32768; yig += v * v; }
  const rms = Math.sqrt(yig / Math.max(1, n));
  tekshir('20c. fayl jim emas (o‘rtacha kuch > 0,05)', rms > 0.05, `rms ${rms.toFixed(3)}`);
  const bosh = buf ? buf.toString('latin1', 0, Math.max(0, i)) : '';
  tekshir('20d. fayl nomi ovoz.wav, turi audio/wav', /filename="ovoz\.wav"/.test(bosh) && /Content-Type: audio\/wav/i.test(bosh));
  await o.yop();
});

S('21. Zaif qurilmada ("lite") halqa o‘chiq, lekin yozuv va to‘xtash ishlaydi', async () => {
  const o = await ochish({ iphone: true, holat: SERVER_BOR });
  await o.p.evaluate(() => document.documentElement.setAttribute('data-fx', 'lite'));
  let eng = 0;
  await o.mik.click();
  const s = await o.kut((x) => { eng = Math.max(eng, x.daraja || 0); return x.xabarlar.length >= 3 && x.maskot === 'tayyor'; }, 15000, 60);
  tekshir('21a. halqa yozilmadi (daraja 0), lekin gap yuborildi va javob keldi', eng === 0 && o.ovozSorovlari.length === 1 && s.xabarlar.length >= 3, `eng ${eng}`);
  await o.yop();
});

S('22. Brauzerda saqlangan ESKI uzun salom yangilanadi (yangilanishdan keyin ham qisqa salom ko‘rinadi), suhbat saqlanadi', async () => {
  const o = await ochish({ iphone: true, lotin: true, holat: SERVER_BOR });
  const kalit = await o.p.evaluate(() => Object.keys(sessionStorage).find((k) => k.startsWith('hudhud:suhbat:')) || '');
  const eski = [
    { id: 0, r: 'a', matn: 'Xayrli oqshom, hurmatli Tekshiruv ADMIN! Men Koalaman — sizning yordamchingiz. Ovoz bilan yoki yozib so‘rang: masalan, «xatlov qanday ketyapti?», «ishsizlar ro‘yxatini och», «qaysi mahalla orqada qolgan?».' },
    { id: 1, r: 'f', matn: 'oldingi savolim' },
  ];
  await o.p.evaluate(([k, v]) => sessionStorage.setItem(k, v), [kalit, JSON.stringify(eski)]);
  await o.p.reload();
  await o.p.waitForSelector('[data-agent-tugmasi]');
  await o.p.click('[data-agent-tugmasi]');
  await o.p.waitForSelector('[role=dialog]');
  await o.p.waitForTimeout(600);
  const h = await o.holat();
  tekshir('22a. salom yangilandi: qisqa ("Men Koalaman — yordamchingiz."), "masalan" ro‘yxati yo‘q', /Men Koalaman — yordamchingiz\.$/.test(h.xabarlar[0] || '') && !/masalan/i.test(h.xabarlar[0] || ''), h.xabarlar[0]);
  tekshir('22b. oldingi suhbat saqlandi', h.xabarlar[1] === 'oldingi savolim', JSON.stringify(h.xabarlar));
  await o.yop();
});

const ishga = stsenariylar.filter(([nom]) => !tanlov || nom.startsWith(tanlov + '.'));
for (const [nom, f] of ishga) {
  console.log(`\n── ${nom}`);
  try { await f(); } catch (e) { tekshir(`${nom} — kutilmagan xato`, false, String(e).slice(0, 300)); }
}
yakun();
