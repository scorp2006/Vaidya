-- Test if the RPC function exists and works
-- First, get a hospital ID from your existing hospitals
SELECT id, name FROM hospitals LIMIT 1;

-- Then test the RPC function (replace HOSPITAL_ID with the actual ID from above)
SELECT create_hospital_admin_db(
  'REPLACE_WITH_HOSPITAL_ID'::uuid,
  'test123@example.com',
  'Test Admin',
  'TestPassword123!'
);

-- Check if it worked
SELECT * FROM auth.users WHERE email = 'test123@example.com';
SELECT * FROM hospital_admins WHERE email = 'test123@example.com';
