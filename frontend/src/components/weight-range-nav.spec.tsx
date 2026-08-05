// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter } from 'next/navigation';
import { presetRange, shiftRange } from '@/lib/weight-range';
import { WeightRangeNav } from './weight-range-nav';

// Fixed instant so the rendered label doesn't depend on when the suite runs.
const NOW = new Date('2026-08-04T12:00:00Z');

const CURRENT_30D = presetRange('30D', NOW);

// The nav navigates rather than calling back, so what these assert on is the
// URL it pushes — `usePathname` is stubbed to '/' in vitest.setup.ts.
const push = vi.fn();

beforeEach(() => {
  push.mockClear();
  vi.mocked(useRouter).mockReturnValue({
    push,
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  } as unknown as ReturnType<typeof useRouter>);
});

/** The query a window is carried in, as the component spells it. */
function url({ from, to }: { from: string; to: string }) {
  return `/?from=${from}&to=${to}`;
}

describe('WeightRangeNav', () => {
  it('given the current 30D window, when rendered, then it names the span', () => {
    render(<WeightRangeNav range={CURRENT_30D} now={NOW} />);

    expect(screen.getByText('Jul 5 – Aug 4')).toBeInTheDocument();
  });

  it('given the current window, when rendered, then stepping forward is unavailable', () => {
    render(<WeightRangeNav range={CURRENT_30D} now={NOW} />);

    // Forward from the current window is the future, where the journal has
    // nothing to show.
    expect(screen.getByRole('button', { name: /later/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /earlier/i })).toBeEnabled();
  });

  it('given a past window, when rendered, then stepping forward is available again', () => {
    render(
      <WeightRangeNav range={shiftRange(CURRENT_30D, -1, NOW)} now={NOW} />,
    );

    expect(screen.getByRole('button', { name: /later/i })).toBeEnabled();
  });

  it('given any window, when stepping earlier, then it moves back one of its own lengths', async () => {
    render(<WeightRangeNav range={CURRENT_30D} now={NOW} />);

    await userEvent.click(screen.getByRole('button', { name: /earlier/i }));

    expect(push).toHaveBeenCalledWith(
      url({ from: '2026-06-05', to: '2026-07-05' }),
    );
  });

  it('given a past window, when stepping later, then it moves forward one length', async () => {
    render(
      <WeightRangeNav
        range={{ from: '2026-05-06', to: '2026-06-05' }}
        now={NOW}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /later/i }));

    expect(push).toHaveBeenCalledWith(
      url({ from: '2026-06-05', to: '2026-07-05' }),
    );
  });

  it('given a window stepped into the past, when a preset is chosen, then it returns to the window ending today', async () => {
    render(
      <WeightRangeNav
        range={{ from: '2026-04-06', to: '2026-05-06' }}
        now={NOW}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: '1 year' }));

    // Three periods back means something different per preset — 90 days at 30D,
    // three years at 1Y — so carrying the past window across a preset change
    // would jump the reader somewhere they didn't ask for.
    expect(push).toHaveBeenCalledWith(url(presetRange('1Y', NOW)));
  });

  it('given a preset’s own window, when rendered, then that preset is the pressed option', () => {
    render(<WeightRangeNav range={presetRange('6M', NOW)} now={NOW} />);

    // Base UI's ToggleGroupItem is a button carrying `aria-pressed`, not a
    // radio — asserted on the attribute a screen reader actually reads rather
    // than on the `data-pressed` the styling hangs off.
    expect(screen.getByRole('button', { name: '6 months' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: '30 days' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('given a window picked by hand, when rendered, then no preset is pressed', () => {
    render(
      <WeightRangeNav
        range={{ from: '2026-07-20', to: '2026-08-03' }}
        now={NOW}
      />,
    );

    // The contradiction the review was about: a preset staying lit over a
    // window it does not describe.
    for (const name of [
      '7 days',
      '30 days',
      '3 months',
      '6 months',
      '1 year',
    ]) {
      expect(screen.getByRole('button', { name })).toHaveAttribute(
        'aria-pressed',
        'false',
      );
    }
  });

  it('given the calendar, when two days are picked, then the window is those two days', async () => {
    render(<WeightRangeNav range={CURRENT_30D} now={NOW} />);

    await userEvent.click(
      screen.getByRole('button', { name: /pick a date range/i }),
    );
    // The calendar opens on the month the window ends in, so both days are on
    // the grid without paging it.
    await userEvent.click(screen.getByRole('button', { name: /August 1st/ }));
    // One click is a start, not a window: nothing is committed yet.
    expect(push).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: /August 3rd/ }));

    expect(push).toHaveBeenCalledWith(
      url({ from: '2026-08-01', to: '2026-08-03' }),
    );
  });

  it('given the calendar, when a day after today is looked for, then it cannot be picked', async () => {
    render(<WeightRangeNav range={CURRENT_30D} now={NOW} />);

    await userEvent.click(
      screen.getByRole('button', { name: /pick a date range/i }),
    );

    expect(screen.getByRole('button', { name: /August 5th/ })).toBeDisabled();
  });
});
