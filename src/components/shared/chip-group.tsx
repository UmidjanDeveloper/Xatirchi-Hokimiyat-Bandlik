'use client';

import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { EntityIcon } from '@/lib/icons';
import { cn } from '@/lib/utils';

export interface ChipOption {
  name: string;
  /** Eski emoji maydoni — endi ishlatilmaydi, ikona nom bo'yicha topiladi */
  icon?: string;
}

interface ChipGroupProps {
  options: ChipOption[];
  values: string[];
  onChange: (values: string[]) => void;
  /** `true` bo'lsa faqat bitta variant tanlanadi */
  single?: boolean;
  /**
   * Tanlanganda boshqa barcha tanlovlarni bekor qiladigan variant.
   * Masalan: "Hech qaysi" to'garagi.
   */
  exclusiveOption?: string;
  className?: string;
}

/**
 * Katta, bosish oson chiplar guruhi.
 *
 * MUHIM — joylashuv siljimasligi:
 * Ilgari tanlanganda ichkariga belgi qo'shilar edi va chip kengayib,
 * qatordagi qolgan chiplar joyidan siljirdi. Endi belgi `absolute`
 * holatda, chipdan tashqarida "suzadi" va chegara qalinligi doimo
 * bir xil (1px) qoladi — faqat rangi va porlashi o'zgaradi.
 * Ya'ni chip o'lchami tanlanganda ham, tanlanmaganda ham aynan bir xil.
 */
export function ChipGroup({
  options,
  values,
  onChange,
  single = false,
  exclusiveOption,
  className,
}: ChipGroupProps) {
  const handleClick = (name: string) => {
    if (single) {
      onChange(values.includes(name) ? [] : [name]);
      return;
    }

    // "Hech qaysi" bosilsa — qolganlari bekor qilinadi
    if (exclusiveOption && name === exclusiveOption) {
      onChange(values.includes(name) ? [] : [name]);
      return;
    }

    const next = values.includes(name)
      ? values.filter((v) => v !== name)
      : [...values.filter((v) => v !== exclusiveOption), name];
    onChange(next);
  };

  return (
    <div className={cn('flex flex-wrap gap-2.5', className)}>
      {options.map((option) => {
        const selected = values.includes(option.name);

        return (
          <motion.button
            key={option.name}
            type="button"
            onClick={() => handleClick(option.name)}
            whileTap={{ scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 420, damping: 26 }}
            aria-pressed={selected}
            className={cn(
              // Chegara doimo 1px — tanlov holati o'lchamga ta'sir qilmaydi
              'relative flex items-center gap-2 rounded-md border px-3.5 py-2.5',
              'text-sm font-medium transition-[color,background-color,border-color,box-shadow] duration-200',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas',
              selected
                ? 'border-accent bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] text-ink shadow-glow'
                : 'glass text-ink-muted hover:border-line-strong hover:text-ink'
            )}
          >
            <EntityIcon
              name={option.name}
              className={cn('h-[18px] w-[18px] shrink-0', selected ? 'text-accent' : 'text-ink-faint')}
            />
            <span className="leading-none">{option.name}</span>

            {/* Belgi oqimdan tashqarida — chip kengaymaydi */}
            {selected && (
              <motion.span
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 520, damping: 22 }}
                className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-accent-solid text-accent-contrast shadow-glow"
              >
                <Check className="h-3 w-3 stroke-[3.5]" />
              </motion.span>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
