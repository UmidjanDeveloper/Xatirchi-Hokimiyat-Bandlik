import { cache } from 'react';
import type { Rol } from '@prisma/client';
import { prisma } from './prisma';
import { joriySessiya } from './auth';

/**
 * ============================================================
 *  САҲИФА ҚОРОВУЛИ — БАЗАДАГИ ҲОЛАТ БЎЙИЧА
 *
 *  ── Қандай тешик ёпилди ──
 *
 *  API (`talabQil`) ҳар сўровда базадан `faol`, `rol` ва
 *  `mahallaId` ни ўқирди. Саҳифалар эса `joriySessiya()` ни
 *  чақирарди — у эса COOKIE ичидаги эски қийматни қайтаради.
 *
 *  Оқибати:
 *
 *    • Администратор ходимнинг ролини пасайтирса, у эски
 *      саҳифаларни 12 соатгача очаверарди.
 *    • Ходим бошқа МФЙ га кўчирилса, у ЭСКИ маҳалланинг
 *      рақамларини кўришда давом этарди.
 *
 *  Ёзув амаллари API орқали кетгани учун тўхтарди, аммо
 *  ЎҚИШ — яъни бегона маҳалланинг фуқаролари рўйхати —
 *  очиқ қоларди.
 *
 *  ── Нега `cache()` ──
 *
 *  Қобиқ ҳам, саҳифа ҳам шу функцияни чақиради. React'нинг
 *  `cache` си БИТТА сўров ичида натижани эслаб қолади, яъни
 *  базага барибир битта мурожаат кетади.
 *
 *  ── Нега сессия АВЛОДИ ҳам шу ерда ──
 *
 *  Парол алмашганда эски cookie ишлашдан тўхташи керак.
 *  Иккита текширувни икки жойга бўлиш — бирида эсдан
 *  чиқариш дегани.
 * ============================================================
 */

export interface JoriyXodim {
  userId: string;
  username: string;
  fullName: string;
  /** БАЗАДАН олинган — cookie'дагиси эмас */
  rol: Rol;
  /** БАЗАДАН олинган — cookie'дагиси эмас */
  mahallaId: string | null;
  mahallaNomi: string | null;
  parolAlmashtirilsin: boolean;
  /**
   * Кўриш режими: администратор бошқа ходимнинг кўзи билан
   * қараяпти. Бўш бўлса — оддий сессия.
   *
   * `korish-rejimi.ts` га қаранг.
   */
  korish?: {
    /** Ростдан ҳам ким кирган — журналда ва лентада шу туради */
    haqiqiyId: string;
    haqiqiyIsm: string;
    haqiqiyUsername: string;
  };
}

/**
 * Жорий ходим — базадаги ҲОЗИРГИ ҳолати билан.
 *
 * `null` қайтарса: сессия йўқ, муддати ўтган, ҳисоб ўчирилган
 * ёки сессия авлоди эскирган.
 */
export const joriyXodim = cache(async (): Promise<JoriyXodim | null> => {
  const sessiya = joriySessiya();
  if (!sessiya) return null;

  const user = await prisma.user.findUnique({
    where: { id: sessiya.userId },
    select: {
      username: true,
      fullName: true,
      rol: true,
      mahallaId: true,
      faol: true,
      parolAlmashtirilsin: true,
      sessiyaVersiyasi: true,
      mahalla: { select: { nomiKirill: true } },
    },
  });

  if (!user || !user.faol) return null;

  /*
   * ── СЕССИЯ АВЛОДИ ──
   *
   * Эски cookie'да бу майдон УМУМАН бўлмайди (`undefined`).
   * Уни рад этмаймиз: миграция тушган пайтда ҳамма ходим
   * бирданига чиқиб кетиши — хавфсизлик эмас, тўхташ.
   *
   * Эски cookie'лар ўз муддати (12 соат) билан ўзи тугайди,
   * янгилари эса авлод билан ҳимояланади.
   */
  const cookieAvlodi = (sessiya as { v?: number }).v;
  if (cookieAvlodi !== undefined && cookieAvlodi !== user.sessiyaVersiyasi) return null;

  /*
   * ── КЎРИШ РЕЖИМИ ──
   *
   * Cookie'да «кўз» бўлса, сайт ЎША ходимнинг роли,
   * маҳалласи ва рўйхатлари билан чизилади.
   *
   * Ҳуқуқ базадан қайта текширилади: cookie ичида ADMIN
   * деб ёзилгани кифоя эмас — администраторлик олиб
   * қўйилган бўлиши мумкин. У ҳолда «кўз» ЖИМГИНА
   * эътиборсиз қолдирилади ва одам ўз панелини кўради.
   */
  const koz = sessiya.koz;
  if (koz && koz !== sessiya.userId && user.rol === 'ADMIN') {
    const nishon = await prisma.user.findUnique({
      where: { id: koz },
      select: {
        id: true,
        username: true,
        fullName: true,
        rol: true,
        mahallaId: true,
        faol: true,
        mahalla: { select: { nomiKirill: true } },
      },
    });

    if (nishon && nishon.faol) {
      return {
        userId: nishon.id,
        username: nishon.username,
        fullName: nishon.fullName,
        rol: nishon.rol,
        mahallaId: nishon.mahallaId,
        mahallaNomi: nishon.mahalla?.nomiKirill ?? null,
        /*
         * Кўриш режимида парол экрани чиқмайди: у ХОДИМНИНГ
         * паролини алмаштиришни сўрарди ва администратор
         * бошқа одамнинг паролини қўя оларди.
         */
        parolAlmashtirilsin: false,
        korish: {
          haqiqiyId: sessiya.userId,
          haqiqiyIsm: user.fullName,
          haqiqiyUsername: user.username,
        },
      };
    }
  }

  return {
    userId: sessiya.userId,
    username: user.username,
    fullName: user.fullName,
    rol: user.rol,
    mahallaId: user.mahallaId,
    mahallaNomi: user.mahalla?.nomiKirill ?? null,
    parolAlmashtirilsin: user.parolAlmashtirilsin,
  };
});

/**
 * Сессия авлодини оширади — барча эски cookie'лар ўлади.
 *
 * Парол алмашганда ва администратор паролни тиклаганда
 * чақирилади.
 */
export async function sessiyalarniBekorQil(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { sessiyaVersiyasi: { increment: 1 } },
  });
}
