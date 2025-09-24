-- This table stores which courses a user has marked as a favorite.

CREATE TABLE IF NOT EXISTS public.lms_user_favorite_courses (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    course_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT lms_user_favorite_courses_pkey PRIMARY KEY (id),
    CONSTRAINT lms_user_favorite_courses_user_id_course_id_key UNIQUE (user_id, course_id),
    CONSTRAINT lms_user_favorite_courses_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.lms_courses(id) ON DELETE CASCADE,
    CONSTRAINT lms_user_favorite_courses_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

-- Enable Row Level Security
ALTER TABLE public.lms_user_favorite_courses ENABLE ROW LEVEL SECURITY;

-- Policies for lms_user_favorite_courses
-- Users can see their own favorites.
CREATE POLICY "Enable read access for user's own favorites"
ON public.lms_user_favorite_courses
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own favorites.
CREATE POLICY "Enable insert for user's own favorites"
ON public.lms_user_favorite_courses
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own favorites.
CREATE POLICY "Enable delete for user's own favorites"
ON public.lms_user_favorite_courses
FOR DELETE
USING (auth.uid() = user_id);
