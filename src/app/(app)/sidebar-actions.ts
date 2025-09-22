'use server';

import { createSupabaseServerClient } from '@/lib/supabaseClient';
import type { UserRole } from '@/types';

// This is a new, separate action specifically for the client-side sidebar to fetch counts.
export async function getSidebarCountsAction(userId: string, userRole: UserRole): Promise<{
    ok: boolean;
    sidebarCounts?: {
        pendingLeaveRequests?: number;
        pendingTCRequests?: number;
        pendingAssignments?: number;
        pendingFeePayments?: number;
    },
    isFeeDefaulter?: boolean;
    lockoutMessage?: string;
    message?: string;
}> {
    if (!userId || !userRole) {
        return { ok: false, message: 'User context is missing.' };
    }
    const supabase = createSupabaseServerClient();
    const sidebarCounts: Record<string, number> = {};
    let isFeeDefaulter = false;
    let lockoutMessage = 'Feature locked due to pending fees.';

    try {
        const { data: user, error: userError } = await supabase.from('users').select('school_id').eq('id', userId).single();
        if (userError || !user) throw new Error("User not found.");
        const schoolId = user.school_id;

        switch (userRole) {
            case 'admin':
                if (schoolId) {
                    const [leaveRes, tcRes] = await Promise.all([
                        supabase.from('leave_applications').select('id', { count: 'exact', head: true }).eq('school_id', schoolId).eq('status', 'Pending'),
                        supabase.from('tc_requests').select('id', { count: 'exact', head: true }).eq('school_id', schoolId).eq('status', 'Pending'),
                    ]);
                    sidebarCounts.pendingLeaveRequests = leaveRes.count || 0;
                    sidebarCounts.pendingTCRequests = tcRes.count || 0;
                }
                break;
            case 'student':
                 const { data: student } = await supabase.from('students').select('id, school_id').eq('user_id', userId).single();
                 if(student) {
                    const { count: feeCount } = await supabase.from('student_fee_payments').select('id', {count: 'exact', head: true}).eq('student_id', student.id).in('status', ['Pending', 'Overdue']);
                    sidebarCounts.pendingFeePayments = feeCount || 0;
                    isFeeDefaulter = (feeCount || 0) > 0;
                 }
                break;
            // Add other roles as needed
        }
        return { ok: true, sidebarCounts, isFeeDefaulter, lockoutMessage };
    } catch(e: any) {
        return { ok: false, message: e.message };
    }
}
