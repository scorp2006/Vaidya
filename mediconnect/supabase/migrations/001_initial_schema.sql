-- ============================================================
-- MediConnect - Initial Schema
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";    -- for text search
CREATE EXTENSION IF NOT EXISTS "earthdistance" CASCADE;  -- for geospatial distance

-- ============================================================
-- HOSPITALS
-- ============================================================
CREATE TABLE hospitals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  subdomain VARCHAR(100) UNIQUE NOT NULL,
  tier INTEGER NOT NULL CHECK (tier IN (1, 2, 3)),

  phone VARCHAR(15),
  email VARCHAR(255),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  pincode VARCHAR(10),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),

  rating DECIMAL(2,1) DEFAULT 0.0,
  total_reviews INTEGER DEFAULT 0,

  subscription_plan VARCHAR(50) DEFAULT 'basic' CHECK (subscription_plan IN ('basic','growth','enterprise')),
  subscription_status VARCHAR(20) DEFAULT 'trial' CHECK (subscription_status IN ('trial','active','suspended')),
  subscription_starts_at TIMESTAMPTZ,
  subscription_ends_at TIMESTAMPTZ,

  is_promoted BOOLEAN DEFAULT false,
  promotion_level VARCHAR(20) CHECK (promotion_level IN ('promoted','premium')),
  promotion_expires_at TIMESTAMPTZ,

  is_active BOOLEAN DEFAULT true,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_hospitals_subdomain ON hospitals(subdomain);
CREATE INDEX idx_hospitals_city ON hospitals(city);
CREATE INDEX idx_hospitals_active ON hospitals(is_active) WHERE is_active = true;
CREATE INDEX idx_hospitals_name_trgm ON hospitals USING GIN (name gin_trgm_ops);

-- ============================================================
-- SUPER ADMINS
-- References auth.users (Supabase Auth)
-- ============================================================
CREATE TABLE super_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'super_admin' CHECK (role IN ('super_admin','support','analyst')),
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- HOSPITAL ADMINS
-- References auth.users (Supabase Auth)
-- ============================================================
CREATE TABLE hospital_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'admin' CHECK (role IN ('admin','manager','receptionist')),
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_hospital_admins_hospital ON hospital_admins(hospital_id);
CREATE INDEX idx_hospital_admins_user ON hospital_admins(user_id);

-- ============================================================
-- DOCTORS
-- ============================================================
CREATE TABLE doctors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  specialization VARCHAR(100) NOT NULL,
  qualifications TEXT,
  experience_years INTEGER,
  consultation_fee INTEGER NOT NULL,
  languages TEXT[] DEFAULT '{}',
  working_days INTEGER[] DEFAULT '{}',
  working_hours_start TIME,
  working_hours_end TIME,
  slot_duration INTEGER DEFAULT 30,
  rating DECIMAL(2,1) DEFAULT 0.0,
  total_reviews INTEGER DEFAULT 0,
  profile_image_url TEXT,
  bio TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_doctors_hospital ON doctors(hospital_id);
CREATE INDEX idx_doctors_specialization ON doctors(specialization);
CREATE INDEX idx_doctors_active ON doctors(hospital_id, is_active) WHERE is_active = true;
CREATE INDEX idx_doctors_name_trgm ON doctors USING GIN (name gin_trgm_ops);
CREATE INDEX idx_doctors_spec_trgm ON doctors USING GIN (specialization gin_trgm_ops);

-- ============================================================
-- PATIENTS (WhatsApp users)
-- ============================================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(15) UNIQUE NOT NULL,
  name VARCHAR(255),
  age INTEGER,
  gender VARCHAR(20),
  blood_group VARCHAR(5),
  allergies TEXT[] DEFAULT '{}',
  chronic_conditions TEXT[] DEFAULT '{}',
  email VARCHAR(255),
  emergency_contact VARCHAR(15),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  pincode VARCHAR(10),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  preferred_language VARCHAR(20) DEFAULT 'English',
  whatsapp_name VARCHAR(255),
  registered_via VARCHAR(20) DEFAULT 'whatsapp',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_city ON users(city);

-- ============================================================
-- HOSPITAL-SPECIFIC PATIENT RECORDS
-- ============================================================
CREATE TABLE hospital_patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  name VARCHAR(255),
  phone VARCHAR(15),
  age INTEGER,
  blood_group VARCHAR(5),
  medical_notes TEXT,
  first_visit_at TIMESTAMPTZ DEFAULT NOW(),
  last_visit_at TIMESTAMPTZ,
  total_visits INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, hospital_id)
);

CREATE INDEX idx_hospital_patients_user ON hospital_patients(user_id);
CREATE INDEX idx_hospital_patients_hospital ON hospital_patients(hospital_id);

-- ============================================================
-- APPOINTMENT SLOTS
-- ============================================================
CREATE TABLE appointment_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  slot_date DATE NOT NULL,
  slot_time TIME NOT NULL,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(doctor_id, slot_date, slot_time)
);

CREATE INDEX idx_slots_doctor_date ON appointment_slots(doctor_id, slot_date);
CREATE INDEX idx_slots_available ON appointment_slots(doctor_id, slot_date, is_available) WHERE is_available = true;

-- ============================================================
-- APPOINTMENTS
-- ============================================================
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  hospital_id UUID NOT NULL REFERENCES hospitals(id),
  doctor_id UUID NOT NULL REFERENCES doctors(id),
  slot_id UUID REFERENCES appointment_slots(id),
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  status VARCHAR(50) DEFAULT 'confirmed' CHECK (
    status IN ('confirmed','cancelled','completed','no_show','checked_in','in_consultation')
  ),
  booking_source VARCHAR(50) DEFAULT 'whatsapp' CHECK (
    booking_source IN ('whatsapp','walk_in','phone','receptionist')
  ),
  patient_name VARCHAR(255),
  patient_phone VARCHAR(15),
  queue_position INTEGER,
  checked_in_at TIMESTAMPTZ,
  consultation_started_at TIMESTAMPTZ,
  consultation_ended_at TIMESTAMPTZ,
  consultation_fee INTEGER,
  payment_status VARCHAR(50) DEFAULT 'pending' CHECK (
    payment_status IN ('pending','paid','refunded')
  ),
  payment_method VARCHAR(50),
  reason_for_visit TEXT,
  admin_notes TEXT,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  reminder_sent_24h BOOLEAN DEFAULT false,
  reminder_sent_1h BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_appointments_user ON appointments(user_id);
CREATE INDEX idx_appointments_hospital ON appointments(hospital_id);
CREATE INDEX idx_appointments_doctor ON appointments(doctor_id);
CREATE INDEX idx_appointments_date ON appointments(appointment_date);
CREATE INDEX idx_appointments_hospital_date ON appointments(hospital_id, appointment_date);
CREATE INDEX idx_appointments_doctor_date ON appointments(doctor_id, appointment_date);
CREATE INDEX idx_appointments_status ON appointments(status);

-- ============================================================
-- MEDICAL RECORDS
-- ============================================================
CREATE TABLE medical_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  hospital_id UUID NOT NULL REFERENCES hospitals(id),
  appointment_id UUID REFERENCES appointments(id),
  record_type VARCHAR(50) NOT NULL CHECK (
    record_type IN ('prescription','lab_report','xray','scan','invoice')
  ),
  file_url TEXT,
  file_name VARCHAR(255),
  file_size INTEGER,
  file_type VARCHAR(50),
  is_encrypted BOOLEAN DEFAULT false,
  title VARCHAR(255),
  description TEXT,
  created_by UUID REFERENCES hospital_admins(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_medical_records_user ON medical_records(user_id);
CREATE INDEX idx_medical_records_hospital ON medical_records(hospital_id);
CREATE INDEX idx_medical_records_appointment ON medical_records(appointment_id);

-- ============================================================
-- MEDICAL RECORD SHARING
-- ============================================================
CREATE TABLE medical_record_sharing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES users(id),
  shared_with_hospital_id UUID NOT NULL REFERENCES hospitals(id),
  shared_with_doctor_id UUID REFERENCES doctors(id),
  scope VARCHAR(20) NOT NULL CHECK (scope IN ('all','specific_hospital','specific_type')),
  specific_hospital_ids UUID[],
  specific_record_types TEXT[],
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT true,
  access_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- BOOKING ANALYTICS (daily aggregates)
-- ============================================================
CREATE TABLE booking_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID REFERENCES hospitals(id),
  doctor_id UUID REFERENCES doctors(id),
  date DATE NOT NULL,
  total_bookings INTEGER DEFAULT 0,
  whatsapp_bookings INTEGER DEFAULT 0,
  walk_in_bookings INTEGER DEFAULT 0,
  completed_appointments INTEGER DEFAULT 0,
  cancelled_appointments INTEGER DEFAULT 0,
  no_shows INTEGER DEFAULT 0,
  total_revenue INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(hospital_id, doctor_id, date)
);

CREATE INDEX idx_analytics_hospital_date ON booking_analytics(hospital_id, date);

-- ============================================================
-- WHATSAPP CONVERSATIONS
-- ============================================================
CREATE TABLE whatsapp_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  phone VARCHAR(15) NOT NULL UNIQUE,
  current_state VARCHAR(50) DEFAULT 'idle',
  context JSONB DEFAULT '{}',
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  last_message_from VARCHAR(20),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_whatsapp_phone ON whatsapp_conversations(phone);

-- ============================================================
-- WHATSAPP MESSAGES
-- ============================================================
CREATE TABLE whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES whatsapp_conversations(id),
  user_id UUID REFERENCES users(id),
  direction VARCHAR(20) NOT NULL CHECK (direction IN ('inbound','outbound')),
  message_text TEXT,
  message_type VARCHAR(50),
  twilio_message_sid VARCHAR(255),
  twilio_status VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation ON whatsapp_messages(conversation_id);
CREATE INDEX idx_messages_created ON whatsapp_messages(created_at);

-- ============================================================
-- AUDIT LOGS
-- ============================================================
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID,
  actor_type VARCHAR(50),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id UUID,
  metadata JSONB,
  ip_address VARCHAR(50),
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_actor ON audit_logs(actor_id);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at);

-- ============================================================
-- FAMILY MEMBERS
-- ============================================================
CREATE TABLE family_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  primary_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  age INTEGER,
  gender VARCHAR(20),
  relationship VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_family_primary_user ON family_members(primary_user_id);

-- ============================================================
-- FAVORITE DOCTORS
-- ============================================================
CREATE TABLE favorite_doctors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, doctor_id)
);

-- ============================================================
-- AUTO-UPDATE updated_at TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER hospitals_updated_at BEFORE UPDATE ON hospitals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER hospital_admins_updated_at BEFORE UPDATE ON hospital_admins
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER super_admins_updated_at BEFORE UPDATE ON super_admins
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER doctors_updated_at BEFORE UPDATE ON doctors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER hospital_patients_updated_at BEFORE UPDATE ON hospital_patients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER appointments_updated_at BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER medical_records_updated_at BEFORE UPDATE ON medical_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER whatsapp_conversations_updated_at BEFORE UPDATE ON whatsapp_conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- ATOMIC BOOKING FUNCTION
-- Prevents double-booking via row-level locking
-- ============================================================
CREATE OR REPLACE FUNCTION book_appointment_atomic(
  p_user_id UUID,
  p_doctor_id UUID,
  p_slot_id UUID,
  p_appointment_date DATE,
  p_appointment_time TIME,
  p_booking_source VARCHAR DEFAULT 'whatsapp',
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_slot appointment_slots%ROWTYPE;
  v_doctor doctors%ROWTYPE;
  v_patient users%ROWTYPE;
  v_appointment appointments%ROWTYPE;
BEGIN
  -- Lock the slot to prevent concurrent bookings
  SELECT * INTO v_slot
  FROM appointment_slots
  WHERE id = p_slot_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Slot not found');
  END IF;

  IF NOT v_slot.is_available THEN
    RETURN jsonb_build_object('success', false, 'error', 'Slot no longer available');
  END IF;

  -- Get doctor for hospital_id and fee
  SELECT * INTO v_doctor FROM doctors WHERE id = p_doctor_id;
  SELECT * INTO v_patient FROM users WHERE id = p_user_id;

  -- Mark slot unavailable
  UPDATE appointment_slots SET is_available = false WHERE id = p_slot_id;

  -- Create appointment
  INSERT INTO appointments (
    user_id, hospital_id, doctor_id, slot_id,
    appointment_date, appointment_time,
    status, booking_source,
    patient_name, patient_phone,
    consultation_fee, reason_for_visit
  ) VALUES (
    p_user_id, v_doctor.hospital_id, p_doctor_id, p_slot_id,
    p_appointment_date, p_appointment_time,
    'confirmed', p_booking_source,
    v_patient.name, v_patient.phone,
    v_doctor.consultation_fee, p_reason
  )
  RETURNING * INTO v_appointment;

  -- Upsert hospital_patient record
  INSERT INTO hospital_patients (user_id, hospital_id, name, phone, age, blood_group, first_visit_at, last_visit_at, total_visits)
  VALUES (p_user_id, v_doctor.hospital_id, v_patient.name, v_patient.phone, v_patient.age, v_patient.blood_group, NOW(), NOW(), 1)
  ON CONFLICT (user_id, hospital_id) DO UPDATE
    SET last_visit_at = NOW(),
        total_visits = hospital_patients.total_visits + 1,
        updated_at = NOW();

  RETURN jsonb_build_object(
    'success', true,
    'appointment_id', v_appointment.id,
    'confirmation_code', UPPER(SUBSTRING(v_appointment.id::TEXT, 1, 8))
  );
END;
$$;

-- ============================================================
-- GET TODAY'S DASHBOARD FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION get_today_dashboard(p_hospital_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_today DATE := CURRENT_DATE;
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'date', v_today,
    'total_appointments', COUNT(*),
    'confirmed', COUNT(*) FILTER (WHERE status = 'confirmed'),
    'checked_in', COUNT(*) FILTER (WHERE status = 'checked_in'),
    'in_consultation', COUNT(*) FILTER (WHERE status = 'in_consultation'),
    'completed', COUNT(*) FILTER (WHERE status = 'completed'),
    'cancelled', COUNT(*) FILTER (WHERE status = 'cancelled'),
    'no_shows', COUNT(*) FILTER (WHERE status = 'no_show'),
    'whatsapp_bookings', COUNT(*) FILTER (WHERE booking_source = 'whatsapp'),
    'walk_in_bookings', COUNT(*) FILTER (WHERE booking_source = 'walk_in'),
    'revenue_today', COALESCE(SUM(consultation_fee) FILTER (WHERE status = 'completed'), 0)
  ) INTO v_result
  FROM appointments
  WHERE hospital_id = p_hospital_id
    AND appointment_date = v_today;

  RETURN v_result;
END;
$$;

-- ============================================================
-- ROW-LEVEL SECURITY
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE hospitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE hospital_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE super_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE hospital_patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_record_sharing ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper: get current user's hospital_id
CREATE OR REPLACE FUNCTION get_my_hospital_id()
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
  SELECT hospital_id FROM hospital_admins WHERE user_id = auth.uid() LIMIT 1;
$$;

-- Helper: is current user a super admin
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM super_admins WHERE user_id = auth.uid() AND is_active = true
  );
$$;

-- Helper: is current user a hospital admin
CREATE OR REPLACE FUNCTION is_hospital_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM hospital_admins WHERE user_id = auth.uid() AND is_active = true
  );
$$;

-- HOSPITALS: super admin sees all, hospital admin sees own
CREATE POLICY "super_admin_all_hospitals" ON hospitals
  FOR ALL USING (is_super_admin());

CREATE POLICY "hospital_admin_own_hospital" ON hospitals
  FOR SELECT USING (id = get_my_hospital_id());

CREATE POLICY "hospital_admin_update_own" ON hospitals
  FOR UPDATE USING (id = get_my_hospital_id());

-- HOSPITAL ADMINS: super admin sees all, admin sees own hospital staff
CREATE POLICY "super_admin_all_hospital_admins" ON hospital_admins
  FOR ALL USING (is_super_admin());

CREATE POLICY "hospital_admin_own_staff" ON hospital_admins
  FOR SELECT USING (hospital_id = get_my_hospital_id());

CREATE POLICY "hospital_admin_own_record" ON hospital_admins
  FOR SELECT USING (user_id = auth.uid());

-- SUPER ADMINS: only super admins can read (for profile checks)
CREATE POLICY "super_admin_own_record" ON super_admins
  FOR ALL USING (user_id = auth.uid() OR is_super_admin());

-- DOCTORS: public read for search, admin write for own hospital
CREATE POLICY "public_read_active_doctors" ON doctors
  FOR SELECT USING (is_active = true);

CREATE POLICY "hospital_admin_manage_doctors" ON doctors
  FOR ALL USING (hospital_id = get_my_hospital_id() AND is_hospital_admin());

CREATE POLICY "super_admin_all_doctors" ON doctors
  FOR ALL USING (is_super_admin());

-- APPOINTMENT SLOTS: public read, admin write for own hospital's doctors
CREATE POLICY "public_read_slots" ON appointment_slots
  FOR SELECT USING (true);

CREATE POLICY "hospital_admin_manage_slots" ON appointment_slots
  FOR ALL USING (
    is_hospital_admin() AND
    doctor_id IN (SELECT id FROM doctors WHERE hospital_id = get_my_hospital_id())
  );

-- APPOINTMENTS: hospital admin sees own hospital, patient sees own
CREATE POLICY "hospital_admin_own_appointments" ON appointments
  FOR ALL USING (hospital_id = get_my_hospital_id() AND is_hospital_admin());

CREATE POLICY "super_admin_all_appointments" ON appointments
  FOR ALL USING (is_super_admin());

-- Allow booking function (runs as definer)
CREATE POLICY "service_role_all_appointments" ON appointments
  FOR ALL USING (auth.role() = 'service_role');

-- HOSPITAL PATIENTS: hospital admin sees own
CREATE POLICY "hospital_admin_own_patients" ON hospital_patients
  FOR ALL USING (hospital_id = get_my_hospital_id() AND is_hospital_admin());

CREATE POLICY "super_admin_all_patients" ON hospital_patients
  FOR ALL USING (is_super_admin());

-- USERS (patients)
CREATE POLICY "hospital_admin_read_users" ON users
  FOR SELECT USING (is_hospital_admin());

CREATE POLICY "super_admin_all_users" ON users
  FOR ALL USING (is_super_admin());

CREATE POLICY "service_role_all_users" ON users
  FOR ALL USING (auth.role() = 'service_role');

-- MEDICAL RECORDS
CREATE POLICY "hospital_admin_own_records" ON medical_records
  FOR ALL USING (hospital_id = get_my_hospital_id() AND is_hospital_admin());

CREATE POLICY "super_admin_all_records" ON medical_records
  FOR ALL USING (is_super_admin());

-- BOOKING ANALYTICS
CREATE POLICY "hospital_admin_own_analytics" ON booking_analytics
  FOR SELECT USING (hospital_id = get_my_hospital_id() AND is_hospital_admin());

CREATE POLICY "super_admin_all_analytics" ON booking_analytics
  FOR ALL USING (is_super_admin());

-- AUDIT LOGS: insert by service role, read by super admin
CREATE POLICY "super_admin_read_audit" ON audit_logs
  FOR SELECT USING (is_super_admin());

CREATE POLICY "service_role_insert_audit" ON audit_logs
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- ============================================================
-- ANALYTICS UPDATE TRIGGER
-- Keeps booking_analytics in sync automatically
-- ============================================================
CREATE OR REPLACE FUNCTION update_booking_analytics()
RETURNS trigger AS $$
BEGIN
  -- Upsert analytics row for hospital+doctor+date
  INSERT INTO booking_analytics (hospital_id, doctor_id, date, total_bookings)
  VALUES (NEW.hospital_id, NEW.doctor_id, NEW.appointment_date, 1)
  ON CONFLICT (hospital_id, doctor_id, date) DO UPDATE
    SET total_bookings = booking_analytics.total_bookings + 1;

  IF NEW.booking_source = 'whatsapp' THEN
    UPDATE booking_analytics
    SET whatsapp_bookings = whatsapp_bookings + 1
    WHERE hospital_id = NEW.hospital_id AND doctor_id = NEW.doctor_id AND date = NEW.appointment_date;
  ELSIF NEW.booking_source = 'walk_in' THEN
    UPDATE booking_analytics
    SET walk_in_bookings = walk_in_bookings + 1
    WHERE hospital_id = NEW.hospital_id AND doctor_id = NEW.doctor_id AND date = NEW.appointment_date;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER appointments_analytics_update
  AFTER INSERT ON appointments
  FOR EACH ROW EXECUTE FUNCTION update_booking_analytics();

CREATE OR REPLACE FUNCTION update_completed_analytics()
RETURNS trigger AS $$
BEGIN
  IF NEW.status != OLD.status THEN
    IF NEW.status = 'completed' THEN
      UPDATE booking_analytics
      SET completed_appointments = completed_appointments + 1,
          total_revenue = total_revenue + COALESCE(NEW.consultation_fee, 0)
      WHERE hospital_id = NEW.hospital_id AND doctor_id = NEW.doctor_id AND date = NEW.appointment_date;
    ELSIF NEW.status = 'cancelled' THEN
      UPDATE booking_analytics
      SET cancelled_appointments = cancelled_appointments + 1
      WHERE hospital_id = NEW.hospital_id AND doctor_id = NEW.doctor_id AND date = NEW.appointment_date;
    ELSIF NEW.status = 'no_show' THEN
      UPDATE booking_analytics
      SET no_shows = no_shows + 1
      WHERE hospital_id = NEW.hospital_id AND doctor_id = NEW.doctor_id AND date = NEW.appointment_date;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER appointments_status_analytics
  AFTER UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION update_completed_analytics();

-- ============================================================
-- STORAGE BUCKETS (run separately or via dashboard)
-- ============================================================
-- INSERT INTO storage.buckets (id, name, public) VALUES ('medical-records', 'medical-records', false);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('doctor-profiles', 'doctor-profiles', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('hospital-logos', 'hospital-logos', true);
