import { lotinga } from '@/lib/alifbo';

/** Only explicit standalone approval, scoped to one visible pending operation. */
export function ovozTasdiqQarori(matn: string): 'ha' | 'yoq' | null {
  const m = lotinga(matn).toLowerCase().replace(/[.!?,]/g, '').replace(/\s+/g, ' ').trim();
  if (/^(tasdiqlayman|amalni tasdiqlayman)$/.test(m)) return 'ha';
  if (/^(bekor qil|amalni bekor qil)$/.test(m)) return 'yoq';
  return null;
}
