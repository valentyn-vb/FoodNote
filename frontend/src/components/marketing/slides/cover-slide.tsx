'use client';

import { useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from 'motion/react';
import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';
import { Asciify } from '@/components/canvasui/Asciify';
import { DitheredObject } from '@/components/canvasui/DitheredObject';
import {
  SparklesIcon,
  type SparklesIconHandle,
} from '@/components/ui/sparkles';
import { supportsHover } from '@/lib/utils';

function HeroCopy({ className }: { className?: string }) {
  const sparkleRef = useRef<SparklesIconHandle>(null);
  const { status } = useAuth();
  const authed = status === 'authenticated';

  return (
    <div className={className}>
      <h1 className="font-display text-pretty text-[clamp(30px,6vw,56px)] leading-[1.02] font-semibold tracking-tight text-text">
        Your calories,
        <br />
        actually tracked.
      </h1>
      <p className="font-sans text-[clamp(14px,1.6vw,18px)] leading-[1.5] text-text/75">
        AI-assisted meal logging, a weight journal that remembers, and a plan
        that adapts.
      </p>
      <div className="flex flex-row gap-3 pt-1">
        <Button
          render={<Link href={authed ? '/dashboard' : '/register'} />}
          nativeButton={false}
          variant="cta"
          className="gap-2 px-6 py-3.5"
          onMouseEnter={() =>
            supportsHover() && sparkleRef.current?.startAnimation()
          }
          onMouseLeave={() =>
            supportsHover() && sparkleRef.current?.stopAnimation()
          }
        >
          <SparklesIcon ref={sparkleRef} size={16} />
          {authed ? 'Go to dashboard' : 'Get started'}
        </Button>
        {!authed && (
          <Button
            render={<Link href="/login" />}
            nativeButton={false}
            variant="outline"
            className="border-black/10 bg-white/70 px-6 py-3.5"
          >
            Log in
          </Button>
        )}
      </div>
    </div>
  );
}

export function CoverSlide() {
  const ref = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end start'],
  });
  const rawParallaxY = useTransform(scrollYProgress, [0, 1], [0, 60]);
  const parallaxY = shouldReduceMotion ? 0 : rawParallaxY;

  return (
    <div ref={ref} className="bg-bg pb-16">
      {/* Desktop: the shot has generous empty space on the left, so the copy
          sits inside the image, like the reference. Padding lives on this
          wrapper (not the shared root) so the mobile branch below can be
          full-bleed without cancelling it back out. */}
      <div className="hidden px-10 pt-2 sm:block">
        <motion.div
          style={{ y: parallaxY }}
          className="relative mx-auto aspect-[1672/941] w-full max-w-[1290px] overflow-hidden rounded-[32px]"
        >
          {/* Cursor-only delight, reads the photo as live ascii art in a
              lens around the pointer. Ported Liquid's uHasContent fallback
              shape into this vendored shader (see Asciify.tsx): without
              drawElementImage support (no browser has it yet), the native
              path would otherwise render nothing at all — the fallback
              branch draws glyphs from values already available without
              captured content (the lens mask, per-cell hashes), tinted with
              `color`, instead of doing nothing. Wraps only the photo, as a
              sibling of the overlaid copy/mascot/etc. below, not their
              parent — pointer events over those overlays bubble through
              their own ancestry, never through this wrapper, so the effect
              stays inert over text and buttons and only activates on the
              plain photo. Mouse-only by nature (no touch on mobile), and
              mobile already uses a separate, simpler hero image entirely.
              Canvas UI's root forces `position: relative` via inline style,
              which beats an `absolute` utility class — sizing it with
              w-full/h-full instead lets it size to this aspect-ratio parent
              as a normal first child; the later siblings are already
              absolute against the same motion.div, so stacking is unaffected. */}
          <Asciify
            radius={0.25}
            color={[0.961, 0.651, 0.361]}
            className="h-full w-full"
          >
            <Image
              src="/inappscreens/studioshot_phoneinhand_dashboard.webp.avif"
              alt="FoodNote's dashboard open on a phone, showing remaining calories and the weight trend"
              fill
              priority
              sizes="(min-width: 1290px) 1290px, 100vw"
              className="object-cover"
            />
          </Asciify>
          <div className="absolute top-[15%] left-[5%] max-w-[46%]">
            <HeroCopy className="flex flex-col gap-4" />
          </div>
          {/* Hidden below lg: the copy block's buttons need real pixel height
            regardless of hero width, but this row's own top-50%/58% start
            points are % of the hero's height — at tablet widths the hero
            gets short enough (measured: 640-900px viewport) that the two
            blocks collide. 1024px+ is the first point with confirmed
            clearance (measured 14px+ gap), so the whole group waits for it
            rather than fighting a losing per-value tuning battle. */}
          <div className="hidden lg:block">
            {/* Same DitheredObject tuning as previously used on the outro (now
              moved here) — grayscale off, tight gridSize, modest environment
              intensity. Don't re-tune blind; those values were hard-won.
              orbit isn't set explicitly — it defaults to true, so dragging
              already works; the caption just needs to say so. */}
            <div className="absolute top-[50%] left-[6%] aspect-square w-[24%]">
              <DitheredObject
                src="/mascot/foodnotemascotin3d.glb"
                className="h-full w-full cursor-grab active:cursor-grabbing"
                grayscale={false}
                gridSize={2.5}
                scale={2.6}
                autoRotate
                autoRotateSpeed={0.6}
                floatIntensity={0.4}
                floatSpeed={0.8}
                highlight="#f5a65c"
                environmentIntensity={0.4}
                background=""
              />
            </div>
            {/* Same line as the nav tooltip, restated here as a quiet footnote
              since it's the hamster's own explanation, not the nav's. */}
            <p className="absolute top-[93%] left-[6%] max-w-[220px] font-sans text-[11px] leading-[1.3] text-text/40 italic">
              Hamsters hoard food but almost never overeat. Kindred spirits.
            </p>
            {/* Positioned beside the mascot's own row (not under the headline)
              so the two never compete for the same horizontal band. */}
            <div className="absolute top-[58%] left-[32%] w-[22%] max-w-[200px]">
              <div className="rounded-2xl bg-white/90 px-3.5 py-2.5 shadow-[0_8px_20px_-8px_rgba(0,0,0,0.25)]">
                <p className="font-[family-name:var(--font-accent-serif)] text-[14px] leading-[1.3] text-text italic">
                  Meet Hammy, your new AI calorie-tracking pet.
                </p>
                <p className="mt-1 font-sans text-[10.5px] text-text-muted">
                  Drag him. He doesn&apos;t mind.
                </p>
              </div>
            </div>
            {/* Every value here is a % of the hero box, same as the mascot and
              caption above, so the gap between them (and this arrow bridging
              it) holds at any hero width in the range this group renders at. */}
            <svg
              viewBox="0 0 110 50"
              fill="none"
              className="absolute top-[61%] left-[21%] aspect-[110/50] w-[9%] text-text/35 select-none"
            >
              <path
                d="M100 8C70 8 35 20 14 32"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeDasharray="1.5 6"
              />
              {/* Legs computed from the curve's actual arrival tangent at
                (14,32) (derived from its end control point (35,20)), not
                eyeballed — that's what was throwing the previous chevron
                off-angle from the dots. */}
              <path
                d="M22 21L14 32L28 31"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </motion.div>
      </div>

      {/* Mobile: this crop has no equivalent empty space (the phone fills the
          frame), so the copy sits above the image instead of colliding with
          it — same split the Craft reference itself uses between breakpoints.
          This branch owns its own bg (matching the photo's own top tone) and
          has no horizontal/bottom padding of its own, so the color and the
          image both bleed edge to edge; only the copy gets an inner inset. */}
      <div className="bg-[#9B999E] pt-28 sm:hidden">
        <HeroCopy className="flex flex-col gap-4 px-6 pb-8 text-center [&>div]:justify-center" />
        <motion.div
          style={{ y: parallaxY }}
          className="relative aspect-[1080/1350] w-full overflow-hidden"
        >
          <Image
            src="/inappscreens/mobile_hero_dashboard.avif"
            alt="FoodNote's dashboard open on a phone, showing remaining calories and the weight trend"
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        </motion.div>
      </div>
    </div>
  );
}
