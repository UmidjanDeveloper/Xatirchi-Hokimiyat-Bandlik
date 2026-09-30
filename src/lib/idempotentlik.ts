import { createHash } from 'crypto';

/**
 * ============================================================
 *  ИДЕМПОТЕНТЛИК — «ШУ СЎРОВНИ АЛЛАҚАЧОН БАЖАРГАНМАНМИ»
 *
 *  ── Қандай муаммони ечади ──
 *
 *  Дала телефонида алоқа узилиб туради. Ходим «Юбориш» ни
 *  босади, сўров серверга ЕТИБ БОРАДИ, жавоб эса йўлда
 *  йўқолади. Браузер «юборилмади» деб ҳисоблайди ва қайта
 *  юборади.
 *
 *  Калит бўлмаса — икки хил ёзув. Калит БОР-у, у фақат
 *  «калит» бўлса — бундан ҳам ёмони содир бўлади.
 *
 *  ── Нега ёлғиз калит ЕТАРЛИ ЭМАС ──
 *
 *  Аввал шундай эди: калит топилса, сервер дарҳол
 *  «ok: true, takror: true» қайтарарди. Амални ҳам,
 *  мазмунни ҳам, эгасини ҳам солиштирмасдан.
 *
 *  Натижада қуйидаги оддий ҳолатда ходимнинг бир соатлик
 *  иши ЖИМГИНА йўқоларди:
 *
 *    1. Қоралама серверда сақланди (калит K билан);
 *    2. Жавоб йўқолди — браузер ёзувнинг `id` сини олмади;
 *    3. Ходим анкетани охиригача тўлдириб ЯКУНИЙ юборди
 *       (ўша калит K билан, `id` эса ҳамон йўқ);
 *    4. Сервер K ни топди ва «такрор» деб 200 қайтарди.
 *
 *  Экранда «сақланди» деб ёзиларди, базада эса ҳамон
 *  ярим тўлдирилган ҚОРАЛАМА ва биронта ишсиз ёзуви йўқ.
 *
 *  ── Ечим ──
 *
 *  Калит УЧТА нарса билан боғланади:
 *
 *    · АМАЛ    — қоралама ёки якуний. Уларнинг маъноси
 *                бошқа, демак калити ҳам бошқа маънода;
 *    · ЭГАСИ   — бошқа ходимнинг калити билан келган сўров
 *                ҳеч қачон унинг ёзувига тегмайди;
 *    · МАЗМУН  — изи (SHA-256). Бир хил калит, бошқа
 *                мазмун — бу «қайта юбориш» эмас.
 * ============================================================
 */

/** Калит тегишли амал */
export type IdempotentAmal = 'qoralama' | 'yakuniy';

/**
 * Мазмуннинг изи.
 *
 * Калитлар ТАРТИБЛАНАДИ: JSON да майдонлар тартиби ўзгариб
 * туриши мумкин ва тартиб фарқи мазмун фарқи эмас.
 *
 * `undefined` ташланади, `Date` эса ISO га келтирилади —
 * акс ҳолда бир хил сана икки хил из берарди.
 */
export function mazmunIzi(malumot: unknown): string {
  return createHash('sha256').update(barqarorMatn(malumot)).digest('hex');
}

function barqarorMatn(x: unknown): string {
  if (x === null || x === undefined) return 'null';
  if (x instanceof Date) return JSON.stringify(x.toISOString());
  if (Array.isArray(x)) return `[${x.map(barqarorMatn).join(',')}]`;
  if (typeof x === 'object') {
    const kalitlar = Object.keys(x as Record<string, unknown>)
      .filter((k) => (x as Record<string, unknown>)[k] !== undefined)
      .sort();
    return `{${kalitlar
      .map((k) => `${JSON.stringify(k)}:${barqarorMatn((x as Record<string, unknown>)[k])}`)
      .join(',')}}`;
  }
  return JSON.stringify(x);
}

/** Калит бўйича топилган ёзувнинг ҳолати */
export interface KalitYozuvi {
  id: string;
  holati: string;
  mahallaId: string;
  idempotentAmal: string | null;
  idempotentUserId: string | null;
  idempotentIzi: string | null;
}

export type KalitQarori =
  /** Бундай калит йўқ — янги ёзув яратилади */
  | { turi: 'yangi' }
  /** АЙНАН ўша сўров қайтадан келди — ёзув жойида, ҳеч нарса ўзгармайди */
  | { turi: 'takror'; id: string; holati: string }
  /**
   * Калит меники, лекин сўров ЯНГИ иш олиб келди:
   * қоралама → якуний ўтиши ёки қораламанинг қайта сақланиши.
   * Топилган ёзув ЯНГИЛАНАДИ.
   */
  | { turi: 'davom'; id: string; sabab: 'qoralamadan-yakuniyga' | 'qoralama-qayta' }
  /** Зиддият — одам кўриши керак */
  | { turi: 'ziddiyat'; id: string; xabar: string }
  /** Бошқа ходимнинг калити */
  | { turi: 'begona' };

/**
 * Калит бўйича топилган ёзув билан НИМА ҚИЛИШ кераклигини айтади.
 *
 * Бу функция базага ТЕГМАЙДИ — фақат қоида. Шунинг учун уни
 * сервер ишга тушмасдан ҳам синовдан ўтказиш мумкин.
 */
export function kalitQarori(
  yozuv: KalitYozuvi | null,
  sorov: { amal: IdempotentAmal; userId: string; izi: string }
): KalitQarori {
  if (!yozuv) return { turi: 'yangi' };

  /*
   * Эгаси текширилади. Эски ёзувларда `idempotentUserId`
   * бўлмаслиги мумкин (устун кейин қўшилган) — у ҳолда
   * эгасиз деб қараймиз ва ишонамиз: калитнинг ўзи тасодифан
   * топилмайди.
   */
  if (yozuv.idempotentUserId && yozuv.idempotentUserId !== sorov.userId) {
    return { turi: 'begona' };
  }

  const saqlanganAmal = yozuv.idempotentAmal;

  /* Эски ёзув: амал номаълум. Мазмун тенг бўлса — такрор. */
  if (!saqlanganAmal) {
    return yozuv.idempotentIzi === sorov.izi
      ? { turi: 'takror', id: yozuv.id, holati: yozuv.holati }
      : { turi: 'davom', id: yozuv.id, sabab: 'qoralama-qayta' };
  }

  if (saqlanganAmal === sorov.amal) {
    if (yozuv.idempotentIzi === sorov.izi) {
      return { turi: 'takror', id: yozuv.id, holati: yozuv.holati };
    }
    /*
     * Бир хил амал, БОШҚА мазмун.
     *
     * Қоралама учун бу оддий ҳол: ходим яна бир нарса ёзиб
     * қайта сақлади. Ёзув янгиланади.
     *
     * Якуний учун эса ЭМАС: бир хонадон икки марта, ҳар
     * сафар бошқа маълумот билан якунланмайди. Буни одам
     * кўриши керак.
     */
    if (sorov.amal === 'qoralama') {
      return { turi: 'davom', id: yozuv.id, sabab: 'qoralama-qayta' };
    }
    return {
      turi: 'ziddiyat',
      id: yozuv.id,
      xabar:
        'Bu anketa allaqachon yakunlab yuborilgan, lekin ma’lumoti boshqacha. Mavjud yozuvni oching va solishtiring.',
    };
  }

  /*
   * ── ҚОРАЛАМА → ЯКУНИЙ ──
   *
   * Айнан шу ўтиш аввал ЙЎҚОЛИШГА олиб келарди. Энди у
   * АЛОҲИДА ТЕКШИРИЛАДИГАН ҳолат ўзгариши: топилган
   * қоралама ёзуви якуний маълумот билан ЯНГИЛАНАДИ.
   */
  if (saqlanganAmal === 'qoralama' && sorov.amal === 'yakuniy') {
    return { turi: 'davom', id: yozuv.id, sabab: 'qoralamadan-yakuniyga' };
  }

  /*
   * Якуний → қоралама. Тескари йўл йўқ: якунланган
   * хатловни қоралама сифатида қайта ёзиб бўлмайди.
   */
  return {
    turi: 'ziddiyat',
    id: yozuv.id,
    xabar: 'Bu anketa allaqachon yakunlangan — uni qoralama sifatida saqlab bo‘lmaydi.',
  };
}
