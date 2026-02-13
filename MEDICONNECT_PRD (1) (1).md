# MediConnect - Product Requirements Document (PRD)

**Version:** 1.0  
**Last Updated:** February 13, 2026  
**Product Owner:** Development Team  
**Target MVP Date:** 27 weeks from start

---

## TABLE OF CONTENTS

1. [Executive Summary](#executive-summary)
2. [Product Overview](#product-overview)
3. [Technical Stack](#technical-stack)
4. [Database Schema](#database-schema)
5. [Phase 1: Hospital Portal](#phase-1-hospital-portal)
6. [Phase 2: Super Admin Portal](#phase-2-super-admin-portal)
7. [Phase 3: Backend Infrastructure](#phase-3-backend-infrastructure)
8. [Phase 4: WhatsApp Integration](#phase-4-whatsapp-integration)
9. [Phase 5: User Flow & Marketplace](#phase-5-user-flow--marketplace)
10. [Deployment & DevOps](#deployment--devops)

---

## EXECUTIVE SUMMARY

**Product Vision:**  
MediConnect is a cloud-based Hospital Management System (HMS) with an integrated WhatsApp booking marketplace. Hospitals use our software for daily operations; patients book appointments via WhatsApp without downloading apps.

**Business Model:**
- Primary: SaaS subscription from hospitals (₹30K-75K/month)
- Secondary: Promoted hospital listings (₹15K-35K/month)
- Tertiary: Booking commission (5% per appointment)

**Core Value Proposition:**
- **For Hospitals:** Complete operational software + new patient acquisition channel
- **For Patients:** Search & book across all hospitals via WhatsApp
- **For Us:** Own the data layer, control the marketplace

---

## PRODUCT OVERVIEW

### Architecture Overview

```
┌─────────────────────────────────────────────┐
│  PATIENT LAYER (Phase 5)                    │
│  WhatsApp Interface                         │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│  API LAYER (Phase 3)                        │
│  RESTful APIs + WebSocket                   │
└──────────────────┬──────────────────────────┘
                   │
         ┌─────────┴─────────┐
         │                   │
┌────────▼─────────┐  ┌─────▼──────────┐
│ HOSPITAL PORTAL  │  │ SUPER ADMIN    │
│ (Phase 1)        │  │ PORTAL         │
│                  │  │ (Phase 2)      │
│ - Multi-tenant   │  │                │
│ - Hospital ops   │  │ - Hospital mgmt│
│ - Doctor/patient │  │ - Analytics    │
└──────────────────┘  └────────────────┘
         │                   │
         └─────────┬─────────┘
                   │
┌──────────────────▼──────────────────────────┐
│  DATA LAYER                                 │
│  PostgreSQL (multi-tenant)                  │
│  Redis (cache)                              │
│  S3 (medical records)                       │
└─────────────────────────────────────────────┘
```

### Key Features by User Type

**Hospital Admin:**
- Dashboard with today's schedule
- Doctor management (add/edit/schedule)
- Patient records management
- Appointment calendar
- Queue management
- Billing & invoicing
- Analytics & reports

**Super Admin (Our Company):**
- Onboard new hospitals
- Manage hospital subscriptions
- Platform analytics
- Promotion/listing management
- System configuration

**Patient (WhatsApp User):**
- Search doctors across all hospitals
- Compare options (price, rating, availability)
- Book appointments
- Get reminders
- View medical records securely
- Multi-lingual support

---

## TECHNICAL STACK

### Frontend
- **Framework:** React 18+ with TypeScript
- **UI Library:** shadcn/ui + Tailwind CSS
- **State Management:** Zustand or React Query
- **Forms:** React Hook Form + Zod validation
- **Charts:** Recharts
- **Calendar:** React Big Calendar
- **Build Tool:** Vite

### Backend
- **Runtime:** Node.js 20+ with TypeScript
- **Framework:** Express.js or Fastify
- **ORM:** Prisma
- **Authentication:** JWT + bcrypt
- **Validation:** Zod
- **API Documentation:** OpenAPI/Swagger

### Database
- **Primary:** PostgreSQL 15+
- **Cache:** Redis 7+
- **File Storage:** AWS S3 (or compatible)
- **Search:** PostgreSQL Full-Text Search (later: Elasticsearch)

### WhatsApp Integration
- **Provider:** Twilio WhatsApp API
- **LLM:** Anthropic Claude API (for intent extraction)
- **Webhooks:** Express endpoints

### DevOps
- **Containerization:** Docker + Docker Compose
- **CI/CD:** GitHub Actions
- **Hosting:** AWS / DigitalOcean / Railway
- **Monitoring:** Sentry (errors), Plausible (analytics)

---

## DATABASE SCHEMA

### Core Tables

```sql
-- ============================================
-- HOSPITALS & USERS
-- ============================================

CREATE TABLE hospitals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  subdomain VARCHAR(100) UNIQUE NOT NULL, -- apollo, kims, care
  tier INTEGER NOT NULL CHECK (tier IN (1, 2, 3)), -- 1=premium, 2=mid, 3=budget
  
  -- Contact info
  phone VARCHAR(15),
  email VARCHAR(255),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  pincode VARCHAR(10),
  
  -- Location for proximity search
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  
  -- Ratings & metrics
  rating DECIMAL(2,1) DEFAULT 0.0,
  total_reviews INTEGER DEFAULT 0,
  
  -- Subscription & promotion
  subscription_plan VARCHAR(50) DEFAULT 'basic', -- basic, growth, enterprise
  subscription_status VARCHAR(20) DEFAULT 'trial', -- trial, active, suspended
  subscription_starts_at TIMESTAMP,
  subscription_ends_at TIMESTAMP,
  
  is_promoted BOOLEAN DEFAULT false,
  promotion_level VARCHAR(20), -- null, 'promoted', 'premium'
  promotion_expires_at TIMESTAMP,
  
  -- Metadata
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- For multi-tenancy
  settings JSONB DEFAULT '{}', -- hospital-specific settings
  
  -- Full-text search
  search_vector tsvector
);

CREATE INDEX idx_hospitals_subdomain ON hospitals(subdomain);
CREATE INDEX idx_hospitals_city ON hospitals(city);
CREATE INDEX idx_hospitals_location ON hospitals USING GIST(ll_to_earth(latitude, longitude));
CREATE INDEX idx_hospitals_search ON hospitals USING GIN(search_vector);

-- ============================================

CREATE TABLE hospital_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'admin', -- admin, manager, receptionist
  
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_hospital_admins_hospital ON hospital_admins(hospital_id);
CREATE INDEX idx_hospital_admins_email ON hospital_admins(email);

-- ============================================
-- DOCTORS
-- ============================================

CREATE TABLE doctors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  
  name VARCHAR(255) NOT NULL,
  specialization VARCHAR(100) NOT NULL,
  qualifications TEXT,
  experience_years INTEGER,
  
  consultation_fee INTEGER NOT NULL,
  
  languages TEXT[] DEFAULT '{}', -- ['English', 'Hindi', 'Telugu']
  
  -- Availability
  working_days INTEGER[] DEFAULT '{}', -- [1,2,3,4,5] for Mon-Fri
  working_hours_start TIME,
  working_hours_end TIME,
  slot_duration INTEGER DEFAULT 30, -- minutes
  
  -- Ratings
  rating DECIMAL(2,1) DEFAULT 0.0,
  total_reviews INTEGER DEFAULT 0,
  
  -- Metadata
  profile_image_url TEXT,
  bio TEXT,
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Full-text search
  search_vector tsvector
);

CREATE INDEX idx_doctors_hospital ON doctors(hospital_id);
CREATE INDEX idx_doctors_specialization ON doctors(specialization);
CREATE INDEX idx_doctors_search ON doctors USING GIN(search_vector);

-- ============================================
-- PATIENTS / USERS
-- ============================================

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  phone VARCHAR(15) UNIQUE NOT NULL,
  name VARCHAR(255),
  age INTEGER,
  gender VARCHAR(20),
  
  -- Safety-critical info (shared across hospitals)
  blood_group VARCHAR(5),
  allergies TEXT[],
  chronic_conditions TEXT[],
  
  -- Contact
  email VARCHAR(255),
  emergency_contact VARCHAR(15),
  
  -- Location
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  pincode VARCHAR(10),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  
  -- Preferences
  preferred_language VARCHAR(20) DEFAULT 'English',
  
  -- WhatsApp registration
  whatsapp_name VARCHAR(255),
  registered_via VARCHAR(20) DEFAULT 'whatsapp',
  
  -- Metadata
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_city ON users(city);

-- ============================================
-- HOSPITAL-SPECIFIC PATIENT RECORDS
-- ============================================

CREATE TABLE hospital_patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  
  -- Basic info (copied from users table at first visit)
  name VARCHAR(255),
  phone VARCHAR(15),
  age INTEGER,
  blood_group VARCHAR(5),
  
  -- Hospital-specific medical notes
  medical_notes TEXT,
  
  -- Visit tracking
  first_visit_at TIMESTAMP DEFAULT NOW(),
  last_visit_at TIMESTAMP,
  total_visits INTEGER DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(user_id, hospital_id)
);

CREATE INDEX idx_hospital_patients_user ON hospital_patients(user_id);
CREATE INDEX idx_hospital_patients_hospital ON hospital_patients(hospital_id);

-- ============================================
-- APPOINTMENT SLOTS
-- ============================================

CREATE TABLE appointment_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  
  slot_date DATE NOT NULL,
  slot_time TIME NOT NULL,
  
  is_available BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(doctor_id, slot_date, slot_time)
);

CREATE INDEX idx_slots_doctor_date ON appointment_slots(doctor_id, slot_date);
CREATE INDEX idx_slots_available ON appointment_slots(is_available) WHERE is_available = true;

-- ============================================
-- APPOINTMENTS
-- ============================================

CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  user_id UUID NOT NULL REFERENCES users(id),
  hospital_id UUID NOT NULL REFERENCES hospitals(id),
  doctor_id UUID NOT NULL REFERENCES doctors(id),
  slot_id UUID REFERENCES appointment_slots(id),
  
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  
  status VARCHAR(50) DEFAULT 'confirmed', -- confirmed, cancelled, completed, no_show
  
  -- Booking source
  booking_source VARCHAR(50) DEFAULT 'whatsapp', -- whatsapp, walk_in, phone, receptionist
  
  -- Patient info snapshot (in case user data changes later)
  patient_name VARCHAR(255),
  patient_phone VARCHAR(15),
  
  -- Queue management
  queue_position INTEGER,
  checked_in_at TIMESTAMP,
  consultation_started_at TIMESTAMP,
  consultation_ended_at TIMESTAMP,
  
  -- Payment
  consultation_fee INTEGER,
  payment_status VARCHAR(50) DEFAULT 'pending', -- pending, paid, refunded
  payment_method VARCHAR(50),
  
  -- Notes
  reason_for_visit TEXT,
  admin_notes TEXT,
  
  -- Cancellation
  cancelled_at TIMESTAMP,
  cancellation_reason TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_appointments_user ON appointments(user_id);
CREATE INDEX idx_appointments_hospital ON appointments(hospital_id);
CREATE INDEX idx_appointments_doctor ON appointments(doctor_id);
CREATE INDEX idx_appointments_date ON appointments(appointment_date);
CREATE INDEX idx_appointments_status ON appointments(status);

-- ============================================
-- MEDICAL RECORDS
-- ============================================

CREATE TABLE medical_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  user_id UUID NOT NULL REFERENCES users(id),
  hospital_id UUID NOT NULL REFERENCES hospitals(id),
  appointment_id UUID REFERENCES appointments(id),
  
  record_type VARCHAR(50) NOT NULL, -- prescription, lab_report, xray, scan, invoice
  
  -- File storage
  file_url TEXT, -- S3 URL
  file_name VARCHAR(255),
  file_size INTEGER, -- bytes
  file_type VARCHAR(50), -- pdf, jpg, png
  
  -- Encryption
  is_encrypted BOOLEAN DEFAULT true,
  encryption_key_id UUID,
  
  -- Metadata
  title VARCHAR(255),
  description TEXT,
  
  -- Doctor who created this
  created_by UUID REFERENCES hospital_admins(id),
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_medical_records_user ON medical_records(user_id);
CREATE INDEX idx_medical_records_hospital ON medical_records(hospital_id);
CREATE INDEX idx_medical_records_appointment ON medical_records(appointment_id);

-- ============================================
-- MEDICAL RECORD SHARING (Patient Consent)
-- ============================================

CREATE TABLE medical_record_sharing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  patient_id UUID NOT NULL REFERENCES users(id),
  shared_with_hospital_id UUID NOT NULL REFERENCES hospitals(id),
  shared_with_doctor_id UUID REFERENCES doctors(id),
  
  -- What's being shared
  scope VARCHAR(20) NOT NULL, -- 'all', 'specific_hospital', 'specific_type'
  specific_hospital_ids UUID[], -- if scope = 'specific_hospital'
  specific_record_types VARCHAR[], -- if scope = 'specific_type'
  
  -- Time-limited access
  granted_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  is_active BOOLEAN DEFAULT true,
  
  -- Audit trail
  accessed_at TIMESTAMP[],
  access_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_sharing_patient ON medical_record_sharing(patient_id);
CREATE INDEX idx_sharing_hospital ON medical_record_sharing(shared_with_hospital_id);
CREATE INDEX idx_sharing_active ON medical_record_sharing(is_active, expires_at);

-- ============================================
-- SUPER ADMIN
-- ============================================

CREATE TABLE super_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'super_admin', -- super_admin, support, analyst
  
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- ANALYTICS & TRACKING
-- ============================================

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
  
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(hospital_id, doctor_id, date)
);

CREATE INDEX idx_analytics_hospital_date ON booking_analytics(hospital_id, date);

-- ============================================
-- WHATSAPP CONVERSATION STATE
-- ============================================

CREATE TABLE whatsapp_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  user_id UUID REFERENCES users(id),
  phone VARCHAR(15) NOT NULL,
  
  -- Conversation state machine
  current_state VARCHAR(50) DEFAULT 'idle', -- idle, searching, booking, viewing_records
  context JSONB DEFAULT '{}', -- stores conversation context
  
  -- Last interaction
  last_message_at TIMESTAMP DEFAULT NOW(),
  last_message_from VARCHAR(20), -- user, bot
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_whatsapp_phone ON whatsapp_conversations(phone);
CREATE INDEX idx_whatsapp_user ON whatsapp_conversations(user_id);

-- ============================================
-- MESSAGE LOG (for debugging & compliance)
-- ============================================

CREATE TABLE whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  conversation_id UUID REFERENCES whatsapp_conversations(id),
  user_id UUID REFERENCES users(id),
  
  direction VARCHAR(20) NOT NULL, -- inbound, outbound
  
  message_text TEXT,
  message_type VARCHAR(50), -- text, image, location, template
  
  -- Twilio metadata
  twilio_message_sid VARCHAR(255),
  twilio_status VARCHAR(50),
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation ON whatsapp_messages(conversation_id);
CREATE INDEX idx_messages_created ON whatsapp_messages(created_at);

-- ============================================
-- ROW-LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS
ALTER TABLE hospital_patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_records ENABLE ROW LEVEL SECURITY;

-- Policy: Hospital admins can only see their hospital's data
CREATE POLICY hospital_isolation_patients ON hospital_patients
  FOR ALL
  USING (hospital_id = current_setting('app.current_hospital_id', true)::UUID);

CREATE POLICY hospital_isolation_appointments ON appointments
  FOR ALL
  USING (hospital_id = current_setting('app.current_hospital_id', true)::UUID);

CREATE POLICY hospital_isolation_records ON medical_records
  FOR ALL
  USING (hospital_id = current_setting('app.current_hospital_id', true)::UUID);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Update search vectors
CREATE FUNCTION update_hospital_search_vector() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.city, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER hospitals_search_vector_update
  BEFORE INSERT OR UPDATE ON hospitals
  FOR EACH ROW EXECUTE FUNCTION update_hospital_search_vector();

CREATE FUNCTION update_doctor_search_vector() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.specialization, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.qualifications, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER doctors_search_vector_update
  BEFORE INSERT OR UPDATE ON doctors
  FOR EACH ROW EXECUTE FUNCTION update_doctor_search_vector();

-- Auto-update timestamps
CREATE FUNCTION update_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER hospitals_updated_at BEFORE UPDATE ON hospitals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER doctors_updated_at BEFORE UPDATE ON doctors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER appointments_updated_at BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

---

# PHASE 1: HOSPITAL PORTAL

**Duration:** 8 weeks  
**Goal:** Build the core HMS that hospitals use for daily operations  
**Team:** 2 Frontend + 2 Backend developers

---

## EPIC 1.1: Authentication & Multi-Tenancy Setup

**Objective:** Enable secure login for hospital admins with subdomain-based multi-tenancy

---

### Story 1.1.1: Hospital Subdomain Routing

**As a** hospital admin  
**I want to** access my hospital's dashboard via a unique subdomain  
**So that** I only see my hospital's data

**Priority:** P0 (Critical)  
**Story Points:** 5  
**Dependencies:** None

**Technical Requirements:**
```typescript
// Frontend: Detect subdomain
const subdomain = window.location.hostname.split('.')[0];
// apollo.mediconnect.com → subdomain = "apollo"

// Backend: Middleware to set hospital context
app.use((req, res, next) => {
  const subdomain = req.hostname.split('.')[0];
  const hospital = await findHospitalBySubdomain(subdomain);
  req.hospitalId = hospital.id;
  next();
});

// Set PostgreSQL RLS context
await db.query(`SET app.current_hospital_id = '${hospitalId}'`);
```

**Acceptance Criteria:**
- [ ] Frontend detects subdomain correctly
- [ ] API middleware extracts hospital from subdomain
- [ ] PostgreSQL RLS policies enforce data isolation
- [ ] Invalid subdomain shows 404 page
- [ ] Works on localhost with format: `apollo.localhost:3000`

**Files to Create:**
- `frontend/src/lib/subdomain.ts`
- `backend/src/middleware/tenancy.ts`
- `backend/src/middleware/rls.ts`

---

### Story 1.1.2: Hospital Admin Registration

**As a** super admin  
**I want to** create hospital admin accounts  
**So that** hospitals can access the system

**Priority:** P0  
**Story Points:** 3  
**Dependencies:** 1.1.1

**Technical Requirements:**
```typescript
// API Endpoint
POST /api/admin/hospitals/{hospitalId}/admins

// Request Body
{
  email: "admin@apollo.com",
  password: "SecurePass123!",
  name: "Dr. Ramesh Kumar",
  role: "admin" // admin, manager, receptionist
}

// Response
{
  id: "uuid",
  email: "admin@apollo.com",
  name: "Dr. Ramesh Kumar",
  role: "admin",
  hospital: {
    id: "uuid",
    name: "Apollo Hospital",
    subdomain: "apollo"
  }
}
```

**Acceptance Criteria:**
- [ ] Email must be unique across all hospitals
- [ ] Password must be hashed with bcrypt (10 rounds)
- [ ] Validation: email format, password strength (min 8 chars, 1 uppercase, 1 number)
- [ ] Auto-send welcome email with login credentials
- [ ] Admin can only be created for active hospitals

**Database:**
- Uses `hospital_admins` table
- Foreign key to `hospitals` table

**Files to Create:**
- `backend/src/routes/admin.routes.ts`
- `backend/src/controllers/admin.controller.ts`
- `backend/src/services/admin.service.ts`
- `backend/src/utils/password.ts`

---

### Story 1.1.3: Hospital Admin Login

**As a** hospital admin  
**I want to** log in with my email and password  
**So that** I can access my hospital's dashboard

**Priority:** P0  
**Story Points:** 5  
**Dependencies:** 1.1.2

**Technical Requirements:**
```typescript
// API Endpoint
POST /api/auth/login

// Request Body
{
  email: "admin@apollo.com",
  password: "SecurePass123!",
  subdomain: "apollo" // optional, can extract from hostname
}

// Response
{
  token: "jwt-token-here",
  refreshToken: "refresh-token-here",
  user: {
    id: "uuid",
    email: "admin@apollo.com",
    name: "Dr. Ramesh Kumar",
    role: "admin",
    hospitalId: "uuid",
    hospitalName: "Apollo Hospital"
  }
}

// JWT Payload
{
  userId: "uuid",
  hospitalId: "uuid",
  role: "admin",
  exp: "timestamp"
}
```

**Acceptance Criteria:**
- [ ] Verify email exists in hospital_admins table
- [ ] Verify password hash matches
- [ ] Generate JWT token (expires in 24 hours)
- [ ] Generate refresh token (expires in 30 days)
- [ ] Update last_login_at timestamp
- [ ] Return 401 for invalid credentials
- [ ] Return 403 if admin is_active = false
- [ ] Rate limit: 5 attempts per 15 minutes per IP

**Frontend:**
- Login page at `/login`
- Store JWT in localStorage or httpOnly cookie
- Redirect to `/dashboard` on success
- Show error message on failure

**Files to Create:**
- `backend/src/routes/auth.routes.ts`
- `backend/src/controllers/auth.controller.ts`
- `backend/src/services/auth.service.ts`
- `backend/src/utils/jwt.ts`
- `frontend/src/pages/Login.tsx`
- `frontend/src/lib/auth.ts`

---

### Story 1.1.4: Protected Routes & Auth Middleware

**As a** hospital admin  
**I want** all admin pages to require authentication  
**So that** unauthorized users cannot access data

**Priority:** P0  
**Story Points:** 3  
**Dependencies:** 1.1.3

**Technical Requirements:**
```typescript
// Backend Middleware
export const requireAuth = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    req.hospitalId = decoded.hospitalId;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Usage
app.get('/api/doctors', requireAuth, getDoctors);

// Frontend: Protected Route Component
function ProtectedRoute({ children }) {
  const token = localStorage.getItem('token');
  
  if (!token) {
    return <Navigate to="/login" />;
  }
  
  return children;
}
```

**Acceptance Criteria:**
- [ ] All `/api/*` endpoints require valid JWT (except /auth/login)
- [ ] Frontend redirects to /login if no token present
- [ ] Frontend redirects to /login if API returns 401
- [ ] Token refresh logic implemented for expired tokens
- [ ] Logout clears token and redirects to /login

**Files to Create:**
- `backend/src/middleware/auth.ts`
- `frontend/src/components/ProtectedRoute.tsx`
- `frontend/src/lib/api-client.ts` (with auto token injection)

---

## EPIC 1.2: Doctor Management

**Objective:** Hospital admins can add, edit, and manage doctors

---

### Story 1.2.1: Add Doctor Form

**As a** hospital admin  
**I want to** add new doctors to my hospital  
**So that** patients can book appointments with them

**Priority:** P0  
**Story Points:** 5  
**Dependencies:** 1.1.4

**Technical Requirements:**
```typescript
// API Endpoint
POST /api/doctors

// Request Body
{
  name: "Dr. Ramesh Sharma",
  specialization: "Cardiology",
  qualifications: "MBBS, MD (Cardiology), FRCP",
  experience_years: 15,
  consultation_fee: 800,
  languages: ["English", "Hindi", "Telugu"],
  working_days: [1, 2, 3, 4, 5], // Monday to Friday
  working_hours_start: "09:00",
  working_hours_end: "17:00",
  slot_duration: 30,
  profile_image_url: "https://s3.../doctor.jpg",
  bio: "Specialist in interventional cardiology..."
}

// Response
{
  id: "uuid",
  name: "Dr. Ramesh Sharma",
  specialization: "Cardiology",
  // ... all fields
  hospital_id: "apollo-hospital-uuid",
  created_at: "2024-02-13T10:00:00Z"
}
```

**Acceptance Criteria:**
- [ ] Form validates all required fields
- [ ] Specialization dropdown with common options
- [ ] Languages multi-select checkbox
- [ ] Working days multi-select (Mon-Sun)
- [ ] Time pickers for working hours
- [ ] Fee accepts only positive integers
- [ ] Image upload to S3 (or placeholder URL)
- [ ] Auto-generate appointment slots based on working hours + slot duration
- [ ] Success message on save
- [ ] Redirect to doctor list page

**Frontend Form Fields:**
- Name (text, required)
- Specialization (select/autocomplete, required)
- Qualifications (textarea)
- Experience Years (number)
- Consultation Fee (number, required)
- Languages (multi-select checkboxes)
- Working Days (checkboxes: Mon-Sun)
- Working Hours Start (time picker)
- Working Hours End (time picker)
- Slot Duration (select: 15/30/45/60 mins)
- Profile Image (file upload)
- Bio (textarea)

**Files to Create:**
- `backend/src/routes/doctors.routes.ts`
- `backend/src/controllers/doctors.controller.ts`
- `backend/src/services/doctors.service.ts`
- `backend/src/utils/slot-generator.ts`
- `frontend/src/pages/AddDoctor.tsx`
- `frontend/src/components/DoctorForm.tsx`

---

### Story 1.2.2: Doctor List Page with Search & Filter

**As a** hospital admin  
**I want to** view all doctors at my hospital  
**So that** I can manage them

**Priority:** P0  
**Story Points:** 5  
**Dependencies:** 1.2.1

**Technical Requirements:**
```typescript
// API Endpoint
GET /api/doctors?search=cardio&specialization=Cardiology&page=1&limit=20

// Response
{
  doctors: [
    {
      id: "uuid",
      name: "Dr. Sharma",
      specialization: "Cardiology",
      rating: 4.8,
      total_reviews: 328,
      consultation_fee: 800,
      is_active: true,
      total_appointments_today: 12,
      available_slots_today: 3
    }
  ],
  pagination: {
    page: 1,
    limit: 20,
    total: 45,
    total_pages: 3
  }
}
```

**Acceptance Criteria:**
- [ ] Table shows: Name, Specialization, Fee, Rating, Status
- [ ] Search bar filters by name or specialization
- [ ] Filter dropdown for specialization
- [ ] Pagination (20 doctors per page)
- [ ] Sort by: Name, Rating, Fee
- [ ] Click row to view doctor details
- [ ] "Add Doctor" button in top right
- [ ] Active/Inactive toggle for each doctor
- [ ] Delete doctor (with confirmation modal)

**Frontend Components:**
- Data table with shadcn/ui Table component
- Search input with debounce
- Filter dropdowns
- Pagination controls

**Files to Create:**
- `frontend/src/pages/DoctorList.tsx`
- `frontend/src/components/DoctorTable.tsx`
- `frontend/src/components/DoctorFilters.tsx`

---

### Story 1.2.3: Edit Doctor & Manage Schedule

**As a** hospital admin  
**I want to** edit doctor information and schedule  
**So that** appointments are accurate

**Priority:** P1  
**Story Points:** 5  
**Dependencies:** 1.2.2

**Technical Requirements:**
```typescript
// API Endpoints
GET /api/doctors/{doctorId}
PUT /api/doctors/{doctorId}
PATCH /api/doctors/{doctorId}/schedule

// Schedule update
PATCH /api/doctors/{doctorId}/schedule
{
  working_days: [1, 2, 3, 4, 5, 6], // Add Saturday
  working_hours_start: "08:00", // Start earlier
  slot_duration: 45 // Change from 30 to 45 mins
}

// Response: Regenerate future slots
{
  message: "Schedule updated successfully",
  slots_regenerated: 120, // for next 30 days
  existing_appointments_affected: 5 // appointments need rescheduling
}
```

**Acceptance Criteria:**
- [ ] Pre-fill form with existing doctor data
- [ ] Update doctor info (name, fee, bio, etc.)
- [ ] Update schedule (working days, hours, slot duration)
- [ ] When schedule changes, regenerate future slots (next 30 days)
- [ ] Show warning if existing appointments are affected
- [ ] Option to auto-reschedule affected appointments
- [ ] Audit log: "Schedule changed by {admin} on {date}"

**Files to Create:**
- `frontend/src/pages/EditDoctor.tsx`
- `backend/src/services/schedule.service.ts`

---

### Story 1.2.4: Doctor Availability Calendar

**As a** hospital admin  
**I want to** see a calendar view of doctor availability  
**So that** I can manage slots visually

**Priority:** P2  
**Story Points:** 8  
**Dependencies:** 1.2.3

**Technical Requirements:**
```typescript
// API Endpoint
GET /api/doctors/{doctorId}/availability?start_date=2024-02-01&end_date=2024-02-29

// Response
{
  doctor: { id, name, specialization },
  slots: [
    {
      date: "2024-02-13",
      total_slots: 16,
      available_slots: 8,
      booked_slots: 8,
      slots_detail: [
        { time: "09:00", is_available: true },
        { time: "09:30", is_available: false, appointment_id: "uuid" },
        // ...
      ]
    }
  ]
}
```

**Acceptance Criteria:**
- [ ] Calendar view using react-big-calendar or similar
- [ ] Show month view with color-coded days:
  - Green: >50% slots available
  - Yellow: 20-50% available
  - Red: <20% available
- [ ] Click day to see slot details
- [ ] Click slot to see appointment details
- [ ] Manually block/unblock specific slots (doctor on leave)
- [ ] Bulk operations: "Block all slots on Feb 15"

**Frontend Library:**
- Use `react-big-calendar` or `@fullcalendar/react`

**Files to Create:**
- `frontend/src/pages/DoctorCalendar.tsx`
- `frontend/src/components/AvailabilityCalendar.tsx`
- `backend/src/services/availability.service.ts`

---

## EPIC 1.3: Appointment Management

**Objective:** Hospital admins can view, create, and manage appointments

---

### Story 1.3.1: Today's Schedule Dashboard

**As a** hospital admin  
**I want to** see today's appointment schedule  
**So that** I know what's happening today

**Priority:** P0  
**Story Points:** 5  
**Dependencies:** 1.2.1

**Technical Requirements:**
```typescript
// API Endpoint
GET /api/dashboard/today

// Response
{
  date: "2024-02-13",
  summary: {
    total_appointments: 45,
    confirmed: 40,
    completed: 12,
    cancelled: 3,
    no_shows: 2,
    walk_ins: 5
  },
  appointments_by_doctor: [
    {
      doctor: {
        id: "uuid",
        name: "Dr. Sharma",
        specialization: "Cardiology"
      },
      appointments: [
        {
          id: "uuid",
          time: "09:00",
          patient_name: "Rahul Kumar",
          patient_phone: "+91-9876543210",
          status: "confirmed",
          booking_source: "whatsapp",
          checked_in: false
        },
        // ...
      ],
      stats: {
        total: 12,
        completed: 4,
        pending: 8,
        current_queue: 3
      }
    }
  ]
}
```

**Acceptance Criteria:**
- [ ] Dashboard shows summary cards at top:
  - Total appointments
  - Completed
  - Pending
  - Revenue (if payments tracked)
- [ ] Grouped by doctor in tabs or accordion
- [ ] Each appointment row shows:
  - Time
  - Patient name & phone
  - Status badge (color-coded)
  - Check-in button
  - Quick actions (view, cancel, complete)
- [ ] Real-time updates (WebSocket or polling)
- [ ] Filter: All / Confirmed / Completed
- [ ] Sort by time
- [ ] Click appointment to view details modal

**Frontend:**
- Dashboard layout with cards
- Tabs for each doctor
- Data table for appointments
- Auto-refresh every 30 seconds

**Files to Create:**
- `frontend/src/pages/Dashboard.tsx`
- `frontend/src/components/TodaySchedule.tsx`
- `frontend/src/components/AppointmentCard.tsx`
- `backend/src/controllers/dashboard.controller.ts`

---

### Story 1.3.2: Manual Appointment Booking (Walk-ins)

**As a** receptionist  
**I want to** book appointments for walk-in patients  
**So that** they get a slot

**Priority:** P0  
**Story Points:** 8  
**Dependencies:** 1.3.1

**Technical Requirements:**
```typescript
// API Flow
// 1. Check if patient exists
GET /api/patients?phone=9876543210

// 2. If not, create patient
POST /api/patients
{
  name: "Rajesh Kumar",
  phone: "9876543210",
  age: 45,
  gender: "Male"
}

// 3. Get available slots
GET /api/doctors/{doctorId}/slots?date=2024-02-13

// 4. Book appointment
POST /api/appointments
{
  user_id: "uuid",
  doctor_id: "uuid",
  slot_id: "uuid",
  appointment_date: "2024-02-13",
  appointment_time: "10:30",
  booking_source: "walk_in",
  reason_for_visit: "Chest pain"
}
```

**Acceptance Criteria:**
- [ ] Search patient by phone number
- [ ] If patient exists, auto-fill details
- [ ] If new patient, show registration form:
  - Name (required)
  - Phone (required, 10 digits)
  - Age
  - Gender
  - Blood group
  - Allergies
- [ ] Select doctor from dropdown
- [ ] Show available slots for selected date
- [ ] Select slot from visual time picker
- [ ] Add reason for visit (optional)
- [ ] Confirm booking
- [ ] Print appointment slip (optional)
- [ ] SMS confirmation sent to patient

**Frontend Flow:**
1. Button "Book Walk-in" on dashboard
2. Modal opens with multi-step form:
   - Step 1: Patient search/registration
   - Step 2: Select doctor & date
   - Step 3: Select time slot
   - Step 4: Confirmation
3. Success: Show appointment details + print option

**Files to Create:**
- `frontend/src/components/BookWalkIn.tsx`
- `frontend/src/components/PatientSearch.tsx`
- `frontend/src/components/SlotPicker.tsx`
- `backend/src/services/booking.service.ts`

---

### Story 1.3.3: Appointment Details & Actions

**As a** hospital admin  
**I want to** view appointment details and perform actions  
**So that** I can manage the appointment lifecycle

**Priority:** P1  
**Story Points:** 5  
**Dependencies:** 1.3.2

**Technical Requirements:**
```typescript
// API Endpoints
GET /api/appointments/{appointmentId}
PATCH /api/appointments/{appointmentId}/status

// Status transitions
{
  status: "checked_in" | "in_consultation" | "completed" | "cancelled" | "no_show"
}

// Cancel appointment
PATCH /api/appointments/{appointmentId}/cancel
{
  cancellation_reason: "Patient couldn't make it",
  cancelled_by: "admin" // admin, patient
}
```

**Acceptance Criteria:**
- [ ] View full appointment details:
  - Patient info (name, phone, age, allergies)
  - Doctor info
  - Time & date
  - Status
  - Booking source (WhatsApp/walk-in)
  - Payment status
  - Medical notes (if any)
- [ ] Action buttons based on status:
  - Confirmed → Check In, Cancel
  - Checked In → Start Consultation
  - In Consultation → Complete, Add Notes
  - Completed → View Records
- [ ] Add appointment notes (visible to doctor)
- [ ] Cancel with reason (required)
- [ ] Mark no-show (if patient didn't arrive)
- [ ] Reschedule appointment (select new slot)
- [ ] Activity log showing status changes

**Files to Create:**
- `frontend/src/pages/AppointmentDetails.tsx`
- `frontend/src/components/AppointmentActions.tsx`
- `backend/src/services/appointment-lifecycle.service.ts`

---

### Story 1.3.4: Queue Management System

**As a** receptionist  
**I want to** manage the patient queue in real-time  
**So that** patients know their wait time

**Priority:** P2  
**Story Points:** 8  
**Dependencies:** 1.3.3

**Technical Requirements:**
```typescript
// API Endpoint
GET /api/queue?doctor_id={uuid}&date=2024-02-13

// Response
{
  doctor: { id, name, specialization },
  current_patient: {
    appointment_id: "uuid",
    patient_name: "Rahul Kumar",
    consultation_started_at: "2024-02-13T10:05:00Z",
    estimated_duration: 30
  },
  queue: [
    {
      position: 1,
      appointment_id: "uuid",
      patient_name: "Priya Sharma",
      appointment_time: "10:30",
      status: "checked_in",
      estimated_call_time: "10:35",
      wait_time_minutes: 5
    },
    {
      position: 2,
      appointment_id: "uuid",
      patient_name: "Amit Reddy",
      appointment_time: "11:00",
      status: "confirmed",
      estimated_call_time: "11:05",
      wait_time_minutes: 30
    }
  ],
  analytics: {
    average_consultation_time: 28,
    current_delay_minutes: 15,
    total_in_queue: 8
  }
}

// Update queue
PATCH /api/queue/{appointmentId}/next
// Marks current patient as complete, calls next patient
```

**Acceptance Criteria:**
- [ ] Real-time queue display (WebSocket updates)
- [ ] Show current patient in consultation
- [ ] List patients in queue with:
  - Position number
  - Name
  - Scheduled time
  - Estimated call time
  - Status (waiting/checked-in)
- [ ] "Call Next" button moves queue forward
- [ ] Manual reorder queue (drag & drop)
- [ ] Display on TV screen for waiting room
- [ ] Calculate dynamic wait times based on:
  - Average consultation duration
  - Current delay
  - Queue position
- [ ] Send SMS/WhatsApp updates to patients when:
  - They're next in line
  - Delay exceeds 15 minutes

**Frontend:**
- Queue management panel
- TV display mode (fullscreen, auto-refresh)
- Drag-and-drop reordering

**Files to Create:**
- `frontend/src/pages/QueueManagement.tsx`
- `frontend/src/pages/QueueDisplay.tsx` (TV screen)
- `backend/src/services/queue.service.ts`
- `backend/src/websocket/queue.handler.ts`

---

## EPIC 1.4: Patient Records Management

**Objective:** Hospital admins can manage patient medical records

---

### Story 1.4.1: Patient List & Search

**As a** hospital admin  
**I want to** search and view all patients  
**So that** I can access their records

**Priority:** P1  
**Story Points:** 5  
**Dependencies:** 1.3.2

**Technical Requirements:**
```typescript
// API Endpoint
GET /api/patients?search=rahul&page=1&limit=50

// Response
{
  patients: [
    {
      id: "uuid",
      name: "Rahul Kumar",
      phone: "+91-9876543210",
      age: 32,
      gender: "Male",
      blood_group: "O+",
      total_visits: 5,
      last_visit_date: "2024-02-01",
      last_visit_doctor: "Dr. Sharma",
      upcoming_appointments: 1
    }
  ],
  pagination: { page: 1, limit: 50, total: 234 }
}
```

**Acceptance Criteria:**
- [ ] Search by: Name, Phone number
- [ ] Table columns: Name, Phone, Age, Last Visit, Total Visits
- [ ] Click row to view patient details
- [ ] Pagination (50 per page)
- [ ] Sort by: Name, Last visit date
- [ ] Export to CSV (optional)

**Files to Create:**
- `frontend/src/pages/PatientList.tsx`
- `frontend/src/components/PatientTable.tsx`

---

### Story 1.4.2: Patient Profile & History

**As a** hospital admin  
**I want to** view a patient's complete history at my hospital  
**So that** I can provide better care

**Priority:** P1  
**Story Points:** 8  
**Dependencies:** 1.4.1

**Technical Requirements:**
```typescript
// API Endpoint
GET /api/patients/{userId}/profile

// Response
{
  patient: {
    id: "uuid",
    name: "Rahul Kumar",
    phone: "+91-9876543210",
    age: 32,
    gender: "Male",
    blood_group: "O+",
    allergies: ["Penicillin"],
    chronic_conditions: ["Type 2 Diabetes"],
    address: "Banjara Hills, Hyderabad",
    emergency_contact: "+91-9988776655"
  },
  visit_history: [
    {
      date: "2024-02-01",
      doctor: "Dr. Sharma",
      specialization: "Cardiology",
      reason: "Chest pain",
      diagnosis: "Normal ECG, anxiety-related",
      prescription: ["Aspirin 75mg"],
      status: "completed"
    }
  ],
  appointments: [
    {
      id: "uuid",
      date: "2024-02-20",
      time: "14:00",
      doctor: "Dr. Patel",
      status: "confirmed"
    }
  ],
  medical_records: [
    {
      id: "uuid",
      type: "ECG Report",
      date: "2024-02-01",
      uploaded_by: "Dr. Sharma",
      file_url: "s3://..."
    }
  ],
  stats: {
    total_visits: 5,
    total_amount_spent: 4500,
    last_visit: "2024-02-01"
  }
}
```

**Acceptance Criteria:**
- [ ] Patient info card at top
- [ ] Tabs for:
  - Overview (summary stats)
  - Visit History (table)
  - Upcoming Appointments
  - Medical Records
  - Prescriptions
- [ ] Edit patient basic info (name, phone, allergies)
- [ ] Add medical notes
- [ ] Upload medical records (PDF, images)
- [ ] View/download existing records
- [ ] Timeline view of patient journey

**Files to Create:**
- `frontend/src/pages/PatientProfile.tsx`
- `frontend/src/components/PatientTabs.tsx`
- `frontend/src/components/VisitTimeline.tsx`

---

### Story 1.4.3: Upload Medical Records

**As a** hospital admin  
**I want to** upload medical records for patients  
**So that** they're stored securely

**Priority:** P1  
**Story Points:** 5  
**Dependencies:** 1.4.2

**Technical Requirements:**
```typescript
// API Endpoint
POST /api/medical-records

// Multipart form data
{
  user_id: "uuid",
  appointment_id: "uuid", // optional
  record_type: "prescription" | "lab_report" | "xray" | "scan",
  title: "Blood Test Report",
  description: "Fasting blood sugar test",
  file: <binary>
}

// Backend flow
1. Upload file to S3
2. Encrypt file (optional)
3. Store metadata in medical_records table
4. Return record ID

// Response
{
  id: "uuid",
  file_url: "https://s3.../encrypted-file.pdf",
  title: "Blood Test Report",
  created_at: "2024-02-13T10:00:00Z"
}
```

**Acceptance Criteria:**
- [ ] File upload with drag & drop
- [ ] Accept: PDF, JPG, PNG (max 10MB)
- [ ] Select record type from dropdown
- [ ] Add title and description
- [ ] Link to specific appointment (optional)
- [ ] Progress bar during upload
- [ ] Thumbnail preview for images
- [ ] Success notification after upload
- [ ] Record appears in patient's medical records tab

**S3 Integration:**
- Use AWS SDK or compatible (MinIO for local dev)
- Organize: `{hospital_id}/{patient_id}/{record_id}.pdf`
- Generate presigned URLs for secure access

**Files to Create:**
- `frontend/src/components/MedicalRecordUpload.tsx`
- `backend/src/services/file-upload.service.ts`
- `backend/src/utils/s3-client.ts`

---

## EPIC 1.5: Analytics & Reports

**Objective:** Hospital admins can view insights and generate reports

---

### Story 1.5.1: Analytics Dashboard

**As a** hospital admin  
**I want to** see key metrics about my hospital  
**So that** I can track performance

**Priority:** P2  
**Story Points:** 8  
**Dependencies:** 1.3.1

**Technical Requirements:**
```typescript
// API Endpoint
GET /api/analytics/overview?start_date=2024-02-01&end_date=2024-02-29

// Response
{
  summary: {
    total_appointments: 450,
    completed_appointments: 380,
    cancelled_appointments: 40,
    no_shows: 30,
    total_revenue: 270000,
    new_patients: 85,
    repeat_patients: 295
  },
  appointments_trend: [
    { date: "2024-02-01", total: 15, completed: 12 },
    { date: "2024-02-02", total: 18, completed: 16 },
    // ...
  ],
  revenue_trend: [
    { date: "2024-02-01", revenue: 9000 },
    // ...
  ],
  top_doctors: [
    {
      doctor_id: "uuid",
      name: "Dr. Sharma",
      total_appointments: 120,
      rating: 4.8,
      revenue: 96000
    }
  ],
  booking_sources: {
    whatsapp: 250,
    walk_in: 150,
    phone: 50
  },
  specialization_breakdown: {
    "Cardiology": 120,
    "Dentistry": 80,
    // ...
  }
}
```

**Acceptance Criteria:**
- [ ] Date range selector (This week, This month, Custom range)
- [ ] Summary cards with key metrics:
  - Total appointments
  - Revenue
  - New patients
  - Avg rating
- [ ] Line chart: Appointments over time
- [ ] Bar chart: Revenue by day
- [ ] Pie chart: Booking sources (WhatsApp vs Walk-in)
- [ ] Table: Top performing doctors
- [ ] Specialization breakdown
- [ ] Compare periods (This month vs Last month)
- [ ] Export report as PDF (optional)

**Frontend:**
- Use Recharts for data visualization
- Responsive layout
- Interactive charts (hover tooltips)

**Files to Create:**
- `frontend/src/pages/Analytics.tsx`
- `frontend/src/components/charts/AppointmentChart.tsx`
- `frontend/src/components/charts/RevenueChart.tsx`
- `backend/src/services/analytics.service.ts`

---

### Story 1.5.2: Doctor Performance Reports

**As a** hospital admin  
**I want to** see individual doctor performance  
**So that** I can evaluate and improve

**Priority:** P2  
**Story Points:** 5  
**Dependencies:** 1.5.1

**Technical Requirements:**
```typescript
// API Endpoint
GET /api/analytics/doctors/{doctorId}?start_date=2024-02-01&end_date=2024-02-29

// Response
{
  doctor: { id, name, specialization },
  metrics: {
    total_appointments: 120,
    completed: 105,
    cancelled: 10,
    no_shows: 5,
    average_consultation_time: 28, // minutes
    total_revenue: 96000,
    average_rating: 4.8,
    total_reviews: 45
  },
  daily_breakdown: [
    {
      date: "2024-02-01",
      appointments: 12,
      revenue: 9600,
      avg_wait_time: 15 // minutes
    }
  ],
  patient_satisfaction: {
    5_star: 30,
    4_star: 10,
    3_star: 3,
    2_star: 1,
    1_star: 1
  }
}
```

**Acceptance Criteria:**
- [ ] Select doctor from dropdown
- [ ] Date range filter
- [ ] KPI cards: Appointments, Revenue, Rating, Avg consultation time
- [ ] Daily appointments chart
- [ ] Patient satisfaction breakdown
- [ ] Compare with hospital average
- [ ] Download PDF report

**Files to Create:**
- `frontend/src/pages/DoctorPerformance.tsx`
- `backend/src/services/doctor-analytics.service.ts`

---

## EPIC 1.6: Settings & Configuration

**Objective:** Hospital admins can configure hospital settings

---

### Story 1.6.1: Hospital Profile Settings

**As a** hospital admin  
**I want to** update my hospital's profile  
**So that** patients see accurate information

**Priority:** P2  
**Story Points:** 3  
**Dependencies:** 1.1.1

**Technical Requirements:**
```typescript
// API Endpoints
GET /api/hospitals/{hospitalId}
PUT /api/hospitals/{hospitalId}

// Update payload
{
  name: "Apollo Hospital",
  phone: "+91-40-12345678",
  email: "info@apollo.com",
  address: "Road No. 10, Banjara Hills",
  city: "Hyderabad",
  state: "Telangana",
  pincode: "500034",
  latitude: 17.4239,
  longitude: 78.4738,
  website: "https://apollo.com",
  description: "Multi-specialty hospital..."
}
```

**Acceptance Criteria:**
- [ ] Form with all hospital details
- [ ] Location picker (map integration or lat/long input)
- [ ] Upload hospital logo
- [ ] Working hours configuration
- [ ] Services offered (multi-select)
- [ ] Insurance accepted (multi-select)
- [ ] Save changes with success notification

**Files to Create:**
- `frontend/src/pages/HospitalSettings.tsx`
- `backend/src/controllers/hospital.controller.ts`

---

### Story 1.6.2: Team Management (Staff Accounts)

**As a** hospital admin  
**I want to** add/remove staff accounts  
**So that** my team can use the system

**Priority:** P2  
**Story Points:** 5  
**Dependencies:** 1.1.2

**Technical Requirements:**
```typescript
// API Endpoints
GET /api/hospitals/{hospitalId}/staff
POST /api/hospitals/{hospitalId}/staff
PUT /api/staff/{staffId}
DELETE /api/staff/{staffId}

// Roles: admin (full access), manager (most access), receptionist (limited)
```

**Acceptance Criteria:**
- [ ] List all staff members
- [ ] Add new staff with email, name, role
- [ ] Edit staff details
- [ ] Deactivate staff (don't delete, just set is_active = false)
- [ ] Resend welcome email
- [ ] Role-based permissions:
  - Admin: All access
  - Manager: Can't add/remove staff
  - Receptionist: Only dashboard, appointments, patients

**Files to Create:**
- `frontend/src/pages/TeamManagement.tsx`
- `backend/src/services/staff.service.ts`

---

# PHASE 2: SUPER ADMIN PORTAL

**Duration:** 4 weeks  
**Goal:** Build the control center for our company to manage hospitals  
**Team:** 1 Frontend + 1 Backend developer

---

## EPIC 2.1: Super Admin Authentication

**Objective:** Secure login for company administrators

---

### Story 2.1.1: Super Admin Login

**As a** super admin  
**I want to** log in to the super admin portal  
**So that** I can manage the platform

**Priority:** P0  
**Story Points:** 3  
**Dependencies:** None

**Technical Requirements:**
```typescript
// API Endpoint
POST /api/super-admin/auth/login

// Request
{
  email: "admin@mediconnect.com",
  password: "SuperSecure123!"
}

// Response
{
  token: "jwt-token",
  user: {
    id: "uuid",
    email: "admin@mediconnect.com",
    name: "Platform Admin",
    role: "super_admin"
  }
}

// JWT payload includes: userId, role: "super_admin"
```

**Acceptance Criteria:**
- [ ] Separate login page at `/super-admin/login`
- [ ] JWT with role-based access
- [ ] Different token prefix to distinguish from hospital admins
- [ ] 2FA optional (TOTP)
- [ ] Audit log of all super admin logins

**Files to Create:**
- `frontend/src/pages/super-admin/Login.tsx`
- `backend/src/routes/super-admin-auth.routes.ts`
- `backend/src/middleware/super-admin-auth.ts`

---

## EPIC 2.2: Hospital Onboarding

**Objective:** Super admins can onboard new hospitals to the platform

---

### Story 2.2.1: Hospital List & Search

**As a** super admin  
**I want to** view all hospitals on the platform  
**So that** I can manage them

**Priority:** P0  
**Story Points:** 5  
**Dependencies:** 2.1.1

**Technical Requirements:**
```typescript
// API Endpoint
GET /api/super-admin/hospitals?search=apollo&city=Hyderabad&status=active

// Response
{
  hospitals: [
    {
      id: "uuid",
      name: "Apollo Hospital",
      subdomain: "apollo",
      city: "Hyderabad",
      tier: 1,
      subscription_status: "active",
      subscription_plan: "growth",
      total_doctors: 45,
      total_appointments_this_month: 1200,
      revenue_this_month: 720000,
      created_at: "2024-01-01",
      is_promoted: true
    }
  ],
  pagination: { page: 1, limit: 50, total: 234 }
}
```

**Acceptance Criteria:**
- [ ] Table with columns: Name, City, Tier, Plan, Status, Doctors, Appointments, Revenue
- [ ] Search by name or city
- [ ] Filter by: Status (active/trial/suspended), Plan, Tier
- [ ] Sort by: Name, Created date, Revenue
- [ ] Click row to view hospital details
- [ ] Quick actions: Edit, Suspend, Promote

**Files to Create:**
- `frontend/src/pages/super-admin/HospitalList.tsx`
- `backend/src/routes/super-admin-hospitals.routes.ts`

---

### Story 2.2.2: Onboard New Hospital

**As a** super admin  
**I want to** onboard a new hospital  
**So that** they can use the platform

**Priority:** P0  
**Story Points:** 8  
**Dependencies:** 2.2.1

**Technical Requirements:**
```typescript
// API Endpoint
POST /api/super-admin/hospitals

// Request
{
  name: "KIMS Hospital",
  subdomain: "kims", // must be unique
  tier: 2,
  
  // Contact
  phone: "+91-40-99999999",
  email: "admin@kims.com",
  address: "Secunderabad, Hyderabad",
  city: "Hyderabad",
  state: "Telangana",
  pincode: "500003",
  latitude: 17.4400,
  longitude: 78.4980,
  
  // Subscription
  subscription_plan: "basic", // basic, growth, enterprise
  subscription_starts_at: "2024-02-13",
  subscription_ends_at: "2025-02-13",
  
  // Admin account
  admin_name: "Dr. Suresh Kumar",
  admin_email: "suresh@kims.com",
  admin_password: "TempPass123!" // or auto-generate
}

// Backend flow:
1. Create hospital record
2. Create hospital_admins record
3. Send welcome email with login credentials
4. Create default settings

// Response
{
  hospital: { id, name, subdomain, ... },
  admin: { id, email, name },
  login_url: "https://kims.mediconnect.com/login",
  credentials: {
    email: "suresh@kims.com",
    temp_password: "TempPass123!"
  }
}
```

**Acceptance Criteria:**
- [ ] Multi-step form:
  - Step 1: Hospital details (name, subdomain, tier)
  - Step 2: Contact & location
  - Step 3: Subscription plan & dates
  - Step 4: Admin account creation
  - Step 5: Review & confirm
- [ ] Validate subdomain is unique and URL-safe
- [ ] Auto-generate secure temporary password
- [ ] Send welcome email to admin with:
  - Login URL
  - Credentials
  - Getting started guide
- [ ] Success page with hospital details
- [ ] Option to immediately configure hospital settings

**Files to Create:**
- `frontend/src/pages/super-admin/OnboardHospital.tsx`
- `backend/src/services/onboarding.service.ts`
- `backend/src/services/email.service.ts`

---

### Story 2.2.3: Hospital Details & Edit

**As a** super admin  
**I want to** view and edit hospital details  
**So that** I can manage their account

**Priority:** P1  
**Story Points:** 5  
**Dependencies:** 2.2.2

**Technical Requirements:**
```typescript
// API Endpoints
GET /api/super-admin/hospitals/{hospitalId}
PUT /api/super-admin/hospitals/{hospitalId}

// Additional actions
PATCH /api/super-admin/hospitals/{hospitalId}/status
{
  status: "active" | "suspended" | "trial"
}

PATCH /api/super-admin/hospitals/{hospitalId}/subscription
{
  plan: "basic" | "growth" | "enterprise",
  ends_at: "2025-02-13"
}
```

**Acceptance Criteria:**
- [ ] View full hospital profile
- [ ] Edit hospital info (name, contact, location, tier)
- [ ] Change subscription plan
- [ ] Extend/shorten subscription dates
- [ ] Suspend/activate hospital
- [ ] View activity log (when created, by whom, changes made)
- [ ] View all staff accounts at this hospital
- [ ] View hospital's statistics:
  - Total doctors
  - Total patients
  - Appointments (this month/all time)
  - Revenue
- [ ] Delete hospital (with confirmation, archive data)

**Files to Create:**
- `frontend/src/pages/super-admin/HospitalDetails.tsx`
- `backend/src/services/hospital-management.service.ts`

---

## EPIC 2.3: Platform Analytics

**Objective:** Super admins can view platform-wide metrics

---

### Story 2.3.1: Platform Dashboard

**As a** super admin  
**I want to** see overall platform metrics  
**So that** I can track business health

**Priority:** P1  
**Story Points:** 8  
**Dependencies:** 2.2.1

**Technical Requirements:**
```typescript
// API Endpoint
GET /api/super-admin/analytics/platform?start_date=2024-02-01&end_date=2024-02-29

// Response
{
  summary: {
    total_hospitals: 50,
    active_hospitals: 45,
    trial_hospitals: 5,
    total_doctors: 1200,
    total_patients: 45000,
    total_appointments: 18500,
    total_revenue: 13320000, // our commission
    new_signups_this_month: 8
  },
  growth_trends: {
    hospitals_growth: [
      { month: "Jan 2024", count: 42 },
      { month: "Feb 2024", count: 50 }
    ],
    appointments_growth: [
      { month: "Jan 2024", count: 16200 },
      { month: "Feb 2024", count: 18500 }
    ],
    revenue_growth: [
      { month: "Jan 2024", amount: 12150000 },
      { month: "Feb 2024", amount: 13320000 }
    ]
  },
  top_hospitals: [
    {
      id: "uuid",
      name: "Apollo Hospital",
      city: "Hyderabad",
      appointments_this_month: 1200,
      revenue_this_month: 720000
    }
  ],
  booking_sources: {
    whatsapp: 12000,
    walk_in: 5500,
    phone: 1000
  },
  churn_analysis: {
    hospitals_churned_this_month: 2,
    reasons: ["Pricing", "Feature missing"]
  }
}
```

**Acceptance Criteria:**
- [ ] KPI cards at top:
  - Total hospitals (with month-over-month growth %)
  - Total appointments
  - Platform revenue
  - Active users
- [ ] Line charts:
  - Hospital growth over time
  - Appointments over time
  - Revenue over time
- [ ] Table: Top 10 hospitals by bookings
- [ ] Pie chart: Booking sources (WhatsApp vs others)
- [ ] Churn metrics
- [ ] Date range selector
- [ ] Export report as PDF

**Files to Create:**
- `frontend/src/pages/super-admin/Dashboard.tsx`
- `backend/src/services/platform-analytics.service.ts`

---

### Story 2.3.2: Revenue & Commission Tracking

**As a** super admin  
**I want to** track revenue and commissions  
**So that** I can monitor profitability

**Priority:** P1  
**Story Points:** 5  
**Dependencies:** 2.3.1

**Technical Requirements:**
```typescript
// API Endpoint
GET /api/super-admin/analytics/revenue?start_date=2024-02-01&end_date=2024-02-29

// Response
{
  summary: {
    total_appointments: 18500,
    gross_appointment_value: 11100000, // consultation fees
    commission_earned: 555000, // 5% commission
    subscription_revenue: 1350000, // hospitals paying subscription
    promotion_revenue: 450000, // promoted listings
    total_platform_revenue: 2355000
  },
  revenue_by_source: {
    commissions: 555000,
    subscriptions: 1350000,
    promotions: 450000
  },
  revenue_by_hospital: [
    {
      hospital_id: "uuid",
      hospital_name: "Apollo",
      appointments: 1200,
      gross_value: 720000,
      commission_earned: 36000,
      subscription_fee: 30000,
      promotion_fee: 15000,
      total_revenue_from_hospital: 81000
    }
  ],
  payment_status: {
    collected: 2100000,
    pending: 255000
  }
}
```

**Acceptance Criteria:**
- [ ] Revenue breakdown cards:
  - Commission income
  - Subscription income
  - Promotion income
  - Total
- [ ] Chart: Revenue by source (stacked bar chart)
- [ ] Table: Revenue by hospital
- [ ] Payment status: Collected vs Pending
- [ ] Export to Excel for accounting
- [ ] Filter by hospital, date range

**Files to Create:**
- `frontend/src/pages/super-admin/Revenue.tsx`
- `backend/src/services/revenue-analytics.service.ts`

---

## EPIC 2.4: Promotion Management

**Objective:** Super admins can manage hospital promotion/listing features

---

### Story 2.4.1: Manage Promoted Hospitals

**As a** super admin  
**I want to** promote/demote hospitals  
**So that** I can control search rankings

**Priority:** P1  
**Story Points:** 5  
**Dependencies:** 2.2.1

**Technical Requirements:**
```typescript
// API Endpoints
GET /api/super-admin/promotions
POST /api/super-admin/promotions

// Create promotion
{
  hospital_id: "uuid",
  promotion_level: "promoted" | "premium",
  starts_at: "2024-02-13",
  expires_at: "2024-03-13",
  monthly_fee: 15000
}

// List promotions
{
  active_promotions: [
    {
      id: "uuid",
      hospital: { id, name, city },
      promotion_level: "premium",
      starts_at: "2024-02-01",
      expires_at: "2024-03-01",
      days_remaining: 16,
      monthly_fee: 35000,
      bookings_received: 320 // since promotion started
    }
  ],
  expired_promotions: []
}

// Auto-expire promotion
// Cron job runs daily, sets is_promoted = false when expires_at < NOW
```

**Acceptance Criteria:**
- [ ] List all active promotions
- [ ] Add promotion to hospital:
  - Select hospital
  - Choose level (promoted/premium)
  - Set duration (start & end dates)
  - Set monthly fee
- [ ] Extend promotion (change expiry date)
- [ ] Cancel promotion (immediate or scheduled)
- [ ] View promotion performance:
  - Bookings received
  - Revenue generated
  - ROI for hospital
- [ ] Auto-expire promotions via cron job
- [ ] Send reminder email to hospital 5 days before expiry

**Files to Create:**
- `frontend/src/pages/super-admin/Promotions.tsx`
- `backend/src/services/promotion.service.ts`
- `backend/src/cron/promotion-expiry.cron.ts`

---

## EPIC 2.5: System Configuration

**Objective:** Super admins can configure platform-wide settings

---

### Story 2.5.1: Global Settings

**As a** super admin  
**I want to** configure platform settings  
**So that** the system behaves correctly

**Priority:** P2  
**Story Points:** 3  
**Dependencies:** 2.1.1

**Technical Requirements:**
```typescript
// API Endpoint
GET /api/super-admin/settings
PUT /api/super-admin/settings

// Settings object (stored in DB as JSONB)
{
  commission_rate: 5, // percentage
  default_slot_duration: 30, // minutes
  whatsapp_api_key: "encrypted-key",
  twilio_account_sid: "encrypted-sid",
  llm_api_key: "encrypted-key",
  email_from: "noreply@mediconnect.com",
  support_email: "support@mediconnect.com",
  maintenance_mode: false,
  features: {
    queue_management: true,
    medical_records_sharing: true,
    promoted_listings: true
  },
  limits: {
    max_doctors_per_hospital: 100,
    max_appointments_per_day: 200
  }
}
```

**Acceptance Criteria:**
- [ ] Form with all settings
- [ ] Sensitive values (API keys) stored encrypted
- [ ] Validation for numeric values
- [ ] Save changes with confirmation
- [ ] Audit log of setting changes
- [ ] Maintenance mode toggle (shows banner on all pages)

**Files to Create:**
- `frontend/src/pages/super-admin/Settings.tsx`
- `backend/src/services/settings.service.ts`

---

# PHASE 3: BACKEND INFRASTRUCTURE

**Duration:** 6 weeks  
**Goal:** Build robust APIs, optimize performance, add core services  
**Team:** 3 Backend developers

---

## EPIC 3.1: API Optimization & Standards

**Objective:** Standardize API structure, add error handling, validation

---

### Story 3.1.1: API Error Handling & Response Format

**As a** developer  
**I want** consistent error handling across all APIs  
**So that** frontend can handle errors uniformly

**Priority:** P0  
**Story Points:** 3  
**Dependencies:** None

**Technical Requirements:**
```typescript
// Standard success response
{
  success: true,
  data: { ... },
  message: "Optional success message"
}

// Standard error response
{
  success: false,
  error: {
    code: "VALIDATION_ERROR",
    message: "Invalid input",
    details: [
      { field: "email", message: "Email is required" }
    ]
  }
}

// Error codes
- VALIDATION_ERROR (400)
- UNAUTHORIZED (401)
- FORBIDDEN (403)
- NOT_FOUND (404)
- CONFLICT (409) - e.g., duplicate subdomain
- INTERNAL_SERVER_ERROR (500)

// Global error handler middleware
app.use((err, req, res, next) => {
  if (err instanceof ValidationError) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: err.message,
        details: err.details
      }
    });
  }
  
  // Log error to Sentry
  Sentry.captureException(err);
  
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Something went wrong'
    }
  });
});
```

**Acceptance Criteria:**
- [ ] All endpoints return consistent format
- [ ] Validation errors include field-level details
- [ ] HTTP status codes used correctly
- [ ] Errors logged to monitoring service (Sentry)
- [ ] No sensitive data in error responses (production)

**Files to Create:**
- `backend/src/middleware/error-handler.ts`
- `backend/src/utils/api-response.ts`
- `backend/src/utils/errors.ts`

---

### Story 3.1.2: Request Validation with Zod

**As a** developer  
**I want** automatic request validation  
**So that** invalid data never reaches business logic

**Priority:** P0  
**Story Points:** 5  
**Dependencies:** 3.1.1

**Technical Requirements:**
```typescript
// Define schemas
import { z } from 'zod';

const CreateDoctorSchema = z.object({
  name: z.string().min(3).max(255),
  specialization: z.string().min(3),
  consultation_fee: z.number().int().positive(),
  working_days: z.array(z.number().min(0).max(6)),
  languages: z.array(z.string()).min(1),
  // ...
});

// Validation middleware
const validate = (schema) => (req, res, next) => {
  try {
    const validated = schema.parse(req.body);
    req.validatedData = validated;
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input',
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        }
      });
    }
    next(error);
  }
};

// Usage
app.post('/api/doctors', validate(CreateDoctorSchema), createDoctor);
```

**Acceptance Criteria:**
- [ ] All POST/PUT/PATCH endpoints have validation schemas
- [ ] Validation happens before database queries
- [ ] Clear error messages for validation failures
- [ ] Nested object validation works
- [ ] Array validation works
- [ ] Type coercion where appropriate

**Files to Create:**
- `backend/src/schemas/doctor.schema.ts`
- `backend/src/schemas/appointment.schema.ts`
- `backend/src/schemas/hospital.schema.ts`
- `backend/src/middleware/validate.ts`

---

### Story 3.1.3: Rate Limiting

**As a** platform owner  
**I want** rate limiting on APIs  
**So that** abuse is prevented

**Priority:** P1  
**Story Points:** 3  
**Dependencies:** None

**Technical Requirements:**
```typescript
import rateLimit from 'express-rate-limit';

// General API rate limit
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many requests, please try again later'
});

// Auth rate limit (stricter)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many login attempts, please try again later'
});

// WhatsApp webhook (very high)
const webhookLimiter = rateLimit({
  windowMs: 1000, // 1 second
  max: 100 // 100 per second
});

// Apply
app.use('/api/', apiLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/webhook/whatsapp', webhookLimiter);
```

**Acceptance Criteria:**
- [ ] Different limits for different endpoints
- [ ] Rate limit by IP address
- [ ] Rate limit by user (for authenticated routes)
- [ ] Return 429 status with Retry-After header
- [ ] Use Redis for distributed rate limiting (if multiple servers)

**Files to Create:**
- `backend/src/middleware/rate-limit.ts`

---

## EPIC 3.2: Database Optimization

**Objective:** Optimize queries, add caching, improve performance

---

### Story 3.2.1: Database Indexing Strategy

**As a** developer  
**I want** optimized database indexes  
**So that** queries are fast

**Priority:** P1  
**Story Points:** 5  
**Dependencies:** Database schema from earlier

**Technical Requirements:**
```sql
-- Already created in schema, but verify:

-- Frequently queried columns
CREATE INDEX IF NOT EXISTS idx_appointments_hospital_date 
  ON appointments(hospital_id, appointment_date);
  
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_date 
  ON appointments(doctor_id, appointment_date);

-- Full-text search
CREATE INDEX IF NOT EXISTS idx_doctors_search 
  ON doctors USING GIN(search_vector);

-- Geospatial queries
CREATE INDEX IF NOT EXISTS idx_hospitals_location 
  ON hospitals USING GIST(ll_to_earth(latitude, longitude));

-- Partial indexes for active records
CREATE INDEX IF NOT EXISTS idx_doctors_active 
  ON doctors(hospital_id) WHERE is_active = true;

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_slots_available 
  ON appointment_slots(doctor_id, slot_date, is_available) 
  WHERE is_available = true;
```

**Acceptance Criteria:**
- [ ] EXPLAIN ANALYZE on slow queries shows index usage
- [ ] All foreign keys have indexes
- [ ] Search queries use full-text indexes
- [ ] Location queries use geospatial indexes
- [ ] No sequential scans on large tables
- [ ] Index maintenance doesn't slow down writes significantly

**Files to Create:**
- `backend/prisma/migrations/add_indexes.sql`
- `backend/docs/database-performance.md`

---

### Story 3.2.2: Redis Caching Layer

**As a** developer  
**I want** Redis caching for expensive queries  
**So that** response times are fast

**Priority:** P1  
**Story Points:** 5  
**Dependencies:** None

**Technical Requirements:**
```typescript
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

// Cache wrapper
async function cacheOrFetch<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttl: number = 300 // 5 minutes default
): Promise<T> {
  const cached = await redis.get(key);
  if (cached) {
    return JSON.parse(cached);
  }
  
  const data = await fetchFn();
  await redis.setex(key, ttl, JSON.stringify(data));
  return data;
}

// Usage
async function getDoctors(hospitalId: string) {
  return cacheOrFetch(
    `hospital:${hospitalId}:doctors`,
    () => db.doctors.findMany({ where: { hospitalId } }),
    600 // 10 minutes
  );
}

// Cache invalidation
async function updateDoctor(doctorId: string, data: any) {
  const doctor = await db.doctors.update({ where: { id: doctorId }, data });
  
  // Invalidate cache
  const hospitalId = doctor.hospitalId;
  await redis.del(`hospital:${hospitalId}:doctors`);
  
  return doctor;
}
```

**What to Cache:**
- Doctor lists (10 min TTL)
- Hospital info (1 hour TTL)
- Available slots (5 min TTL)
- Dashboard summaries (5 min TTL)
- Analytics data (15 min TTL)

**What NOT to Cache:**
- Real-time appointment updates
- Queue status
- User authentication

**Acceptance Criteria:**
- [ ] Redis connected and working
- [ ] Cache keys follow naming convention
- [ ] TTL appropriate for data freshness needs
- [ ] Cache invalidation on updates
- [ ] Graceful degradation if Redis is down (fetch from DB)
- [ ] Monitor cache hit rate

**Files to Create:**
- `backend/src/lib/redis.ts`
- `backend/src/lib/cache.ts`

---

### Story 3.2.3: Database Connection Pooling

**As a** developer  
**I want** optimized database connection pooling  
**So that** we handle high load efficiently

**Priority:** P1  
**Story Points:** 3  
**Dependencies:** None

**Technical Requirements:**
```typescript
// Prisma datasource configuration
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  
  // Connection pool settings
  connection_limit = 20
  pool_timeout = 10
}

// For high-traffic endpoints, use connection pooling service
// e.g., PgBouncer in transaction mode

// Connection string with pooling
DATABASE_URL="postgresql://user:pass@host:6432/db?pgbouncer=true"

// Monitor connections
SELECT count(*) FROM pg_stat_activity WHERE datname = 'mediconnect';
```

**Acceptance Criteria:**
- [ ] Connection pool size configured appropriately
- [ ] No "too many connections" errors under load
- [ ] Idle connections cleaned up
- [ ] Long-running queries timeout (60s)
- [ ] Connection metrics logged

**Files to Create:**
- `backend/prisma/schema.prisma` (update)
- `backend/docs/database-pooling.md`

---

## EPIC 3.3: Search & Discovery Engine

**Objective:** Build the search logic for finding doctors across hospitals

---

### Story 3.3.1: Doctor Search API

**As a** WhatsApp user  
**I want** to search for doctors by specialty, location, etc.  
**So that** I can find the right doctor

**Priority:** P0  
**Story Points:** 8  
**Dependencies:** 3.2.1, 3.2.2

**Technical Requirements:**
```typescript
// API Endpoint
GET /api/public/search/doctors?
  specialty=cardiology
  &location_lat=17.4239
  &location_lng=78.4738
  &radius_km=10
  &max_fee=1000
  &language=Telugu
  &date=2024-02-15
  &sort=rating

// Response
{
  doctors: [
    {
      id: "uuid",
      name: "Dr. Sharma",
      specialization: "Cardiology",
      qualifications: "MBBS, MD",
      experience_years: 15,
      rating: 4.8,
      total_reviews: 328,
      consultation_fee: 800,
      languages: ["English", "Hindi", "Telugu"],
      
      hospital: {
        id: "uuid",
        name: "Apollo Hospital",
        tier: 1,
        address: "Banjara Hills, Hyderabad",
        distance_km: 2.3,
        is_promoted: true,
        promotion_level: "premium"
      },
      
      next_available_slot: {
        date: "2024-02-15",
        time: "15:00"
      }
    }
  ],
  meta: {
    total_results: 45,
    search_time_ms: 127
  }
}

// Ranking algorithm
function calculateScore(doctor, hospital, userLocation) {
  let score = 0;
  
  // 1. Promotion boost
  if (hospital.promotion_level === 'premium') {
    score += 1000;
  } else if (hospital.promotion_level === 'promoted') {
    score += 500;
  }
  
  // 2. Tier weight (Tier 1 = best)
  score += (4 - hospital.tier) * 100;
  
  // 3. Rating weight
  score += doctor.rating * 50;
  
  // 4. Proximity weight (closer = better)
  const distance = calculateDistance(hospital.location, userLocation);
  score += Math.max(0, 100 - distance * 5);
  
  // 5. Availability bonus
  if (doctor.hasAvailableSlotsToday) {
    score += 50;
  }
  
  return score;
}
```

**Acceptance Criteria:**
- [ ] Search by specialty (required)
- [ ] Filter by location (lat/lng + radius)
- [ ] Filter by max fee
- [ ] Filter by language
- [ ] Filter by availability on specific date
- [ ] Sort options: rating, fee (low/high), distance
- [ ] Promoted hospitals appear first (but only if relevant)
- [ ] Fast response (<200ms for 1000 doctors)
- [ ] Results cached in Redis (5 min TTL)
- [ ] Pagination (20 results per page)

**Files to Create:**
- `backend/src/routes/public/search.routes.ts`
- `backend/src/services/search.service.ts`
- `backend/src/utils/ranking-algorithm.ts`
- `backend/src/utils/distance-calculator.ts`

---

### Story 3.3.2: Autocomplete Suggestions

**As a** WhatsApp user  
**I want** autocomplete for specializations and hospitals  
**So that** I can search faster

**Priority:** P2  
**Story Points:** 3  
**Dependencies:** 3.3.1

**Technical Requirements:**
```typescript
// API Endpoint
GET /api/public/suggest?q=cardio&type=specialty

// Response
{
  suggestions: [
    { value: "Cardiology", count: 45 },
    { value: "Cardiac Surgery", count: 12 }
  ]
}

GET /api/public/suggest?q=apollo&type=hospital

// Response
{
  suggestions: [
    { 
      value: "Apollo Hospital, Hyderabad",
      id: "uuid",
      city: "Hyderabad"
    },
    {
      value: "Apollo Spectra, Secunderabad",
      id: "uuid",
      city: "Hyderabad"
    }
  ]
}
```

**Acceptance Criteria:**
- [ ] Type-ahead suggestions for specialties
- [ ] Type-ahead suggestions for hospitals
- [ ] Prefix matching (not substring)
- [ ] Case-insensitive
- [ ] Max 5 suggestions
- [ ] Response time <50ms
- [ ] Cached suggestions

**Files to Create:**
- `backend/src/routes/public/suggest.routes.ts`
- `backend/src/services/autocomplete.service.ts`

---

## EPIC 3.4: Booking Engine

**Objective:** Handle appointment booking logic robustly

---

### Story 3.4.1: Slot Availability Check

**As a** user  
**I want** to see available slots for a doctor  
**So that** I can book an appointment

**Priority:** P0  
**Story Points:** 5  
**Dependencies:** 1.2.1

**Technical Requirements:**
```typescript
// API Endpoint
GET /api/public/doctors/{doctorId}/slots?date=2024-02-15

// Response
{
  doctor: { id, name, specialization },
  date: "2024-02-15",
  working_hours: {
    start: "09:00",
    end: "17:00"
  },
  slots: [
    { time: "09:00", is_available: true },
    { time: "09:30", is_available: false, status: "booked" },
    { time: "10:00", is_available: true },
    // ...
  ],
  available_count: 12,
  total_count: 16
}

// Logic
1. Get doctor's working hours for that day
2. Generate slots based on slot_duration
3. Check appointment_slots table for bookings
4. Mark slots as available/unavailable
```

**Acceptance Criteria:**
- [ ] Returns slots only for working days
- [ ] Respects doctor's schedule (working hours)
- [ ] Shows past slots as unavailable
- [ ] Accurate availability status
- [ ] Fast response (cached for 5 min)
- [ ] Works for next 30 days

**Files to Create:**
- `backend/src/services/slot-availability.service.ts`

---

### Story 3.4.2: Appointment Booking API

**As a** user  
**I want** to book an appointment  
**So that** I can see a doctor

**Priority:** P0  
**Story Points:** 8  
**Dependencies:** 3.4.1

**Technical Requirements:**
```typescript
// API Endpoint
POST /api/public/appointments

// Request
{
  user_id: "uuid",
  doctor_id: "uuid",
  slot_id: "uuid",
  appointment_date: "2024-02-15",
  appointment_time: "10:30",
  reason_for_visit: "Chest pain" // optional
}

// Backend flow
async function bookAppointment(data) {
  // 1. Start transaction
  const transaction = await db.$transaction(async (tx) => {
    
    // 2. Lock slot (prevent double booking)
    const slot = await tx.appointmentSlot.findUnique({
      where: { id: data.slot_id },
      lock: true // FOR UPDATE lock
    });
    
    if (!slot || !slot.is_available) {
      throw new Error('Slot no longer available');
    }
    
    // 3. Create appointment
    const appointment = await tx.appointment.create({
      data: {
        user_id: data.user_id,
        doctor_id: data.doctor_id,
        hospital_id: slot.doctor.hospital_id,
        slot_id: data.slot_id,
        appointment_date: data.appointment_date,
        appointment_time: data.appointment_time,
        status: 'confirmed',
        booking_source: 'whatsapp'
      }
    });
    
    // 4. Mark slot as unavailable
    await tx.appointmentSlot.update({
      where: { id: data.slot_id },
      data: { is_available: false }
    });
    
    // 5. Create hospital_patient record if first visit
    await tx.hospitalPatient.upsert({
      where: {
        user_id_hospital_id: {
          user_id: data.user_id,
          hospital_id: slot.doctor.hospital_id
        }
      },
      update: {
        last_visit_at: new Date(),
        total_visits: { increment: 1 }
      },
      create: {
        user_id: data.user_id,
        hospital_id: slot.doctor.hospital_id,
        name: user.name,
        phone: user.phone,
        first_visit_at: new Date()
      }
    });
    
    return appointment;
  });
  
  // 6. After transaction: Send confirmations
  await sendConfirmationSMS(appointment);
  await sendConfirmationWhatsApp(appointment);
  
  // 7. Invalidate caches
  await redis.del(`doctor:${data.doctor_id}:slots:${data.appointment_date}`);
  
  return appointment;
}

// Response
{
  success: true,
  appointment: {
    id: "uuid",
    appointment_date: "2024-02-15",
    appointment_time: "10:30",
    status: "confirmed",
    doctor: { name: "Dr. Sharma" },
    hospital: { name: "Apollo", address: "..." },
    confirmation_code: "APPT-8472"
  }
}
```

**Acceptance Criteria:**
- [ ] Atomic booking (no race conditions)
- [ ] Validate slot is available before booking
- [ ] Create hospital_patient record if new patient
- [ ] Send confirmation SMS/WhatsApp
- [ ] Return appointment details
- [ ] Handle concurrent bookings gracefully
- [ ] Roll back on any failure
- [ ] Log booking for analytics

**Files to Create:**
- `backend/src/services/booking.service.ts`
- `backend/src/services/notification.service.ts`

---

### Story 3.4.3: Appointment Cancellation

**As a** user or hospital  
**I want** to cancel an appointment  
**So that** the slot becomes available

**Priority:** P1  
**Story Points:** 5  
**Dependencies:** 3.4.2

**Technical Requirements:**
```typescript
// API Endpoint
PATCH /api/appointments/{appointmentId}/cancel

// Request
{
  cancellation_reason: "Patient emergency",
  cancelled_by: "patient" // or "hospital"
}

// Backend flow
async function cancelAppointment(appointmentId, reason, cancelledBy) {
  const transaction = await db.$transaction(async (tx) => {
    // 1. Update appointment status
    const appointment = await tx.appointment.update({
      where: { id: appointmentId },
      data: {
        status: 'cancelled',
        cancelled_at: new Date(),
        cancellation_reason: reason
      }
    });
    
    // 2. Free up the slot
    if (appointment.slot_id) {
      await tx.appointmentSlot.update({
        where: { id: appointment.slot_id },
        data: { is_available: true }
      });
    }
    
    return appointment;
  });
  
  // 3. Send cancellation notification
  await sendCancellationNotification(appointment);
  
  // 4. Invalidate caches
  await redis.del(`doctor:${appointment.doctor_id}:slots:${appointment.appointment_date}`);
  
  return appointment;
}
```

**Acceptance Criteria:**
- [ ] Update appointment status to 'cancelled'
- [ ] Free up the slot (set is_available = true)
- [ ] Send notification to patient (if hospital cancelled)
- [ ] Send notification to hospital (if patient cancelled)
- [ ] Store cancellation reason
- [ ] Allow cancellation up to 2 hours before appointment
- [ ] Prevent cancellation of completed appointments

**Files to Create:**
- `backend/src/services/cancellation.service.ts`

---

## EPIC 3.5: Notification System

**Objective:** Send SMS and WhatsApp notifications

---

### Story 3.5.1: SMS Integration (Twilio)

**As a** system  
**I want** to send SMS notifications  
**So that** users are informed

**Priority:** P1  
**Story Points:** 3  
**Dependencies:** None

**Technical Requirements:**
```typescript
import twilio from 'twilio';

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

async function sendSMS(to: string, message: string) {
  try {
    const result = await client.messages.create({
      from: process.env.TWILIO_PHONE_NUMBER,
      to: to,
      body: message
    });
    
    // Log for audit
    await db.notification.create({
      data: {
        type: 'sms',
        recipient: to,
        message: message,
        status: 'sent',
        provider_message_id: result.sid
      }
    });
    
    return result;
  } catch (error) {
    console.error('SMS failed:', error);
    throw error;
  }
}

// Usage
await sendSMS(
  '+919876543210',
  'Your appointment with Dr. Sharma is confirmed for Feb 15 at 10:30 AM'
);
```

**When to Send SMS:**
- Appointment confirmation
- Appointment reminder (1 day before + 1 hour before)
- Appointment cancellation
- Queue updates (optional)

**Acceptance Criteria:**
- [ ] Twilio SDK integrated
- [ ] SMS sent successfully
- [ ] Handle errors gracefully
- [ ] Log all SMS for audit
- [ ] Rate limiting (avoid spam)
- [ ] Templates for common messages

**Files to Create:**
- `backend/src/services/sms.service.ts`
- `backend/src/templates/sms-templates.ts`

---

### Story 3.5.2: Scheduled Reminders (Cron Jobs)

**As a** system  
**I want** to send automated reminders  
**So that** patients don't miss appointments

**Priority:** P1  
**Story Points:** 5  
**Dependencies:** 3.5.1

**Technical Requirements:**
```typescript
import cron from 'node-cron';

// Run every hour
cron.schedule('0 * * * *', async () => {
  await sendUpcomingReminders();
});

async function sendUpcomingReminders() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  // Find appointments 24 hours from now
  const appointments = await db.appointment.findMany({
    where: {
      appointment_date: tomorrow,
      status: 'confirmed',
      reminder_sent_24h: false
    },
    include: {
      user: true,
      doctor: true,
      hospital: true
    }
  });
  
  for (const appt of appointments) {
    try {
      await sendSMS(
        appt.user.phone,
        `Reminder: You have an appointment tomorrow at ${appt.appointment_time} with ${appt.doctor.name} at ${appt.hospital.name}. Reply CANCEL to cancel.`
      );
      
      await db.appointment.update({
        where: { id: appt.id },
        data: { reminder_sent_24h: true }
      });
    } catch (error) {
      console.error(`Failed to send reminder for appointment ${appt.id}:`, error);
    }
  }
}

// Similar function for 1-hour reminders
```

**Acceptance Criteria:**
- [ ] Cron job runs reliably
- [ ] Send reminder 24 hours before appointment
- [ ] Send reminder 1 hour before appointment
- [ ] Mark reminders as sent (don't send duplicates)
- [ ] Handle timezone correctly
- [ ] Batch process for efficiency
- [ ] Error handling (retry failed sends)

**Files to Create:**
- `backend/src/cron/appointment-reminders.cron.ts`
- `backend/src/services/reminder.service.ts`

---

## EPIC 3.6: Security & Compliance

**Objective:** Implement security best practices

---

### Story 3.6.1: Data Encryption at Rest

**As a** platform owner  
**I want** sensitive data encrypted  
**So that** we're compliant with regulations

**Priority:** P1  
**Story Points:** 5  
**Dependencies:** None

**Technical Requirements:**
```typescript
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // 32 bytes
const IV_LENGTH = 16;

function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(text: string): string {
  const parts = text.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encryptedText = parts[1];
  
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

// Usage for medical records
async function saveMedicalRecord(data) {
  const encryptedData = encrypt(JSON.stringify(data));
  
  await db.medicalRecord.create({
    data: {
      user_id: data.user_id,
      encrypted_data: encryptedData,
      is_encrypted: true
    }
  });
}
```

**What to Encrypt:**
- Medical record file URLs (or files themselves in S3)
- Sensitive patient data (if required)
- API keys and secrets

**Acceptance Criteria:**
- [ ] Encryption key stored securely (env variable, not in code)
- [ ] AES-256 encryption used
- [ ] IV generated randomly for each encryption
- [ ] Encrypted data marked in database
- [ ] Decryption works correctly
- [ ] Performance acceptable (<10ms overhead)

**Files to Create:**
- `backend/src/utils/encryption.ts`

---

### Story 3.6.2: Audit Logging

**As a** compliance officer  
**I want** all sensitive actions logged  
**So that** we have an audit trail

**Priority:** P1  
**Story Points:** 3  
**Dependencies:** None

**Technical Requirements:**
```typescript
// Audit log table
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID, -- who performed the action
  actor_type VARCHAR(50), -- 'hospital_admin', 'super_admin', 'patient'
  action VARCHAR(100) NOT NULL, -- 'appointment.create', 'medical_record.view'
  entity_type VARCHAR(50), -- 'appointment', 'medical_record'
  entity_id UUID,
  metadata JSONB, -- additional context
  ip_address VARCHAR(50),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

// Audit function
async function logAudit(data: {
  actorId: string;
  actorType: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: any;
  req: Request;
}) {
  await db.auditLog.create({
    data: {
      actor_id: data.actorId,
      actor_type: data.actorType,
      action: data.action,
      entity_type: data.entityType,
      entity_id: data.entityId,
      metadata: data.metadata,
      ip_address: data.req.ip,
      user_agent: data.req.headers['user-agent']
    }
  });
}

// Usage
await logAudit({
  actorId: req.user.id,
  actorType: 'hospital_admin',
  action: 'medical_record.view',
  entityType: 'medical_record',
  entityId: recordId,
  metadata: { reason: 'appointment consultation' },
  req
});
```

**What to Log:**
- Medical record access
- Appointment creation/cancellation
- Patient data updates
- Admin actions (suspend hospital, change subscription)
- Failed login attempts

**Acceptance Criteria:**
- [ ] All sensitive actions logged
- [ ] Logs immutable (no updates, only inserts)
- [ ] Includes context (who, what, when, where)
- [ ] Searchable by date, actor, action
- [ ] Retention policy (keep for 7 years)
- [ ] Performance (<5ms overhead)

**Files to Create:**
- `backend/src/services/audit.service.ts`
- `backend/src/middleware/audit-log.ts`

---

# PHASE 4: WHATSAPP INTEGRATION

**Duration:** 5 weeks  
**Goal:** Integrate Twilio WhatsApp API and build conversational AI  
**Team:** 2 Backend + 1 Frontend (for testing tools)

---

## EPIC 4.1: WhatsApp API Setup

**Objective:** Connect to Twilio WhatsApp API and handle webhooks

---

### Story 4.1.1: Twilio WhatsApp Sandbox Setup

**As a** developer  
**I want** Twilio WhatsApp sandbox configured  
**So that** we can test WhatsApp integration

**Priority:** P0  
**Story Points:** 2  
**Dependencies:** None

**Technical Requirements:**
```
1. Sign up for Twilio account
2. Enable WhatsApp Sandbox
3. Get sandbox WhatsApp number (e.g., +1 415 523 8886)
4. Configure webhook URL: https://your-app.com/webhook/whatsapp
5. Save credentials:
   - TWILIO_ACCOUNT_SID
   - TWILIO_AUTH_TOKEN
   - TWILIO_WHATSAPP_NUMBER
```

**Acceptance Criteria:**
- [ ] Twilio account active
- [ ] WhatsApp sandbox enabled
- [ ] Webhook URL configured
- [ ] Test message sent successfully
- [ ] Webhook receives messages

**Files to Create:**
- `backend/.env.example` (add Twilio variables)
- `docs/twilio-setup.md`

---

### Story 4.1.2: WhatsApp Webhook Handler

**As a** system  
**I want** to receive WhatsApp messages  
**So that** I can process user requests

**Priority:** P0  
**Story Points:** 5  
**Dependencies:** 4.1.1

**Technical Requirements:**
```typescript
// API Endpoint
POST /webhook/whatsapp

// Twilio sends POST request with form data
{
  From: "whatsapp:+919876543210",
  To: "whatsapp:+14155238886",
  Body: "I need a cardiologist",
  MessageSid: "SM...",
  NumMedia: "0",
  // ... other fields
}

// Handler
app.post('/webhook/whatsapp', async (req, res) => {
  // 1. Validate request is from Twilio
  const isValid = twilio.validateRequest(
    process.env.TWILIO_AUTH_TOKEN,
    req.headers['x-twilio-signature'],
    req.url,
    req.body
  );
  
  if (!isValid) {
    return res.status(403).send('Forbidden');
  }
  
  // 2. Extract message data
  const from = req.body.From.replace('whatsapp:', '');
  const message = req.body.Body;
  const messageSid = req.body.MessageSid;
  
  // 3. Process message asynchronously
  processWhatsAppMessage(from, message, messageSid).catch(console.error);
  
  // 4. Respond immediately (Twilio requires response within 15 seconds)
  res.status(200).send('OK');
});
```

**Acceptance Criteria:**
- [ ] Webhook receives Twilio POST requests
- [ ] Validates Twilio signature
- [ ] Extracts message data correctly
- [ ] Responds within 15 seconds (Twilio timeout)
- [ ] Processes messages asynchronously
- [ ] Logs all incoming messages

**Files to Create:**
- `backend/src/routes/webhook.routes.ts`
- `backend/src/controllers/whatsapp-webhook.controller.ts`

---

### Story 4.1.3: Send WhatsApp Messages

**As a** system  
**I want** to send WhatsApp messages  
**So that** I can respond to users

**Priority:** P0  
**Story Points:** 3  
**Dependencies:** 4.1.1

**Technical Requirements:**
```typescript
import twilio from 'twilio';

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

async function sendWhatsAppMessage(to: string, message: string) {
  try {
    const result = await client.messages.create({
      from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
      to: `whatsapp:${to}`,
      body: message
    });
    
    // Log message
    await db.whatsappMessage.create({
      data: {
        direction: 'outbound',
        phone: to,
        message_text: message,
        twilio_message_sid: result.sid,
        twilio_status: result.status
      }
    });
    
    return result;
  } catch (error) {
    console.error('Failed to send WhatsApp message:', error);
    throw error;
  }
}

// Usage
await sendWhatsAppMessage(
  '+919876543210',
  'Found 3 cardiologists near you. Reply with a number to book:\n\n1️⃣ Dr. Sharma @ Apollo\n2️⃣ Dr. Reddy @ KIMS\n3️⃣ Dr. Kumar @ Care'
);
```

**Acceptance Criteria:**
- [ ] Send text messages successfully
- [ ] Handle errors gracefully
- [ ] Log all outbound messages
- [ ] Respect WhatsApp formatting (emoji, line breaks)
- [ ] Rate limiting (don't spam)

**Files to Create:**
- `backend/src/services/whatsapp.service.ts`

---

## EPIC 4.2: Conversational AI Engine

**Objective:** Use Claude API to understand user intent and generate responses

---

### Story 4.2.1: Claude API Integration

**As a** system  
**I want** to use Claude API  
**So that** I can understand user intent

**Priority:** P0  
**Story Points:** 5  
**Dependencies:** None

**Technical Requirements:**
```typescript
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

async function extractIntent(userMessage: string) {
  const prompt = `Extract structured data from this user message for a healthcare booking system.

User message: "${userMessage}"

Return ONLY valid JSON with this structure:
{
  "intent": "find_doctor" | "book_appointment" | "view_records" | "cancel_appointment" | "check_status" | "greeting" | "unclear",
  "specialty": "cardiology" | "dentistry" | "orthopedics" | null,
  "location": "Banjara Hills" | "Hyderabad" | null,
  "date": "today" | "tomorrow" | "2024-02-15" | null,
  "hospital_preference": "Apollo" | "KIMS" | null,
  "language": "English" | "Hindi" | "Telugu" | null
}`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 200,
    messages: [{
      role: 'user',
      content: prompt
    }]
  });
  
  const content = response.content[0].text;
  return JSON.parse(content);
}

// Usage
const intent = await extractIntent("I need a cardiologist tomorrow in Banjara Hills");
// { intent: "find_doctor", specialty: "cardiology", location: "Banjara Hills", date: "tomorrow" }
```

**Acceptance Criteria:**
- [ ] Claude API connected
- [ ] Intent extraction works reliably
- [ ] Returns valid JSON
- [ ] Handles unclear messages gracefully
- [ ] Cost efficient (<200 tokens per call)
- [ ] Response time <2 seconds

**Files to Create:**
- `backend/src/services/llm.service.ts`
- `backend/src/services/intent-extraction.service.ts`

---

### Story 4.2.2: Conversation State Management

**As a** system  
**I want** to maintain conversation context  
**So that** multi-turn conversations work

**Priority:** P0  
**Story Points:** 5  
**Dependencies:** 4.2.1

**Technical Requirements:**
```typescript
// Conversation state machine
type ConversationState = 
  | 'idle'
  | 'searching_doctor'
  | 'selecting_doctor'
  | 'selecting_slot'
  | 'confirming_booking'
  | 'viewing_records';

interface ConversationContext {
  state: ConversationState;
  data: {
    searchResults?: Doctor[];
    selectedDoctor?: Doctor;
    selectedSlot?: Slot;
    appointmentId?: string;
  };
}

// Get or create conversation
async function getConversation(phone: string) {
  let conversation = await db.whatsappConversation.findUnique({
    where: { phone }
  });
  
  if (!conversation) {
    conversation = await db.whatsappConversation.create({
      data: {
        phone,
        current_state: 'idle',
        context: {}
      }
    });
  }
  
  return conversation;
}

// Update conversation state
async function updateConversationState(
  conversationId: string,
  state: ConversationState,
  context: any
) {
  await db.whatsappConversation.update({
    where: { id: conversationId },
    data: {
      current_state: state,
      context: context,
      last_message_at: new Date()
    }
  });
}

// State transition logic
async function handleMessage(phone: string, message: string) {
  const conversation = await getConversation(phone);
  
  switch (conversation.current_state) {
    case 'idle':
      return handleIdleState(phone, message, conversation);
    
    case 'selecting_doctor':
      return handleSelectingDoctorState(phone, message, conversation);
    
    case 'selecting_slot':
      return handleSelectingSlotState(phone, message, conversation);
    
    // ...
  }
}
```

**Acceptance Criteria:**
- [ ] Conversation state persisted in database
- [ ] State transitions work correctly
- [ ] Context preserved across messages
- [ ] Timeout handling (reset to idle after 1 hour of inactivity)
- [ ] Multiple concurrent conversations work

**Files to Create:**
- `backend/src/services/conversation-manager.service.ts`
- `backend/src/state-machines/booking-flow.ts`

---

### Story 4.2.3: Response Generation

**As a** system  
**I want** to generate natural, contextual responses  
**So that** users have good experience

**Priority:** P0  
**Story Points:** 5  
**Dependencies:** 4.2.2

**Technical Requirements:**
```typescript
async function generateResponse(
  intent: Intent,
  context: ConversationContext,
  data?: any
): Promise<string> {
  
  switch (intent.intent) {
    case 'find_doctor':
      if (!data || data.length === 0) {
        return "Sorry, I couldn't find any doctors matching your requirements. Try broadening your search?";
      }
      
      // Format doctor list
      let response = `Found ${data.length} doctors:\n\n`;
      data.slice(0, 5).forEach((doctor, i) => {
        response += `${i + 1}️⃣ Dr. ${doctor.name} @ ${doctor.hospital.name}\n`;
        response += `   ⭐${doctor.rating} | ₹${doctor.consultation_fee}\n`;
        response += `   Next: ${doctor.next_slot}\n\n`;
      });
      response += `Reply with number to book`;
      return response;
    
    case 'booking_confirmed':
      return `✅ Appointment Booked!

📋 Details:
👨‍⚕️ ${data.doctor.name} - ${data.doctor.specialization}
🏥 ${data.hospital.name}
📅 ${formatDate(data.date)} at ${data.time}
💰 ₹${data.fee}

📍 Location: ${data.hospital.address}

I'll remind you 1 day before and 1 hour before your appointment.`;
    
    case 'greeting':
      return `Hi! 👋 I'm your healthcare assistant.

I can help you:
🔍 Find doctors
📅 Book appointments  
📋 View your records

What would you like to do?`;
    
    // ... other intents
  }
}
```

**Acceptance Criteria:**
- [ ] Responses are clear and concise
- [ ] Use emoji for better UX
- [ ] Format data nicely (line breaks, numbering)
- [ ] Multilingual support (if user's language detected)
- [ ] Error messages are helpful
- [ ] Confirm actions before executing

**Files to Create:**
- `backend/src/services/response-generator.service.ts`
- `backend/src/templates/response-templates.ts`

---

## EPIC 4.3: WhatsApp Message Handlers

**Objective:** Handle specific user intents

---

### Story 4.3.1: Find Doctor Flow

**As a** user  
**I want** to search for doctors via WhatsApp  
**So that** I can find the right one

**Priority:** P0  
**Story Points:** 8  
**Dependencies:** 4.2.3, 3.3.1

**Technical Requirements:**
```typescript
async function handleFindDoctor(phone: string, message: string, conversation: Conversation) {
  // 1. Extract intent
  const intent = await extractIntent(message);
  
  // 2. Get user location (from profile or ask)
  let user = await db.user.findUnique({ where: { phone } });
  
  if (!user) {
    // New user - need to register
    return handleRegistration(phone);
  }
  
  // 3. Search doctors
  const doctors = await searchDoctors({
    specialty: intent.specialty,
    location: {
      lat: user.latitude,
      lng: user.longitude
    },
    date: parseDate(intent.date),
    hospital: intent.hospital_preference
  });
  
  // 4. Update conversation state
  await updateConversationState(conversation.id, 'selecting_doctor', {
    searchResults: doctors,
    searchParams: intent
  });
  
  // 5. Generate response
  const response = await generateResponse({ intent: 'find_doctor' }, conversation, doctors);
  
  // 6. Send message
  await sendWhatsAppMessage(phone, response);
}
```

**Acceptance Criteria:**
- [ ] Understands doctor search requests
- [ ] Searches doctors from database
- [ ] Returns top 5 results
- [ ] Formats results nicely
- [ ] Updates conversation state
- [ ] Handles no results case

**Files to Create:**
- `backend/src/handlers/find-doctor.handler.ts`

---

### Story 4.3.2: Book Appointment Flow

**As a** user  
**I want** to book appointments via WhatsApp  
**So that** I get a confirmed slot

**Priority:** P0  
**Story Points:** 8  
**Dependencies:** 4.3.1, 3.4.2

**Technical Requirements:**
```typescript
// Multi-step flow
// Step 1: User selects doctor (by number)
async function handleDoctorSelection(phone: string, message: string, conversation: Conversation) {
  const selection = parseInt(message.trim());
  const doctors = conversation.context.searchResults;
  
  if (!selection || selection < 1 || selection > doctors.length) {
    return sendWhatsAppMessage(phone, "Invalid selection. Please reply with a number between 1-5.");
  }
  
  const selectedDoctor = doctors[selection - 1];
  
  // Fetch available slots
  const slots = await getAvailableSlots(selectedDoctor.id, conversation.context.searchParams.date);
  
  // Update state
  await updateConversationState(conversation.id, 'selecting_slot', {
    selectedDoctor,
    availableSlots: slots
  });
  
  // Show slots
  const response = `Dr. ${selectedDoctor.name} @ ${selectedDoctor.hospital.name}
⭐ ${selectedDoctor.rating} | ₹${selectedDoctor.consultation_fee}

Available slots:
${slots.map((s, i) => `${i + 1}️⃣ ${s.time}`).join('\n')}

Reply with slot number`;
  
  await sendWhatsAppMessage(phone, response);
}

// Step 2: User selects slot
async function handleSlotSelection(phone: string, message: string, conversation: Conversation) {
  const selection = parseInt(message.trim());
  const slots = conversation.context.availableSlots;
  
  if (!selection || selection < 1 || selection > slots.length) {
    return sendWhatsAppMessage(phone, "Invalid selection. Please reply with a slot number.");
  }
  
  const selectedSlot = slots[selection - 1];
  
  // Update state - ask for confirmation
  await updateConversationState(conversation.id, 'confirming_booking', {
    ...conversation.context,
    selectedSlot
  });
  
  const response = `Confirm booking?

👨‍⚕️ ${conversation.context.selectedDoctor.name}
🏥 ${conversation.context.selectedDoctor.hospital.name}
📅 ${selectedSlot.date} at ${selectedSlot.time}
💰 ₹${conversation.context.selectedDoctor.consultation_fee}

Reply YES to confirm or NO to cancel`;
  
  await sendWhatsAppMessage(phone, response);
}

// Step 3: User confirms
async function handleBookingConfirmation(phone: string, message: string, conversation: Conversation) {
  const response = message.toLowerCase().trim();
  
  if (response !== 'yes' && response !== 'y') {
    await updateConversationState(conversation.id, 'idle', {});
    return sendWhatsAppMessage(phone, "Booking cancelled. Type 'help' if you need assistance.");
  }
  
  // Book appointment
  const user = await db.user.findUnique({ where: { phone } });
  const { selectedDoctor, selectedSlot } = conversation.context;
  
  const appointment = await bookAppointment({
    user_id: user.id,
    doctor_id: selectedDoctor.id,
    slot_id: selectedSlot.id,
    appointment_date: selectedSlot.date,
    appointment_time: selectedSlot.time
  });
  
  // Reset state
  await updateConversationState(conversation.id, 'idle', {});
  
  // Send confirmation
  const confirmationMessage = await generateResponse(
    { intent: 'booking_confirmed' },
    conversation,
    {
      doctor: selectedDoctor,
      hospital: selectedDoctor.hospital,
      date: selectedSlot.date,
      time: selectedSlot.time,
      fee: selectedDoctor.consultation_fee
    }
  );
  
  await sendWhatsAppMessage(phone, confirmationMessage);
}
```

**Acceptance Criteria:**
- [ ] 3-step booking flow works
- [ ] Validates user selections
- [ ] Shows confirmation before booking
- [ ] Books appointment in database
- [ ] Sends confirmation message
- [ ] Handles errors (slot taken, etc.)
- [ ] User can cancel at any step

**Files to Create:**
- `backend/src/handlers/book-appointment.handler.ts`

---

### Story 4.3.3: View Records Flow

**As a** user  
**I want** to view my medical records  
**So that** I can access them anytime

**Priority:** P1  
**Story Points:** 5  
**Dependencies:** 4.2.3, 1.4.3

**Technical Requirements:**
```typescript
async function handleViewRecords(phone: string, message: string, conversation: Conversation) {
  const user = await db.user.findUnique({
    where: { phone },
    include: {
      medical_records: {
        orderBy: { created_at: 'desc' },
        take: 10
      }
    }
  });
  
  if (!user.medical_records || user.medical_records.length === 0) {
    return sendWhatsAppMessage(phone, "You don't have any medical records yet.");
  }
  
  let response = "📋 Your Medical Records:\n\n";
  
  user.medical_records.forEach((record, i) => {
    response += `${i + 1}️⃣ ${record.title}\n`;
    response += `   📅 ${formatDate(record.created_at)}\n`;
    response += `   🏥 ${record.hospital.name}\n\n`;
  });
  
  response += "Reply with number to view securely 🔒";
  
  await updateConversationState(conversation.id, 'selecting_record', {
    records: user.medical_records
  });
  
  await sendWhatsAppMessage(phone, response);
}

async function handleRecordSelection(phone: string, message: string, conversation: Conversation) {
  const selection = parseInt(message.trim());
  const records = conversation.context.records;
  
  if (!selection || selection < 1 || selection > records.length) {
    return sendWhatsAppMessage(phone, "Invalid selection.");
  }
  
  const record = records[selection - 1];
  
  // Generate secure time-limited link
  const token = generateSecureToken({ recordId: record.id, userId: record.user_id });
  const otp = generateOTP();
  
  await redis.setex(`otp:${record.id}`, 300, otp); // 5 min expiry
  
  const secureLink = `${process.env.APP_URL}/view-record?token=${token}`;
  
  const response = `🔒 Secure Access Required

Tap this link to view your ${record.title}:

${secureLink}

Your OTP: ${otp}

⏰ Link expires in 5 minutes`;
  
  await sendWhatsAppMessage(phone, response);
  
  // Reset state
  await updateConversationState(conversation.id, 'idle', {});
}
```

**Acceptance Criteria:**
- [ ] Lists user's medical records
- [ ] User selects record by number
- [ ] Generates secure time-limited link
- [ ] Generates OTP for verification
- [ ] Sends link via WhatsApp
- [ ] Link expires after 5 minutes
- [ ] Audit log of record access

**Files to Create:**
- `backend/src/handlers/view-records.handler.ts`
- `backend/src/services/secure-link.service.ts`

---

## EPIC 4.4: Multi-lingual Support

**Objective:** Support multiple Indian languages

---

### Story 4.4.1: Language Detection & Translation

**As a** user  
**I want** to interact in my preferred language  
**So that** I'm comfortable

**Priority:** P2  
**Story Points:** 8  
**Dependencies:** 4.2.1

**Technical Requirements:**
```typescript
async function detectLanguage(message: string): Promise<string> {
  const prompt = `Detect the language of this message. Reply with ONLY the language name: English, Hindi, Telugu, Tamil, Kannada, or Other.

Message: "${message}"`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 50,
    messages: [{ role: 'user', content: prompt }]
  });
  
  return response.content[0].text.trim();
}

async function translateMessage(message: string, targetLanguage: string): Promise<string> {
  const prompt = `Translate this message to ${targetLanguage}. Maintain the original meaning and tone.

Message: "${message}"

Translation:`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 500,
    messages: [{ role: 'user', content: prompt }]
  });
  
  return response.content[0].text.trim();
}

// Usage
const userLanguage = await detectLanguage("నాకు దంతవైద్యుడు కావాలి");
// "Telugu"

if (userLanguage !== 'English') {
  // Translate user message to English for processing
  const englishMessage = await translateMessage(userMessage, 'English');
  
  // Process in English
  const englishResponse = await handleMessage(englishMessage);
  
  // Translate response back to user's language
  const localizedResponse = await translateMessage(englishResponse, userLanguage);
  
  await sendWhatsAppMessage(phone, localizedResponse);
}
```

**Supported Languages:**
- English (default)
- Hindi
- Telugu
- Tamil
- Kannada
- Bengali

**Acceptance Criteria:**
- [ ] Detects user's language accurately
- [ ] Translates messages bidirectionally
- [ ] Preserves formatting (emoji, numbers)
- [ ] Stores user's preferred language
- [ ] Cost-efficient (small prompts)
- [ ] Fast (<3 seconds including translation)

**Files to Create:**
- `backend/src/services/translation.service.ts`

---

# PHASE 5: USER FLOW & MARKETPLACE

**Duration:** 4 weeks  
**Goal:** Complete user-facing features and polish the experience  
**Team:** 2 Backend + 1 Frontend

---

## EPIC 5.1: User Registration & Profile

**Objective:** Onboard new WhatsApp users smoothly

---

### Story 5.1.1: Quick Registration Flow

**As a** new user  
**I want** to register quickly via WhatsApp  
**So that** I can start booking

**Priority:** P0  
**Story Points:** 5  
**Dependencies:** 4.2.2

**Technical Requirements:**
```typescript
async function handleRegistration(phone: string) {
  // Step 1: Welcome & ask for name
  await sendWhatsAppMessage(phone, `👋 Welcome to MediConnect!

I'll help you book doctor appointments across 50+ hospitals in your city.

Let's get you registered in 30 seconds.

What's your name?`);
  
  await updateConversationState(conversationId, 'registration_name', {
    phone
  });
}

async function handleNameInput(phone: string, message: string) {
  const name = message.trim();
  
  await sendWhatsAppMessage(phone, `Nice to meet you, ${name}! 

How old are you? (Just the number)`);
  
  await updateConversationState(conversationId, 'registration_age', {
    phone,
    name
  });
}

async function handleAgeInput(phone: string, message: string, context: any) {
  const age = parseInt(message.trim());
  
  if (!age || age < 1 || age > 120) {
    return sendWhatsAppMessage(phone, "Please enter a valid age.");
  }
  
  await sendWhatsAppMessage(phone, `Great! 

Which language do you prefer?
1️⃣ English
2️⃣ हिंदी (Hindi)
3️⃣ తెలుగు (Telugu)
4️⃣ தமிழ் (Tamil)`);
  
  await updateConversationState(conversationId, 'registration_language', {
    ...context,
    age
  });
}

async function handleLanguageSelection(phone: string, message: string, context: any) {
  const languages = ['English', 'Hindi', 'Telugu', 'Tamil'];
  const selection = parseInt(message.trim());
  
  if (!selection || selection < 1 || selection > 4) {
    return sendWhatsAppMessage(phone, "Invalid selection. Please reply 1-4.");
  }
  
  const language = languages[selection - 1];
  
  await sendWhatsAppMessage(phone, `Perfect! Last step...

Share your location so I can find hospitals near you.

(Use WhatsApp's location sharing feature 📍 or just type your area/city)`);
  
  await updateConversationState(conversationId, 'registration_location', {
    ...context,
    language
  });
}

async function handleLocationInput(phone: string, message: string, context: any) {
  // Handle both: location share (lat/lng) or text input
  let latitude, longitude, city;
  
  if (message.includes(',')) {
    // Assume it's lat,lng
    [latitude, longitude] = message.split(',').map(s => parseFloat(s.trim()));
  } else {
    // Text input - geocode it
    const geocoded = await geocodeAddress(message);
    latitude = geocoded.lat;
    longitude = geocoded.lng;
    city = geocoded.city;
  }
  
  // Create user
  const user = await db.user.create({
    data: {
      phone,
      name: context.name,
      age: context.age,
      preferred_language: context.language,
      latitude,
      longitude,
      city: city || message,
      registered_via: 'whatsapp'
    }
  });
  
  // Reset conversation
  await updateConversationState(conversationId, 'idle', {});
  
  // Welcome message
  const welcomeMessage = `✅ All set, ${context.name}!

You can now:
🔍 Find doctors - Say "I need a cardiologist"
📅 Book appointments
📋 View your records - Say "my records"

What would you like to do?`;
  
  await sendWhatsAppMessage(phone, welcomeMessage);
}
```

**Acceptance Criteria:**
- [ ] Multi-step registration flow
- [ ] Collects: Name, Age, Language, Location
- [ ] Validates inputs
- [ ] Creates user in database
- [ ] Handles location sharing (GPS) or text input
- [ ] Can skip optional fields (age)
- [ ] User can restart registration

**Files to Create:**
- `backend/src/handlers/registration.handler.ts`
- `backend/src/services/geocoding.service.ts`

---

### Story 5.1.2: User Profile Management

**As a** user  
**I want** to update my profile  
**So that** my information is accurate

**Priority:** P2  
**Story Points:** 3  
**Dependencies:** 5.1.1

**Technical Requirements:**
```typescript
async function handleProfileUpdate(phone: string, message: string) {
  const user = await db.user.findUnique({ where: { phone } });
  
  if (message.toLowerCase().includes('update profile')) {
    const profileMessage = `Your Profile:
    
👤 Name: ${user.name}
📅 Age: ${user.age}
🗣️ Language: ${user.preferred_language}
📍 Location: ${user.city}

What would you like to update?
1️⃣ Name
2️⃣ Age  
3️⃣ Language
4️⃣ Location`;
    
    await sendWhatsAppMessage(phone, profileMessage);
    await updateConversationState(conversationId, 'updating_profile', {});
  }
}
```

**Acceptance Criteria:**
- [ ] User can view current profile
- [ ] User can update any field
- [ ] Changes saved to database
- [ ] Confirmation message sent

**Files to Create:**
- `backend/src/handlers/profile.handler.ts`

---

## EPIC 5.2: Advanced Booking Features

**Objective:** Add convenience features for booking

---

### Story 5.2.1: Family Account Management

**As a** user  
**I want** to book appointments for family members  
**So that** I can manage everyone's healthcare

**Priority:** P2  
**Story Points:** 5  
**Dependencies:** 5.1.1

**Technical Requirements:**
```typescript
// Database: Add family members as linked profiles
CREATE TABLE family_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  primary_user_id UUID NOT NULL REFERENCES users(id),
  name VARCHAR(255) NOT NULL,
  age INTEGER,
  gender VARCHAR(20),
  relationship VARCHAR(50), -- 'spouse', 'child', 'parent', 'sibling'
  created_at TIMESTAMP DEFAULT NOW()
);

// Add family member
async function handleAddFamilyMember(phone: string) {
  await sendWhatsAppMessage(phone, `Add a family member:

What's their name?`);
  
  await updateConversationState(conversationId, 'adding_family_member_name', {});
}

// Book for family member
async function handleBookForFamily(phone: string, message: string) {
  const user = await db.user.findUnique({
    where: { phone },
    include: { family_members: true }
  });
  
  let response = `Who is this appointment for?

0️⃣ Myself (${user.name})
`;
  
  user.family_members.forEach((member, i) => {
    response += `${i + 1}️⃣ ${member.name} (${member.relationship}, ${member.age} years)\n`;
  });
  
  response += `\n➕ Add new family member`;
  
  await sendWhatsAppMessage(phone, response);
}
```

**Acceptance Criteria:**
- [ ] User can add family members
- [ ] Each member has: Name, Age, Relationship
- [ ] When booking, user selects who it's for
- [ ] Appointment booked under selected person
- [ ] Primary user can view all family appointments

**Files to Create:**
- `backend/src/handlers/family.handler.ts`
- `backend/prisma/migrations/add_family_members.sql`

---

### Story 5.2.2: Favorite Doctors

**As a** user  
**I want** to save favorite doctors  
**So that** I can book with them quickly

**Priority:** P2  
**Story Points:** 3  
**Dependencies:** 4.3.2

**Technical Requirements:**
```typescript
CREATE TABLE favorite_doctors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  doctor_id UUID NOT NULL REFERENCES doctors(id),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, doctor_id)
);

async function handleFavorites(phone: string) {
  const user = await db.user.findUnique({
    where: { phone },
    include: {
      favorite_doctors: {
        include: { doctor: { include: { hospital: true } } }
      }
    }
  });
  
  if (user.favorite_doctors.length === 0) {
    return sendWhatsAppMessage(phone, "You haven't added any favorite doctors yet. After booking, you'll be asked if you'd like to save the doctor.");
  }
  
  let response = "⭐ Your Favorite Doctors:\n\n";
  
  user.favorite_doctors.forEach((fav, i) => {
    response += `${i + 1}️⃣ Dr. ${fav.doctor.name}\n`;
    response += `   ${fav.doctor.specialization} @ ${fav.doctor.hospital.name}\n\n`;
  });
  
  response += "Reply with number to book appointment";
  
  await sendWhatsAppMessage(phone, response);
}

// After successful booking
async function offerToFavorite(phone: string, doctorId: string) {
  await sendWhatsAppMessage(phone, "⭐ Would you like to save Dr. Sharma as a favorite for quick booking next time?\n\nReply YES or NO");
}
```

**Acceptance Criteria:**
- [ ] User can add doctors to favorites
- [ ] View list of favorite doctors
- [ ] Quick book from favorites
- [ ] Remove from favorites

**Files to Create:**
- `backend/src/handlers/favorites.handler.ts`

---

## EPIC 5.3: Queue Management & Live Updates

**Objective:** Real-time queue updates for patients

---

### Story 5.3.1: Queue Status via WhatsApp

**As a** patient  
**I want** to check queue status  
**So that** I know when to arrive

**Priority:** P2  
**Story Points:** 5  
**Dependencies:** 1.3.4

**Technical Requirements:**
```typescript
async function handleQueueStatus(phone: string) {
  const user = await db.user.findUnique({ where: { phone } });
  
  // Find today's appointment
  const appointment = await db.appointment.findFirst({
    where: {
      user_id: user.id,
      appointment_date: new Date().toISOString().split('T')[0],
      status: 'confirmed'
    },
    include: {
      doctor: true,
      hospital: true
    }
  });
  
  if (!appointment) {
    return sendWhatsAppMessage(phone, "You don't have any appointments today.");
  }
  
  // Get queue info
  const queueInfo = await getQueueStatus(appointment.doctor_id, new Date());
  
  const response = `📊 Queue Status

Your appointment: ${appointment.appointment_time}

Current status:
├─ 👥 ${queueInfo.patients_ahead} patients ahead of you
├─ ⏱️ Estimated wait: ${queueInfo.estimated_wait_minutes} minutes
└─ 🕐 Estimated call time: ${queueInfo.estimated_call_time}

${queueInfo.current_delay > 15 ? '⚠️ Doctor is running late today' : '✅ On schedule'}

I'll update you when you're next in line.`;
  
  await sendWhatsAppMessage(phone, response);
}

// Send proactive updates
async function sendQueueUpdates() {
  // Cron job runs every 5 minutes
  const upcomingAppointments = await db.appointment.findMany({
    where: {
      appointment_date: new Date(),
      status: 'confirmed',
      queue_update_sent: false
    }
  });
  
  for (const appt of upcomingAppointments) {
    const queueInfo = await getQueueStatus(appt.doctor_id, new Date());
    
    // If patient is next or next-next
    if (queueInfo.position <= 2) {
      await sendWhatsAppMessage(
        appt.patient_phone,
        `🔔 You're ${queueInfo.position === 1 ? 'next' : '2nd'} in line!

Estimated call time: ${queueInfo.estimated_call_time}

Please be ready at ${appt.hospital.name}.`
      );
      
      await db.appointment.update({
        where: { id: appt.id },
        data: { queue_update_sent: true }
      });
    }
  }
}
```

**Acceptance Criteria:**
- [ ] User can check queue status anytime
- [ ] Shows: Position, Wait time, Estimated call time
- [ ] Proactive updates when patient is next
- [ ] Updates when doctor is delayed
- [ ] Works only for today's appointments

**Files to Create:**
- `backend/src/handlers/queue-status.handler.ts`
- `backend/src/cron/queue-updates.cron.ts`

---

## EPIC 5.4: Help & Support

**Objective:** Provide help resources via WhatsApp

---

### Story 5.4.1: Help Menu & Common Questions

**As a** user  
**I want** help resources  
**So that** I can solve issues myself

**Priority:** P1  
**Story Points:** 3  
**Dependencies:** 4.2.3

**Technical Requirements:**
```typescript
async function handleHelp(phone: string) {
  const helpMessage = `❓ How can I help you?

📚 Quick Guides:
1️⃣ How to book an appointment
2️⃣ How to cancel/reschedule
3️⃣ How to add family members
4️⃣ How to view medical records
5️⃣ Payment & fees
6️⃣ Privacy & security

Or ask me anything in your own words!

📞 Need human support?
Email: support@mediconnect.com
Phone: 1800-XXX-XXXX`;

  await sendWhatsAppMessage(phone, helpMessage);
}

// Handle FAQ selection
const FAQs = {
  1: `📅 Booking an Appointment:

1. Tell me what you need (e.g., "I need a dentist")
2. I'll show you available doctors
3. Pick a doctor by replying with the number
4. Choose a time slot
5. Confirm - done! ✅

You'll get reminders before your appointment.`,
  
  2: `❌ Cancel/Reschedule:

To cancel: Say "cancel appointment"
To reschedule: Say "reschedule appointment"

Note: You can cancel up to 2 hours before your appointment time.`,
  
  // ... more FAQs
};
```

**Acceptance Criteria:**
- [ ] Help command shows menu
- [ ] FAQs cover common questions
- [ ] Can access help anytime
- [ ] Links to human support if needed

**Files to Create:**
- `backend/src/handlers/help.handler.ts`
- `backend/src/data/faqs.ts`

---

## EPIC 5.5: Analytics & Insights

**Objective:** Track WhatsApp user behavior

---

### Story 5.5.1: WhatsApp Engagement Metrics

**As a** super admin  
**I want** to see WhatsApp metrics  
**So that** I can optimize the experience

**Priority:** P2  
**Story Points:** 5  
**Dependencies:** 2.3.1

**Technical Requirements:**
```typescript
// API Endpoint
GET /api/super-admin/analytics/whatsapp?start_date=2024-02-01&end_date=2024-02-29

// Response
{
  summary: {
    total_conversations: 15000,
    unique_users: 8500,
    total_messages: 45000,
    avg_messages_per_conversation: 3,
    successful_bookings: 6200,
    conversion_rate: 0.73, // 73% of conversations led to booking
    avg_response_time_seconds: 2.5
  },
  messages_by_day: [
    { date: "2024-02-01", count: 1200 },
    // ...
  ],
  intent_breakdown: {
    "find_doctor": 6500,
    "book_appointment": 6200,
    "view_records": 1200,
    "check_status": 800,
    "cancel": 300
  },
  language_breakdown: {
    "English": 7000,
    "Hindi": 4000,
    "Telugu": 3000,
    "Tamil": 1000
  },
  drop_off_analysis: {
    "search": 1500, // users who searched but didn't select doctor
    "selecting_doctor": 800, // selected doctor but didn't pick slot
    "selecting_slot": 500 // picked slot but didn't confirm
  },
  peak_hours: [
    { hour: 9, message_count: 2500 },
    { hour: 10, message_count: 3000 },
    // ...
  ]
}
```

**Acceptance Criteria:**
- [ ] Track all WhatsApp interactions
- [ ] Measure conversion funnel
- [ ] Identify drop-off points
- [ ] Analyze peak usage times
- [ ] Language preferences
- [ ] Intent distribution

**Files to Create:**
- `frontend/src/pages/super-admin/WhatsAppAnalytics.tsx`
- `backend/src/services/whatsapp-analytics.service.ts`

---

# DEPLOYMENT & DEVOPS

**Objective:** Deploy application to production

---

## Story D.1: Docker Setup

**Technical Requirements:**
```dockerfile
# backend/Dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npx prisma generate

EXPOSE 8000

CMD ["npm", "start"]
```

```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: mediconnect
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
  
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
  
  backend:
    build: ./backend
    environment:
      DATABASE_URL: postgresql://admin:${DB_PASSWORD}@postgres:5432/mediconnect
      REDIS_URL: redis://redis:6379
      JWT_SECRET: ${JWT_SECRET}
      TWILIO_ACCOUNT_SID: ${TWILIO_ACCOUNT_SID}
      TWILIO_AUTH_TOKEN: ${TWILIO_AUTH_TOKEN}
    ports:
      - "8000:8000"
    depends_on:
      - postgres
      - redis
  
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    depends_on:
      - backend

volumes:
  postgres_data:
```

---

## Story D.2: CI/CD Pipeline

**Technical Requirements:**
```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm test
  
  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to production
        run: |
          # Deploy commands here
          ssh user@server 'cd /app && git pull && docker-compose up -d'
```

---

## Story D.3: Monitoring & Logging

**Technical Requirements:**
```typescript
// Install Sentry
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1
});

// Error tracking
app.use(Sentry.Handlers.errorHandler());

// Performance monitoring
const transaction = Sentry.startTransaction({
  op: 'search_doctors',
  name: 'Search Doctors'
});

// ... code ...

transaction.finish();
```

---

# TESTING STRATEGY

## Unit Tests
- Test each service function
- Mock database calls
- Target: 80%+ coverage

## Integration Tests
- Test API endpoints
- Test database operations
- Test external API calls (Twilio, Claude)

## E2E Tests
- Test complete user flows
- WhatsApp conversation flows
- Booking flow end-to-end

---

# SUCCESS METRICS

**Phase 1 (Hospital Portal):**
- [ ] 5 hospitals can use the portal daily
- [ ] 100+ doctors managed
- [ ] 500+ appointments booked

**Phase 2 (Super Admin):**
- [ ] Onboard 10 hospitals via super admin
- [ ] Track platform metrics

**Phase 3 (Backend):**
- [ ] API response time <200ms (95th percentile)
- [ ] Zero downtime deployments
- [ ] 99.9% uptime

**Phase 4 (WhatsApp):**
- [ ] 1000+ WhatsApp conversations
- [ ] 70%+ booking conversion rate
- [ ] <5 second average response time

**Phase 5 (User Flow):**
- [ ] 5000+ registered users
- [ ] 3000+ bookings via WhatsApp
- [ ] Multi-lingual support working

---

# APPENDIX

## API Endpoints Summary

```
# Authentication
POST   /api/auth/login
POST   /api/auth/refresh

# Hospitals
GET    /api/hospitals
POST   /api/hospitals
GET    /api/hospitals/{id}
PUT    /api/hospitals/{id}

# Doctors
GET    /api/doctors
POST   /api/doctors
GET    /api/doctors/{id}
PUT    /api/doctors/{id}
GET    /api/doctors/{id}/slots
GET    /api/doctors/{id}/availability

# Appointments
GET    /api/appointments
POST   /api/appointments
GET    /api/appointments/{id}
PATCH  /api/appointments/{id}/status
PATCH  /api/appointments/{id}/cancel

# Patients
GET    /api/patients
GET    /api/patients/{id}
PUT    /api/patients/{id}

# Medical Records
GET    /api/medical-records
POST   /api/medical-records
GET    /api/medical-records/{id}

# Dashboard
GET    /api/dashboard/today
GET    /api/dashboard/stats

# Analytics
GET    /api/analytics/overview
GET    /api/analytics/doctors/{id}

# Public (WhatsApp users)
GET    /api/public/search/doctors
GET    /api/public/doctors/{id}/slots
POST   /api/public/appointments

# Super Admin
POST   /api/super-admin/hospitals
GET    /api/super-admin/analytics/platform
GET    /api/super-admin/analytics/revenue

# Webhooks
POST   /webhook/whatsapp
```

---

## Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/mediconnect

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRY=24h

# Twilio
TWILIO_ACCOUNT_SID=ACxxxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_WHATSAPP_NUMBER=+14155238886

# Anthropic
ANTHROPIC_API_KEY=sk-ant-xxx

# AWS S3
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx
AWS_S3_BUCKET=mediconnect-files
AWS_REGION=ap-south-1

# App
NODE_ENV=production
PORT=8000
APP_URL=https://mediconnect.com

# Monitoring
SENTRY_DSN=https://xxx@sentry.io/xxx
```

---

END OF PRD
