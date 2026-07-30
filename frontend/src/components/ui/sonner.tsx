'use client';

import { useTheme } from 'next-themes';
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
  const { theme = 'system' } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
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
          '--success-bg': 'var(--fn-success-bg)',
          '--success-border': 'var(--fn-success-border)',
          '--success-text': 'var(--fn-success-text)',
          '--error-bg': 'var(--fn-error-bg)',
          '--error-border': 'var(--fn-error-border)',
          '--error-text': 'var(--fn-error-text)',
          '--warning-bg': 'var(--fn-warning-bg)',
          '--warning-border': 'var(--fn-warning-border)',
          '--warning-text': 'var(--fn-warning-text)',
          // Nothing in the app raises an info toast yet; keep it neutral so one
          // added later inherits the app's surface instead of sonner's blue.
          '--info-bg': 'var(--popover)',
          '--info-border': 'var(--border)',
          '--info-text': 'var(--popover-foreground)',
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: 'font-sans shadow-card',
          title: 'font-sans text-label font-semibold',
          description: 'font-sans text-caption',
          // Sonner fills the action button by inverting the toast's own colours
          // (white on near-black), which lands as a hard chip inside a soft
          // wash. The app's idiom for a secondary action is a quiet text
          // button, so this is one: `!` is needed because sonner's own
          // `[data-sonner-toast] [data-button]` rule outranks a single class.
          actionButton:
            'h-auto! bg-transparent! px-0! font-sans text-caption font-semibold text-current! underline-offset-2 hover:underline',
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
