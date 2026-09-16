import { redirect } from 'next/navigation';
import { joriySessiya } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { AppShell } from '@/components/shell/app-shell';
import { SessiyaQorovuli } from '@/components/shell/sessiya-qorovuli';
import { AlifboProvider } from '@/components/alifbo/alifbo-provider';
import { alifboServer } from '@/lib/alifbo-server';

/**
 * Tizimga kirgan xodimlar uchun umumiy qobiq.
 *
 * Sessiya bu yerda bir marta o'qiladi va bazadan tekshiriladi -
 * har bir sahifa uni qaytadan tekshirmaydi. Middleware faqat
 * cookie borligini ko'radi, haqiqiy qo'riqchi shu.
 */
export default async function IlovaLayout({ children }: { children: React.ReactNode }) {
  const sessiya = joriySessiya();
  if (!sessiya) redirect('/kirish');

  const user = await prisma.user.findUnique({
    where: { id: sessiya.userId },
    select: {
      username: true,
      fullName: true,
      rol: true,
      faol: true,
      parolAlmashtirilsin: true,
      mahalla: { select: { nomiKirill: true } },
    },
  });

  // Xodim ishdan bo'shatilgan bo'lsa, cookie hali yaroqli bo'lsa ham kirmaydi
  if (!user || !user.faol) redirect('/kirish');

  // Boshlang'ich parol almashtirilmaguncha boshqa sahifalar ochilmaydi
  if (user.parolAlmashtirilsin) redirect('/parol-almashtirish');

  const alifbo = alifboServer();

  return (
    <AlifboProvider boshlangich={alifbo}>
      <AppShell
        fullName={user.fullName}
        rol={user.rol}
        /*
          Qobiq HAM kirill nomini oladi va uni o'zi o'giradi.
          Ilgari lotin uchun `nomi` ustuni ishlatilardi va natijada
          bitta ekranda ikki xil yozuv chiqardi: sarlavhada
          "Chechak ota MFY", sahifada esa "Chechakota MFY".

          Sabab - tasdiqlangan ro'yxatning o'zida lotin va kirill
          nomlari har doim ham mos kelmaydi (70 tadan 16 tasi).
          Endi butun interfeys bitta manbadan - kirill nomidan -
          o'giriladi, shuning uchun hamma joyda bir xil yoziladi.
        */
        mahallaNomi={user.mahalla?.nomiKirill}
      >
        {/*
          Бир браузерда битта cookie бўлади: иккинчи ойнада
          бошқа ҳисобга кирилса, БУ ойнадаги сессия ҳам
          алмашади. Қоровул шуни пайқаб, ишни давом эттиришга
          йўл қўймайди — акс ҳолда амаллар бошқа одам номидан
          бажарилиб кетарди.
        */}
        <SessiyaQorovuli username={user.username} />
        {children}
      </AppShell>
    </AlifboProvider>
  );
}
