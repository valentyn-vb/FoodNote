import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  'Dashboard',
  'Log a meal',
  'Log weight',
  'Settings',
] as const;

export function AppSidebar({
  active,
  className,
}: {
  active?: (typeof NAV_ITEMS)[number];
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex w-56 shrink-0 flex-col gap-8 border-r border-border bg-surface px-4 py-7',
        className,
      )}
    >
      <div className="flex items-center gap-2.25 px-1">
        <div className="font-display text-body font-semibold text-text">
          FoodNote
        </div>
      </div>
      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => (
          <div
            key={item}
            className={cn(
              'flex h-10 items-center gap-2.5 rounded-sm px-3 font-sans text-[13.5px]',
              item === active
                ? 'bg-[#FFF3E7] font-semibold text-primary-deep'
                : 'text-text-muted',
            )}
          >
            {item}
          </div>
        ))}
      </nav>
    </div>
  );
}
