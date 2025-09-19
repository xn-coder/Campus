
'use server';

import { createSupabaseServerClient } from '@/lib/supabaseClient';
import { revalidatePath } from 'next/cache';
import { v4 as uuidv4 } from 'uuid';
import type { StudentFeePayment, PaymentStatus, Student, FeeCategory, AcademicYear, ClassData, Installment, Concession, PaymentMethod } from '@/types';
import { getAdminSchoolIdAction } from '../academic-years/actions';


export async function fetchAdminSchoolIdForFees(adminUserId: string): Promise<string | null> {
    return getAdminSchoolIdAction(adminUserId);
}

export async function getStudentsByClass(schoolId: string, classId: string): Promise<{ ok: boolean; students?: Student[]; message?: string }> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .eq('school_id', schoolId)
    .eq('class_id', classId)
    .order('name');

  if (error) {
    console.error(`Error fetching students for class ${classId}:`, error);
    return { ok: false, message: error.message };
  }

  return { ok: true, students: data || [] };
}


interface RecordPaymentInput {
  fee_payment_id: string;
  payment_amount: number;
  payment_date: string;
  school_id: string;
  payment_mode?: string;
  notes?: string;
}

export async function recordStudentFeePaymentAction(
  input: RecordPaymentInput
): Promise<{ ok: boolean; message: string; feePayment?: StudentFeePayment }> {
  const supabaseAdmin = createSupabaseServerClient();
  const { fee_payment_id, payment_amount, payment_date, school_id, payment_mode, notes } = input;


  const { data: existingFeePayment, error: fetchError } = await supabaseAdmin
    .from('student_fee_payments')
    .select('assigned_amount, paid_amount, notes')
    .eq('id', fee_payment_id)
    .eq('school_id', school_id)
    .single();

  if (fetchError || !existingFeePayment) {
    console.error("Error fetching existing fee payment or not found:", fetchError);
    return { ok: false, message: 'Fee assignment not found or database error.' };
  }

  const newPaidAmount = existingFeePayment.paid_amount + payment_amount; 
  let newStatus: PaymentStatus = 'Pending';

  if (newPaidAmount >= existingFeePayment.assigned_amount) {
    newStatus = 'Paid';
  } else if (newPaidAmount > 0) {
    newStatus = 'Partially Paid';
  }

  const finalPaidAmount = Math.min(newPaidAmount, existingFeePayment.assigned_amount);
  
  const updatedNotes = notes ? (existingFeePayment.notes ? `${existingFeePayment.notes}\n${notes}` : notes) : existingFeePayment.notes;

  const { error, data } = await supabaseAdmin
    .from('student_fee_payments')
    .update({
      paid_amount: finalPaidAmount,
      status: newStatus,
      payment_date: payment_date,
      payment_mode: payment_mode || 'Cash',
      notes: updatedNotes,
    })
    .eq('id', fee_payment_id)
    .eq('school_id', school_id)
    .select()
    .single();

  if (error) {
    console.error("Error recording student fee payment:", error);
    return { ok: false, message: `Failed to record payment: ${error.message}` };
  }
  revalidatePath('/admin/student-fees');
  revalidatePath('/student/payment-history');
  revalidatePath('/dashboard');
  revalidatePath('/student/assignments');
  return { ok: true, message: 'Payment recorded successfully.', feePayment: data as StudentFeePayment };
}

export async function getFeePaymentPageData(schoolId: string): Promise<{ ok: boolean; classes?: ClassData[]; methods?: PaymentMethod[]; message?: string }> {
    if (!schoolId) return { ok: false, message: 'School ID is required' };
    const supabase = createSupabaseServerClient();
    try {
        const [classesRes, methodsRes] = await Promise.all([
            supabase.from('classes').select('*').eq('school_id', schoolId).order('name'),
            supabase.from('payment_methods').select('*').eq('school_id', schoolId).order('name')
        ]);
        
        if (classesRes.error) throw new Error(`Failed to load classes: ${classesRes.error.message}`);
        if (methodsRes.error) {
             if(methodsRes.error.message.includes('relation "public.payment_methods" does not exist')) {
                // This is a soft failure, the page can still render without payment methods if table is missing
                console.warn("Payment Methods table does not exist.");
                return { ok: true, classes: classesRes.data || [], methods: [] };
             }
            throw new Error(`Failed to load payment methods: ${methodsRes.error.message}`);
        }

        return {
            ok: true,
            classes: classesRes.data || [],
            methods: methodsRes.data || []
        };
    } catch (e: any) {
        return { ok: false, message: e.message || 'An unexpected error occurred.' };
    }
}

export async function getFeesForStudentAction(studentId: string): Promise<{ ok: boolean; fees?: StudentFeePayment[]; message?: string }> {
    if (!studentId) return { ok: false, message: 'Student ID is required' };
    const supabase = createSupabaseServerClient();
    try {
        const { data, error } = await supabase
            .from('student_fee_payments')
            .select('*, fee_category:fee_category_id(name), installment:installment_id(title), fee_type:fee_type_id(display_name, installment_type)')
            .eq('student_id', studentId)
            .order('due_date', { ascending: false });

        if (error) throw error;
        return { ok: true, fees: (data as any) || [] };
    } catch (e: any) {
        return { ok: false, message: `Failed to load fees: ${e.message}` };
    }
}
    
export async function getStudentPaymentHistoryAction(userId: string): Promise<{
    ok: boolean;
    payments?: StudentFeePayment[];
    feeCategories?: FeeCategory[];
    academicYears?: AcademicYear[];
    studentProfile?: Student | null;
    message?: string;
}> {
    if (!userId) {
        return { ok: false, message: "User not identified." };
    }
    const supabase = createSupabaseServerClient();
    try {
        const { data: student, error: studentError } = await supabase
            .from('students')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (studentError || !student) {
            return { ok: false, message: "Student profile not found." };
        }

        const schoolId = student.school_id;

        const [paymentsRes, categoriesRes, yearsRes] = await Promise.all([
            supabase.from('student_fee_payments').select('*').eq('student_id', student.id).order('due_date', { ascending: false }),
            supabase.from('fee_categories').select('*').eq('school_id', schoolId),
            supabase.from('academic_years').select('*').eq('school_id', schoolId),
        ]);

        if (paymentsRes.error) throw new Error(`Failed to load payment history: ${paymentsRes.error.message}`);
        if (categoriesRes.error) throw new Error(`Failed to load fee categories: ${categoriesRes.error.message}`);
        if (yearsRes.error) throw new Error(`Failed to load academic years: ${yearsRes.error.message}`);

        return {
            ok: true,
            payments: (paymentsRes.data as any) || [],
            feeCategories: categoriesRes.data || [],
            academicYears: yearsRes.data || [],
            studentProfile: student as Student
        };
    } catch (e: any) {
        return { ok: false, message: `An unexpected error occurred: ${e.message}` };
    }
}

// --- Payment Method Actions ---

export async function getPaymentMethodsAction(schoolId: string): Promise<{ ok: boolean; methods?: PaymentMethod[]; message?: string }> {
    if (!schoolId) return { ok: false, message: "School ID is required." };
    const supabase = createSupabaseServerClient();
    try {
        const { data, error } = await supabase
            .from('payment_methods')
            .select('*')
            .eq('school_id', schoolId)
            .order('name');
        if (error) throw error;
        return { ok: true, methods: data || [] };
    } catch (e: any) {
        return { ok: false, message: `DB Error: ${e.message}` };
    }
}

export async function createPaymentMethodAction(input: Pick<PaymentMethod, 'name' | 'description' | 'school_id'>): Promise<{ ok: boolean; message: string }> {
    const supabase = createSupabaseServerClient();
    try {
        const { error } = await supabase.from('payment_methods').insert(input);
        if (error) throw error;
        revalidatePath('/admin/student-fees');
        return { ok: true, message: 'Payment method added.' };
    } catch (e: any) {
        return { ok: false, message: `Failed to create method: ${e.message}` };
    }
}

export async function updatePaymentMethodAction(id: string, updates: Partial<Pick<PaymentMethod, 'name' | 'description'>>, schoolId: string): Promise<{ ok: boolean; message: string }> {
    const supabase = createSupabaseServerClient();
    try {
        const { error } = await supabase.from('payment_methods').update(updates).eq('id', id).eq('school_id', schoolId);
        if (error) throw error;
        revalidatePath('/admin/student-fees');
        return { ok: true, message: 'Payment method updated.' };
    } catch (e: any) {
        return { ok: false, message: `Failed to update method: ${e.message}` };
    }
}

export async function deletePaymentMethodAction(id: string, schoolId: string): Promise<{ ok: boolean; message: string }> {
    const supabase = createSupabaseServerClient();
    try {
        const { data: method, error: fetchError } = await supabase
            .from('payment_methods')
            .select('name')
            .eq('id', id)
            .eq('school_id', schoolId)
            .single();

        if (fetchError || !method) {
            return { ok: false, message: "Could not find the payment method to delete." };
        }
        
        const methodName = method.name;
        
        const { count, error: checkError } = await supabase
            .from('student_fee_payments')
            .select('id', { count: 'exact', head: true })
            .eq('payment_mode', methodName)
            .eq('school_id', schoolId);
        
        if (checkError) {
            console.error('Error checking payment method usage:', checkError);
            return { ok: false, message: `Database error while checking for dependencies: ${checkError.message}` };
        }
        
        if (count && count > 0) {
            return { ok: false, message: `Cannot delete "${methodName}": This payment method is used in ${count} transaction(s).` };
        }

        const { error } = await supabase.from('payment_methods').delete().eq('id', id).eq('school_id', schoolId);
        if (error) throw error;

        revalidatePath('/admin/student-fees');
        return { ok: true, message: 'Payment method deleted.' };
    } catch (e: any) {
        return { ok: false, message: `Failed to delete method: ${e.message}` };
    }
}
