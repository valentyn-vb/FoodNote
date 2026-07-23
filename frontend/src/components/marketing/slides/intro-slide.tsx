import Image from 'next/image';
import { ScrollReveal } from '@/components/marketing/scroll-reveal';
import { MascotPeek } from '@/components/marketing/mascot-peek';
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
        'absolute z-10 rounded-full bg-white/95 px-3 py-1.5 text-[12px] font-semibold text-text shadow-[0_4px_12px_-4px_rgba(0,0,0,0.25)]',
        className,
      )}
    >
      {children}
    </div>
  );
}

function Block({
  image,
  imageAlt,
  chip,
  chipClassName,
  mascot,
  mascotClassName,
  imageBg,
  title,
  description,
  reverse,
}: {
  image: string;
  imageAlt: string;
  chip: string;
  chipClassName: string;
  mascot: string;
  mascotClassName: string;
  imageBg: string;
  title: string;
  description: string;
  reverse?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-8 sm:flex-row sm:gap-12',
        reverse && 'sm:flex-row-reverse',
      )}
    >
      {/* aspect-square + object-contain + padding, not object-cover — these
          screenshots are tall app crops (~370x662), forcing them into a
          landscape frame via cover just cut off the top/bottom content. The
          padding leaves colored gutter on the sides for the mascot to sit
          in, fully inside the blob, instead of bleeding across its rounded
          edge (their own backing isn't transparent, so crossing the curve
          reads as a collision, not a sticker). */}
      <div
        className={cn(
          'relative aspect-square w-full max-w-[280px] overflow-hidden rounded-[28px] sm:flex-1',
          imageBg,
        )}
      >
        <Chip className={chipClassName}>{chip}</Chip>
        {/* Padding lives on the image itself, not the container — `fill`
            positions edge-to-edge regardless of the parent's own padding. */}
        <Image src={image} alt={imageAlt} fill className="object-contain p-9" />
        <MascotPeek src={mascot} className={mascotClassName} rotate={-6} />
      </div>
      <ScrollReveal className="sm:flex-1">
        <h3 className="font-display text-[clamp(22px,3vw,28px)] font-semibold text-text">
          {title}
        </h3>
        <p className="mt-3 max-w-md font-sans text-[15px] leading-[1.55] text-text/75">
          {description}
        </p>
      </ScrollReveal>
    </div>
  );
}

export function IntroSlide() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-20 sm:px-10 sm:py-28">
      <h2 className="max-w-xl font-display text-[clamp(28px,4vw,40px)] leading-[1.1] font-semibold text-text">
        Less logging. More living.
      </h2>

      <div className="mt-14 flex flex-col gap-16 sm:gap-24">
        <Block
          image="/inappscreens/ai_meal_logging_feature.avif"
          imageAlt="FoodNote parsing a described meal into calories and macros"
          chip="Parsed in seconds"
          chipClassName="top-4 right-4"
          mascot="/mascot/foodnotemascotfoodprep.avif"
          mascotClassName="bottom-3 left-3 size-12 sm:size-14"
          imageBg="bg-gradient-to-br from-[#fde3da] to-[#fbeee6]"
          title="Describe it. We'll do the math."
          description="Type what you ate. FoodNote's AI turns it into calories and macros in seconds, ready to review and edit before it's saved."
        />
        <Block
          image="/inappscreens/weight_logging_feature.avif"
          imageAlt="FoodNote's weight trend chart with a projected goal date"
          chip="Never below 1,200 kcal"
          chipClassName="bottom-4 left-4"
          mascot="/mascot/foodnotemascotmuscly.avif"
          mascotClassName="top-3 right-3 size-12 sm:size-14"
          imageBg="bg-gradient-to-br from-[#dcf0e4] to-[#eef7f0]"
          title="Your weight, without the guesswork."
          description="Log whenever you step on the scale. Your trend and projected date update automatically, paced at 0.25–1.0 kg/wk, never below the Safety Floor."
          reverse
        />
      </div>
    </div>
  );
}
