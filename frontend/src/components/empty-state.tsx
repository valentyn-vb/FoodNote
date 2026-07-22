import Image from 'next/image';
import { cn } from '@/lib/utils';

export function EmptyState({
  mascotSrc,
  caption,
  className,
}: {
  mascotSrc: string;
  caption: string;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center gap-2 py-6', className)}>
      <Image src={mascotSrc} alt="" width={56} height={56} />
      <div className="font-sans text-caption text-text-muted">{caption}</div>
    </div>
  );
}
