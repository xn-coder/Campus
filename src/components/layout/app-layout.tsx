
"use client";

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Sidebar, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { useToast } from "@/hooks/use-toast";
import SidebarWrapper from '@/components/layout/sidebar-wrapper';

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const router = useRouter();
  const { toast } = useToast();

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('currentUserRole');
      localStorage.removeItem('currentUserId');
      localStorage.removeItem('currentUserName');
      localStorage.removeItem('currentSchoolId');
    }
    toast({
      title: "Logout Successful",
      description: "You have been logged out.",
    });
    router.push('/login');
  };

  const [sidebar, ...pageContent] = React.Children.toArray(children);

  return (
    <div className="flex min-h-screen w-full">
      {sidebar}
      <SidebarInset className="flex-1 bg-background">
        <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6 py-4 md:hidden">
           <SidebarTrigger />
           <Image src="/logo.png" alt="App Logo" width={120} height={32} priority />
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-6">
          {pageContent}
        </main>
      </SidebarInset>
    </div>
  );
}
