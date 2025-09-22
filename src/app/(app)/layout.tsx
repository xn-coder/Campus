
"use client"; 

import { SidebarProvider } from '@/components/ui/sidebar';
import AppLayout from '@/components/layout/app-layout';
import type React from 'react';
import SidebarWrapper from '@/components/layout/sidebar-wrapper';

export default function ApplicationLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider defaultOpen>
        <AppLayout>
          <SidebarWrapper />
          {children}
        </AppLayout>
    </SidebarProvider>
  );
}
