import Image from 'next/image';
import { Text } from '@/components/ui/text';
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
      <Text variant="caption" tone="muted">
        {caption}
      </Text>
    </div>
  );
}
