// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WeightRangeNav } from './weight-range-nav';

// Fixed instant so the rendered label doesn't depend on when the suite runs.
const NOW = new Date('2026-08-04T12:00:00Z');

describe('WeightRangeNav', () => {
  it('given the current 30D window, when rendered, then it names the span', () => {
    render(
      <WeightRangeNav preset="30D" offset={0} now={NOW} onChange={vi.fn()} />,
    );

    expect(screen.getByText('Jul 5 – Aug 4')).toBeInTheDocument();
  });

  it('given the current window, when rendered, then stepping forward is unavailable', () => {
    render(
      <WeightRangeNav preset="30D" offset={0} now={NOW} onChange={vi.fn()} />,
    );

    // Forward from the current window is the future, where the journal has
    // nothing to show.
    expect(screen.getByRole('button', { name: /later/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /earlier/i })).toBeEnabled();
  });

  it('given a past window, when rendered, then stepping forward is available again', () => {
    render(
      <WeightRangeNav preset="30D" offset={-1} now={NOW} onChange={vi.fn()} />,
    );

    expect(screen.getByRole('button', { name: /later/i })).toBeEnabled();
  });

  it('given any window, when stepping earlier, then the offset moves back one period and the preset is kept', async () => {
    const onChange = vi.fn();
    render(
      <WeightRangeNav preset="3M" offset={-1} now={NOW} onChange={onChange} />,
    );

    await userEvent.click(screen.getByRole('button', { name: /earlier/i }));

    expect(onChange).toHaveBeenCalledWith({ preset: '3M', offset: -2 });
  });

  it('given a past window, when stepping later, then the offset moves forward one period', async () => {
    const onChange = vi.fn();
    render(
      <WeightRangeNav preset="3M" offset={-2} now={NOW} onChange={onChange} />,
    );

    await userEvent.click(screen.getByRole('button', { name: /later/i }));

    expect(onChange).toHaveBeenCalledWith({ preset: '3M', offset: -1 });
  });

  it('given a window stepped into the past, when the preset changes, then the offset resets to the current window', async () => {
    const onChange = vi.fn();
    render(
      <WeightRangeNav preset="30D" offset={-3} now={NOW} onChange={onChange} />,
    );

    await userEvent.click(screen.getByRole('button', { name: '1 year' }));

    // Three periods back means something different per preset — 90 days at 30D,
    // three years at 1Y — so carrying the offset across a preset change would
    // jump the reader somewhere they didn't ask for.
    expect(onChange).toHaveBeenCalledWith({ preset: '1Y', offset: 0 });
  });

  it('given a preset, when rendered, then it is the pressed option', () => {
    render(
      <WeightRangeNav preset="6M" offset={0} now={NOW} onChange={vi.fn()} />,
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
});
