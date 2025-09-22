
import type React from 'react';
import SidebarWrapper from '@/components/layout/sidebar-wrapper';
import ClientLayout from './client-layout';

export default async function ApplicationLayout({ children }: { children: React.ReactNode }) {

  return (
    <ClientLayout>
        <SidebarWrapper />
        {children}
    </ClientLayout>
  );
}
