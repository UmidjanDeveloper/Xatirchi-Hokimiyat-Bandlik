/** Faqat administratorga yuboriladigan, server tozalagan qisqa diagnostika. */
export function ovozTafsiloti(r: Response): string | undefined {
  try { return decodeURIComponent(r.headers.get('x-nutq-sabab') ?? '').slice(0, 500) || undefined; }
  catch { return undefined; }
}
