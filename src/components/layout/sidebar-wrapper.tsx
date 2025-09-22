
import { cookies } from 'next/headers';
import { getDashboardDataAction } from '@/app/dashboard/actions';
import { Sidebar } from '@/components/ui/sidebar';

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

  return (
      <Sidebar 
         sidebarCounts={sidebarCounts}
         isFeeDefaulter={isFeeDefaulter}
         lockoutMessage={lockoutMessage}
      />
  );
}
