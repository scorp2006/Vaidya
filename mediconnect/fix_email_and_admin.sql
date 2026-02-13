-- RUN THIS IN SUPABASE SQL EDITOR with the CORRECT EMAIL

-- 1. Confirm the user's email manually (bypasses verification link)
UPDATE auth.users
SET email_confirmed_at = NOW(),
    updated_at = NOW()
-- Using the CORRECT email:
WHERE email = 'harshithkumar4452@gmail.com'; 

-- 2. Ensure they are a Super Admin
DO $$
DECLARE
  v_user_id UUID;
  v_email TEXT := 'harshithkumar4452@gmail.com'; -- CORRECT EMAIL
BEGIN
  -- Get ID of confirmed user
  SELECT id INTO v_user_id FROM auth.users WHERE email = v_email;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User % not found. Did you register with this email?', v_email;
  END IF;

  -- Insert into super_admins table
  INSERT INTO public.super_admins (user_id, email, name, role)
  VALUES (v_user_id, v_email, 'Harshith Kumar', 'super_admin')
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    role = 'super_admin',
    is_active = true;

  RAISE NOTICE 'Success! User % confirmed and granted Super Admin access.', v_email;
END $$;
