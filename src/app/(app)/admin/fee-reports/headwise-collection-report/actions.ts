
'use server';

import { createSupabaseServerClient } from '@/lib/supabaseClient';
import type { ClassData, FeeCategory } from '@/types';

interface ReportFilters {
    paymentStatus?: 'all' | 'Paid' | 'Dues';
    classId?: string;
    startDate?: string; // YYYY-MM-DD
    endDate?: string;   // YYYY-MM-DD
    searchTerm?: string;
    feeCategoryId?: string;
}

export async function getHeadwiseFeeReportDataAction(params: { adminUserId: string, filters: ReportFilters }) {
    const { adminUserId, filters } = params;
    const supabase = createSupabaseServerClient();
    
    try {
        const { data: user, error: userError } = await supabase.from('users').select('school_id').eq('id', adminUserId).single();
        if (userError || !user?.school_id) throw new Error("Admin not associated with a school.");
        const schoolId = user.school_id;

        let query = supabase.from('student_fee_payments')
            .select('*, student:student_id(*, class:class_id(name, division)), fee_category:fee_category_id(name), concessions:student_fee_concessions(concession_amount)')
            .eq('school_id', schoolId)
            .is('installment_id', null); // <-- EXCLUDE INSTALLMENT-BASED FEES

        if (filters.paymentStatus === 'Paid') {
            query = query.eq('status', 'Paid');
        } else if (filters.paymentStatus === 'Dues') {
            query = query.in('status', ['Pending', 'Partially Paid', 'Overdue']);
        }
        
        if (filters.startDate) {
            query = query.gte('payment_date', filters.startDate);
        }
        if (filters.endDate) {
            query = query.lte('payment_date', filters.endDate);
        }

        if (filters.classId) {
            query = query.eq('student.class_id', filters.classId);
        }

        if (filters.feeCategoryId) {
            query = query.eq('fee_category_id', filters.feeCategoryId);
        }
        
        if (filters.searchTerm) {
            query = query.ilike('student.name', `%${filters.searchTerm}%`);
        }

        const { data: reportData, error: reportError } = await query.order('payment_date', { ascending: false });
        if (reportError) throw new Error(`Failed to fetch report data: ${reportError.message}`);

        const [classesRes, feeCategoriesRes] = await Promise.all([
            supabase.from('classes').select('*').eq('school_id', schoolId),
            supabase.from('fee_categories').select('*').eq('school_id', schoolId)
        ]);

        if(classesRes.error) throw new Error(`Failed to fetch classes: ${classesRes.error.message}`);
        if(feeCategoriesRes.error) throw new Error(`Failed to fetch fee categories: ${feeCategoriesRes.error.message}`);
        
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

        return { 
            ok: true, 
            reportData: enrichedReportData, 
            summary, 
            classes: classesRes.data,
            feeCategories: feeCategoriesRes.data,
        };

    } catch (e: any) {
        return { ok: false, message: e.message };
    }
}
