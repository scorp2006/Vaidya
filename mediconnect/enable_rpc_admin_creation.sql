-- RUN THIS IN SUPABASE SQL EDITOR
-- This creates a secure function to create hospital admins directly from the frontend
-- bypassing the need for Edge Functions in development.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Function to create a user and hospital_admin record atomically
CREATE OR REPLACE FUNCTION public.create_hospital_admin_db(
    hospital_id UUID,
    email TEXT,
    name TEXT,
    password TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with superuser privileges to insert into auth.users
SET search_path = public, auth -- Secure search path
AS $$
DECLARE
  v_user_id UUID;
  v_encrypted_pw TEXT;
BEGIN
  -- Check if user already exists
  SELECT id INTO v_user_id FROM auth.users WHERE auth.users.email = create_hospital_admin_db.email;
  
  IF v_user_id IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User with this email already exists');
  END IF;

  -- Generate ID and encrypt password
  v_user_id := gen_random_uuid();
  v_encrypted_pw := crypt(password, gen_salt('bf'));

  -- 1. Create Auth User
  INSERT INTO auth.users (
    id, 
    email, 
    encrypted_password, 
    email_confirmed_at, 
    items_at, -- For backward compatibility maybe?
    raw_app_meta_data, 
    raw_user_meta_data, 
    created_at, 
    updated_at, 
    role, 
    aud,
    is_super_admin
  )
  VALUES (
    v_user_id,
    email,
    v_encrypted_pw,
    NOW(), -- Auto confirm
    null,
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('full_name', name),
    NOW(),
    NOW(),
    'authenticated',
    'authenticated',
    false
  );

  -- 2. Create Identity (Link email)
  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  )
  VALUES (
    gen_random_uuid(),
    v_user_id,
    format('{"sub":"%s","email":"%s"}', v_user_id::text, email)::jsonb,
    'email',
    NOW(),
    NOW(),
    NOW()
  );

  -- 3. Create Hospital Admin record
  INSERT INTO public.hospital_admins (user_id, hospital_id, email, name, role, is_active)
  VALUES (v_user_id, hospital_id, email, name, 'admin', true);

  RETURN jsonb_build_object('success', true, 'user_id', v_user_id);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
