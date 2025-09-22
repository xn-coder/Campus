

'use server';

import { createSupabaseServerClient } from '@/lib/supabaseClient';
import type { Course, CourseResource, UserRole } from '@/types';

export async function getCourseForViewingAction(courseId: string): Promise<{
  ok: boolean;
  course?: Course & { resources: CourseResource[] };
  message?: string;
}> {
  if (!courseId) {
    return { ok: false, message: "Course ID is required." };
  }
  const supabase = createSupabaseServerClient();
  try {
    const { data: courseData, error: courseError } = await supabase
      .from('lms_courses')
      .select('*')
      .eq('id', courseId)
      .single();

    if (courseError || !courseData) {
      return { ok: false, message: courseError?.message || "Course not found." };
    }

    const { data: resourcesData, error: resourcesError } = await supabase
        .from('lms_course_resources')
        .select('*')
        .eq('course_id', courseId)
        .order('created_at', { ascending: true });

    if (resourcesError) {
        return { ok: false, message: `Failed to fetch resources: ${resourcesError.message}` };
    }
    
    const enrichedCourse = {
        ...(courseData as Course),
        resources: (resourcesData || []) as CourseResource[],
    };

    return { ok: true, course: enrichedCourse };
  } catch (error: any) {
    console.error("Error in getCourseForViewingAction:", error);
    return { ok: false, message: error.message || "An unexpected error occurred." };
  }
}


export async function checkUserEnrollmentForCourseViewAction(
  courseId: string,
  userId: string, // This is users.id
  userRole: UserRole,
  preview: boolean = false
): Promise<{ ok: boolean; isEnrolled: boolean; studentProfileId?: string; message?: string }> {
  if (!courseId || !userId || !userRole) {
    return { ok: false, isEnrolled: false, message: "Course ID, User ID, and User Role are required." };
  }
  const supabase = createSupabaseServerClient();

  try {
    // Superadmin and Admins in preview mode have full access.
    if (userRole === 'superadmin' || (userRole === 'admin' && preview)) {
      return { ok: true, isEnrolled: true }; 
    }
    
    let userProfileId: string | null = null;
    if (userRole === 'student') {
      const { data: studentProfile, error: studentError } = await supabase
        .from('students')
        .select('id')
        .eq('user_id', userId)
        .single();
      if (studentError || !studentProfile) {
        return { ok: false, isEnrolled: false, message: "Student profile not found."};
      }
      userProfileId = studentProfile.id;
    } else if (userRole === 'teacher') {
      const { data: teacherProfile, error: teacherError } = await supabase
        .from('teachers')
        .select('id')
        .eq('user_id', userId)
        .single();
      if (teacherError || !teacherProfile) {
         return { ok: false, isEnrolled: false, message: "Teacher profile not found."};
      }
      userProfileId = teacherProfile.id;
    }

    // Admins who are not in preview mode might be checking a course's status without being enrolled.
    // This is not an error; they are simply not enrolled. Let the UI handle it.
    if (userRole === 'admin' && !preview) {
        return { ok: true, isEnrolled: false };
    }

    if (!userProfileId) {
      return { ok: false, isEnrolled: false, message: "User profile id could not be determined for enrollment check." };
    }
    
    const enrollmentTable = userRole === 'student' ? 'lms_student_course_enrollments' : 'lms_teacher_course_enrollments';
    const fkColumn = userRole === 'student' ? 'student_id' : 'teacher_id';

    const { data: enrollment, error: enrollmentError } = await supabase
      .from(enrollmentTable)
      .select('id')
      .eq('course_id', courseId)
      .eq(fkColumn, userProfileId)
      .maybeSingle();

    if (enrollmentError) {
      console.error(`Enrollment check error for ${userRole} ${userProfileId} in course ${courseId}:`, enrollmentError);
      return { ok: false, isEnrolled: false, message: `Database error checking enrollment: ${enrollmentError.message}` };
    }

    return { ok: true, isEnrolled: !!enrollment, studentProfileId: userRole === 'student' ? userProfileId : undefined };

  } catch (error: any) {
    console.error("Error in checkUserEnrollmentForCourseViewAction:", error);
    return { ok: false, isEnrolled: false, message: error.message || "An unexpected error occurred during enrollment check." };
  }
}

// New action to record completion, now supports teachers
export async function markResourceAsCompleteAction(
  userId: string,
  userRole: UserRole,
  courseId: string,
  resourceId: string
): Promise<{ ok: boolean; message: string }> {
  const supabase = createSupabaseServerClient();
  let userProfileId: string | null = null;
  let schoolId: string | null = null;

  try {
      if (userRole === 'student') {
        const { data: profile, error } = await supabase.from('students').select('id, school_id').eq('user_id', userId).single();
        if (error || !profile) throw new Error("Could not find student profile to save progress.");
        userProfileId = profile.id;
        schoolId = profile.school_id;
      } else if (userRole === 'teacher') {
        const { data: profile, error } = await supabase.from('teachers').select('id, school_id').eq('user_id', userId).single();
        if (error || !profile) throw new Error("Could not find teacher profile to save progress.");
        userProfileId = profile.id;
        schoolId = profile.school_id;
      } else {
        return { ok: true, message: "Progress not tracked for this user role." };
      }

      if (!userProfileId || !schoolId) {
        return { ok: false, message: "Could not determine profile or school to save progress." };
      }
  
      const { error } = await supabase.from('lms_completion').upsert(
        {
          user_profile_id: userProfileId,
          user_role: userRole,
          course_id: courseId,
          resource_id: resourceId,
          school_id: schoolId,
          completed_at: new Date().toISOString(),
        },
        { onConflict: 'user_profile_id,user_role,course_id,resource_id' }
      );
      
      if (error) {
        if (error.message.includes('relation "public.lms_completion" does not exist')) {
          console.warn("LMS Completion table does not exist. Progress cannot be saved.");
          return { ok: true, message: "Progress could not be saved to the database. The 'lms_completion' table is missing." };
        }
        throw error;
      }

      return { ok: true, message: "Progress saved." };

  } catch (e: any) {
      console.error("Error saving resource completion:", e);
      return { ok: false, message: `Failed to save progress: ${e.message}` };
  }
}


// New action to get completion status, now supports teachers
export async function getCompletionStatusAction(
  userId: string,
  userRole: UserRole,
  courseId: string
): Promise<{ ok: boolean; completedResources?: Record<string, boolean> }> {
  const supabase = createSupabaseServerClient();
  let userProfileId: string | null = null;
  
  try {
     if (userRole === 'student') {
        const { data: profile, error } = await supabase.from('students').select('id').eq('user_id', userId).single();
        if (error || !profile) throw new Error("Could not find student profile.");
        userProfileId = profile.id;
      } else if (userRole === 'teacher') {
        const { data: profile, error } = await supabase.from('teachers').select('id').eq('user_id', userId).single();
        if (error || !profile) throw new Error("Could not find teacher profile.");
        userProfileId = profile.id;
      } else {
          return { ok: true, completedResources: {} }; // No progress for other roles
      }
  
      if(!userProfileId) return { ok: false, completedResources: {} };

      const { data, error } = await supabase
        .from('lms_completion')
        .select('resource_id')
        .eq('user_profile_id', userProfileId)
        .eq('user_role', userRole)
        .eq('course_id', courseId);
      
      if (error) {
        if (error.message.includes('relation "public.lms_completion" does not exist')) {
            console.warn("LMS Completion table does not exist. Cannot fetch completion status.");
            return { ok: true, completedResources: {} }; // Return empty object gracefully
        }
        throw error;
      }

      const completedMap: Record<string, boolean> = {};
      (data || []).forEach(item => {
        completedMap[item.resource_id] = true;
      });

      return { ok: true, completedResources: completedMap };
  } catch(e: any) {
      console.error("Error fetching completion status:", e);
      return { ok: false, completedResources: {} };
  }
}
