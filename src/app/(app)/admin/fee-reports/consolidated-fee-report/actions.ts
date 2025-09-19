
'use server';

import { createSupabaseServerClient } from '@/lib/supabaseClient';
import type { ClassData, Student, StudentFeePayment, FeeCategory } from '@/types';

interface FeeSummary {
    head: string;
    total_payable: number;
    total_paid: number;
    total_due: number;
}

export async function getConsolidatedFeeReportPageDataAction(adminUserId: string) {
    if (!adminUserId) {
        return { ok: false, message: 'Admin user not found.' };
    }
    const supabase = createSupabaseServerClient();

    try {
        const { data: user, error: userError } = await supabase.from('users').select('school_id').eq('id', adminUserId).single();
        if (userError || !user?.school_id) throw new Error(userError?.message || "Admin not associated with a school.");
        const schoolId = user.school_id;

        const { data: classes, error: classError } = await supabase
            .from('classes')
            .select('id, name, division')
            .eq('school_id', schoolId)
            .order('name');
        
        if(classError) throw new Error(classError.message);

        const { data: students, error: studentError } = await supabase
            .from('students')
            .select('id, name, class_id')
            .eq('school_id', schoolId);

        if(studentError) throw new Error(studentError.message);
        
        return {
            ok: true,
            classes: classes || [],
            students: students || []
        };
    } catch(e: any) {
        return { ok: false, message: e.message };
    }
}

export async function getStudentConsolidatedReportAction(studentId: string, schoolId: string): Promise<{ ok: boolean, summary?: FeeSummary[], message?: string }> {
    if (!studentId || !schoolId) {
        return { ok: false, message: 'Student and School ID are required.' };
    }
    const supabase = createSupabaseServerClient();
    try {
        const { data: payments, error } = await supabase
            .from('student_fee_payments')
            .select('assigned_amount, paid_amount, fee_category:fee_category_id(name)')
            .eq('student_id', studentId)
            .eq('school_id', schoolId);

        if (error) throw error;
        
        const summaryMap: Record<string, { total_payable: number, total_paid: number }> = {};

        for (const payment of payments) {
            const head = (payment.fee_category as any)?.name || 'Uncategorized';
            if (!summaryMap[head]) {
                summaryMap[head] = { total_payable: 0, total_paid: 0 };
            }
            summaryMap[head].total_payable += payment.assigned_amount;
            summaryMap[head].total_paid += payment.paid_amount;
        }

        const summary: FeeSummary[] = Object.entries(summaryMap).map(([head, totals]) => ({
            head,
            ...totals,
            total_due: totals.total_payable - totals.total_paid,
        }));
        
        return { ok: true, summary };
    } catch (e: any) {
        return { ok: false, message: e.message };
    }
}
