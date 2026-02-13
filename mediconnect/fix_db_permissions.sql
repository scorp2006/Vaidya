-- RUN THIS SCRIPT IN SUPABASE SQL EDITOR

BEGIN;

-- 1. Correct the foreign key constraint just to be sure
ALTER TABLE public.super_admins
DROP CONSTRAINT IF EXISTS super_admins_user_id_fkey;

ALTER TABLE public.super_admins
ADD CONSTRAINT super_admins_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES auth.users(id)
ON DELETE CASCADE;

-- 2. Insert the Super Admin (using the ID from your logs)
INSERT INTO public.super_admins (user_id, email, name, role)
VALUES (
  '733f374b-dbfb-48d0-ad59-6c7453668ed4', 
  'kumarharshith4452@gmail.com', 
  'Harshith Kumar', 
  'super_admin'
)
ON CONFLICT (user_id) 
DO UPDATE SET 
  role = 'super_admin',
  is_active = true;

COMMIT;

-- 3. Verify success
SELECT * FROM public.super_admins WHERE user_id = '733f374b-dbfb-48d0-ad59-6c7453668ed4';
