
"use client";

import * as React from 'react';
import { Sidebar, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import Image from 'next/image';

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [pageContent] = React.Children.toArray(children);

  return (
    <>
      <Sidebar />
      <SidebarInset className="flex-1 bg-background">
        <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6 py-4 md:hidden">
           <SidebarTrigger />
           <Image src="/logo.png" alt="App Logo" width={120} height={32} priority />
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-6">
          {pageContent}
        </main>
      </SidebarInset>
    </>
  );
}
