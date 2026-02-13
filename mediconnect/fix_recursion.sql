-- RUN THIS IN SUPABASE SQL EDITOR
-- Fixes stack depth limit exceeded by removing recursive RLS checks

-- 1. Helper: is super admin (SECURITY DEFINER to bypass RLS)
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public -- Ensures no hijacking
AS $$
  SELECT EXISTS (
    SELECT 1 FROM super_admins WHERE user_id = auth.uid() AND is_active = true
  );
$$;

-- 2. Helper: get current user's hospital_id (SECURITY DEFINER to bypass RLS)
CREATE OR REPLACE FUNCTION get_my_hospital_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT hospital_id FROM hospital_admins WHERE user_id = auth.uid() LIMIT 1;
$$;

-- 3. Helper: is hospital admin (SECURITY DEFINER to bypass RLS)
CREATE OR REPLACE FUNCTION is_hospital_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM hospital_admins WHERE user_id = auth.uid() AND is_active = true
  );
$$;
