-- ============================================================================
-- COMPLETE SETUP SCRIPT - Run this ONCE in Supabase SQL Editor
-- This fixes ALL issues: recursion, permissions, and sets up your admin account
-- ============================================================================

-- STEP 1: Fix the recursion issue (CRITICAL - prevents infinite loading)
-- ============================================================================
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN 
LANGUAGE sql 
STABLE 
SECURITY DEFINER 
SET search_path = public
AS $$ 
  SELECT EXISTS (
    SELECT 1 FROM super_admins 
    WHERE user_id = auth.uid() AND is_active = true
  ); 
$$;

CREATE OR REPLACE FUNCTION get_my_hospital_id()
RETURNS UUID 
LANGUAGE sql 
STABLE 
SECURITY DEFINER 
SET search_path = public
AS $$ 
  SELECT hospital_id FROM hospital_admins 
  WHERE user_id = auth.uid() LIMIT 1; 
$$;

-- STEP 2: Enable RPC for creating hospital admins (replaces Edge Function)
-- ============================================================================
-- Enable pgcrypto extension for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.create_hospital_admin_db(
    hospital_id UUID,
    email TEXT,
    name TEXT,
    password TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_user_id UUID;
  v_encrypted_pw TEXT;
BEGIN
  -- Check if user exists
  SELECT id INTO v_user_id FROM auth.users WHERE auth.users.email = create_hospital_admin_db.email;
  IF v_user_id IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User already exists');
  END IF;

  v_user_id := gen_random_uuid();
  v_encrypted_pw := extensions.crypt(password, extensions.gen_salt('bf'));

  -- Create Auth User
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud)
  VALUES (v_user_id, email, v_encrypted_pw, NOW(), '{"provider":"email","providers":["email"]}', jsonb_build_object('full_name', name), NOW(), NOW(), 'authenticated', 'authenticated');

  -- Create Identity (with provider_id set to user_id for email provider)
  INSERT INTO auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), v_user_id::text, v_user_id, format('{"sub":"%s","email":"%s"}', v_user_id::text, email)::jsonb, 'email', NOW(), NOW(), NOW());

  -- Create Hospital Admin
  INSERT INTO public.hospital_admins (user_id, hospital_id, email, name, role, is_active)
  VALUES (v_user_id, hospital_id, email, name, 'admin', true);

  RETURN jsonb_build_object('success', true, 'user_id', v_user_id);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- STEP 3: Confirm your email and make you Super Admin
-- ============================================================================
UPDATE auth.users 
SET email_confirmed_at = NOW(), 
    updated_at = NOW() 
WHERE email = 'harshithkumar4452@gmail.com'; 

DO $$ 
DECLARE 
  v_user_id UUID; 
  v_email TEXT := 'harshithkumar4452@gmail.com';
BEGIN 
  SELECT id INTO v_user_id FROM auth.users WHERE email = v_email;
  
  IF v_user_id IS NULL THEN 
    RAISE EXCEPTION 'User % not found! Please register at /register first', v_email; 
  END IF;
  
  INSERT INTO public.super_admins (user_id, email, name, role) 
  VALUES (v_user_id, v_email, 'Harshith Kumar', 'super_admin')
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    role = 'super_admin', 
    is_active = true;
    
  RAISE NOTICE 'SUCCESS! % is now a Super Admin with full access', v_email;
END $$;
