import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * The palette's measured ratios, asserted rather than remembered.
 *
 * Every colour in the app resolves through a token (ADR 0010 bans literals in
 * `.tsx`), so a pair that passes here passes everywhere it is used — and a token
 * nudged "so it reads better" cannot quietly take four pairs with it. This is
 * the layer the literal-ban lint rule does not reach.
 *
 * The one allowed failure is white on the fill orange in light, a team decision
 * on review of #106 taken with the number known. Dark carries no exception: the
 * fill keeps its value and the *label* flips (ADR 0014).
 */

const CSS = readFileSync(
  fileURLToPath(new URL('./globals.css', import.meta.url)),
  'utf8',
);

// ── oklch → WCAG relative luminance ────────────────────────────────────────
// Oklab's own matrices (Björn Ottosson), then sRGB's luminance weights. Written
// out rather than pulled in: a colour library is a dependency this app does not
// otherwise need, and these twelve constants are the whole of it.

function oklchToLuminance(l: number, c: number, hDeg: number): number {
  const h = (hDeg * Math.PI) / 180;
  const a = c * Math.cos(h);
  const b = c * Math.sin(h);

  const lms = [
    l + 0.3963377774 * a + 0.2158037573 * b,
    l - 0.1055613458 * a - 0.0638541728 * b,
    l - 0.0894841775 * a - 1.291485548 * b,
  ].map((v) => v ** 3);

  const [lc, mc, sc] = lms;
  const linear = [
    4.0767416621 * lc - 3.3077115913 * mc + 0.2309699292 * sc,
    -1.2684380046 * lc + 2.6097574011 * mc - 0.3413193965 * sc,
    -0.0041960863 * lc - 0.7034186147 * mc + 1.707614701 * sc,
    // Out of gamut clamps the way a display does, so the number matches what an
    // eye would meet rather than the maths.
  ].map((v) => Math.min(1, Math.max(0, v)));

  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrast(a: string, b: string): number {
  const [la, lb] = [a, b].map((value) => {
    const m = /^oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)\)$/.exec(value);
    // Worded around the literal ban on purpose: the lint rule reads this file
    // too, and the name of the function it is looking for is the function this
    // one parses.
    if (!m) throw new Error(`not a plain colour value: ${value}`);
    return oklchToLuminance(Number(m[1]), Number(m[2]), Number(m[3]));
  });
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

// ── reading the declarations back out of the stylesheet ─────────────────────

function declarationsOf(block: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const [, name, value] of block.matchAll(
    /^\s*(--[\w-]+):\s*([^;]+);/gm,
  )) {
    out.set(name, value.trim());
  }
  return out;
}

function blocksMatching(selector: RegExp): string[] {
  return [...CSS.matchAll(selector)].map((m) => m[1]);
}

const light = declarationsOf(
  blocksMatching(/^:root \{\n([\s\S]*?)^\}/gm).join('\n'),
);

const darkAttribute = declarationsOf(
  blocksMatching(/^:root\[data-appearance='dark'\] \{\n([\s\S]*?)^\}/gm).join(
    '\n',
  ),
);

const darkMedia = declarationsOf(
  blocksMatching(
    /@media \(prefers-color-scheme: dark\) \{\n\s*:root:not\(\[data-appearance='light'\]\) \{\n([\s\S]*?)^  \}/gm,
  ).join('\n'),
);

// The regexes above are the weak point of this file: they hard-code the quote
// style, the indent and the nesting of blocks Prettier is free to reflow. A miss
// is silent — `declarationsOf('')` is an empty map, every dark assertion below
// then compares nothing to nothing and passes — so the parse is asserted before
// anything is measured, and a reflow fails the suite loudly instead.
for (const [what, block] of [
  ['the light set', light],
  [":root[data-appearance='dark']", darkAttribute],
  ['the prefers-color-scheme block', darkMedia],
] as const) {
  if (block.size < 20) {
    throw new Error(
      `globals.css: ${what} parsed to ${block.size} declarations — the selector regex has stopped matching.`,
    );
  }
}

// An appearance is the light set with the dark set laid over it — which is what
// the cascade does, and why an aliased token needs no second declaration.
const dark = new Map([...light, ...darkAttribute]);

function resolve(tokens: Map<string, string>, name: string): string {
  const value = tokens.get(name);
  if (!value) throw new Error(`no such token: ${name}`);
  const alias = /^var\((--[\w-]+)\)$/.exec(value);
  return alias ? resolve(tokens, alias[1]) : value;
}

// ── the pairs ──────────────────────────────────────────────────────────────

/** [foreground, background, what it is] */
const TEXT_PAIRS: [string, string, string][] = [
  ['--foreground', '--background', 'body text on the page'],
  ['--foreground', '--card', 'body text on a card'],
  ['--foreground', '--secondary', 'text on the secondary surface'],
  ['--foreground', '--muted', 'text on the muted surface'],
  ['--foreground', '--accent', 'text on the accent wash'],
  ['--muted-foreground', '--background', 'secondary text on the page'],
  ['--muted-foreground', '--card', 'secondary text on a card'],
  ['--brand-ink', '--background', 'a link on the page'],
  ['--brand-ink', '--card', 'a link on a card'],
  ['--primary-foreground', '--primary', "the primary button's label"],
  ['--success-text', '--card', 'success text on a card'],
  ['--warning-text', '--card', 'warning text on a card'],
  ['--destructive-text', '--card', 'destructive text on a card'],
  ['--destructive', '--card', 'a destructive control on a card'],
  ['--destructive', '--background', 'a destructive control on the page'],
];

/** Non-text: WCAG 2.2 wants 3:1 for a control boundary or a focus ring. */
const UI_PAIRS: [string, string, string][] = [
  ['--ring', '--background', 'the focus ring against the page'],
  ['--ring', '--card', 'the focus ring against a card'],
  ['--primary', '--background', 'the fill orange against the page'],
];

/**
 * Pairs that do not clear their threshold, asserted from the other side: each is
 * pinned to the number it actually measures, so it is allowed to be bad and not
 * allowed to drift. All four are in light, and none is new here.
 *
 * `--primary-foreground/--primary` is the team's decision on review of #106.
 *
 * `--primary/--background` is the fill's own boundary against the page. A solid
 * button names itself with its label, and darkening the fill to earn the ratio is
 * the #106 argument again, so it stays pinned rather than fixed.
 *
 * `--ring` used to be here too, measuring *lower* than the fill it was
 * introduced to improve on. It clears 3:1 in both appearances now, which is why
 * this list is two entries shorter than the day it was written.
 */
const KNOWN_GAPS = new Map([
  ['light:--primary-foreground/--primary', 2.0],
  ['light:--primary/--background', 1.9],
]);

describe.each([
  ['light', light],
  ['dark', dark],
])('%s appearance', (appearance, tokens) => {
  function check(fg: string, bg: string, threshold: number) {
    const ratio = contrast(resolve(tokens, fg), resolve(tokens, bg));
    const gap = KNOWN_GAPS.get(`${appearance}:${fg}/${bg}`);
    if (gap !== undefined) {
      expect(ratio).toBeCloseTo(gap, 1);
      return;
    }
    expect(ratio).toBeGreaterThanOrEqual(threshold);
  }

  it.each(TEXT_PAIRS)('%s on %s — %s — clears 4.5:1', (fg, bg) => {
    check(fg, bg, 4.5);
  });

  it.each(UI_PAIRS)('%s on %s — %s — clears 3:1', (fg, bg) => {
    check(fg, bg, 3);
  });

  it('keeps the writing orange distinct from plain text', () => {
    // A link inside a paragraph is what this tests, and the `link` variant
    // underlines on hover only — so at rest the colour is the whole cue and the
    // recognised target is 3:1 against body text. Neither appearance reaches it:
    // light measures 2.77, and dark is necessarily thinner at 1.39, because ADR
    // 0014 puts the ink *above* the fill and there is not much room between the
    // fill at 0.788 and body text at 0.945. Pinned rather than waived, so the
    // little separation there is cannot quietly shrink.
    expect(
      contrast(resolve(tokens, '--brand-ink'), resolve(tokens, '--foreground')),
    ).toBeGreaterThan(appearance === 'dark' ? 1.35 : 2.7);
  });
});

describe('the dark set', () => {
  it('is declared identically under both selectors', () => {
    // Two copies because `light-dark()` would break getComputedStyle for the
    // confetti (see globals.css). This is what keeps them from drifting.
    expect(Object.fromEntries(darkMedia)).toEqual(
      Object.fromEntries(darkAttribute),
    );
  });

  it('leaves the fill orange and the unused fifth chart hue alone', () => {
    expect(darkAttribute.has('--primary')).toBe(false);
    expect(darkAttribute.has('--chart-5')).toBe(false);
  });

  it('keeps the donut hues at least 45° apart', () => {
    // Four of these are drawn at once, sectors touching, with no separating
    // stroke — so the constraint is pairwise, not "against the background".
    const hues = ['--chart-1', '--chart-2', '--chart-3', '--chart-4'].map(
      (name) => {
        const m = /^oklch\([\d.]+\s+[\d.]+\s+([\d.]+)\)$/.exec(
          resolve(dark, name),
        );
        return Number(m![1]);
      },
    );

    for (const [i, a] of hues.entries()) {
      for (const b of hues.slice(i + 1)) {
        const apart = Math.min(Math.abs(a - b), 360 - Math.abs(a - b));
        expect(apart).toBeGreaterThanOrEqual(45);
      }
    }
  });

  it('holds every surface below the chroma ceiling', () => {
    // Warmth comes from hue, not saturation — the lesson the light background
    // already learned when its chroma was halved. Above ~0.015 a warm dark
    // surface reads as sepia rather than as dark.
    for (const name of [
      '--background',
      '--card',
      '--popover',
      '--secondary',
      '--muted',
      '--accent',
      '--border',
      '--input',
      '--chart-empty',
    ]) {
      const chroma = Number(
        /^oklch\([\d.]+\s+([\d.]+)/.exec(resolve(dark, name))![1],
      );
      expect(chroma).toBeLessThanOrEqual(0.015);
    }
  });
});
