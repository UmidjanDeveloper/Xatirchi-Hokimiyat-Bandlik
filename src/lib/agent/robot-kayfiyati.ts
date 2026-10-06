/** Only server-authorized task counts determine task emotion, never generated answer text. */
export function robotVazifaHolati(bloklar: readonly { kalit: string; soni: number; ogohlik: string; yetishmayotgan?: string }[]) {
  const olchangan = bloklar.filter((b) => !b.yetishmayotgan && Number.isFinite(b.soni) && b.soni >= 0);
  const kechikkan = olchangan.filter((b) => b.kalit === 'kechikkan').reduce((n, b) => n + b.soni, 0);
  const shoshilinch = olchangan.filter((b) => b.ogohlik === 'shoshilinch' && b.soni > 0).length;
  return { kayfiyat: kechikkan > 0 ? 'jiddiy' as const : shoshilinch > 0 ? 'xavotir' as const : 'vazmin' as const, kechikkan, shoshilinch };
}
