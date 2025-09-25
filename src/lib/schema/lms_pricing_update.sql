-- This SQL script updates the lms_courses table to use price_per_user instead of price_per_10_users.
-- Please execute this in your Supabase SQL editor to apply the changes.

-- Step 1: Add the new column 'price_per_user'.
-- We add it as nullable first to avoid issues with existing rows.
ALTER TABLE public.lms_courses ADD COLUMN price_per_user numeric;

-- Step 2: Copy and convert the data from the old column to the new one.
-- We divide by 10 to get the price per single user.
-- The COALESCE function handles cases where the old price was NULL.
UPDATE public.lms_courses
SET price_per_user = COALESCE(price_per_10_users / 10, 0);

-- Step 3: (Optional but recommended) Drop the old 'price_per_10_users' column
-- to keep the schema clean.
-- You might want to backup your data before running this step.
ALTER TABLE public.lms_courses DROP COLUMN price_per_10_users;

