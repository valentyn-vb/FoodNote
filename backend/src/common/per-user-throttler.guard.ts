import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { AuthenticatedUser } from '../auth/auth.service';

/**
 * Throttles per authenticated user instead of per IP, so several people behind
 * one NAT don't share a budget on an expensive endpoint.
 *
 * MUST be listed after JwtAuthGuard on the route — Nest populates `req.user` in
 * that guard, and guards run in declaration order:
 *
 *   @UseGuards(JwtAuthGuard, PerUserThrottlerGuard)
 *   @Throttle({ default: AI_PARSE_THROTTLE })
 *
 * It cannot be registered globally: global guards run before controller-scoped
 * ones, so `req.user` would never be set and every request would fall back to
 * the IP — silently degrading to the same behaviour as the global guard.
 *
 * Not attached to any route yet. POST /meals/ai-parse is its intended home
 * (#37 scope, contract already documents its 429) but that endpoint isn't built.
 * Note for whoever lands it: the global guard also evaluates that route's
 * @Throttle metadata under an IP tracker, and @SkipThrottle can't target one
 * guard without the other — so ai-parse ends up limited per user AND per IP.
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
