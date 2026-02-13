-- EMERGENCY FIX: Disable RLS on admin tables to stop the recursion
-- This allows authentication to work while we debug the policy issue

-- Temporarily disable RLS on super_admins table
ALTER TABLE super_admins DISABLE ROW LEVEL SECURITY;

-- Temporarily disable RLS on hospital_admins table  
ALTER TABLE hospital_admins DISABLE ROW LEVEL SECURITY;

-- Fix the helper functions with proper SECURITY DEFINER
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
