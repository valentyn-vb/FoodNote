'use client';

import { useEffect, useRef, useState } from 'react';
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
import type { Asciify as AsciifyComponent } from '@/components/canvasui/Asciify';
import type {
  DitheredObjectProps,
  DitheredObject as DitheredObjectComponent,
} from '@/components/canvasui/DitheredObject';
import {
  SparklesIcon,
  type SparklesIconHandle,
} from '@/components/ui/sparkles';
import { useMediaQuery } from '@/hooks/use-media-query';
import { supportsHover } from '@/lib/utils';

// The mascot drags in three.js (GLTF/DRACO loaders, ~320KB gzipped) plus an
// 800KB+ .glb model, and only ever renders at lg+ — `hidden lg:block` alone
// doesn't stop React from mounting it (or the browser from fetching those
// bytes) below that breakpoint. A plain `import()` inside an effect (rather
// than a top-level `next/dynamic()`) means the chunk is only requested once
// this actually mounts: `next/dynamic()` declared at module scope gets
// preloaded by Next regardless of runtime conditions ("needs to be marked
// in the top level of the module for preloading to work" — the opposite of
// what's wanted here), so it still shipped the chunk to phones in testing.
function LazyMascot(props: DitheredObjectProps) {
  const [Loaded, setLoaded] = useState<typeof DitheredObjectComponent | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;
    import('@/components/canvasui/DitheredObject').then((mod) => {
      if (!cancelled) setLoaded(() => mod.DitheredObject);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!Loaded) return null;
  return <Loaded {...props} />;
}

// The desktop hero photo, with the Asciify cursor-lens as a progressive
// enhancement. The lens is a mouse-only delight (it follows the pointer) and
// wraps a photo that only shows at sm+, so it's pure waste on touch devices:
// it would still mount a WebGL context and run a render loop for an effect no
// one can trigger. Gating on a real pointer + width check (not just CSS)
// keeps its code and its GL context off phones/tablets entirely; the base
// <Image> renders identically with or without it (Asciify overlays a
// transparent canvas, it doesn't replace the photo), so the LCP image and its
// priority preload are unaffected and there's no swap flash on desktop.
function DesktopHeroImage() {
  const enhance = useMediaQuery(
    '(min-width: 1024px) and (hover: hover) and (pointer: fine)',
  );
  const [Asciify, setAsciify] = useState<typeof AsciifyComponent | null>(null);

  useEffect(() => {
    if (!enhance) return;
    let cancelled = false;
    import('@/components/canvasui/Asciify').then((mod) => {
      if (!cancelled) setAsciify(() => mod.Asciify);
    });
    return () => {
      cancelled = true;
    };
  }, [enhance]);

  const image = (
    <Image
      src="/inappscreens/studioshot_phoneinhand_dashboard.webp.avif"
      alt="FoodNote's dashboard open on a phone, showing remaining calories and the weight trend"
      fill
      priority
      sizes="(min-width: 1290px) 1290px, 100vw"
      className="object-cover"
    />
  );

  if (enhance && Asciify) {
    return (
      <Asciify
        radius={0.25}
        color={[0.961, 0.651, 0.361]}
        className="h-full w-full"
      >
        {image}
      </Asciify>
    );
  }
  return image;
}

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
  // Real breakpoint check, not just the `hidden lg:block` below — that CSS
  // class hides the mascot visually but doesn't stop it from mounting (or
  // three.js/the .glb from being fetched) on phones and tablets.
  const showMascot = useMediaQuery('(min-width: 1024px)');

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
          {/* The photo plus its cursor-lens enhancement. See DesktopHeroImage:
              the lens is mouse-only and gated off touch devices so it never
              mounts a WebGL context there; the photo itself (this slide's LCP
              on desktop) renders the same either way. The Asciify wrapper it
              may add forces `position: relative` inline and sizes itself with
              w-full/h-full to this aspect-ratio parent; the copy/mascot/etc.
              siblings below are absolute against the same motion.div, so
              stacking is unaffected whether or not the lens is present. */}
          <DesktopHeroImage />
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
          {showMascot && (
            <div className="hidden lg:block">
              {/* Same DitheredObject tuning as previously used on the outro (now
                moved here) — grayscale off, tight gridSize, modest environment
                intensity. Don't re-tune blind; those values were hard-won.
                orbit isn't set explicitly — it defaults to true, so dragging
                already works; the caption just needs to say so. */}
              <div className="absolute top-[50%] left-[6%] aspect-square w-[24%]">
                <LazyMascot
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
          )}
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
