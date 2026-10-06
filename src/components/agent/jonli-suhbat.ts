import type { Amal, Manba } from '@/lib/agent/turlar';
import type { MaskotHolati } from './maskot';

export interface JonliHodisalar {
  onHolat(h: MaskotHolati): void;
  onDaraja(d: number): void;
  onMatn(id: string, r: 'f' | 'a', matn: string): void;
  onAmallar(amallar: Amal[], manbalar: Manba[], signal: AbortSignal): Promise<Record<string, unknown>>;
  onXato(matn: string): void;
  onTugadi(): void;
}

export function jonliMumkinmi(): boolean {
  return typeof window !== 'undefined' && Boolean(window.RTCPeerConnection && navigator.mediaDevices?.getUserMedia);
}

/** Native WebRTC audio, not a text -> TTS loop. The API key never reaches this module. */
export function jonliBoshla(cb: JonliHodisalar): { bekor(): void; yubor(matn: string): boolean; eslat(matn: string): void } {
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
  let ulanishVaqti: ReturnType<typeof setTimeout> | undefined;
  let speaking = false;
  let javobFaol = false;
  let navbat = 0;
  let asbobCtrl: AbortController | null = null;
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
  const bekor = () => {
    if (tugadi) return;
    tugadi = true; ctrl.abort(); asbobCtrl?.abort();
    clearTimeout(vaqt); clearTimeout(ulanishVaqti); cancelAnimationFrame(frame);
    mikrofon?.getTracks().forEach((t) => t.stop()); masofa?.getTracks().forEach((t) => t.stop());
    if (audio) { audio.pause(); audio.srcObject = null; audio.remove(); }
    dc?.close(); pc?.close(); void context?.close().catch(() => {});
    if (ruxsat) atrofniYop(ruxsat);
    cb.onDaraja(0); cb.onHolat('tayyor'); cb.onTugadi();
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
      if (chaqiruvlar.size > 30) { xato('Jonli buyruqlar chegarasi tugadi. Qayta suhbat oching.'); return; }
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
        navbat++; asbobCtrl?.abort(); speaking = false; cb.onDaraja(0); cb.onHolat('eshitmoqda'); break;
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
      case 'response.created': javobFaol = true; cb.onHolat('oylamoqda'); break;
      case 'output_audio_buffer.started': speaking = true; cb.onHolat('gapirmoqda'); break;
      case 'output_audio_buffer.stopped':
      case 'output_audio_buffer.cleared': speaking = false; cb.onDaraja(0); cb.onHolat('eshitmoqda'); break;
      case 'response.done':
        javobFaol = false;
        if (e.response?.status === 'failed') { xato('Jonli javob olinmadi. Oddiy suhbatdan foydalaning.'); break; }
        if (e.response?.status === 'completed' && Array.isArray(e.response.output)) void asboblarniBajar(e.response.output);
        break;
      case 'error':
        if (!['response_cancel_not_active', 'conversation_already_has_active_response'].includes(e.error?.code)) xato('Jonli suhbatda xato yuz berdi. Qayta ulang yoki yozma suhbatdan foydalaning.');
        break;
    }
  };

  const ulan = async () => {
    try {
      if (!jonliMumkinmi()) throw new Error('qurilma');
      cb.onHolat('oylamoqda');
      ulanishVaqti = setTimeout(() => xato('Jonli ulanish kechikdi. Qayta urinib ko‘ring.'), 35_000);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      if (tugadi) { stream.getTracks().forEach((t) => t.stop()); return; }
      mikrofon = stream;
      pc = new RTCPeerConnection();
      stream.getTracks().forEach((track) => pc!.addTrack(track, stream));
      audio = document.createElement('audio'); audio.autoplay = true; audio.setAttribute('playsinline', '');
      audio.style.display = 'none'; document.body.appendChild(audio);
      pc.ontrack = (e) => {
        if (tugadi) return;
        masofa = e.streams[0] ?? new MediaStream([e.track]);
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
        if (['failed', 'disconnected', 'closed'].includes(pc?.connectionState ?? '') && !tugadi) xato('Jonli ovoz aloqasi uzildi. Qayta ulang.');
      };
      dc = pc.createDataChannel('oai-events');
      dc.onmessage = (e) => { if (typeof e.data === 'string') hodisa(e.data); };
      dc.onclose = () => { if (!tugadi) xato('Jonli suhbat yakunlandi.'); };
      dc.onopen = () => {
        clearTimeout(ulanishVaqti);
        cb.onHolat('eshitmoqda');
        send({ type: 'response.create', response: { instructions: 'Qisqa salomlash va foydalanuvchini tinglashga tayyorligingni ayt. Asbob chaqirma.' } });
      };
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      const r = await fetch('/api/agent/jonli', { method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ tur: 'ulanish', sdp: offer.sdp }), signal: ctrl.signal });
      const d = await r.json() as { sdp?: string; ruxsat?: string; muddatMs?: number; xabar?: string };
      // A late answer after cancel still needs a provider hangup.
      if (tugadi) { if (d.ruxsat) atrofniYop(d.ruxsat); return; }
      if (!r.ok || !d.sdp || !d.ruxsat) { xato(d.xabar ?? 'Jonli xizmatga ulanib bo‘lmadi.'); return; }
      ruxsat = d.ruxsat;
      await pc.setRemoteDescription({ type: 'answer', sdp: d.sdp });
      vaqt = setTimeout(() => { cb.onXato('Besh daqiqalik suhbat tugadi. Davom etish uchun qayta ulang.'); bekor(); }, Math.min(d.muddatMs ?? 300_000, 300_000));
    } catch (e) {
      if (tugadi) return;
      xato((e as Error)?.name === 'NotAllowedError' ? 'Mikrofonga ruxsat bering va qayta ulang.' : 'Jonli ovozga ulanib bo‘lmadi. Oddiy mikrofon yoki yozma suhbatdan foydalaning.');
    }
  };
  void ulan();
  return {
    bekor,
    yubor(matn) {
      if (tugadi || dc?.readyState !== 'open' || !matn.trim()) return false;
      navbat++; asbobCtrl?.abort();
      if (javobFaol) send({ type: 'response.cancel' });
      if (speaking) send({ type: 'output_audio_buffer.clear' });
      send({ type: 'conversation.item.create', item: { type: 'message', role: 'user', content: [{ type: 'input_text', text: matn }] } });
      send({ type: 'response.create' }); return true;
    },
    eslat(matn) {
      if (javobFaol) send({ type: 'response.cancel' });
      if (speaking) send({ type: 'output_audio_buffer.clear' });
      send({ type: 'conversation.item.create', item: { type: 'message', role: 'user', content: [{ type: 'input_text', text: `Interfeys natijasi: ${matn}. Natijani qisqa o'zbekcha ayt.` }] } });
      send({ type: 'response.create' });
    },
  };
}
