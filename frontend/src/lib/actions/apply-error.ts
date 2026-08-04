import type { FieldValues, Path, UseFormReturn } from 'react-hook-form';
import { toast } from 'sonner';
import { FORM_ERROR, type ActionFailure } from './result';

/**
 * Draws a failed `ActionResult` where it belongs: field errors onto their
 * fields, anything else into a toast. This is the only place that decision is
 * made, so an action never has to know whether the form it is serving has a
 * field of that name on screen.
 *
 * Because the errors land in react-hook-form's own state, the existing
 * `data-invalid` / `aria-invalid` markup renders them unchanged — a server-side
 * rejection looks exactly like a client-side one to the user, and no form needs
 * a second error-display path.
 */
export function applyActionError<T extends FieldValues>(
  form: UseFormReturn<T>,
  result: ActionFailure,
): void {
  const entries = Object.entries(result.fieldErrors ?? {});

  if (entries.length === 0) {
    toast.error(result.message);
    return;
  }

  // Field errors only, no toast: the summary would duplicate what is already
  // drawn under each field, and "Validation failed" beside three red inputs
  // reads as a fourth, unrelated problem.
  for (const [name, message] of entries) {
    // The server names fields as strings; `Path<T>` is a compile-time view of
    // the same names. A mismatch means the form and the request schema have
    // drifted — react-hook-form stores the error either way, and it surfaces as
    // a message with no field rather than as a crash.
    form.setError(name as Path<T>, { type: 'server', message });
  }

  // `root` is a form-level error with no input behind it, so there is nothing to
  // focus — asking react-hook-form to focus it would reach for a ref that does
  // not exist. The message is already in an alert, which is what announces it.
  const [firstName] = entries[0];
  if (firstName !== FORM_ERROR) {
    form.setFocus(firstName as Path<T>);
  }
}
