-- SQL for creating the lms_completion table
-- This table tracks which student has completed which resource within a course.

CREATE TABLE IF NOT EXISTS public.lms_completion (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    student_id uuid NOT NULL,
    course_id uuid NOT NULL,
    resource_id uuid NOT NULL, -- This is the UUID of the resource inside the lesson's JSON content
    school_id uuid NOT NULL,
    completed_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT lms_completion_pkey PRIMARY KEY (id),
    CONSTRAINT lms_completion_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE,
    CONSTRAINT lms_completion_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.lms_courses(id) ON DELETE CASCADE,
    CONSTRAINT lms_completion_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE CASCADE,
    CONSTRAINT lms_completion_student_course_resource_unique UNIQUE (student_id, course_id, resource_id)
);

-- Add comments to explain the table and columns
COMMENT ON TABLE public.lms_completion IS 'Tracks student progress by recording completed resources within LMS courses.';
COMMENT ON COLUMN public.lms_completion.id IS 'Primary key for the completion record.';
COMMENT ON COLUMN public.lms_completion.student_id IS 'Foreign key to the students table.';
COMMENT ON COLUMN public.lms_completion.course_id IS 'Foreign key to the lms_courses table.';
COMMENT ON COLUMN public.lms_completion.resource_id IS 'The UUID of the specific resource (e.g., video, quiz) within the course lesson content.';
COMMENT ON COLUMN public.lms_completion.school_id IS 'Foreign key to the schools table for data partitioning.';
COMMENT ON COLUMN public.lms_completion.completed_at IS 'Timestamp of when the resource was marked as complete.';
COMMENT ON CONSTRAINT lms_completion_student_course_resource_unique ON public.lms_completion IS 'Ensures a student can only complete a specific resource once.';

-- Enable Row Level Security (RLS)
ALTER TABLE public.lms_completion ENABLE ROW LEVEL SECURITY;

-- Policies for RLS
-- Students can see their own completion records.
CREATE POLICY "Students can view their own completion records"
ON public.lms_completion
FOR SELECT
TO authenticated
USING (
  (SELECT auth.uid()) IN (SELECT user_id FROM public.students WHERE id = student_id)
);

-- Students can insert their own completion records.
CREATE POLICY "Students can insert their own completion records"
ON public.lms_completion
FOR INSERT
TO authenticated
WITH CHECK (
  (SELECT auth.uid()) IN (SELECT user_id FROM public.students WHERE id = student_id)
);

-- Admins and teachers can view completion records for their school.
CREATE POLICY "School staff can view completion records in their school"
ON public.lms_completion
FOR SELECT
TO authenticated
USING (
  school_id IN (SELECT school_id FROM public.users WHERE id = auth.uid())
);
