import { ChevronDown } from 'lucide-react';

/**
 * Yig'iladigan blok: sarlavha qatori har doim ko'rinadi, ichi bosilganda ochiladi.
 *
 * Nega kerak bo'ldi: "Tahlil paneli", "Operatsion panel" va "Boshqaruv"
 * sahifalarida bir xil bloklar (AI xulosa, o'sish va kamayish, oylik oqim)
 * takrorlanardi. Takror ma'lumot o'chirilmaydi - ular har rolning o'z
 * talabi bilan qo'shilgan edi - lekin tahlil paneliga kira oladigan rolda
 * ish sahifasida YOPIQ turadi: sahifa ish bilan boshlansin, tahlil esa
 * bir bosish narida bo'lsin.
 *
 * `<details>` brauzerning o'zida ishlaydi: JavaScript kerak emas, shuning
 * uchun bu server komponenti va sahifa hajmini oshirmaydi.
 */
export function YigmaBlok({
  sarlavha,
  izoh,
  children,
  ochiq = false,
}: {
  sarlavha: string;
  izoh?: string;
  children: React.ReactNode;
  ochiq?: boolean;
}) {
  return (
    <details className="group" open={ochiq}>
      <summary className="karta flex cursor-pointer list-none items-center justify-between gap-3 p-4 [&::-webkit-details-marker]:hidden">
        <span className="min-w-0">
          <span className="block text-sm font-bold text-ink">{sarlavha}</span>
          {izoh && <span className="mt-0.5 block text-xs font-normal text-ink-faint">{izoh}</span>}
        </span>
        <ChevronDown
          className="h-4 w-4 shrink-0 text-ink-muted transition-transform group-open:rotate-180"
          aria-hidden="true"
        />
      </summary>
      <div className="mt-3 space-y-5">{children}</div>
    </details>
  );
}
