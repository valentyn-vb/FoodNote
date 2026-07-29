import type { Reflector } from '@nestjs/core';
import type { ThrottlerStorage } from '@nestjs/throttler';
import { PerUserThrottlerGuard } from './per-user-throttler.guard';

/**
 * `getTracker` is the guard's whole reason to exist, and it is the ONLY place
 * per-user throttling can be proven: an e2e test cannot distinguish it from the
 * per-IP limit, because both land on the same 10/min (see ai-parse.e2e-spec.ts).
 */
class ProbeGuard extends PerUserThrottlerGuard {
  track(req: Record<string, unknown>): Promise<string> {
    return this.getTracker(req);
  }
}

function makeGuard(): ProbeGuard {
  return new ProbeGuard(
    { throttlers: [] },
    {} as ThrottlerStorage,
    {} as Reflector,
  );
}

describe('PerUserThrottlerGuard', () => {
  it('tracks by authenticated user id, not client IP', async () => {
    const tracker = await makeGuard().track({
      user: { id: 'user-1', email: 'a@example.com' },
      ip: '203.0.113.7',
    });

    expect(tracker).toBe('user-1');
  });

  it('falls back to the client IP when no user is attached', async () => {
    const tracker = await makeGuard().track({ ip: '203.0.113.7' });

    expect(tracker).toBe('203.0.113.7');
  });
});
