import type { Amal } from '@/lib/agent/turlar';

export interface HisobotNatijasi { ok: boolean; xabar: string }

/** Wait for the correct route and the actual exporter result, not just a navigation. */
export async function hisobotniIjroQil(
  a: Extract<Amal, { tur: 'hisobot' }>, yur: (url: string) => void, signal?: AbortSignal
): Promise<HisobotNatijasi> {
  const id = crypto.randomUUID();
  const hozirgi = () => window.location.pathname + window.location.search;
  const hudud = new URL(a.url, window.location.origin).searchParams.get('mfy') ?? '';
  const tugmaTayyor = () => document.querySelector('[data-hisobot-tugmalari]')?.getAttribute('data-hisobot-hudud') === hudud;
  if (hozirgi() !== a.url) yur(a.url);
  for (let i = 0; i < 60; i++) {
    if (signal?.aborted) return { ok: false, xabar: 'Hisobot so‘rovi bekor qilindi.' };
    if (hozirgi() === a.url && tugmaTayyor()) break;
    if (hozirgi() === a.url) window.dispatchEvent(new CustomEvent('hudhud:hisobot-hudud', { detail: { mahallaId: hudud } }));
    await new Promise((r) => setTimeout(r, 200));
  }
  if (hozirgi() !== a.url || !tugmaTayyor()) return { ok: false, xabar: 'Hisobot sahifasi ochilmadi. Qayta urinib ko‘ring.' };
  // Effects install the listener after the export buttons mount.
  await new Promise((r) => setTimeout(r, 200));
  if (signal?.aborted) return { ok: false, xabar: 'Hisobot so‘rovi bekor qilindi.' };
  return new Promise((resolve) => {
    const tugat = (d: HisobotNatijasi) => {
      clearTimeout(taymer); window.removeEventListener('hudhud:hisobot-natija', natija);
      signal?.removeEventListener('abort', bekor); resolve(d);
    };
    const natija = (e: Event) => {
      const d = (e as CustomEvent<{ id?: string; ok?: boolean; xabar?: string }>).detail;
      if (d?.id === id && typeof d.ok === 'boolean' && typeof d.xabar === 'string') tugat({ ok: d.ok, xabar: d.xabar });
    };
    const bekor = () => tugat({ ok: false, xabar: 'Hisobot so‘rovi bekor qilindi.' });
    const taymer = setTimeout(() => tugat({ ok: false, xabar: 'Hisobot hali yakunlanmadi. Sahifadagi hisobot holatini tekshiring.' }), 60_000);
    window.addEventListener('hudhud:hisobot-natija', natija);
    signal?.addEventListener('abort', bekor, { once: true });
    window.dispatchEvent(new CustomEvent('hudhud:hisobot', { detail: { turi: a.format, id } }));
  });
}
