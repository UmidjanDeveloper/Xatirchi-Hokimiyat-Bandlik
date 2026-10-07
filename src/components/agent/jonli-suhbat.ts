'use client';

import type { Amal, Manba } from '@/lib/agent/turlar';
import type { MaskotHolati } from './maskot';
import { jonliRuxsatniYangilabTur } from './jonli-ruxsat';

export interface JonliHodisalar {
  onHolat(h: MaskotHolati): void;
  onDaraja(d: number): void;
  onMatn(id: string, r: 'f' | 'a', matn: string, tamom?: boolean): void;
  onAmallar(amallar: Amal[], manbalar: Manba[], signal: AbortSignal): Promise<Record<string, unknown>>;
  onXato(matn: string): void;
  onTugadi(): void;
  onOvoz?(matn: string, signal: AbortSignal): Promise<void>;
  /**
   * Gemini yo'li ishlamadi (ulanish, javob bermaslik...): OpenAI zaxirasiga o'tish kerak. `qoplash` — ishlamagan
   * urinishning ruxsatnomasi (kunlik hisob ikki marta yemaydi), `mikrofon` — allaqachon ruxsat berilgan oqim.
   * Berilmasa xato ko'rsatiladi va suhbat tugaydi.
   */
  onZaxira?(qoplash: string | undefined, sabab: string, mikrofon: MediaStream | null): void;
  /** Xato emas, ogohlantirish (masalan "ElevenLabs ishlamadi, OpenAI ovozi o'qiyapti") */
  onOgoh?(matn: string): void;
  onQaytaUlanish?(sabab: 'muddat' | 'aloqa' | 'provayder' | 'ovoz', ruxsat: string | undefined, mikrofon: MediaStream | null, qoplash?: string): void;
}

export function jonliMumkinmi(): boolean {
  return typeof window !== 'undefined' && Boolean(window.RTCPeerConnection && navigator.mediaDevices?.getUserMedia);
}

/** Native WebRTC audio, not a text -> TTS loop. The API key never reaches this module. */
export function jonliBoshla(
  cb: JonliHodisalar,
  // `zaxira`: Gemini ishlamadi, OpenAI o'z ovozi bilan davom etadi; `qoplash`: ishlamagan urinishning ruxsatnomasi (kunlik hisob ikki marta yemaydi)
  opt: { mahalliyOvoz?: boolean; zaxira?: boolean; qoplash?: string; davom?: string; mikrofon?: MediaStream | null } = {},
): { bekor(): void; yubor(matn: string): boolean; eslat(matn: string): void } {
  const ctrl = new AbortController();
  let tugadi = false;
  let pc: RTCPeerConnection | null = null;
  let dc: RTCDataChannel | null = null;
  let mikrofon: MediaStream | null = null;
  let audio: HTMLAudioElement | null = null;
  let masofa: MediaStream | null = null;
  let ruxsat = '';
  let frame = 0;
  let vaqt: ReturnType<typeof setTimeout> | undefined;
  let uzilishVaqti: ReturnType<typeof setTimeout> | undefined;
  let ulanishVaqti: ReturnType<typeof setTimeout> | undefined;
  let speaking = false;
  let javobFaol = false;
  let navbat = 0;
  let asbobCtrl: AbortController | null = null;
  let ovozCtrl: AbortController | null = null;
  let tashqiOvoz = false;
  const oqilgan = new Set<string>();
  const matnlar = new Map<string, string>();
  const chaqiruvlar = new Set<string>();
  const Ctx = typeof window !== 'undefined' ? window.AudioContext : undefined;
  const context = Ctx ? new Ctx() : null;
  // iOS/Chrome audio permission is unlocked in the initiating click.
  void context?.resume().catch(() => {});

  const send = (event: Record<string, unknown>) => {
    if (!tugadi && dc?.readyState === 'open') dc.send(JSON.stringify(event));
  };
  const atrofniYop = (token: string) => {
    void fetch('/api/agent/jonli', { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ tur: 'yopish', ruxsat: token }), keepalive: true }).catch(() => {});
  };
  const tozala = (mikrofonniSaqla = false) => {
    if (tugadi) return;
    tugadi = true; ctrl.abort(); asbobCtrl?.abort(); ovozCtrl?.abort();
    clearTimeout(vaqt); clearTimeout(ulanishVaqti); clearTimeout(uzilishVaqti); cancelAnimationFrame(frame);
    if (!mikrofonniSaqla) mikrofon?.getTracks().forEach((t) => t.stop());
    masofa?.getTracks().forEach((t) => t.stop());
    if (audio) { audio.pause(); audio.srcObject = null; audio.remove(); }
    dc?.close(); pc?.close(); void context?.close().catch(() => {});
    if (ruxsat) atrofniYop(ruxsat);
  };
  const bekor = () => { if (!tugadi) { tozala(); cb.onDaraja(0); cb.onHolat('tayyor'); cb.onTugadi(); } };
  const qaytaUlan = (sabab: 'muddat' | 'aloqa' | 'provayder' | 'ovoz') => {
    if (tugadi || !cb.onQaytaUlanish) return false;
    tozala(true); cb.onDaraja(0);
    cb.onQaytaUlanish(sabab, ruxsat || opt.davom, mikrofon);
    return true;
  };
  const xato = (m: string) => { if (!tugadi) { cb.onXato(m); bekor(); } };
  const yangila = (id: string, r: 'f' | 'a', m: string, delta = false) => {
    if (!m || tugadi) return;
    const yangi = (delta ? (matnlar.get(id) ?? '') + m : m).slice(0, 12_000);
    matnlar.set(id, yangi); cb.onMatn(id, r, yangi);
  };

  const asboblarniBajar = async (output: Array<Record<string, unknown>>) => {
    const chaqiruv = output.filter((o) => o && typeof o === 'object' && o.type === 'function_call' && typeof o.call_id === 'string' && !chaqiruvlar.has(o.call_id));
    if (!chaqiruv.length || tugadi) return;
    const bosqich = navbat;
    const turnCtrl = new AbortController(); asbobCtrl = turnCtrl;
    cb.onHolat('oylamoqda');
    for (const o of chaqiruv) {
      const callId = o.call_id as string;
      chaqiruvlar.add(callId);
      if (chaqiruvlar.size > 1000) { if (!qaytaUlan('muddat')) xato('Suhbatni yangilang.'); return; }
      let result: Record<string, unknown>;
      try {
        if (ctrl.signal.aborted || turnCtrl.signal.aborted) throw new Error('bekor');
        const args: unknown = JSON.parse(String(o.arguments ?? '{}'));
        const r = await fetch('/api/agent/jonli', {
          method: 'POST', headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ tur: 'asbob', ruxsat, callId, nomi: o.name, args }),
          signal: AbortSignal.any([ctrl.signal, turnCtrl.signal, AbortSignal.timeout(30_000)]),
        });
        const d = await r.json() as { malumot?: Record<string, unknown>; amallar?: Amal[]; manbalar?: Manba[]; xabar?: string };
        if (tugadi) return;
        if (!r.ok) result = { xato: 'buyruq_rad', izoh: d.xabar ?? 'Buyruq bajarilmadi.' };
        else {
          result = { ...d.malumot };
          if (bosqich === navbat && !turnCtrl.signal.aborted) {
            const browser = await cb.onAmallar(d.amallar ?? [], d.manbalar ?? [], turnCtrl.signal);
            if (Object.keys(browser).length) result.brauzerNatijasi = browser;
          } else result.brauzerNatijasi = { bekor: true, izoh: 'Yangi savol boshlandi; oldingi ekran amali bajarilmadi.' };
        }
      } catch {
        result = { xato: 'buyruq_uzildi', izoh: 'Buyruq javobi olinmadi yoki suhbat bo‘lindi. Bajarildi deb aytmang.' };
      }
      // The function output settles the call even when a newer user turn interrupted it.
      send({ type: 'conversation.item.create', item: { type: 'function_call_output', call_id: callId, output: JSON.stringify(result).slice(0, 14_000) } });
    }
    if (asbobCtrl === turnCtrl) asbobCtrl = null;
    if (!tugadi && bosqich === navbat) send({ type: 'response.create' });
  };

  const hodisa = (raw: string) => {
    if (tugadi || raw.length > 100_000) return;
    let e: Record<string, any>; // Provider events are validated per field before use.
    try { e = JSON.parse(raw); } catch { return; }
    if (!e || typeof e !== 'object') return;
    switch (e.type) {
      case 'input_audio_buffer.speech_started':
        navbat++; asbobCtrl?.abort(); ovozCtrl?.abort(); speaking = false; cb.onDaraja(0); cb.onHolat('eshitmoqda'); break;
      case 'input_audio_buffer.speech_stopped': cb.onHolat('oylamoqda'); break;
      case 'conversation.item.input_audio_transcription.completed':
        if (typeof e.item_id === 'string' && typeof e.transcript === 'string') yangila(e.item_id, 'f', e.transcript); break;
      case 'conversation.item.input_audio_transcription.failed':
        cb.onXato('Aytilgan gap matnda ko‘rinmadi. Noto‘g‘ri eshitgan bo‘lsam, qayta ayting.'); break;
      case 'response.output_audio_transcript.delta':
      case 'response.output_text.delta':
        if (typeof e.item_id === 'string' && typeof e.delta === 'string') yangila(e.item_id, 'a', e.delta, true); break;
      case 'response.output_audio_transcript.done':
        if (typeof e.item_id === 'string' && typeof e.transcript === 'string') yangila(e.item_id, 'a', e.transcript); break;
      case 'response.output_text.done':
        if (typeof e.item_id === 'string' && typeof e.text === 'string') yangila(e.item_id, 'a', e.text); break;
      case 'response.created': javobFaol = true; cb.onHolat('oylamoqda'); break;
      case 'output_audio_buffer.started': speaking = true; cb.onHolat('gapirmoqda'); break;
      case 'output_audio_buffer.stopped':
      case 'output_audio_buffer.cleared': speaking = false; cb.onDaraja(0); cb.onHolat('eshitmoqda'); break;
      case 'response.done':
        javobFaol = false;
        if (e.response?.status === 'failed') { if (!qaytaUlan('provayder')) xato('Jonli javob olinmadi. Oddiy suhbatdan foydalaning.'); break; }
        if (e.response?.status === 'completed' && Array.isArray(e.response.output)) {
          void asboblarniBajar(e.response.output);
          if (tashqiOvoz && typeof e.response.id === 'string' && !oqilgan.has(e.response.id)) {
            oqilgan.add(e.response.id);
            const m = e.response.output.filter((o: any) => o?.type === 'message' && o.role === 'assistant')
              .flatMap((o: any) => Array.isArray(o.content) ? o.content : [])
              .filter((c: any) => c?.type === 'output_text' && typeof c.text === 'string')
              .map((c: any) => c.text).join(' ').trim();
            // An intermediate tool response must not interrupt the exporter or claim completion.
            if (m && !e.response.output.some((o: any) => o?.type === 'function_call')) {
              ovozCtrl?.abort(); const turn = new AbortController(); ovozCtrl = turn;
              if (cb.onOvoz) void cb.onOvoz(m, turn.signal).catch(() => { if (!tugadi && !turn.signal.aborted && !qaytaUlan('ovoz')) cb.onXato('Ovoz olinmadi. Javob matni ekranda.'); }).finally(() => {
                if (ovozCtrl === turn) { ovozCtrl = null; if (!tugadi && !turn.signal.aborted) cb.onHolat('eshitmoqda'); }
              });
            }
          }
        }
        break;
      case 'error':
        if (!['response_cancel_not_active', 'conversation_already_has_active_response'].includes(e.error?.code) && !qaytaUlan('provayder')) xato('Jonli suhbatda xato yuz berdi. Qayta ulang yoki yozma suhbatdan foydalaning.');
        break;
    }
  };

  const ulan = async () => {
    try {
      if (!jonliMumkinmi()) throw new Error('qurilma');
      cb.onHolat('oylamoqda');
      ulanishVaqti = setTimeout(() => { if (!qaytaUlan('aloqa')) xato('Jonli ulanish kechikdi. Qayta urinib ko‘ring.'); }, 35_000);
      // Zaxirada Gemini allaqachon ruxsat olgan oqim beriladi: ikkinchi marta so'ramaydi (iPhone'da qayta so'rov chiqmasin)
      const stream = opt.mikrofon?.getAudioTracks().some((t) => t.readyState === 'live') ? opt.mikrofon
        : await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 } });
      if (tugadi) { stream.getTracks().forEach((t) => t.stop()); return; }
      mikrofon = stream;
      pc = new RTCPeerConnection();
      stream.getTracks().forEach((track) => pc!.addTrack(track, stream));
      audio = document.createElement('audio'); audio.autoplay = true; audio.setAttribute('playsinline', '');
      audio.style.display = 'none'; document.body.appendChild(audio);
      pc.ontrack = (e) => {
        if (tugadi) return;
        masofa = e.streams[0] ?? new MediaStream([e.track]);
        if (tashqiOvoz) return; // The local ElevenLabs player owns audio and mouth amplitude.
        audio!.srcObject = masofa;
        void audio!.play().catch(() => xato('Ovozni eshitish uchun jonli suhbat tugmasini yana bosing.'));
        if (!context) return;
        const source = context.createMediaStreamSource(masofa);
        const analyser = context.createAnalyser(); analyser.fftSize = 256; source.connect(analyser);
        const data = new Float32Array(analyser.fftSize);
        const kuzat = () => {
          if (tugadi) return;
          analyser.getFloatTimeDomainData(data);
          const rms = Math.sqrt(data.reduce((sum, x) => sum + x * x, 0) / data.length);
          cb.onDaraja(speaking ? Math.min(1, rms * 9) : 0);
          frame = requestAnimationFrame(kuzat);
        };
        cancelAnimationFrame(frame); kuzat();
      };
      pc.onconnectionstatechange = () => {
        clearTimeout(uzilishVaqti);
        if (pc?.connectionState === 'disconnected') uzilishVaqti = setTimeout(() => {
          if (!tugadi && pc?.connectionState === 'disconnected' && !qaytaUlan('aloqa')) xato('Jonli ovoz aloqasi uzildi. Qayta ulang.');
        }, 5000);
        if (['failed', 'closed'].includes(pc?.connectionState ?? '') && !tugadi && !qaytaUlan('aloqa')) xato('Jonli ovoz aloqasi uzildi. Qayta ulang.');
      };
      dc = pc.createDataChannel('oai-events');
      dc.onmessage = (e) => { if (typeof e.data === 'string') hodisa(e.data); };
      dc.onclose = () => { if (!tugadi && !qaytaUlan('aloqa')) xato('Jonli suhbat yakunlandi.'); };
      dc.onopen = () => {
        clearTimeout(ulanishVaqti);
        cb.onOgoh?.('Жонли суҳбат уланди. Сизни тинглаяпман.');
        cb.onHolat('eshitmoqda');
        send({ type: 'response.create', response: { instructions: 'Qisqa salomlash va foydalanuvchini tinglashga tayyorligingni ayt. Asbob chaqirma.' } });
      };
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      const r = await fetch('/api/agent/jonli', { method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ tur: 'ulanish', sdp: offer.sdp, ...(opt.mahalliyOvoz ? { mahalliyOvoz: true } : {}), ...(opt.zaxira ? { zaxira: true } : {}), ...(opt.zaxira && opt.qoplash ? { qoplash: opt.qoplash } : {}), ...(opt.davom ? { davom: opt.davom } : {}) }), signal: ctrl.signal });
      const d = await r.json() as { sdp?: string; ruxsat?: string; muddatMs?: number; tashqiOvoz?: boolean; xabar?: string };
      // A late answer after cancel still needs a provider hangup.
      if (tugadi) { if (d.ruxsat) atrofniYop(d.ruxsat); return; }
      if (!r.ok || !d.sdp || !d.ruxsat) { if (r.status >= 500 && qaytaUlan('provayder')) return; xato(d.xabar ?? 'Jonli xizmatga ulanib bo‘lmadi.'); return; }
      ruxsat = d.ruxsat;
      tashqiOvoz = d.tashqiOvoz === true;
      await pc.setRemoteDescription({ type: 'answer', sdp: d.sdp });
      jonliRuxsatniYangilabTur({ ruxsat: () => ruxsat, yangilandi: (v) => { ruxsat = v; }, muddatMs: d.muddatMs ?? 300_000, signal: ctrl.signal,
        xato: (s) => { if ([401, 403, 429].includes(s) || !qaytaUlan('aloqa')) xato('Jonli suhbat ruxsatini yangilab bo‘lmadi. Qayta ulang.'); },
      });
    } catch (e) {
      if (tugadi) return;
      if (!['NotAllowedError', 'NotFoundError'].includes((e as Error)?.name) && qaytaUlan('aloqa')) return;
      xato((e as Error)?.name === 'NotAllowedError' ? 'Mikrofonga ruxsat bering va qayta ulang.' : 'Jonli ovozga ulanib bo‘lmadi. Oddiy mikrofon yoki yozma suhbatdan foydalaning.');
    }
  };
  void ulan();
  return {
    bekor,
    yubor(matn) {
      if (tugadi || dc?.readyState !== 'open' || !matn.trim()) return false;
      navbat++; asbobCtrl?.abort(); ovozCtrl?.abort();
      if (javobFaol) send({ type: 'response.cancel' });
      if (speaking) send({ type: 'output_audio_buffer.clear' });
      send({ type: 'conversation.item.create', item: { type: 'message', role: 'user', content: [{ type: 'input_text', text: matn }] } });
      send({ type: 'response.create' }); return true;
    },
    eslat(matn) {
      ovozCtrl?.abort();
      if (javobFaol) send({ type: 'response.cancel' });
      if (speaking) send({ type: 'output_audio_buffer.clear' });
      send({ type: 'conversation.item.create', item: { type: 'message', role: 'user', content: [{ type: 'input_text', text: `Interfeys natijasi: ${matn}. Natijani qisqa o'zbekcha ayt.` }] } });
      send({ type: 'response.create' });
    },
  };
}
