import type { ReactNode } from 'react';
import { AppSidebar } from '@/components/app-sidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { MealsProvider } from '@/lib/meals-context';

// Shared shell for the authenticated app routes (dashboard/profile). Mobile
// gets none of this — AppSidebar and SidebarInset only activate at lg+, each
// route's own `lg:hidden` block still owns the mobile layout entirely.
// MealsProvider lives here (not in the dashboard page) so the sidebar's
// "Log a meal" trigger shares the same state as the dashboard's numbers.
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider className="lg:min-h-screen">
      <MealsProvider>
        <AppSidebar />
        <SidebarInset className="bg-bg">{children}</SidebarInset>
      </MealsProvider>
    </SidebarProvider>
  );
}
