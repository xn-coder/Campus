
import type React from 'react';
import SidebarWrapper from '@/components/layout/sidebar-wrapper';
import AppLayout from '@/components/layout/app-layout';

export default async function ApplicationLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SidebarWrapper />
      <AppLayout>
        {children}
      </AppLayout>
    </>
  );
}
