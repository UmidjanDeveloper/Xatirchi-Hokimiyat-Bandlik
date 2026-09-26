import { NextResponse } from 'next/server';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { jurnal, talabQil } from '@/lib/api-auth';
import { mahallagaRuxsat } from '@/lib/auth';
import { BAND_HOLATLAR, bekorQilingandagiHolat } from '@/lib/joylashtirish';
import { elonKuchdami, odatiyMuddat } from '@/lib/elon-muddati';
import { mustahkamlashChorasi } from '@/lib/chora-yaratish';

/**
 * ============================================================
 *  ФУҚАРОНИ ЭЪЛОНГА ЖОЙЛАШТИРИШ
 *
 *  Илгари мутахассис иш жойини қўлда терарди ва занжир шу ерда
 *  узилиб қоларди: эълон тўлгани билинмас, битта ўрин чексиз
 *  таклиф қилинаверарди.
 *
 *  Энди жойлаштириш — АЛОҲИДА АМАЛ. У бир вақтнинг ўзида:
 *    · фуқарони эълонга боғлайди;
 *    · иш жойи ва лавозимни эълондан КЎЧИРАДИ (қўлда терилмайди);
 *    · ҳаёт сиклини «жойлаштирилди» га ўтказади;
 *    · ўрин тўлса, эълонни автоматик ёпади.
 *
 *  ── Нега SERIALIZABLE ──
 *
 *  Иккита мутахассис битта охирги ўринга бир вақтда икки одам
 *  жойлаштириши мумкин: иккаласи ҳам «1 ўрин бўш» деб ўқийди,
 *  иккаласи ҳам ёзади. Одатдаги изоляция буни тўхтатмайди —
 *  саналаётган қаторлар ҳали йўқ. Serializable эса иккинчисини
 *  рад этади ва биз уни 409 билан қайтарамиз.
 * ============================================================
 */

const Yubor = z.object({
  ishsizId: z.string().cuid(),
  ishgaKirganSana: z.coerce.date().nullish(),
});

const Bekor = z.object({
  ishsizId: z.string().cuid(),
  sababi: z.string().max(500).nullish(),
});

/** Serializable тўқнашуви — фойдаланувчига тушунарли хабар */
function toqnashuv(e: unknown): NextResponse | null {
  const kod = (e as { code?: string })?.code;
  if (kod === 'P2034' || kod === '40001') {
    return NextResponse.json(
      { xabar: 'Айни дамда бошқа ходим шу эълон билан ишлаяпти. Қайта уриниб кўринг.' },
      { status: 409 }
    );
  }
  return null;
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const q = await talabQil(['BANDLIK', 'BANDLIK_RAHBAR', 'ADMIN']);
  if (q instanceof NextResponse) return q;

  const natija = Yubor.safeParse(await request.json().catch(() => null));
  if (!natija.success) {
    return NextResponse.json(
      { xabar: 'Маълумот нотўғри', tafsilot: natija.error.flatten() },
      { status: 400 }
    );
  }
  const d = natija.data;

  try {
    const javob = await prisma.$transaction(
      async (tx) => {
        const orin = await tx.vacancy.findUnique({
          where: { id: params.id },
          select: {
            id: true,
            mahallaId: true,
            faol: true,
            amalQilishMuddati: true,
            ornlarSoni: true,
            korxonaNomi: true,
            lavozim: true,
          },
        });
        if (!orin) return { xato: 'Эълон топилмади', kod: 404 } as const;
        if (!mahallagaRuxsat(q.sessiya, orin.mahallaId)) {
          return { xato: 'Бу маҳаллага ҳуқуқингиз йўқ', kod: 403 } as const;
        }
        if (!orin.faol) {
          return { xato: 'Эълон ёпилган — жойлаштириб бўлмайди', kod: 409 } as const;
        }
        /*
         * Муддати ўтган эълон базада ҳали `faol` бўлиши мумкин:
         * кунлик тозалаш ҳали ишламаган. Одамни ўша ерга
         * юбормаймиз — корхона аллақачон воз кечган бўлиши
         * мумкин, фуқаро эса бекорга бориб қайтарди.
         */
        if (!elonKuchdami(orin)) {
          return {
            xato: 'Эълоннинг амал қилиш муддати тугаган. Муддатини узайтиринг ёки корхона билан боғланинг.',
            kod: 409,
          } as const;
        }

        const odam = await tx.unemployedPerson.findUnique({
          where: { id: d.ishsizId },
          select: {
            id: true,
            fish: true,
            mahallaId: true,
            holati: true,
            vacancyId: true,
            householdId: true,
          },
        });
        if (!odam) return { xato: 'Фуқаро топилмади', kod: 404 } as const;
        if (!mahallagaRuxsat(q.sessiya, odam.mahallaId)) {
          return { xato: 'Бу фуқарога ҳуқуқингиз йўқ', kod: 403 } as const;
        }
        if (odam.vacancyId === orin.id) {
          return { ok: true, allaqachon: true } as const;
        }
        if (odam.vacancyId) {
          return {
            xato: 'Фуқаро аллақачон бошқа эълонга жойлаштирилган. Аввал ўшани бекор қилинг.',
            kod: 409,
          } as const;
        }

        const band = await tx.unemployedPerson.count({
          where: { vacancyId: orin.id, holati: { in: BAND_HOLATLAR } },
        });
        if (band >= orin.ornlarSoni) {
          return { xato: 'Бўш ўрин қолмади', kod: 409 } as const;
        }

        await tx.unemployedPerson.update({
          where: { id: odam.id },
          data: {
            vacancyId: orin.id,
            // Иш жойи ва лавозим эълондан КЎЧИРИЛАДИ: қўлда терилса,
            // бир корхона беш хил ёзилиб, ҳисобот бўлиниб кетарди.
            ishJoyi: orin.korxonaNomi,
            ishLavozimi: orin.lavozim,
            ishgaKirganSana: d.ishgaKirganSana ?? new Date(),
            radSababi: null,
            // TASDIQLANDI — якуний натижа, орқага қайтмайди
            holati: odam.holati === 'TASDIQLANDI' ? 'TASDIQLANDI' : 'JOYLASHTIRILDI',
            ...(odam.holati === 'ANIQLANDI'
              ? { suhbatSanasi: new Date(), mutaxassisId: q.sessiya.userId }
              : {}),
          },
        });

        // Ўрин тўлдими — шу ернинг ўзида ёпамиз. Кейинги сўровга
        // қолдирилса, эълон бир муддат «бўш» бўлиб турарди.
        const toldi = band + 1 >= orin.ornlarSoni;
        if (toldi) {
          await tx.vacancy.update({
            where: { id: orin.id },
            data: { faol: false, yopilishSababi: 'TOLDI', yopilganSana: new Date() },
          });
        }

        /*
         * ── ЗАНЖИРНИНГ ОХИРГИ ҲАЛҚАСИ ──
         *
         * Схемада «3 ойдан кейин текширилади» деб ёзилган эди,
         * аммо у фақат ҚЎЛДА белгиланарди — яъни биров эслаб
         * қолиши керак эди. Ҳеч ким эсламади ва одамлар
         * тўртинчи ойдан бери «жойлаштирилди» да ётаверди.
         *
         * Энди жойлаштиришнинг ЎЗИ текширув топшириғини
         * туғдиради. Муддат ўтса — кечиккан топшириқлар
         * қаторига тушади ва ҳокимнинг панелида қизил кўринади.
         *
         * Такрор яратилмайди: муаммо матни бўйича танилади.
         */
        const kirganSana = d.ishgaKirganSana ?? new Date();
        const mustahkamlash = mustahkamlashChorasi({
          ishsizId: odam.id,
          householdId: odam.householdId,
          fish: odam.fish,
          ishJoyi: orin.korxonaNomi,
          ishgaKirganSana: kirganSana,
        });
        const borTopshiriq = await tx.actionPlan.findFirst({
          where: { ishsizId: odam.id, muammo: mustahkamlash.muammo },
          select: { id: true },
        });
        if (!borTopshiriq) {
          await tx.actionPlan.create({
            data: { ...mustahkamlash, yaratganId: q.sessiya.userId },
          });
        }

        return { ok: true, fish: odam.fish, toldi, qolgan: orin.ornlarSoni - band - 1 } as const;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );

    if ('xato' in javob) {
      return NextResponse.json({ xabar: javob.xato }, { status: javob.kod });
    }

    if (!('allaqachon' in javob)) {
      await jurnal(q.sessiya.userId, 'OZGARTIRISH', {
        obyektTuri: 'UnemployedPerson',
        obyektId: d.ishsizId,
        izoh: `Эълонга жойлаштирилди: ${params.id}${javob.toldi ? ' (эълон тўлди)' : ''}`,
      });
    }

    return NextResponse.json(javob);
  } catch (e) {
    const t = toqnashuv(e);
    if (t) return t;
    throw e;
  }
}

/**
 * Жойлаштиришни бекор қилиш.
 *
 * Фуқаро ишга чиқмади, синов муддатидан ўтмади ёки хато
 * белгиланди. Ўрин бўшайди, эълон тўлгани учун ёпилган бўлса
 * ҚАЙТА ОЧИЛАДИ — қўл билан ёпилгани эса ёпиқлигича қолади.
 */
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const q = await talabQil(['BANDLIK', 'BANDLIK_RAHBAR', 'ADMIN']);
  if (q instanceof NextResponse) return q;

  const natija = Bekor.safeParse(await request.json().catch(() => null));
  if (!natija.success) {
    return NextResponse.json(
      { xabar: 'Маълумот нотўғри', tafsilot: natija.error.flatten() },
      { status: 400 }
    );
  }
  const d = natija.data;

  try {
    const javob = await prisma.$transaction(
      async (tx) => {
        const orin = await tx.vacancy.findUnique({
          where: { id: params.id },
          select: {
            id: true,
            mahallaId: true,
            ornlarSoni: true,
            faol: true,
            yopilishSababi: true,
            amalQilishMuddati: true,
          },
        });
        if (!orin) return { xato: 'Эълон топилмади', kod: 404 } as const;
        if (!mahallagaRuxsat(q.sessiya, orin.mahallaId)) {
          return { xato: 'Бу маҳаллага ҳуқуқингиз йўқ', kod: 403 } as const;
        }

        const odam = await tx.unemployedPerson.findUnique({
          where: { id: d.ishsizId },
          select: {
            id: true,
            fish: true,
            vacancyId: true,
            takliflar: true,
            suhbatSanasi: true,
          },
        });
        if (!odam) return { xato: 'Фуқаро топилмади', kod: 404 } as const;
        if (odam.vacancyId !== orin.id) {
          return { xato: 'Фуқаро шу эълонга жойлаштирилмаган', kod: 409 } as const;
        }

        await tx.unemployedPerson.update({
          where: { id: odam.id },
          data: {
            vacancyId: null,
            ishJoyi: null,
            ishLavozimi: null,
            ishgaKirganSana: null,
            holati: d.sababi?.trim() ? 'RAD_ETDI' : bekorQilingandagiHolat(odam),
            ...(d.sababi?.trim() ? { radSababi: d.sababi.trim() } : {}),
          },
        });

        // Фақат ТЎЛГАНИ учун ёпилган эълон қайта очилади
        if (!orin.faol && orin.yopilishSababi === 'TOLDI') {
          await tx.vacancy.update({
            where: { id: orin.id },
            data: {
              faol: true,
              yopilishSababi: null,
              yopilganSana: null,
              /*
               * Қайта очилаётган эълоннинг муддати ўтиб кетган
               * бўлиши мумкин — унда у очилиши биланоқ яна
               * яширинарди. Янги муддат берамиз.
               */
              ...(elonKuchdami({ faol: true, amalQilishMuddati: orin.amalQilishMuddati })
                ? {}
                : { amalQilishMuddati: odatiyMuddat() }),
            },
          });
        }

        return { ok: true, fish: odam.fish } as const;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );

    if ('xato' in javob) {
      return NextResponse.json({ xabar: javob.xato }, { status: javob.kod });
    }

    await jurnal(q.sessiya.userId, 'OZGARTIRISH', {
      obyektTuri: 'UnemployedPerson',
      obyektId: d.ishsizId,
      izoh: `Жойлаштириш бекор қилинди: ${params.id}${d.sababi ? ` — ${d.sababi}` : ''}`,
    });

    return NextResponse.json(javob);
  } catch (e) {
    const t = toqnashuv(e);
    if (t) return t;
    throw e;
  }
}
