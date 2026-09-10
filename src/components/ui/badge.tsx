import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-sm border px-2 py-0.5 font-mono text-[11px] font-semibold tabular-nums transition-colors',
  {
    variants: {
      variant: {
        default: 'border-accent/40 bg-[color-mix(in_srgb,var(--accent)_15%,transparent)] text-accent',
        secondary: 'border-line bg-surface-strong text-ink-muted',
        success: 'border-ok/40 bg-ok-bg text-ok',
        warning: 'border-warn/40 bg-warn-bg text-warn',
        pink: 'border-accent-violet/40 bg-[color-mix(in_srgb,var(--accent-3)_15%,transparent)] text-accent-violet',
        outline: 'border-line text-ink-muted',
      },
    },
    defaultVariants: { variant: 'default' },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
