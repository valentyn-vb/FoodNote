import type { ZodError } from 'zod';

/**
 * What every Server Action returns.
 *
 * Expected failures are **return values, never throws**. A thrown error crossing
 * the action boundary has its `message` replaced with a generic string in a
 * production build, so "Email already registered" reaches the user as "An error
 * occurred in the Server Components render" — the one message that helps nobody.
 * Throwing stays for the genuinely unexpected, where that redaction is correct.
 *
 * The action reports *what* went wrong and, where it knows, *which field* it
 * belongs to. It never decides where the error is drawn — that is the form's
 * job, via `applyActionError`.
 */
export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; message: string; fieldErrors?: Record<string, string> };

export function ok(): ActionResult;
export function ok<T>(data: T): ActionResult<T>;
export function ok<T>(data?: T): ActionResult<T | undefined> {
  return { ok: true, data };
}

export function fail(
  message: string,
  fieldErrors?: Record<string, string>,
): ActionResult<never> {
  return { ok: false, message, fieldErrors };
}

/**
 * The action `safeParse`s its request schema as a trust boundary — a Server
 * Action is a public POST endpoint, so the client-side validation that already
 * ran proves nothing about what actually arrived. When that parse fails on a
 * well-behaved client it means the form and the request schema have drifted
 * apart, so the field errors are worth surfacing rather than swallowing.
 *
 * Only the first issue per field survives: a form field shows one message, and
 * picking the first matches what `zodResolver` does on the client.
 */
export function fieldErrorsOf(error: ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = issue.path.join('.');
    if (path && !(path in fieldErrors)) {
      fieldErrors[path] = issue.message;
    }
  }
  return fieldErrors;
}
