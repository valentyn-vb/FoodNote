import * as React from 'react';

/**
 * Lets a component be driven either way: it keeps its own state when the
 * caller passes nothing, and defers to the caller's value when it does. The
 * rule that matters — only write local state while uncontrolled, or the two
 * copies drift — is stated once here rather than in each component.
 *
 * `onChange` always fires, controlled or not, so a caller can react to a
 * change it didn't initiate (a drawer closing itself after a save).
 */
export function useControllableState<T>(
  controlled: T | undefined,
  onChange: ((value: T) => void) | undefined,
  defaultValue: T,
): [T, (value: T) => void] {
  const [uncontrolled, setUncontrolled] = React.useState(defaultValue);
  const isControlled = controlled !== undefined;
  const value = isControlled ? controlled : uncontrolled;

  const setValue = React.useCallback(
    (next: T) => {
      if (!isControlled) setUncontrolled(next);
      onChange?.(next);
    },
    [isControlled, onChange],
  );

  return [value, setValue];
}
