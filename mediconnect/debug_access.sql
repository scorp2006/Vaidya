-- RUN THIS SCRIPT TO DEBUG YOUR SUPER ADMIN STATUS

-- 1. List all super admins currently in the database
SELECT * FROM public.super_admins;

-- 2. Verify if the recursion fix is applied correctly
-- This should return 1 or true if you are a super admin
-- REPLACE 'YOUR_USER_ID_HERE' with your actual User UID (e.g. '733f374b-dbfb-48d0-ad59-6c7453668ed4')
-- DO NOT RUN THIS PART IF YOU DON'T KNOW YOUR ID, JUST RUN THE SELECT ABOVE
-- SELECT is_super_admin(); -- This won't work directly in SQL Editor as auth.uid() is null there

-- Instead, let's verify if the function definition is correct
SELECT prosrc FROM pg_proc WHERE proname = 'is_super_admin';
