import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { jurnal, talabQil } from '@/lib/api-auth';
import { parolXeshla, parolYaroqlimi } from '@/lib/auth';
import { ismTekshir, telefonSaqlashUchun } from '@/lib/inson-tekshiruvi';
import { shifrla, shifrniOch } from '@/lib/sir-shifrlash';

/**
 * ============================================================
 *  XODIMNI TAHRIRLASH
 *
 *  Ikki rol kiradi, lekin huquqlari har xil:
 *
 *    ADMIN          - har qanday hisobni, har qanday maydonni
 *    BANDLIK_RAHBAR - FAQAT mahalla (YETTILIK) hisoblarini
 *
 *  Cheklov shu yerda, serverda turadi. Brauzerdagi ko'rinish
 *  faqat qulaylik uchun soddalashtiriladi va unga himoya
 *  sifatida tayanilmaydi.
 * ============================================================
 */

const Tahrir = z.object({
  // Profil
  fullName: z.string().min(3).max(100).optional(),
  position: z.string().max(100).nullish(),
  telefon: z.string().max(20).nullish(),
  mahallaId: z.string().cuid().nullish(),

  // Holat va parol
  faol: z.boolean().optional(),
  yangiParol: z.string().min(8).max(200).optional(),

  /*
   * Xodim birinchi kirishda parolni almashtirishga majbur
   * qilinsinmi?
   *
   * Odatiy javob - YO'Q, va buning sababi bor. Tuman sharoitida
   * parolni eng ko'p unutadigan odam 70 ta MFY raisi. Agar har
   * biri o'ziga parol o'ylab qo'ysa, rahbar ularga yordam bera
   * olmaydi: tayinlangan nusxa eskiradi va ro'yxatda parol
   * o'rniga "ходим ўзгартирган" yozuvi qoladi.
   *
   * Shuning uchun majburlash ATAYLAB yoqiladi - masalan hisob
   * boshqa odamga o'tayotganda.
   */
  almashtirilsin: z.boolean().optional(),
});

/** Nishon hisobga tegishi mumkinmi - bir joyda hal qilinadi */
async function ruxsatTekshir(sessiyaRol: string, nishonId: string) {
  const nishon = await prisma.user.findUnique({
    where: { id: nishonId },
    select: { rol: true, username: true },
  });
  if (!nishon) return { xato: 'Ходим топилмади', kod: 404 as const };

  /*
   * Bandlik rahbari faqat mahalla hisoblariga tega oladi.
   * Nishonning roli BAZADAN o'qiladi, so'rovdan emas - so'rovga
   * ishonib bo'lmaydi. Busiz rahbar administratorning parolini
   * tiklab, uning nomidan kirib olardi.
   */
  if (sessiyaRol !== 'ADMIN' && nishon.rol !== 'YETTILIK') {
    return { xato: 'Сиз фақат маҳалла ҳисобини ўзгартира оласиз', kod: 403 as const };
  }
  return { nishon };
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const q = await talabQil(['ADMIN', 'BANDLIK_RAHBAR']);
  if (q instanceof NextResponse) return q;

  const r = await ruxsatTekshir(q.sessiya.rol, params.id);
  if ('xato' in r) return NextResponse.json({ xabar: r.xato }, { status: r.kod });

  const natija = Tahrir.safeParse(await request.json().catch(() => null));
  if (!natija.success) {
    return NextResponse.json({ xabar: 'Маълумот нотўғри' }, { status: 400 });
  }
  const d = natija.data;

  /*
   * Administrator o'zini o'chira olmaydi.
   *
   * Aks holda oxirgi administrator o'zini faolsizlantirib qo'ysa,
   * tizimga hech kim kira olmay qoladi va uni faqat bazadan qo'lda
   * tuzatish mumkin bo'ladi.
   */
  if (d.faol === false && params.id === q.sessiya.userId) {
    return NextResponse.json({ xabar: 'Ўзингизни фаолсизлантира олмайсиз' }, { status: 400 });
  }

  if (d.fullName) {
    const ism = ismTekshir(d.fullName, 'Ф.И.Ш.');
    if (!ism.ok) return NextResponse.json({ xabar: ism.xabar }, { status: 400 });
  }

  /*
   * YETTILIK mahallasiz qola olmaydi: mahalla filtri aynan shu
   * maydonga tayanadi va u bo'sh bo'lsa xodim butun tumandagi
   * oilalar ma'lumotini ko'rib qoladi.
   */
  if (d.mahallaId === null && r.nishon.rol === 'YETTILIK') {
    return NextResponse.json(
      { xabar: 'Маҳалла еттилиги аъзоси маҳалласиз бўла олмайди' },
      { status: 400 }
    );
  }

  let korsatiladiganParol: string | null = null;

  if (d.yangiParol) {
    const t = parolYaroqlimi(d.yangiParol);
    if (!t.ok) return NextResponse.json({ xabar: t.xato }, { status: 400 });
    korsatiladiganParol = d.yangiParol;
  }

  await prisma.user.update({
    where: { id: params.id },
    data: {
      ...(d.fullName ? { fullName: d.fullName.trim() } : {}),
      ...(d.position !== undefined ? { position: d.position?.trim() || null } : {}),
      ...(d.telefon !== undefined ? { phone: d.telefon ? telefonSaqlashUchun(d.telefon) : null } : {}),
      ...(d.mahallaId !== undefined ? { mahallaId: d.mahallaId } : {}),
      ...(d.faol !== undefined ? { faol: d.faol } : {}),
      ...(d.yangiParol
        ? {
            passwordHash: parolXeshla(d.yangiParol),
            // Shifrlangan nusxa - administrator keyinroq ko'rishi uchun
            berilganParol: shifrla(d.yangiParol),
            parolBerilganVaqt: new Date(),
            parolAlmashtirilsin: d.almashtirilsin === true,
          }
        : {}),
    },
  });

  const nima = d.yangiParol
    ? 'парол тайинланди'
    : d.faol !== undefined
      ? d.faol
        ? 'фаоллаштирилди'
        : 'фаолсизлантирилди'
      : 'профил таҳрирланди';

  await jurnal(q.sessiya.userId, 'OZGARTIRISH', {
    obyektTuri: 'User',
    obyektId: params.id,
    izoh: `${r.nishon.username}: ${nima}`,
  });

  return NextResponse.json({ ok: true, parol: korsatiladiganParol });
}

/**
 * Tayinlangan parolni ko'rsatadi.
 *
 * Alohida so'rov bilan olinadi, ro'yxat bilan birga emas: shunda
 * parol faqat ATAYLAB so'ralganda serverdan chiqadi va har bir
 * ko'rish audit jurnaliga tushadi. Aks holda administrator
 * sahifani ochishi bilan 70 ta parol brauzerga tushib kelardi.
 */
export async function GET(request: Request, { params }: { params: { id: string } }) {
  const q = await talabQil(['ADMIN', 'BANDLIK_RAHBAR']);
  if (q instanceof NextResponse) return q;

  const r = await ruxsatTekshir(q.sessiya.rol, params.id);
  if ('xato' in r) return NextResponse.json({ xabar: r.xato }, { status: r.kod });

  const u = await prisma.user.findUnique({
    where: { id: params.id },
    select: { berilganParol: true, parolBerilganVaqt: true },
  });

  /*
   * Nusxa yo'q. Ikki sabab bo'lishi mumkin va ular bir xil emas:
   *
   *   parolBerilganVaqt BOR  - parol tayinlangan edi, keyin xodim
   *                            uni O'ZI almashtirdi va nusxa
   *                            o'chirildi (`/api/auth/parol`).
   *   parolBerilganVaqt YO'Q - bu hisobga hech qachon parol
   *                            tayinlanmagan (eski hisoblar).
   *
   * Farqi muhim: birinchi holatda parol bor, shunchaki bizda yo'q;
   * ikkinchisida tayinlash kerak. Ro'yxat shunga qarab boshqacha
   * yozuv ko'rsatadi.
   */
  if (!u?.berilganParol) {
    return NextResponse.json({
      parol: null,
      sabab: u?.parolBerilganVaqt ? 'xodim_ozgartirgan' : 'saqlanmagan',
    });
  }

  const ochilgan = shifrniOch(u.berilganParol);
  if (!ochilgan) {
    return NextResponse.json({ parol: null, sabab: 'ochib_bolmadi' });
  }

  await jurnal(q.sessiya.userId, 'KORISH', {
    obyektTuri: 'User',
    obyektId: params.id,
    izoh: `${r.nishon.username}: парол кўрилди`,
  });

  return NextResponse.json({ parol: ochilgan, vaqti: u.parolBerilganVaqt });
}
