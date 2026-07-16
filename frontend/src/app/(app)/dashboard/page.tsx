import { DesktopDashboard } from './desktop-dashboard';
import { MobileDashboard } from './mobile-dashboard';

// Mobile and desktop are separate layouts over the same route and data,
// per docs/design/foodnote-design-summary.md — each owns one breakpoint.
export default function DashboardPage() {
  return (
    <>
      <MobileDashboard />
      <DesktopDashboard />
    </>
  );
}
