-- Check if the hospital admin you just created exists
-- Replace with the email you used when creating the hospital

SELECT 
    u.id as user_id,
    u.email,
    u.email_confirmed_at,
    ha.hospital_id,
    ha.name,
    ha.role,
    ha.is_active
FROM auth.users u
LEFT JOIN hospital_admins ha ON ha.user_id = u.id
WHERE u.email = 'YOUR_EMAIL_HERE'  -- REPLACE THIS
ORDER BY u.created_at DESC
LIMIT 1;
