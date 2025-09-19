
'use server';

import { createSupabaseServerClient } from '@/lib/supabaseClient';
import type { PaymentStatus, ClassData } from '@/types';

interface ReportFilters {
    paymentStatus?: 'all' | 'Paid' | 'Dues';
    classId?: string;
    date?: string; // YYYY-MM-DD
    searchTerm?: string;
}

export async function getFeeReportDataAction(params: { adminUserId: string, filters: ReportFilters }) {
    const { adminUserId, filters } = params;
    const supabase = createSupabaseServerClient();
    
    try {
        const { data: user, error: userError } = await supabase.from('users').select('school_id').eq('id', adminUserId).single();
        if (userError || !user?.school_id) throw new Error("Admin not associated with a school.");
        const schoolId = user.school_id;

        let query = supabase.from('student_fee_payments')
            .select('*, student:student_id(*, class:class_id(name, division)), fee_category:fee_category_id(name), concessions:student_fee_concessions(concession_amount)')
            .eq('school_id', schoolId);

        if (filters.paymentStatus === 'Paid') {
            query = query.eq('status', 'Paid');
        } else if (filters.paymentStatus === 'Dues') {
            query = query.in('status', ['Pending', 'Partially Paid', 'Overdue']);
        }
        
        if (filters.date) {
            query = query.eq('payment_date', filters.date);
        }

        if (filters.classId) {
            query = query.eq('student.class_id', filters.classId);
        }
        
        if (filters.searchTerm) {
            query = query.ilike('student.name', `%${filters.searchTerm}%`);
        }

        const { data: reportData, error: reportError } = await query.order('payment_date', { ascending: false });
        if (reportError) throw new Error(`Failed to fetch report data: ${reportError.message}`);

        const { data: classes, error: classesError } = await supabase.from('classes').select('*').eq('school_id', schoolId);
        if(classesError) throw new Error(`Failed to fetch classes: ${classesError.message}`);
        
        const enrichedReportData = (reportData || []).map(item => {
            const totalConcession = (item.concessions || []).reduce((sum: number, c: any) => sum + (c.concession_amount || 0), 0);
            return { ...item, total_concession: totalConcession };
        });

        // Calculate summary based on filtered data
        const summary = enrichedReportData.reduce((acc, item) => {
            acc.totalCollection += item.paid_amount;
            acc.totalConcession += item.total_concession;
            return acc;
        }, { totalCollection: 0, totalConcession: 0 });

        return { ok: true, reportData: enrichedReportData, summary, classes };

    } catch (e: any) {
        return { ok: false, message: e.message };
    }
}
