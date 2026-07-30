'use client';

import { Toaster as Sonner, type ToasterProps } from 'sonner';
import {
  CircleCheckIcon,
  InfoIcon,
  TriangleAlertIcon,
  OctagonXIcon,
  Loader2Icon,
} from 'lucide-react';

/**
 * Feedback surface for the whole app.
 *
 * `richColors` is on, so a toast carries its meaning in the surface itself
 * rather than only in an icon — a saved meal reads as success at a glance. The
 * palette is ours: sonner's own rich colours are saturated web-safe greens and
 * reds that sit oddly against the warm paper background, so every one of its
 * `--<type>-*` variables is overridden here with a FoodNote wash (defined in
 * globals.css). Inline custom properties on this element beat sonner's own
 * `[data-sonner-toaster]` rules, which is what makes the override stick.
 */
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      // The app has one appearance. This used to ask next-themes, without a
      // provider above it, and got 'system' back — which meant a toast could go
      // dark on a light app.
      theme="light"
      richColors
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
          // Matches a stat tile or a meal row rather than a popover: a toast is
          // a small surface, and 20px on one reads as a pill.
          '--border-radius': 'var(--radius-md)',
          '--success-bg': 'var(--success-surface)',
          '--success-border': 'var(--success-border)',
          '--success-text': 'var(--success-text)',
          '--error-bg': 'var(--destructive-surface)',
          '--error-border': 'var(--destructive-border)',
          '--error-text': 'var(--destructive-text)',
          '--warning-bg': 'var(--warning-surface)',
          '--warning-border': 'var(--warning-border)',
          '--warning-text': 'var(--warning-text)',
          // Nothing in the app raises an info toast yet; keep it neutral so one
          // added later inherits the app's surface instead of sonner's blue.
          '--info-bg': 'var(--popover)',
          '--info-border': 'var(--border)',
          '--info-text': 'var(--popover-foreground)',
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: 'shadow-card',
          title: 'text-label font-semibold',
          description: 'text-caption',
          // Sonner fills the action button by inverting the toast's own colours
          // (white on near-black), which lands as a hard chip inside a soft
          // wash. The app's idiom for a secondary action is a quiet text
          // button, so this is one: `!` is needed because sonner's own
          // `[data-sonner-toast] [data-button]` rule outranks a single class.
          actionButton:
            'h-auto! bg-transparent! px-0! text-caption font-semibold text-current! underline-offset-2 hover:underline',
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
