-- Check if the RPC function exists
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name = 'create_hospital_admin_db';

-- If it exists, try calling it manually to test
-- REPLACE these values with your test data:
SELECT create_hospital_admin_db(
  'HOSPITAL_ID_HERE'::uuid,  -- Replace with actual hospital ID from hospitals table
  'test@example.com',
  'Test Admin',
  'password123'
);
