
'use server';

import { createSupabaseServerClient } from '@/lib/supabaseClient';
import type { FeeType, Installment } from '@/types';

interface ReportFilters {
    classId?: string;
    startDate?: string;
    endDate?: string;
    searchTerm?: string;
    feeType?: 'fee_type' | 'special_fee_type' | 'installment';
    feeHeadId?: string;
}

export async function getCompletePaidReportDataAction(params: { adminUserId: string, filters: ReportFilters }) {
    const { adminUserId, filters } = params;
    const supabase = createSupabaseServerClient();
    
    try {
        const { data: user, error: userError } = await supabase.from('users').select('school_id').eq('id', adminUserId).single();
        if (userError || !user?.school_id) throw new Error("Admin not associated with a school.");
        const schoolId = user.school_id;

        let query = supabase.from('student_fee_payments')
            .select('*, student:student_id(*, class:class_id(name, division)), fee_type:fee_type_id(name), installment:installment_id(title)')
            .eq('school_id', schoolId)
            .eq('status', 'Paid');

        if (filters.startDate) {
            query = query.gte('payment_date', filters.startDate);
        }
        if (filters.endDate) {
            query = query.lte('payment_date', filters.endDate);
        }
        
        if (filters.classId) {
            query = query.eq('student.class_id', filters.classId);
        }
        
        if (filters.searchTerm) {
            query = query.ilike('student.name', `%${filters.searchTerm}%`);
        }

        if (filters.feeType === 'installment') {
            query = query.not('installment_id', 'is', null);
            if (filters.feeHeadId) {
                query = query.eq('installment_id', filters.feeHeadId);
            }
        } else if (filters.feeType === 'fee_type' || filters.feeType === 'special_fee_type') {
            // Fetch fee_type_ids for the selected category first
             const { data: feeTypeIds, error: feeTypeError } = await supabase
                .from('fee_types')
                .select('id')
                .eq('school_id', schoolId)
                .eq('installment_type', filters.feeType === 'fee_type' ? 'installments' : 'extra_charge');
            
            if (feeTypeError) throw new Error(`Could not fetch fee type IDs: ${feeTypeError.message}`);

            const ids = (feeTypeIds || []).map(ft => ft.id);

            if (filters.feeHeadId) {
                // If a specific head is chosen, it must be of the correct type.
                if (ids.includes(filters.feeHeadId)) {
                    query = query.eq('fee_type_id', filters.feeHeadId);
                } else {
                     // The selected head doesn't match the type, so return no results for this query part.
                    query = query.eq('id', 'this-will-not-match');
                }
            } else if (ids.length > 0) {
                 // If no specific head is chosen, filter by all fee types of the selected category.
                query = query.in('fee_type_id', ids);
            } else {
                // No fee types of this category exist, so return no results.
                 query = query.eq('id', 'this-will-not-match');
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
        
        return { 
            ok: true, 
            reportData, 
            classes: classesRes.data,
            feeTypes: feeTypesRes.data as (FeeType[] | null),
            installments: installmentsRes.data as (Installment[] | null)
        };

    } catch (e: any) {
        return { ok: false, message: e.message };
    }
}
