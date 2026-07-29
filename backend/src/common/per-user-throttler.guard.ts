import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { AuthenticatedUser } from '../auth/auth.service';

/**
 * Throttles by authenticated user instead of client IP, so one account cannot
 * burn an expensive endpoint's budget from many addresses.
 *
 * MUST be listed after JwtAuthGuard on the route — Nest populates `req.user` in
 * that guard, and guards run in declaration order:
 *
 *   @UseGuards(JwtAuthGuard, PerUserThrottlerGuard)
 *   @Throttle({ default: AI_PARSE_THROTTLE })
 *
 * It cannot be registered globally: global guards run before controller-scoped
 * ones, so `req.user` would never be set and every request would fall back to
 * the IP — silently degrading to the same behaviour as the global guard. The
 * per-route `getTracker` that @Throttle accepts has the same problem, since it
 * still executes inside the global guard.
 *
 * ACCEPTED CONSEQUENCE: the route ends up limited per user AND per IP at the
 * same number. The global guard reads the very same @Throttle metadata under an
 * IP tracker, and @SkipThrottle cannot target one guard without the other
 * (it would remove both limits). So this guard adds a per-account cap; it does
 * NOT give users behind one NAT independent budgets — they still share the
 * per-IP bucket. Only the unit spec can observe the per-user tracking.
 */
@Injectable()
export class PerUserThrottlerGuard extends ThrottlerGuard {
  protected getTracker(req: Record<string, unknown>): Promise<string> {
    const user = req.user as AuthenticatedUser | undefined;
    // The IP fallback should be unreachable behind JwtAuthGuard; it keeps the
    // guard safe rather than throttling everyone under one `undefined` key.
    return Promise.resolve(user?.id ?? (req.ip as string));
  }
}
