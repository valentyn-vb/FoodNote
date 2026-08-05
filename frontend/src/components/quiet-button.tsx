import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * The second action in a drawer step's footer: `ghost`, the shape the meal
 * drawer's title-bar "Back to AI Input" has, rather than the muted `link` these
 * used to be — under a full-width primary that read as fine print.
 *
 * Full height, not `sm`: `sm`'s 32px under a 40px primary looked like a caption
 * that happened to be clickable, and this is a real branch of the flow.
 *
 * Muted until approached: at rest it must not compete with the primary above it,
 * and `hover:text-foreground` is what says it is a control. Auto width, never
 * `w-full` — two buttons of one width read as two equal choices.
 *
 * A component rather than the same four classes typed at each site: the third
 * copy of them was `SaveToMyMealsButton`, sitting in the very same footer.
 */
export function QuietButton({
  className,
  ...props
}: React.ComponentProps<typeof Button>) {
  return (
    <Button
      type="button"
      variant="ghost"
      className={cn(
        'gap-1 text-muted-foreground hover:text-foreground',
        className,
      )}
      {...props}
    />
  );
}
