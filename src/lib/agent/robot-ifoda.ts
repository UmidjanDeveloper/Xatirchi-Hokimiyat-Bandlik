import { lotinga } from '@/lib/alifbo';

export type RobotKayfiyati = 'vazmin' | 'xursand' | 'jiddiy' | 'xavotir';

/** Social expression only: user text must never establish completion or overdue task counts. */
export function suhbatIfodasi(matn: string): { kayfiyat: RobotKayfiyati; namoyish?: string } | null {
  const m = lotinga(matn).toLowerCase().replace(/[ʻʼ‘’`]/g, "'").replace(/[^a-z'\s]/g, ' ').replace(/\s+/g, ' ').trim();
  if (/^(?:hamroh )?(?:jahlingni ko'rsat|jahling chiqsin|jahl qil|jahldor bo'l)$/.test(m)) {
    return { kayfiyat: 'jiddiy', namoyish: 'Мана, жиддий қиёфам. Бу мимика намойиши, вазифалар ҳақидаги хабар эмас.' };
  }
  if (/^(?:hamroh )?(?:kul|kulib qo'y|tabassum qil|xursand bo'l|xursandchilikni ko'rsat)$/.test(m)) {
    return { kayfiyat: 'xursand', namoyish: 'Мана, табассумим! Сизга ёрдам беришга тайёрман.' };
  }
  if (/^(?:salom|assalomu alaykum|rahmat|katta rahmat|zo'r|barakalla)(?:\s|$)/.test(m)) return { kayfiyat: 'xursand' };
  if (/ishlamayapti|ishlamadi|xato bo'ldi|yordam kerak/.test(m)) return { kayfiyat: 'xavotir' };
  return null;
}
