-- Run this snapshot in Supabase SQL Editor
-- This uses your specific User ID found in the logs

INSERT INTO public.super_admins (user_id, email, name, role)
VALUES (
  '733f374b-dbfb-48d0-ad59-6c7453668ed4', 
  'kumarharshith4452@gmail.com', 
  'Harshith Kumar', 
  'super_admin'
)
ON CONFLICT (user_id) DO NOTHING;

-- Verify the insertion
SELECT * FROM public.super_admins;
