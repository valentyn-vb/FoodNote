import { MonitorIcon, MoonIcon, SunIcon } from 'lucide-react';
import type { Appearance } from '@foodnote/shared';
import type { ToggleOption } from '@/components/option-toggle';

/**
 * The three options, in one place because two controls offer them — the section
 * on /profile and the sidebar's submenu. Held here so a rename cannot leave the
 * two disagreeing about what the same value is called, and typed as the toggle's
 * own option so neither call site casts the value back to `Appearance`.
 *
 * The hint travels with the label rather than in a second table beside the
 * control that shows it: one row per appearance, so adding a fourth cannot
 * compile without one.
 *
 * Ordered light → dark → system: the two concrete appearances first, then the one
 * that defers to the device.
 */
export const APPEARANCE_OPTIONS: readonly (ToggleOption<Appearance> & {
  hint: string;
  /** Required here, unlike on the option: the sidebar's rows are icon + label. */
  Icon: NonNullable<ToggleOption['Icon']>;
})[] = [
  {
    value: 'light',
    label: 'Light',
    Icon: SunIcon,
    hint: 'Always light, whatever your device is set to.',
  },
  {
    value: 'dark',
    label: 'Dark',
    Icon: MoonIcon,
    hint: 'Always dark, whatever your device is set to.',
  },
  {
    value: 'system',
    label: 'System',
    Icon: MonitorIcon,
    hint: 'Follows your device.',
  },
];
