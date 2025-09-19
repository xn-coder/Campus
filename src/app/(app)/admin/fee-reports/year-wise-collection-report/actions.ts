
'use server';

import { createSupabaseServerClient } from '@/lib/supabaseClient';
import { startOfYear, endOfYear, format } from 'date-fns';
import type { FeeType, Installment } from '@/types';

interface ReportFilters {
    classId?: string;
    year: number;
    searchTerm?: string;
    feeType?: 'fee_type' | 'special_fee_type' | 'installment';
    feeHeadId?: string;
}

export async function getYearWiseCollectionReportDataAction(params: { adminUserId: string, filters: ReportFilters }) {
    const { adminUserId, filters } = params;
    const supabase = createSupabaseServerClient();
    
    try {
        const { data: user, error: userError } = await supabase.from('users').select('school_id').eq('id', adminUserId).single();
        if (userError || !user?.school_id) throw new Error("Admin not associated with a school.");
        const schoolId = user.school_id;

        const startDate = format(startOfYear(new Date(filters.year, 0, 1)), 'yyyy-MM-dd');
        const endDate = format(endOfYear(new Date(filters.year, 11, 31)), 'yyyy-MM-dd');

        let query = supabase.from('student_fee_payments')
            .select('*, student:student_id(*, class:class_id(name, division)), fee_type:fee_type_id(*), installment:installment_id(*), concessions:student_fee_concessions(concession_amount)')
            .eq('school_id', schoolId)
            .gte('due_date', startDate) 
            .lte('due_date', endDate);
        
        if (filters.classId) {
            query = query.eq('student.class_id', filters.classId);
        }
        
        if (filters.searchTerm) {
            query = query.ilike('student.name', `%${filters.searchTerm}%`);
        }

        if (filters.feeType) {
            if (filters.feeType === 'installment') {
                query = query.not('installment_id', 'is', null);
                if (filters.feeHeadId) {
                    query = query.eq('installment_id', filters.feeHeadId);
                }
            } else {
                 const { data: feeTypeIds, error: feeTypeError } = await supabase
                    .from('fee_types')
                    .select('id')
                    .eq('school_id', schoolId)
                    .eq('installment_type', filters.feeType === 'fee_type' ? 'installments' : 'extra_charge');
                if (feeTypeError) throw new Error(`Could not fetch fee type IDs: ${feeTypeError.message}`);

                const ids = (feeTypeIds || []).map(ft => ft.id);
                
                if (filters.feeHeadId) {
                    if (ids.includes(filters.feeHeadId)) {
                        query = query.eq('fee_type_id', filters.feeHeadId);
                    } else {
                        query = query.eq('id', 'this-will-not-match');
                    }
                } else if (ids.length > 0) {
                    query = query.in('fee_type_id', ids);
                } else {
                     query = query.eq('id', 'this-will-not-match');
                }
            }
        }

        const { data: reportData, error: reportError } = await query.order('payment_date', { ascending: false });
        if (reportError) throw new Error(`Failed to fetch report data: ${reportError.message}`);

        const [classesRes, feeTypesRes, installmentsRes] = await Promise.all([
            supabase.from('classes').select('*').eq('school_id', schoolId),
            supabase.from('fee_types').select('id, name, display_name, installment_type').eq('school_id', schoolId),
            supabase.from('installments').select('id, title').eq('school_id', schoolId),
        ]);

        if(classesRes.error) throw new Error(`Failed to fetch classes: ${classesRes.error.message}`);
        if(feeTypesRes.error) throw new Error(`Failed to fetch fee types: ${feeTypesRes.error.message}`);
        if(installmentsRes.error) throw new Error(`Failed to fetch installments: ${installmentsRes.error.message}`);
        
        const enrichedReportData = (reportData || []).map(item => {
            const totalConcession = (item.concessions || []).reduce((sum: number, c: any) => sum + (c.concession_amount || 0), 0);
            return { ...item, total_concession: totalConcession };
        });

        return { 
            ok: true, 
            reportData: enrichedReportData, 
            classes: classesRes.data,
            feeTypes: feeTypesRes.data as (FeeType[] | null),
            installments: installmentsRes.data as (Installment[] | null)
        };

    } catch (e: any) {
        return { ok: false, message: e.message };
    }
}
