
'use server';

import { createSupabaseServerClient } from '@/lib/supabaseClient';

interface ReportFilters {
    classId?: string;
    paymentMethod?: string;
    paymentStatus?: 'all' | 'Paid' | 'Dues';
    searchTerm?: string;
}

export async function getOnlineFeeTransactionReportDataAction(params: { adminUserId: string, filters: ReportFilters }) {
    const { adminUserId, filters } = params;
    const supabase = createSupabaseServerClient();
    
    try {
        const { data: user, error: userError } = await supabase.from('users').select('school_id').eq('id', adminUserId).single();
        if (userError || !user?.school_id) throw new Error("Admin not associated with a school.");
        const schoolId = user.school_id;

        let query = supabase.from('student_fee_payments')
            .select('*, student:student_id(*, class:class_id(name, division))')
            .eq('school_id', schoolId)
            .not('payment_mode', 'ilike', 'cash');

        if (filters.paymentStatus === 'Paid') {
            query = query.eq('status', 'Paid');
        } else if (filters.paymentStatus === 'Dues') {
            query = query.in('status', ['Pending', 'Partially Paid', 'Overdue']);
        }
        
        if (filters.classId) {
            query = query.eq('student.class_id', filters.classId);
        }
        
        if (filters.paymentMethod) {
            query = query.eq('payment_mode', filters.paymentMethod);
        }

        if (filters.searchTerm) {
            query = query.ilike('student.name', `%${filters.searchTerm}%`);
        }

        const { data: reportData, error: reportError } = await query.order('payment_date', { ascending: false });
        if (reportError) throw new Error(`Failed to fetch report data: ${reportError.message}`);

        const { data: classes, error: classesError } = await supabase.from('classes').select('*').eq('school_id', schoolId);
        if(classesError) throw new Error(`Failed to fetch classes: ${classesError.message}`);
        
        const { data: paymentMethods, error: methodsError } = await supabase.from('payment_methods').select('*').eq('school_id', schoolId);
        if(methodsError) console.warn(`Could not fetch payment methods: ${methodsError.message}`);

        return { ok: true, reportData, classes, paymentMethods: paymentMethods || [] };

    } catch (e: any) {
        return { ok: false, message: e.message };
    }
}
