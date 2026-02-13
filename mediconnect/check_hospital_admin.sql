-- Run this to check if your hospital admin was created successfully
-- Replace 'admin@hospital.com' with the email you used when creating the hospital

-- Check if user exists in auth.users
SELECT id, email, email_confirmed_at, created_at 
FROM auth.users 
WHERE email = 'admin@hospital.com';  -- REPLACE WITH YOUR EMAIL

-- Check if user exists in hospital_admins
SELECT user_id, hospital_id, email, name, role, is_active 
FROM hospital_admins 
WHERE email = 'admin@hospital.com';  -- REPLACE WITH YOUR EMAIL

-- Check if identity was created
SELECT id, provider_id, user_id, provider 
FROM auth.identities 
WHERE user_id IN (SELECT id FROM auth.users WHERE email = 'admin@hospital.com');  -- REPLACE WITH YOUR EMAIL
