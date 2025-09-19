
'use server';

import { createSupabaseServerClient } from '@/lib/supabaseClient';
import type { ClassData, Student, StudentFeePayment } from '@/types';
import { startOfYear, endOfYear, format } from 'date-fns';

interface ReportFilters {
    classId?: string;
    year: number;
    searchTerm?: string;
}

export async function getYearlyDuesReportDataAction(params: { adminUserId: string, filters: ReportFilters }) {
    const { adminUserId, filters } = params;
    const supabase = createSupabaseServerClient();
    
    try {
        const { data: user, error: userError } = await supabase.from('users').select('school_id').eq('id', adminUserId).single();
        if (userError || !user?.school_id) throw new Error("Admin not associated with a school.");
        const schoolId = user.school_id;

        const startDate = format(startOfYear(new Date(filters.year, 0, 1)), 'yyyy-MM-dd');
        const endDate = format(endOfYear(new Date(filters.year, 11, 31)), 'yyyy-MM-dd');

        let feeQuery = supabase.from('student_fee_payments')
            .select('student_id, assigned_amount, paid_amount, concessions:student_fee_concessions(concession_amount)')
            .eq('school_id', schoolId)
            .gte('due_date', startDate)
            .lte('due_date', endDate)
            .in('status', ['Pending', 'Partially Paid', 'Overdue']);

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
            const { data: classes } = await supabase.from('classes').select('*').eq('school_id', schoolId);
            return { ok: true, reportData: [], classes: classes || [] };
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

        const { data: classes, error: classesError } = await supabase.from('classes').select('*').eq('school_id', schoolId);
        if(classesError) throw new Error(`Failed to fetch classes: ${classesError.message}`);
        
        return { ok: true, reportData, classes: classes || [] };

    } catch (e: any) {
        return { ok: false, message: e.message };
    }
}
