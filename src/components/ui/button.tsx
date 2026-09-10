import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/**
 * Tugma variantlari.
 *
 * Radius `pill` emas — 8-12 px to'rtburchak, bu zamonaviyroq ko'rinadi
 * va matn uzun bo'lganda ham tartibli qoladi. Hover'da gradient siljiydi
 * va nozik porlash qo'shiladi; `disabled` holat aniq farqlanadi.
 */
const buttonVariants = cva(
  [
    'relative inline-flex items-center justify-center gap-2 whitespace-nowrap',
    'font-display font-semibold tracking-tight',
    'transition-[transform,box-shadow,background-position,opacity] duration-200 ease-out',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas',
    'disabled:pointer-events-none disabled:opacity-40 disabled:saturate-50',
    'active:scale-[0.985]',
  ].join(' '),
  {
    variants: {
      variant: {
        /* Asosiy harakat — gradient + porlash */
        default: [
          'text-accent-contrast shadow-glow',
          'bg-[linear-gradient(110deg,var(--accent-solid)_0%,var(--accent-3)_50%,var(--accent-solid)_100%)]',
          'bg-[length:220%_100%] bg-[position:0%_0] hover:bg-[position:100%_0]',
          'hover:-translate-y-[1px]',
        ].join(' '),

        /* Ikkilamchi — shisha yuza */
        outline: 'glass text-ink hover:border-line-strong hover:-translate-y-[1px]',

        secondary: 'bg-surface-strong text-ink hover:brightness-110',

        ghost: 'text-ink-muted hover:bg-surface hover:text-ink',

        link: 'text-accent underline-offset-4 hover:underline',

        /* Yakuniy tasdiq */
        success: [
          'text-accent-contrast',
          'bg-[linear-gradient(110deg,var(--ok)_0%,var(--accent-2)_55%,var(--ok)_100%)]',
          'bg-[length:220%_100%] bg-[position:0%_0] hover:bg-[position:100%_0]',
          'shadow-float hover:-translate-y-[1px]',
        ].join(' '),

        destructive: 'bg-danger-bg text-danger hover:brightness-110',
      },
      size: {
        sm: 'h-9 rounded-sm px-3 text-xs',
        default: 'h-11 rounded-md px-5 text-sm',
        lg: 'h-13 rounded-md px-7 text-[15px]',
        xl: 'h-14 rounded-lg px-9 text-base',
        icon: 'h-11 w-11 rounded-md',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
