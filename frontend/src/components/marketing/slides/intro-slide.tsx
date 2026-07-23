import Image from 'next/image';
import { cn } from '@/lib/utils';

function Chip({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'absolute z-20 rounded-full bg-white/95 px-3 py-1.5 text-[12px] font-semibold text-text shadow-[0_4px_12px_-4px_rgba(0,0,0,0.25)]',
        className,
      )}
    >
      {children}
    </div>
  );
}

// EXPERIMENTAL layout (Flighty's "Never hear..." card): one shared,
// overflow-hidden card instead of two separate side-by-side blocks. Both
// phones overlap and are cropped by the card's own top/bottom edges rather
// than sitting fully inside it. If this doesn't hold up, the previous
// two-Block layout (text beside a single upright phone, no shared card) is
// what to restore — it's a straightforward revert, not a rebuild: swap this
// function body back to a flex row per feature, each with its own text
// beside its own phone.
export function IntroSlide() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-20 sm:px-10 sm:py-28">
      <h2 className="max-w-xl font-display text-[clamp(28px,4vw,40px)] leading-[1.1] font-semibold text-text">
        Less calculating. More living.
      </h2>

      <div className="relative mt-14 overflow-hidden rounded-[32px] bg-[#f5f5f2] px-8 py-14 sm:px-14 sm:py-20">
        <div className="relative z-10 max-w-sm">
          <p className="font-sans text-[17px] leading-[1.65] text-text/75">
            <span className="font-display font-semibold text-text">
              Describe it. We&apos;ll do the math.
            </span>{' '}
            Type what you ate. FoodNote&apos;s AI turns it into calories and
            macros in seconds, ready to review and edit before it&apos;s saved.
          </p>
        </div>
        <div className="relative z-10 mt-10 max-w-sm sm:mt-12">
          <p className="font-sans text-[17px] leading-[1.65] text-text/75">
            <span className="font-display font-semibold text-text">
              Your weight, without the guesswork.
            </span>{' '}
            Log whenever you step on the scale. Your trend and projected date
            update automatically, paced at 0.25–1.0 kg/wk, never below the
            Safety Floor.
          </p>
        </div>

        {/* Meal-logging phone: upper-right, bleeding past the card's own
            top edge (cropped by the card's overflow-hidden). */}
        <div className="absolute -top-28 right-[-8%] z-0 w-[70%] max-w-[340px] rotate-12 sm:-top-28 sm:right-[4%] sm:w-[58%]">
          <Image
            src="/inappscreens/logmeal_feature_tilt.avif"
            alt="FoodNote parsing a described meal into calories and macros"
            width={1080}
            height={1350}
            className="h-auto w-full"
          />
        </div>
        {/* Weight phone: lower and shifted left of the meal phone so they
            overlap, bleeding past the card's own bottom edge. */}
        <div className="absolute right-[8%] -bottom-20 z-[1] w-[70%] max-w-[340px] rotate-12 sm:right-[18%] sm:-bottom-20 sm:w-[58%]">
          <Image
            src="/inappscreens/logweight_feature_tilt.avif"
            alt="FoodNote's weight trend chart with a projected goal date"
            width={1080}
            height={1350}
            className="h-auto w-full"
          />
        </div>

        <Chip className="top-6 right-6">Parsed in seconds</Chip>
        <Chip className="bottom-8 left-8 sm:right-[46%] sm:left-auto">
          Never below 1,200 kcal
        </Chip>
      </div>
    </div>
  );
}
