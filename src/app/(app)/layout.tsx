"use client";

import * as React from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import AppLayout from '@/components/layout/app-layout';
import { getSidebarCountsAction } from './sidebar-actions';

export default function ApplicationLayout({ children }: { children: React.ReactNode }) {
  const [sidebarCounts, setSidebarCounts] = React.useState<Record<string, number>>({});
  const [isFeeDefaulter, setIsFeeDefaulter] = React.useState(false);
  const [lockoutMessage, setLockoutMessage] = React.useState('');

  React.useEffect(() => {
    async function fetchSidebarData() {
      const userId = localStorage.getItem('currentUserId');
      const userRole = localStorage.getItem('currentUserRole') as any;

      if (userId && userRole) {
        const result = await getSidebarCountsAction(userId, userRole);
        if (result.ok) {
          setSidebarCounts(result.sidebarCounts || {});
          setIsFeeDefaulter(result.isFeeDefaulter || false);
          setLockoutMessage(result.lockoutMessage || '');
        }
      }
    }
    fetchSidebarData();
    // Re-fetch on window focus to get latest counts
    window.addEventListener('focus', fetchSidebarData);
    return () => window.removeEventListener('focus', fetchSidebarData);
  }, []);

  return (
    <SidebarProvider 
      sidebarCounts={sidebarCounts}
      isFeeDefaulter={isFeeDefaulter}
      lockoutMessage={lockoutMessage}
    >
        <AppLayout>
          {children}
        </AppLayout>
    </SidebarProvider>
  );
}
