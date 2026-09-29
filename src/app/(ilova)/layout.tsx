import { redirect } from 'next/navigation';
import { joriyXodim } from '@/lib/sahifa-auth';
import { AppShell } from '@/components/shell/app-shell';
import { SessiyaQorovuli } from '@/components/shell/sessiya-qorovuli';
import { KorishLentasi } from '@/components/shell/korish-lentasi';
import { ROL_NOMI } from '@/components/shell/navigatsiya';
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
  /*
   * ── БИТТА ҚОРОВУЛ ──
   *
   * Аввал бу ерда cookie ўқилиб, базадан алоҳида сўров
   * кетарди, саҳифалар эса ЯНА cookie'ни ўқирди. Иккита
   * манба — иккита ҳақиқат.
   *
   * Энди иккови ҳам `joriyXodim()` ни чақиради. У `cache()`
   * билан ўралган, яъни битта сўров ичида базага барибир
   * битта мурожаат кетади.
   */
  const xodim = await joriyXodim();
  if (!xodim) redirect('/kirish');

  // Boshlang'ich parol almashtirilmaguncha boshqa sahifalar ochilmaydi
  if (xodim.parolAlmashtirilsin) redirect('/parol-almashtirish');

  const alifbo = alifboServer();

  return (
    <AlifboProvider boshlangich={alifbo}>
      {/*
        ── КЎРИШ РЕЖИМИ ──

        Администратор бошқа ходимнинг кўзи билан қараётган
        бўлса, экраннинг энг тепасида доимий лента туради.
        У қобиқдан ТАШҚАРИДА: қобиқ сурилиб кетса ҳам лента
        жойида қолсин.
      */}
      {xodim.korish && (
        <KorishLentasi
          nishonIsmi={xodim.fullName}
          nishonRoli={ROL_NOMI[xodim.rol]}
          haqiqiyIsm={xodim.korish.haqiqiyIsm}
        />
      )}
      <AppShell
        fullName={xodim.fullName}
        /*
          Қобиққа ҲАҚИҚИЙ логин берилади. Чиқишда телефон
          хотираси ЎША ҳисобники бўйича тозаланади — кўриш
          режимида бегона ходимнинг қораламаси ўчиб
          кетмасин.
        */
        username={xodim.korish?.haqiqiyUsername ?? xodim.username}
        rol={xodim.rol}
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
        mahallaNomi={xodim.mahallaNomi}
      >
        {/*
          Бир браузерда битта cookie бўлади: иккинчи ойнада
          бошқа ҳисобга кирилса, БУ ойнадаги сессия ҳам
          алмашади. Қоровул шуни пайқаб, ишни давом эттиришга
          йўл қўймайди — акс ҳолда амаллар бошқа одам номидан
          бажарилиб кетарди.
        */}
        {/*
          Қоровулга ҲАҚИҚИЙ ҳисоб берилади. Кўриш режимида
          экранда бошқа ходимнинг панели турибди, лекин
          cookie ҳамон администраторники — қоровул ўшани
          солиштиради ва бекордан-бекорга огоҳлантирмайди.
        */}
        <SessiyaQorovuli username={xodim.korish?.haqiqiyUsername ?? xodim.username} />
        {children}
      </AppShell>
    </AlifboProvider>
  );
}
