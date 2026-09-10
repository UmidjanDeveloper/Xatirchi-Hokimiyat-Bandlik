import * as React from 'react';
import { cn } from '@/lib/utils';

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => (
    <textarea
      className={cn(
        'flex min-h-[110px] w-full rounded-md border border-line bg-surface px-4 py-3 text-base text-ink transition-colors',
        'placeholder:text-ink-faint',
        'focus-visible:outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/40',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      ref={ref}
      {...props}
    />
  )
);
Textarea.displayName = 'Textarea';

export { Textarea };
