// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { presetRange, shiftRange } from '@/lib/weight-range';
import { WeightRangeNav } from './weight-range-nav';

// Fixed instant so the rendered label doesn't depend on when the suite runs.
const NOW = new Date('2026-08-04T12:00:00Z');

const CURRENT_30D = presetRange('30D', NOW);

describe('WeightRangeNav', () => {
  it('given the current 30D window, when rendered, then it names the span', () => {
    render(<WeightRangeNav range={CURRENT_30D} now={NOW} onChange={vi.fn()} />);

    expect(screen.getByText('Jul 5 – Aug 4')).toBeInTheDocument();
  });

  it('given the current window, when rendered, then stepping forward is unavailable', () => {
    render(<WeightRangeNav range={CURRENT_30D} now={NOW} onChange={vi.fn()} />);

    // Forward from the current window is the future, where the journal has
    // nothing to show.
    expect(screen.getByRole('button', { name: /later/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /earlier/i })).toBeEnabled();
  });

  it('given a past window, when rendered, then stepping forward is available again', () => {
    render(
      <WeightRangeNav
        range={shiftRange(CURRENT_30D, -1, NOW)}
        now={NOW}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: /later/i })).toBeEnabled();
  });

  it('given any window, when stepping earlier, then it moves back one of its own lengths', async () => {
    const onChange = vi.fn();
    render(
      <WeightRangeNav range={CURRENT_30D} now={NOW} onChange={onChange} />,
    );

    await userEvent.click(screen.getByRole('button', { name: /earlier/i }));

    expect(onChange).toHaveBeenCalledWith({
      from: '2026-06-05',
      to: '2026-07-05',
    });
  });

  it('given a past window, when stepping later, then it moves forward one length', async () => {
    const onChange = vi.fn();
    render(
      <WeightRangeNav
        range={{ from: '2026-05-06', to: '2026-06-05' }}
        now={NOW}
        onChange={onChange}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /later/i }));

    expect(onChange).toHaveBeenCalledWith({
      from: '2026-06-05',
      to: '2026-07-05',
    });
  });

  it('given a window stepped into the past, when a preset is chosen, then it returns to the window ending today', async () => {
    const onChange = vi.fn();
    render(
      <WeightRangeNav
        range={{ from: '2026-04-06', to: '2026-05-06' }}
        now={NOW}
        onChange={onChange}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: '1 year' }));

    // Three periods back means something different per preset — 90 days at 30D,
    // three years at 1Y — so carrying the past window across a preset change
    // would jump the reader somewhere they didn't ask for.
    expect(onChange).toHaveBeenCalledWith(presetRange('1Y', NOW));
  });

  it('given a preset’s own window, when rendered, then that preset is the pressed option', () => {
    render(
      <WeightRangeNav
        range={presetRange('6M', NOW)}
        now={NOW}
        onChange={vi.fn()}
      />,
    );

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
        onChange={vi.fn()}
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
    const onChange = vi.fn();
    render(
      <WeightRangeNav range={CURRENT_30D} now={NOW} onChange={onChange} />,
    );

    await userEvent.click(
      screen.getByRole('button', { name: /pick a date range/i }),
    );
    // The calendar opens on the month the window ends in, so both days are on
    // the grid without paging it.
    await userEvent.click(screen.getByRole('button', { name: /August 1st/ }));
    // One click is a start, not a window: nothing is committed yet.
    expect(onChange).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: /August 3rd/ }));

    expect(onChange).toHaveBeenCalledWith({
      from: '2026-08-01',
      to: '2026-08-03',
    });
  });

  it('given the calendar, when a day after today is looked for, then it cannot be picked', async () => {
    render(<WeightRangeNav range={CURRENT_30D} now={NOW} onChange={vi.fn()} />);

    await userEvent.click(
      screen.getByRole('button', { name: /pick a date range/i }),
    );

    expect(screen.getByRole('button', { name: /August 5th/ })).toBeDisabled();
  });
});
