import { Text } from '@/components/ui/text';

// Ticket #41: shared copy for every estimate-showing surface.
export function Disclaimer({ className }: { className?: string }) {
  return (
    <Text variant="caption" tone="muted" className={className}>
      This is an estimate, not medical advice. Actual results vary.
    </Text>
  );
}
