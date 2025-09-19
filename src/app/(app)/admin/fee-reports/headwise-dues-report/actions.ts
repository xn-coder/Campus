
'use server';

import { createSupabaseServerClient } from '@/lib/supabaseClient';
import type { ClassData, Student, StudentFeePayment, FeeCategory } from '@/types';

interface ReportFilters {
    feeCategoryId?: string;
    classId?: string;
    searchTerm?: string;
}

export async function getHeadwiseDuesReportDataAction(params: { adminUserId: string, filters: ReportFilters }) {
    const { adminUserId, filters } = params;
    const supabase = createSupabaseServerClient();
    
    try {
        const { data: user, error: userError } = await supabase.from('users').select('school_id').eq('id', adminUserId).single();
        if (userError || !user?.school_id) throw new Error("Admin not associated with a school.");
        const schoolId = user.school_id;

        const [classesRes, feeCategoriesRes] = await Promise.all([
             supabase.from('classes').select('*').eq('school_id', schoolId),
             supabase.from('fee_categories').select('*').eq('school_id', schoolId)
        ]);
        if(classesRes.error) throw new Error(`Failed to fetch classes: ${classesRes.error.message}`);
        if(feeCategoriesRes.error) throw new Error(`Failed to fetch fee categories: ${feeCategoriesRes.error.message}`);
        
        const feeCategories = feeCategoriesRes.data || [];
        const classes = classesRes.data || [];

        let targetFeeCategoryId = filters.feeCategoryId;
        // If no category is selected but categories exist, default to the first one.
        if (!targetFeeCategoryId && feeCategories.length > 0) {
            targetFeeCategoryId = feeCategories[0].id;
        }
        
        if (!targetFeeCategoryId) {
            // No fee categories exist at all, so no data to fetch.
            return { ok: true, reportData: [], classes, feeCategories };
        }

        let feeQuery = supabase.from('student_fee_payments')
            .select('student_id, assigned_amount, paid_amount, concessions:student_fee_concessions(concession_amount)')
            .eq('school_id', schoolId)
            .in('status', ['Pending', 'Partially Paid', 'Overdue'])
            .eq('fee_category_id', targetFeeCategoryId);

        const { data: feeData, error: feeError } = await feeQuery;
        if (feeError) throw new Error(`Failed to fetch fee data: ${feeError.message}`);

        const dueStudents = (feeData || []).reduce((acc, item) => {
            const totalConcession = (item.concessions || []).reduce((sum: number, c: any) => sum + (c.concession_amount || 0), 0);
            const dueAmount = item.assigned_amount - item.paid_amount - totalConcession;
            if (dueAmount > 0) {
                if (!acc[item.student_id]) {
                    acc[item.student_id] = 0;
                }
                acc[item.student_id] += dueAmount;
            }
            return acc;
        }, {} as Record<string, number>);

        const studentIdsWithDues = Object.keys(dueStudents);

        if (studentIdsWithDues.length === 0) {
            return { ok: true, reportData: [], classes, feeCategories };
        }

        let studentQuery = supabase.from('students')
            .select('*, class:class_id(name, division)')
            .in('id', studentIdsWithDues);
        
        if (filters.classId) {
            studentQuery = studentQuery.eq('class_id', filters.classId);
        }

        if (filters.searchTerm) {
            studentQuery = studentQuery.or(`name.ilike.%${filters.searchTerm}%,father_name.ilike.%${filters.searchTerm}%`);
        }

        const { data: studentData, error: studentError } = await studentQuery;
        if (studentError) throw new Error(`Failed to fetch student data: ${studentError.message}`);

        const reportData = (studentData || []).map(student => ({
            ...student,
            dueAmount: dueStudents[student.id] || 0
        }));
        
        return { ok: true, reportData, classes, feeCategories };

    } catch (e: any) {
        return { ok: false, message: e.message };
    }
}
