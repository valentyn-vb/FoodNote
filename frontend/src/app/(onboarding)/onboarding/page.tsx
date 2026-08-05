import type { Metadata } from 'next';
import { OnboardingWizard } from './onboarding-wizard';

// The step the flow opens on is "Tell us about you", but the flow is named by
// what it produces, and the tab has to name the flow rather than its first step.
export const metadata: Metadata = {
  title: 'Choose your plan — FoodNote',
};

export default function OnboardingPage() {
  return <OnboardingWizard />;
}
