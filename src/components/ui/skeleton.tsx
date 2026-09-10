import { cn } from '@/lib/utils';

/** Ma'lumot yuklanayotgan paytdagi "skelet" ko'rinish */
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('animate-pulse rounded-md bg-surface-strong', className)} {...props} />;
}

export { Skeleton };
