
import { cookies } from 'next/headers';
import { getDashboardDataAction } from '@/app/dashboard/actions';
import { Sidebar, SidebarFooter, SidebarHeader, SidebarContent, SidebarTrigger, SidebarNav } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { ThemeToggleButton } from '@/components/theme-toggle-button';
import Link from 'next/link';
import Image from 'next/image';

async function getSidebarData() {
    const cookieStore = cookies();
    const userId = cookieStore.get('currentUserId')?.value;
    const userRole = cookieStore.get('currentUserRole')?.value;

    if (userId && userRole) {
        const result = await getDashboardDataAction(userId, userRole as any);
        if (result.ok && result.data) {
            return {
                sidebarCounts: result.data.sidebarCounts || {},
                isFeeDefaulter: result.data.feeStatus?.isDefaulter || false,
                lockoutMessage: result.data.feeStatus?.message || 'Feature locked due to pending fees.'
            };
        }
    }
    return { sidebarCounts: {}, isFeeDefaulter: false, lockoutMessage: '' };
}


export default async function SidebarWrapper() {
  const { sidebarCounts, isFeeDefaulter, lockoutMessage } = await getSidebarData();
  
  // This is a server component, but handleLogout must be client-side.
  // We'll keep the visual parts here and the interactive parts in a client component.
  // For simplicity, we move logout to app-layout, which is a client component.

  return (
      <Sidebar variant="sidebar" collapsible="icon" side="left">
        <SidebarHeader className="p-4 flex items-center justify-between">
          <Link href="/dashboard" className="group-data-[collapsible=icon]:hidden">
            <Image src="/logo.png" alt="App Logo" width={148} height={40} priority />
          </Link>
          <Link href="/dashboard" className="hidden group-data-[collapsible=icon]:block">
             <Image src="/logo.png" alt="App Logo" width={32} height={32} className="rounded-sm" priority />
          </Link>
          <SidebarTrigger className="group-data-[collapsible=icon]:hidden md:hidden" />
        </SidebarHeader>
        <SidebarContent className="flex-1">
          <SidebarNav 
             sidebarCounts={sidebarCounts}
             isFeeDefaulter={isFeeDefaulter}
             lockoutMessage={lockoutMessage}
          />
        </SidebarContent>
        <SidebarFooter className="p-2 border-t border-sidebar-border">
          <div className="flex flex-col gap-1 group-data-[collapsible=icon]:items-center">
            <ThemeToggleButton />
            <Button variant="ghost" className="w-full justify-start group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:w-8 group-data-[collapsible=icon]:p-0" asChild>
                {/* This button will be handled by the client-side app-layout */}
                <span data-logout-button>
                    <LogOut className="mr-2 group-data-[collapsible=icon]:mr-0" />
                    <span className="group-data-[collapsible=icon]:hidden">Logout</span>
                </span>
            </Button>
          </div>
        </SidebarFooter>
      </Sidebar>
  )
}
