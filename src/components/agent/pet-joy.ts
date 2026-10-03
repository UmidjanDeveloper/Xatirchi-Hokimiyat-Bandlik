export interface PetJoy { x: number; y: number }
export function petChegarasi(p: PetJoy, kenglik: number, balandlik: number): PetJoy {
  const clamp = (n: number, max: number) => Math.min(Math.max(12, Number.isFinite(n) ? n : 12), Math.max(12, max));
  return { x: clamp(p.x, kenglik - 100), y: clamp(p.y, balandlik - 112) };
}
