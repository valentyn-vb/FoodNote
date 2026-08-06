import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * The landing deck is pinned to one appearance (see the block it asserts, in
 * landing.css), and the pin is a copy of the light set. This is what keeps the
 * copy honest — the same job `globals.spec.ts` does for the dark set's two
 * halves, and the same weak point: the selectors below hard-code the quote
 * style, the indent and the nesting that Prettier is free to reflow, so a parse
 * that has stopped matching has to fail loudly rather than compare nothing to
 * nothing.
 */

const read = (name: string) =>
  readFileSync(fileURLToPath(new URL(name, import.meta.url)), 'utf8');

function declarationsOf(block: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const [, name, value] of block.matchAll(
    /^\s*(--[\w-]+):\s*([^;]+);/gm,
  )) {
    out.set(name, value.trim());
  }
  return out;
}

function blockOf(css: string, selector: RegExp, what: string) {
  const found = [...css.matchAll(selector)].map((m) => m[1]);
  const declarations = declarationsOf(found.join('\n'));
  if (declarations.size < 20) {
    throw new Error(
      `${what} parsed to ${declarations.size} declarations — the selector regex has stopped matching.`,
    );
  }
  return declarations;
}

const globals = read('./globals.css');
const landing = read('./landing.css');

const light = blockOf(globals, /^:root \{\n([\s\S]*?)^\}/gm, 'the light set');

const dark = blockOf(
  globals,
  /^:root\[data-appearance='dark'\] \{\n([\s\S]*?)^\}/gm,
  "globals.css's :root[data-appearance='dark']",
);

const pinned = blockOf(
  landing,
  /^:root:has\(main\[data-landing\]\) \{\n([\s\S]*?)^\}/gm,
  "landing.css's :root:has(main[data-landing])",
);

describe('the landing pin', () => {
  it('covers every token the dark set overrides', () => {
    // Not "the tokens the deck reads today": the deck's surfaces are hardcoded
    // and its text is not, so a dark override added later lands on a slide with
    // a white background and nobody re-checks the deck. Covering the whole set
    // is what makes that impossible rather than unlikely.
    expect([...pinned.keys()].sort()).toEqual([...dark.keys()].sort());
  });

  it('holds the light value of each of them', () => {
    for (const [name, value] of pinned) {
      expect(value, name).toBe(light.get(name));
    }
  });

  it('pins the document to one colour-scheme too', () => {
    // Native UI — the scrollbars above all — is not covered by the tokens, and
    // a dark scrollbar down the edge of a light page is the tell.
    expect(
      /^:root:has\(main\[data-landing\]\) \{\n\s*color-scheme: only light;/m.test(
        landing,
      ),
    ).toBe(true);
  });
});
