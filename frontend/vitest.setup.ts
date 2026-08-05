import { afterEach, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';

// Testing Library only self-registers cleanup when the test globals are on, and
// this repo imports `describe`/`it` explicitly instead. Without this every
// render in a file stacks up in the same document, and the second test in a
// file fails with "found multiple elements" — a confusing error a long way from
// its cause. Registered here rather than per spec so it cannot be forgotten.
//
// Imported lazily and behind the guard because @testing-library/react needs a
// DOM: a static import would break the node-environment specs, which are most
// of the suite.
if (typeof window !== 'undefined') {
  const { cleanup } = await import('@testing-library/react');
  afterEach(cleanup);
}

// The App Router isn't present under jsdom — anything nested inside
// (app)/layout.tsx (useRouter) or reaching for a close/back control
// (useRouter/usePathname) needs this or it throws on mount, not on the
// assertion. Individual tests override with vi.mocked(...).mockReturnValue
// when a specific push/back call needs asserting on.
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));

// This setup file runs for every test file, including the node-environment
// ones (pure lib/ functions, no DOM at all) — guard on window existing so
// those don't throw on a global that jsdom-environment specs are the only
// ones that actually have.
//
// jsdom implements neither matchMedia nor ResizeObserver — Base UI (via
// useMediaQuery/useIsMobile) and recharts (sizing a chart to its container)
// both touch them on mount, so a component test throws before it renders
// anything at all without these.
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}

if (typeof window !== 'undefined' && !('ResizeObserver' in window)) {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  // @ts-expect-error -- test stub, not a full implementation
  window.ResizeObserver = ResizeObserverStub;
}
