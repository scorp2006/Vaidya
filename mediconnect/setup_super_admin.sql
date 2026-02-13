-- Run this script in your Supabase SQL Editor
-- Replace 'YOUR_EMAIL_HERE' with the email you signed up with

DO $$
DECLARE
  v_user_id UUID;
  v_email TEXT := 'YOUR_EMAIL_HERE'; -- CHANGE THIS TO YOUR EMAIL
BEGIN
  -- 1. Get the user ID from auth.users
  SELECT id INTO v_user_id FROM auth.users WHERE email = v_email;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found', v_email;
  END IF;

  -- 2. Insert into super_admins if not exists
  INSERT INTO public.super_admins (user_id, email, name, role)
  VALUES (v_user_id, v_email, 'Super Admin', 'super_admin')
  ON CONFLICT (user_id) DO NOTHING;

  RAISE NOTICE 'Super admin access granted for %', v_email;
END $$;
