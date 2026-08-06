import type { Metadata } from 'next';
import { requireNotOnboarded } from '@/lib/server/session';
import { OnboardingWizard } from './onboarding-wizard';

// The step the flow opens on is "Tell us about you", but the flow is named by
// what it produces, and the tab has to name the flow rather than its first step.
export const metadata: Metadata = {
  title: 'Choose your plan — FoodNote',
};

/**
 * The gate is here rather than in `(onboarding)/layout.tsx` because the group's
 * layout has no reason to fetch: this is its only route. It replaces the client
 * `OnboardingGuard`, which gated the `(app)` group from the other side and showed
 * a full-screen spinner while it found out.
 */
export default async function OnboardingPage() {
  await requireNotOnboarded();
  return <OnboardingWizard />;
}
