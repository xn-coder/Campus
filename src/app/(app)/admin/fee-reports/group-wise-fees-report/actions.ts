
'use server';

import { createSupabaseServerClient } from '@/lib/supabaseClient';
import type { Student, FeeTypeGroup, StudentFeePayment } from '@/types';

interface GroupReportRow {
    student_id: string;
    student_name: string;
    roll_number?: string | null;
    total_assigned: number;
    total_paid: number;
    total_due: number;
}

export async function getGroupWiseFeesReportInitialData(adminUserId: string): Promise<{
    ok: boolean;
    feeGroups?: FeeTypeGroup[];
    message?: string;
}> {
    const supabase = createSupabaseServerClient();
    try {
        const { data: user, error: userError } = await supabase.from('users').select('school_id').eq('id', adminUserId).single();
        if (userError || !user?.school_id) throw new Error("Admin not associated with a school.");
        
        const { data: feeGroups, error: groupsError } = await supabase.from('fee_type_groups').select('*').eq('school_id', user.school_id).order('name');
        if (groupsError) throw new Error(`Failed to fetch fee groups: ${groupsError.message}`);
        
        return { ok: true, feeGroups: feeGroups || [] };
    } catch(e: any) {
        return { ok: false, message: e.message };
    }
}

export async function getGroupWiseFeesReportDataAction(params: { adminUserId: string, feeGroupId: string }): Promise<{
    ok: boolean;
    reportData?: GroupReportRow[];
    message?: string;
}> {
    const { adminUserId, feeGroupId } = params;
    const supabase = createSupabaseServerClient();
    
    try {
        const { data: user, error: userError } = await supabase.from('users').select('school_id').eq('id', adminUserId).single();
        if (userError || !user?.school_id) throw new Error("Admin not associated with a school.");
        const schoolId = user.school_id;

        const { data: payments, error: paymentsError } = await supabase
            .from('student_fee_payments')
            .select('student_id, assigned_amount, paid_amount')
            .eq('school_id', schoolId)
            .eq('fee_type_group_id', feeGroupId);
        
        if (paymentsError) throw new Error(`Failed to fetch payment data: ${paymentsError.message}`);
        
        const studentFeeMap = (payments || []).reduce((acc, p) => {
            if (!acc[p.student_id]) {
                acc[p.student_id] = { total_assigned: 0, total_paid: 0 };
            }
            acc[p.student_id].total_assigned += p.assigned_amount;
            acc[p.student_id].total_paid += p.paid_amount;
            return acc;
        }, {} as Record<string, { total_assigned: number, total_paid: number }>);
        
        const studentIds = Object.keys(studentFeeMap);
        if (studentIds.length === 0) {
            return { ok: true, reportData: [] };
        }

        const { data: students, error: studentsError } = await supabase
            .from('students')
            .select('id, name, roll_number')
            .in('id', studentIds)
            .order('name');
            
        if (studentsError) throw new Error(`Failed to fetch student details: ${studentsError.message}`);

        const reportData: GroupReportRow[] = (students || []).map(student => ({
            student_id: student.id,
            student_name: student.name,
            roll_number: student.roll_number,
            total_assigned: studentFeeMap[student.id].total_assigned,
            total_paid: studentFeeMap[student.id].total_paid,
            total_due: studentFeeMap[student.id].total_assigned - studentFeeMap[student.id].total_paid,
        }));
        
        return { ok: true, reportData };
    } catch (e: any) {
        return { ok: false, message: e.message };
    }
}
