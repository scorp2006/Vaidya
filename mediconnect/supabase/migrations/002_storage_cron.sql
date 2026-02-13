-- ============================================================
-- MediConnect - Migration 002
-- Storage Buckets + pg_cron + Missing service_role policies
-- Run in Supabase SQL Editor
-- ============================================================

-- ── Storage Buckets ──────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('medical-records', 'medical-records', false, 52428800,
   ARRAY['application/pdf','image/jpeg','image/png','image/webp']),
  ('doctor-profiles', 'doctor-profiles', true, 5242880,
   ARRAY['image/jpeg','image/png','image/webp']),
  ('hospital-logos',  'hospital-logos',  true, 5242880,
   ARRAY['image/jpeg','image/png','image/webp','image/svg+xml'])
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: medical-records (private)
CREATE POLICY "hospital_admin_read_records" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'medical-records'
    AND auth.role() IN ('authenticated', 'service_role')
  );

CREATE POLICY "hospital_admin_insert_records" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'medical-records'
    AND auth.role() IN ('authenticated', 'service_role')
  );

CREATE POLICY "service_role_all_records" ON storage.objects
  FOR ALL USING (
    bucket_id = 'medical-records'
    AND auth.role() = 'service_role'
  );

-- Storage RLS: doctor-profiles (public read, admin write)
CREATE POLICY "public_read_doctor_profiles" ON storage.objects
  FOR SELECT USING (bucket_id = 'doctor-profiles');

CREATE POLICY "hospital_admin_upload_doctor_profiles" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'doctor-profiles'
    AND auth.role() IN ('authenticated', 'service_role')
  );

-- Storage RLS: hospital-logos (public read, admin write)
CREATE POLICY "public_read_hospital_logos" ON storage.objects
  FOR SELECT USING (bucket_id = 'hospital-logos');

CREATE POLICY "authenticated_upload_hospital_logos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'hospital-logos'
    AND auth.role() IN ('authenticated', 'service_role')
  );

-- ── Enable pg_cron extension ─────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ── Cron: send appointment reminders every hour ───────────────
-- Replace <SERVICE_ROLE_KEY> with your actual key before running
SELECT cron.schedule(
  'send-appointment-reminders',
  '0 * * * *',
  $$
    SELECT net.http_post(
      url := 'https://qpwtgdephdjdodknjsqv.supabase.co/functions/v1/send-reminders',
      headers := '{"Authorization": "Bearer <SERVICE_ROLE_KEY>", "Content-Type": "application/json"}'::jsonb,
      body := '{}'::jsonb
    );
  $$
);

-- ── Cron: regenerate doctor slots daily at midnight ───────────
-- Keeps slots rolling 30 days ahead
SELECT cron.schedule(
  'regenerate-doctor-slots',
  '0 0 * * *',
  $$
    SELECT net.http_post(
      url := 'https://qpwtgdephdjdodknjsqv.supabase.co/functions/v1/regenerate-slots',
      headers := '{"Authorization": "Bearer <SERVICE_ROLE_KEY>", "Content-Type": "application/json"}'::jsonb,
      body := '{}'::jsonb
    );
  $$
);

-- ── Missing service_role policies ────────────────────────────
-- appointment_slots: service role (Edge Functions) can write
CREATE POLICY "service_role_all_slots" ON appointment_slots
  FOR ALL USING (auth.role() = 'service_role');

-- whatsapp_conversations: service role full access
CREATE POLICY "service_role_all_conversations" ON whatsapp_conversations
  FOR ALL USING (auth.role() = 'service_role');

-- whatsapp_messages: service role full access
CREATE POLICY "service_role_all_messages" ON whatsapp_messages
  FOR ALL USING (auth.role() = 'service_role');

-- family_members: service role
CREATE POLICY "service_role_all_family" ON family_members
  FOR ALL USING (auth.role() = 'service_role');

-- medical_records: service role
CREATE POLICY "service_role_all_medical_records" ON medical_records
  FOR ALL USING (auth.role() = 'service_role');

-- hospital_patients: service role
CREATE POLICY "service_role_all_hospital_patients" ON hospital_patients
  FOR ALL USING (auth.role() = 'service_role');

-- ── Indexes for WhatsApp query patterns ─────────────────────
CREATE INDEX IF NOT EXISTS idx_appointments_reminder_24h
  ON appointments(appointment_date, status, reminder_sent_24h)
  WHERE status = 'confirmed' AND reminder_sent_24h = false;

CREATE INDEX IF NOT EXISTS idx_appointments_reminder_1h
  ON appointments(appointment_date, appointment_time, status, reminder_sent_1h)
  WHERE status = 'confirmed' AND reminder_sent_1h = false;

CREATE INDEX IF NOT EXISTS idx_appointments_user_status
  ON appointments(user_id, status, appointment_date);

CREATE INDEX IF NOT EXISTS idx_analytics_hospital_date_range
  ON booking_analytics(hospital_id, date DESC);
