'use server';

import { createSupabaseServerClient } from '@/lib/supabaseClient';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { revalidatePath } from 'next/cache';
import type { Teacher, User } from '@/types'; // Assuming Teacher and User types are defined here or accessible

const SALT_ROUNDS = 10;

// Type definitions for internal use in actions.ts
interface TeacherWithUserId extends Teacher {
    user_id: string; // Ensure user_id is always present for actions
}

interface UpdateTeacherInput {
  id: string; 
  userId?: string; // Optional as it might not be present if teacher was created externally
  name: string;
  email: string;
  subject: string;
  profilePictureUrl?: string;
  school_id: string;
}

/**
 * Fetches the school ID associated with an admin user.
 * It first checks the user's own record for school_id, then falls back to checking the 'schools' table
 * if the user is listed as an admin_user_id there.
 * @param adminUserId The ID of the admin user.
 * @returns The school ID or null if not found.
 */
export async function fetchAdminSchoolIdAction(adminUserId: string): Promise<string | null> {
  const supabase = createSupabaseServerClient(); // Use server client

  // First, try to get school_id directly from the user's record
  const { data: userRec, error: userErr } = await supabase
    .from('users')
    .select('school_id')
    .eq('id', adminUserId)
    .single();
  
  if (userErr && userErr.code !== 'PGRST116') { // PGRST116 is 'No rows found'
    console.error("Error fetching user record for school ID:", userErr.message);
  }

  if (userRec?.school_id) {
    return userRec.school_id;
  }

  // Fallback: If school_id is null on the user record, check if they are an admin_user_id in the schools table
  console.warn(`User ${adminUserId} has no school_id on their record. Falling back to check schools.admin_user_id.`);
  const { data: school, error: schoolError } = await supabase 
    .from('schools')
    .select('id')
    .eq('admin_user_id', adminUserId)
    .single();

  if (schoolError && schoolError.code !== 'PGRST116') {
    console.error("Error during fallback school fetch for admin:", schoolError.message);
    return null;
  }
  
  if (school) {
    return school.id;
  }

  console.error(`Could not determine school ID for admin ${adminUserId} via user record or schools table.`);
  return null;
}

/**
 * Fetches all teachers for a given school ID.
 * @param schoolId The ID of the school.
 * @returns An array of Teacher objects or an error message.
 */
export async function fetchTeachersAction(schoolId: string): Promise<{ data?: TeacherWithUserId[]; error?: string }> {
  const supabase = createSupabaseServerClient(); // Use server client
  
  const { data, error } = await supabase 
    .from('teachers')
    .select('id, name, email, subject, profile_picture_url, user_id')
    .eq('school_id', schoolId);

  if (error) {
    console.error("Error fetching teacher data in action:", error.message);
    return { error: `Failed to fetch teacher data: ${error.message}` };
  } else {
    // Ensure all returned teachers have user_id, which is mandatory for internal actions
    const formattedTeachers: TeacherWithUserId[] = data?.map(t => ({
      id: t.id, 
      user_id: t.user_id, 
      name: t.name,
      email: t.email, 
      subject: t.subject,
      profile_picture_url: t.profile_picture_url,
      school_id: schoolId, // Explicitly set school_id based on query
    })) || [];
    return { data: formattedTeachers };
  }
}

export async function createTeacherAction(
  formData: FormData
): Promise<{ ok: boolean; message: string; teacherId?: string; userId?: string }> {
  const supabaseAdmin = createSupabaseServerClient();
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const subject = formData.get('subject') as string;
  const school_id = formData.get('school_id') as string;
  const profilePictureFile = formData.get('profilePictureFile') as File | null;
  const defaultPassword = "password"; 

  try {
    const { data: existingUser, error: userFetchError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (userFetchError && userFetchError.code !== 'PGRST116') {
      console.error('Error checking for existing user by email:', userFetchError);
      return { ok: false, message: 'Database error checking email.' };
    }
    if (existingUser) {
      return { ok: false, message: `A user with email ${email} already exists.` };
    }
    
    const newUserId = uuidv4();
    const hashedPassword = await bcrypt.hash(defaultPassword, SALT_ROUNDS);

    const { data: newUser, error: userInsertError } = await supabaseAdmin
      .from('users')
      .insert({
        id: newUserId,
        email: email.trim(),
        name: name.trim(),
        role: 'teacher',
        password_hash: hashedPassword,
        school_id: school_id, 
      })
      .select('id')
      .single();

    if (userInsertError || !newUser) {
      console.error('Error creating teacher user account:', userInsertError);
      return { ok: false, message: `Failed to create teacher login: ${userInsertError?.message || 'No user data returned'}` };
    }

    let profilePictureUrl: string | undefined = undefined;
    if (profilePictureFile && profilePictureFile.size > 0) {
        const sanitizedFileName = profilePictureFile.name.replace(/[^a-zA-Z0-9_.-]/g, '_');
        const filePath = `public/teacher-profiles/${school_id}/${uuidv4()}-${sanitizedFileName}`;

        const { error: uploadError } = await supabaseAdmin.storage
            .from('campushub')
            .upload(filePath, profilePictureFile);
        
        if (uploadError) {
            await supabaseAdmin.from('users').delete().eq('id', newUserId);
            throw new Error(`Failed to upload profile picture: ${uploadError.message}`);
        }

        const { data: publicUrlData } = supabaseAdmin.storage.from('campushub').getPublicUrl(filePath);
        profilePictureUrl = publicUrlData?.publicUrl;
    }

    const newTeacherProfileId = uuidv4();
    const { error: teacherInsertError } = await supabaseAdmin
      .from('teachers')
      .insert({
        id: newTeacherProfileId,
        user_id: newUser.id,
        name: name.trim(),
        email: email.trim(), 
        subject: subject.trim(),
        profile_picture_url: profilePictureUrl?.trim() || `https://placehold.co/100x100.png?text=${name.substring(0,1)}`,
        school_id: school_id,
      });

    if (teacherInsertError) {
      console.error('Error creating teacher profile:', teacherInsertError);
      await supabaseAdmin.from('users').delete().eq('id', newUser.id);
      return { ok: false, message: `Failed to create teacher profile: ${teacherInsertError.message}` };
    }
    
    revalidatePath('/admin/manage-teachers');
    return { 
        ok: true, 
        message: `Teacher ${name} created with login. Default password: "password".`,
        teacherId: newTeacherProfileId,
        userId: newUser.id
    };
  } catch (error: any) {
    console.error('Unexpected error creating teacher:', error);
    return { ok: false, message: `An unexpected error occurred: ${error.message}` };
  }
}

export async function updateTeacherAction(
  data: UpdateTeacherInput
): Promise<{ ok: boolean; message: string }> {
  const supabaseAdmin = createSupabaseServerClient();
  const { id, userId, name, email, subject, profilePictureUrl, school_id } = data;
  try {
    if (userId) {
        const { data: currentUserData, error: currentUserFetchError } = await supabaseAdmin
            .from('users')
            .select('email')
            .eq('id', userId)
            .single();
        
        if (currentUserData && email.trim() !== currentUserData.email) {
            const { data: existingUserWithNewEmail, error: fetchError } = await supabaseAdmin
                .from('users')
                .select('id')
                .eq('email', email.trim())
                .neq('id', userId) 
                .single();
            if (fetchError && fetchError.code !== 'PGRST116') {
                return { ok: false, message: 'Database error checking for new email uniqueness.' };
            }
            if (existingUserWithNewEmail) {
                return { ok: false, message: 'Another user with this email already exists.' };
            }
        }
    }

    const { error: teacherUpdateError } = await supabaseAdmin
      .from('teachers')
      .update({
        name: name.trim(),
        email: email.trim(), 
        subject: subject.trim(),
        profile_picture_url: profilePictureUrl?.trim() || `https://placehold.co/100x100.png?text=${name.substring(0,1)}`,
      })
      .eq('id', id)
      .eq('school_id', school_id);

    if (teacherUpdateError) {
      console.error('Error updating teacher profile:', teacherUpdateError);
      return { ok: false, message: `Failed to update teacher profile: ${teacherUpdateError.message}` };
    }

    if (userId) {
      const { error: userUpdateError } = await supabaseAdmin
        .from('users')
        .update({ name: name.trim(), email: email.trim() })
        .eq('id', userId);
      
      if (userUpdateError) {
         console.warn(`Teacher profile updated, but failed to update user login details: ${userUpdateError.message}`);
      }
    }
    revalidatePath('/admin/manage-teachers');
    return { ok: true, message: `Teacher ${name} updated successfully.` };
  } catch (error: any) {
    console.error('Unexpected error updating teacher:', error);
    return { ok: false, message: `An unexpected error occurred: ${error.message}` };
  }
}


export async function deleteTeacherAction(
  teacherProfileId: string,
  userId: string | undefined,
  schoolId: string
): Promise<{ ok: boolean; message: string }> {
  const supabaseAdmin = createSupabaseServerClient();
  try {
    const { count: classCount, error: classError } = await supabaseAdmin
        .from('classes')
        .select('id', { count: 'exact', head: true })
        .eq('teacher_id', teacherProfileId)
        .eq('school_id', schoolId);

    if (classError) return { ok: false, message: `Error checking class assignments: ${classError.message}`};
    if (classCount && classCount > 0) return { ok: false, message: `Cannot delete: Teacher is assigned to ${classCount} class(es). Unassign first.`};
    
    const { count: assignmentCount, error: assignmentError } = await supabaseAdmin
        .from('assignments')
        .select('id', {count: 'exact', head: true})
        .eq('teacher_id', teacherProfileId)
        .eq('school_id', schoolId); // Assuming assignments are school-scoped
    if (assignmentError) return {ok: false, message: `Error checking assignments: ${assignmentError.message}`};
    if (assignmentCount && assignmentCount > 0) return {ok: false, message: `Cannot delete: Teacher has posted ${assignmentCount} assignment(s).`};

    const { error: teacherDeleteError } = await supabaseAdmin
      .from('teachers')
      .delete()
      .eq('id', teacherProfileId)
      .eq('school_id', schoolId);

    if (teacherDeleteError) {
      console.error('Error deleting teacher profile:', teacherDeleteError);
      return { ok: false, message: `Failed to delete teacher profile: ${teacherDeleteError.message}` };
    }

    if (userId) {
      const { error: userDeleteError } = await supabaseAdmin
        .from('users')
        .delete()
        .eq('id', userId);
      if (userDeleteError) {
        console.warn(`Teacher profile deleted, but failed to delete user login for ID ${userId}: ${userDeleteError.message}`);
      }
    }
    revalidatePath('/admin/manage-teachers');
    return { ok: true, message: 'Teacher record and login deleted successfully.' };
  } catch (error: any) {
    console.error('Unexpected error deleting teacher:', error);
    return { ok: false, message: `An unexpected error occurred: ${error.message}` };
  }
}

export async function getTeacherActivityData(schoolId: string) {
    if (!schoolId) {
        return { ok: false, message: "School ID is required." };
    }
    const supabase = createSupabaseServerClient();
    try {
        const [teachersRes, assignmentsRes, classesRes, usersRes] = await Promise.all([
            supabase.from('teachers').select('id, name, email, subject, user_id').eq('school_id', schoolId),
            supabase.from('assignments').select('teacher_id').eq('school_id', schoolId),
            supabase.from('classes').select('teacher_id').eq('school_id', schoolId),
            supabase.from('users').select('id, last_sign_in_at').eq('school_id', schoolId).eq('role', 'teacher'),
        ]);

        if (teachersRes.error) throw new Error(teachersRes.error.message);

        const assignmentsByTeacher = (assignmentsRes.data || []).reduce((acc, assignment) => {
            if (assignment.teacher_id) {
                acc[assignment.teacher_id] = (acc[assignment.teacher_id] || 0) + 1;
            }
            return acc;
        }, {} as Record<string, number>);

        const classesByTeacher = (classesRes.data || []).reduce((acc, cls) => {
            if (cls.teacher_id) {
                acc[cls.teacher_id] = (acc[cls.teacher_id] || 0) + 1;
            }
            return acc;
        }, {} as Record<string, number>);

        const teachersWithActivity = (teachersRes.data || []).map(t => {
            const user = usersRes.data?.find(u => u.id === t.user_id);
            return {
                ...t,
                assignmentsPosted: assignmentsByTeacher[t.id] || 0,
                classesTaught: classesByTeacher[t.id] || 0,
                lastLogin: user?.last_sign_in_at,
            };
        });
        
        return { ok: true, data: teachersWithActivity };

    } catch (e: any) {
        console.error("Error fetching teacher activity data:", e);
        return { ok: false, message: e.message || "An unexpected error occurred." };
    }
}