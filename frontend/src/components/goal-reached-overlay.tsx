'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import confetti from 'canvas-confetti';
import { useReducedMotion } from 'motion/react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useMeals } from '@/lib/meals-context';
import { useWeight } from '@/lib/weight-context';

// The brand palette (globals.css --fn-*), so the burst reads as FoodNote rather
// than as a generic confetti library default.
const CONFETTI_COLORS = ['#f5a65c', '#e08a3c', '#5bb98c', '#f4907e'];

// Two bursts angled in from the lower corners: a single centre burst reads as a
// popup artefact, a pair reads as a room cheering.
function fireConfetti() {
  const shared = {
    particleCount: 60,
    spread: 70,
    startVelocity: 45,
    colors: CONFETTI_COLORS,
    disableForReducedMotion: true,
    zIndex: 100,
  };
  void confetti({ ...shared, angle: 60, origin: { x: 0, y: 0.7 } });
  void confetti({ ...shared, angle: 120, origin: { x: 1, y: 0.7 } });
}

/**
 * The one-shot celebration for meeting a goal. Mounted once in the (app) layout
 * because the two "Log weight" triggers live in different trees (the sidebar on
 * desktop, the dashboard button row on mobile) and both must reach it.
 *
 * Dismiss-only on purpose: the reached state persists in the dashboard banner,
 * which is where the "what next" choices live. Celebrating and deciding are
 * separate moments.
 */
export function GoalReachedOverlay() {
  const { celebrating, dismissCelebration } = useWeight();
  const { goal } = useMeals();
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (!celebrating || shouldReduceMotion) return;
    fireConfetti();
  }, [celebrating, shouldReduceMotion]);

  return (
    <Dialog
      open={celebrating}
      onOpenChange={(next) => !next && dismissCelebration()}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader className="items-center gap-2 text-center">
          <Image
            src="/mascot/celebrate.webp"
            alt=""
            width={96}
            height={96}
            priority
          />
          <DialogTitle className="font-display text-title font-semibold text-text">
            You hit your target
          </DialogTitle>
          <DialogDescription className="font-sans text-caption text-text-muted">
            {goal
              ? `You reached ${goal.targetWeightKg} kg. Your daily calories now hold you there — switch to maintenance or set a new target whenever you're ready.`
              : 'You reached your target weight.'}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <DialogClose render={<Button type="button" variant="cta" />}>
            Nice
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
