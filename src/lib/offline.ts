/**
 * ============================================================
 *  Oflayn rejim uchun navbat (queue)
 *  Maktab kompyuterlarida internet uzilib qolsa, anketa
 *  localStorage ga saqlanadi va aloqa tiklanganda avtomatik
 *  serverga yuboriladi.
 * ============================================================
 */
import type { StudentInput } from './validation';

const QUEUE_KEY = 'kelajak_egasi_offline_queue';

/**
 * Navbatdagi anketalarning maksimal soni.
 * Brauzer localStorage odatda ~5 MB, bitta anketa ~1 KB — ya'ni chegara
 * juda uzoq. Shunga qaramay cheklov qo'yamiz: agar kompyuter oylab
 * internetsiz ishlasa, navbat cheksiz o'smasligi kerak.
 */
const MAX_QUEUE_SIZE = 500;

export interface QueuedSubmission {
  /** Navbatdagi yozuvning lokal identifikatori */
  localId: string;
  payload: StudentInput;
  /** Navbatga qo'shilgan vaqt */
  queuedAt: string;
  /** Nechta marta yuborishga urinilgan */
  attempts: number;
}

/** Brauzer muhitida ekanini tekshiradi */
function hasStorage(): boolean {
  try {
    return typeof window !== 'undefined' && !!window.localStorage;
  } catch {
    return false;
  }
}

/** Navbatdagi barcha yozuvlarni o'qiydi */
export function readQueue(): QueuedSubmission[] {
  if (!hasStorage()) return [];
  try {
    const raw = window.localStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as QueuedSubmission[]) : [];
  } catch {
    return [];
  }
}

/**
 * Navbatni to'liq qayta yozadi.
 *
 * Xotira to'lib qolsa (QuotaExceededError), eng eski yozuvlarni bosqichma-
 * bosqich o'chirib qayta urinadi. Baribir saqlab bo'lmasa `false` qaytaradi
 * — chaqiruvchi kod buni foydalanuvchiga rostini aytishi uchun.
 *
 * MUHIM: xatoni jimgina yutib yuborish mumkin emas. Aks holda o'quvchiga
 * "anketang saqlandi" deb ko'rsatiladi-yu, aslida hech narsa saqlanmaydi.
 */
function writeQueue(items: QueuedSubmission[]): boolean {
  if (!hasStorage()) return false;

  // Chegaradan oshsa — eng eskilarini kesib tashlaymiz
  let list = items.length > MAX_QUEUE_SIZE ? items.slice(-MAX_QUEUE_SIZE) : items;

  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      window.localStorage.setItem(QUEUE_KEY, JSON.stringify(list));
      return true;
    } catch {
      // Xotira to'ldi. Eng eski 25% ni o'chirib qayta urinamiz.
      if (list.length <= 1) {
        // Bitta yozuv ham sig'masa — boshqa iloj yo'q
        return false;
      }
      list = list.slice(Math.max(1, Math.ceil(list.length * 0.25)));
    }
  }

  return false;
}

/**
 * Anketani navbatga qo'shadi.
 * Saqlab bo'lmasa (xotira to'la yoki localStorage ishlamayapti) `null`
 * qaytaradi — bunda foydalanuvchiga muvaffaqiyat ko'rsatilmasligi kerak.
 */
export function enqueue(payload: StudentInput): QueuedSubmission | null {
  const item: QueuedSubmission = {
    localId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    payload,
    queuedAt: new Date().toISOString(),
    attempts: 0,
  };

  const queue = readQueue();
  queue.push(item);

  if (!writeQueue(queue)) return null;

  // Yozildi, lekin kesilgan bo'lishi mumkin — yangi yozuv haqiqatan
  // saqlanganini tekshiramiz
  const saved = readQueue().some((i) => i.localId === item.localId);
  return saved ? item : null;
}

/** Navbatdan bitta yozuvni o'chiradi */
export function dequeue(localId: string): void {
  writeQueue(readQueue().filter((i) => i.localId !== localId));
}

/** Yozuvning urinishlar sonini oshiradi */
function bumpAttempts(localId: string): void {
  writeQueue(
    readQueue().map((i) => (i.localId === localId ? { ...i, attempts: i.attempts + 1 } : i))
  );
}

/** Navbatdagi yozuvlar soni */
export function queueSize(): number {
  return readQueue().length;
}

/**
 * Ayni damda ketayotgan sinxronizatsiya.
 * Brauzer `online` hodisasini bir necha marta yuborishi mumkin — himoyasiz
 * qoldirilsa, bitta anketa ikki marta jo'natilib, baza ikkilanib ketardi.
 */
let activeSync: Promise<SyncResult> | null = null;

/** Sinxronizatsiya natijasi */
export interface SyncResult {
  sent: number;
  failed: number;
  remaining: number;
}

/**
 * Navbatdagi barcha anketalarni serverga yuborishga urinadi.
 * Muvaffaqiyatli yuborilganlar (va takror deb rad etilganlar)
 * navbatdan o'chiriladi.
 */
export function syncQueue(): Promise<SyncResult> {
  // Allaqachon ishlayotgan bo'lsa — o'shanga qo'shilamiz, yangisini boshlamaymiz
  if (activeSync) return activeSync;

  activeSync = runSync().finally(() => {
    activeSync = null;
  });
  return activeSync;
}

/** Sinxronizatsiyaning asosiy mantiqi */
async function runSync(): Promise<SyncResult> {
  const queue = readQueue();
  let sent = 0;
  let failed = 0;

  for (const item of queue) {
    try {
      const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item.payload),
      });

      // 2xx — qabul qilindi; 409 — takroriy anketa; 422 — noto'g'ri ma'lumot.
      // Uchala holatda ham navbatda saqlashning ma'nosi yo'q.
      if (res.ok || res.status === 409 || res.status === 422) {
        dequeue(item.localId);
        sent += 1;
      } else {
        bumpAttempts(item.localId);
        failed += 1;
      }
    } catch {
      bumpAttempts(item.localId);
      failed += 1;
    }
  }

  return { sent, failed, remaining: queueSize() };
}
