export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      hospitals: {
        Row: {
          id: string
          name: string
          subdomain: string
          tier: 1 | 2 | 3
          phone: string | null
          email: string | null
          address: string | null
          city: string | null
          state: string | null
          pincode: string | null
          latitude: number | null
          longitude: number | null
          rating: number
          total_reviews: number
          subscription_plan: 'basic' | 'growth' | 'enterprise'
          subscription_status: 'trial' | 'active' | 'suspended'
          subscription_starts_at: string | null
          subscription_ends_at: string | null
          is_promoted: boolean
          promotion_level: 'promoted' | 'premium' | null
          promotion_expires_at: string | null
          is_active: boolean
          settings: Json
          created_at: string
          updated_at: string
        }
        Insert: Omit<
          Database['public']['Tables']['hospitals']['Row'],
          'id' | 'created_at' | 'updated_at' | 'rating' | 'total_reviews'
        >
        Update: Partial<Database['public']['Tables']['hospitals']['Insert']>
      }

      hospital_admins: {
        Row: {
          id: string
          hospital_id: string
          user_id: string // references auth.users
          email: string
          name: string
          role: 'admin' | 'manager' | 'receptionist'
          is_active: boolean
          last_login_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<
          Database['public']['Tables']['hospital_admins']['Row'],
          'id' | 'created_at' | 'updated_at'
        >
        Update: Partial<Database['public']['Tables']['hospital_admins']['Insert']>
      }

      super_admins: {
        Row: {
          id: string
          user_id: string // references auth.users
          email: string
          name: string
          role: 'super_admin' | 'support' | 'analyst'
          is_active: boolean
          last_login_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<
          Database['public']['Tables']['super_admins']['Row'],
          'id' | 'created_at' | 'updated_at'
        >
        Update: Partial<Database['public']['Tables']['super_admins']['Insert']>
      }

      doctors: {
        Row: {
          id: string
          hospital_id: string
          name: string
          specialization: string
          qualifications: string | null
          experience_years: number | null
          consultation_fee: number
          languages: string[]
          working_days: number[]
          working_hours_start: string | null
          working_hours_end: string | null
          slot_duration: number
          rating: number
          total_reviews: number
          profile_image_url: string | null
          bio: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<
          Database['public']['Tables']['doctors']['Row'],
          'id' | 'created_at' | 'updated_at' | 'rating' | 'total_reviews'
        >
        Update: Partial<Database['public']['Tables']['doctors']['Insert']>
      }

      users: {
        Row: {
          id: string
          phone: string
          name: string | null
          age: number | null
          gender: string | null
          blood_group: string | null
          allergies: string[]
          chronic_conditions: string[]
          email: string | null
          emergency_contact: string | null
          address: string | null
          city: string | null
          state: string | null
          pincode: string | null
          latitude: number | null
          longitude: number | null
          preferred_language: string
          whatsapp_name: string | null
          registered_via: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<
          Database['public']['Tables']['users']['Row'],
          'id' | 'created_at' | 'updated_at'
        >
        Update: Partial<Database['public']['Tables']['users']['Insert']>
      }

      hospital_patients: {
        Row: {
          id: string
          user_id: string
          hospital_id: string
          name: string | null
          phone: string | null
          age: number | null
          blood_group: string | null
          medical_notes: string | null
          first_visit_at: string
          last_visit_at: string | null
          total_visits: number
          created_at: string
          updated_at: string
        }
        Insert: Omit<
          Database['public']['Tables']['hospital_patients']['Row'],
          'id' | 'created_at' | 'updated_at' | 'total_visits'
        >
        Update: Partial<Database['public']['Tables']['hospital_patients']['Insert']>
      }

      appointment_slots: {
        Row: {
          id: string
          doctor_id: string
          slot_date: string
          slot_time: string
          is_available: boolean
          created_at: string
        }
        Insert: Omit<
          Database['public']['Tables']['appointment_slots']['Row'],
          'id' | 'created_at'
        >
        Update: Partial<Database['public']['Tables']['appointment_slots']['Insert']>
      }

      appointments: {
        Row: {
          id: string
          user_id: string
          hospital_id: string
          doctor_id: string
          slot_id: string | null
          appointment_date: string
          appointment_time: string
          status: 'confirmed' | 'cancelled' | 'completed' | 'no_show' | 'checked_in' | 'in_consultation'
          booking_source: 'whatsapp' | 'walk_in' | 'phone' | 'receptionist'
          patient_name: string | null
          patient_phone: string | null
          queue_position: number | null
          checked_in_at: string | null
          consultation_started_at: string | null
          consultation_ended_at: string | null
          consultation_fee: number | null
          payment_status: 'pending' | 'paid' | 'refunded'
          payment_method: string | null
          reason_for_visit: string | null
          admin_notes: string | null
          cancelled_at: string | null
          cancellation_reason: string | null
          reminder_sent_24h: boolean
          reminder_sent_1h: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<
          Database['public']['Tables']['appointments']['Row'],
          'id' | 'created_at' | 'updated_at' | 'reminder_sent_24h' | 'reminder_sent_1h'
        >
        Update: Partial<Database['public']['Tables']['appointments']['Insert']>
      }

      medical_records: {
        Row: {
          id: string
          user_id: string
          hospital_id: string
          appointment_id: string | null
          record_type: 'prescription' | 'lab_report' | 'xray' | 'scan' | 'invoice'
          file_url: string | null
          file_name: string | null
          file_size: number | null
          file_type: string | null
          is_encrypted: boolean
          title: string | null
          description: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<
          Database['public']['Tables']['medical_records']['Row'],
          'id' | 'created_at' | 'updated_at'
        >
        Update: Partial<Database['public']['Tables']['medical_records']['Insert']>
      }

      medical_record_sharing: {
        Row: {
          id: string
          patient_id: string
          shared_with_hospital_id: string
          shared_with_doctor_id: string | null
          scope: 'all' | 'specific_hospital' | 'specific_type'
          specific_hospital_ids: string[] | null
          specific_record_types: string[] | null
          granted_at: string
          expires_at: string
          is_active: boolean
          access_count: number
          created_at: string
        }
        Insert: Omit<
          Database['public']['Tables']['medical_record_sharing']['Row'],
          'id' | 'created_at' | 'access_count'
        >
        Update: Partial<Database['public']['Tables']['medical_record_sharing']['Insert']>
      }

      booking_analytics: {
        Row: {
          id: string
          hospital_id: string | null
          doctor_id: string | null
          date: string
          total_bookings: number
          whatsapp_bookings: number
          walk_in_bookings: number
          completed_appointments: number
          cancelled_appointments: number
          no_shows: number
          total_revenue: number
          created_at: string
        }
        Insert: Omit<
          Database['public']['Tables']['booking_analytics']['Row'],
          'id' | 'created_at'
        >
        Update: Partial<Database['public']['Tables']['booking_analytics']['Insert']>
      }

      whatsapp_conversations: {
        Row: {
          id: string
          user_id: string | null
          phone: string
          current_state: string
          context: Json
          last_message_at: string
          last_message_from: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<
          Database['public']['Tables']['whatsapp_conversations']['Row'],
          'id' | 'created_at' | 'updated_at'
        >
        Update: Partial<Database['public']['Tables']['whatsapp_conversations']['Insert']>
      }

      whatsapp_messages: {
        Row: {
          id: string
          conversation_id: string | null
          user_id: string | null
          direction: 'inbound' | 'outbound'
          message_text: string | null
          message_type: string | null
          twilio_message_sid: string | null
          twilio_status: string | null
          created_at: string
        }
        Insert: Omit<
          Database['public']['Tables']['whatsapp_messages']['Row'],
          'id' | 'created_at'
        >
        Update: Partial<Database['public']['Tables']['whatsapp_messages']['Insert']>
      }

      audit_logs: {
        Row: {
          id: string
          actor_id: string | null
          actor_type: string | null
          action: string
          entity_type: string | null
          entity_id: string | null
          metadata: Json | null
          ip_address: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: Omit<
          Database['public']['Tables']['audit_logs']['Row'],
          'id' | 'created_at'
        >
        Update: never
      }

      family_members: {
        Row: {
          id: string
          primary_user_id: string
          name: string
          age: number | null
          gender: string | null
          relationship: string | null
          created_at: string
        }
        Insert: Omit<
          Database['public']['Tables']['family_members']['Row'],
          'id' | 'created_at'
        >
        Update: Partial<Database['public']['Tables']['family_members']['Insert']>
      }

      favorite_doctors: {
        Row: {
          id: string
          user_id: string
          doctor_id: string
          created_at: string
        }
        Insert: Omit<
          Database['public']['Tables']['favorite_doctors']['Row'],
          'id' | 'created_at'
        >
        Update: never
      }
    }

    Views: {
      [_ in never]: never
    }

    Functions: {
      get_today_dashboard: {
        Args: { p_hospital_id: string }
        Returns: Json
      }
      get_queue_status: {
        Args: { p_doctor_id: string; p_date: string }
        Returns: Json
      }
      book_appointment_atomic: {
        Args: {
          p_user_id: string
          p_doctor_id: string
          p_slot_id: string
          p_appointment_date: string
          p_appointment_time: string
          p_booking_source: string
          p_reason: string | null
        }
        Returns: Json
      }
    }

    Enums: {
      [_ in never]: never
    }
  }
}

// Convenience types
export type Hospital = Database['public']['Tables']['hospitals']['Row']
export type HospitalInsert = Database['public']['Tables']['hospitals']['Insert']
export type HospitalUpdate = Database['public']['Tables']['hospitals']['Update']

export type HospitalAdmin = Database['public']['Tables']['hospital_admins']['Row']
export type SuperAdmin = Database['public']['Tables']['super_admins']['Row']

export type Doctor = Database['public']['Tables']['doctors']['Row']
export type DoctorInsert = Database['public']['Tables']['doctors']['Insert']
export type DoctorUpdate = Database['public']['Tables']['doctors']['Update']

export type Patient = Database['public']['Tables']['users']['Row']
export type HospitalPatient = Database['public']['Tables']['hospital_patients']['Row']

export type Appointment = Database['public']['Tables']['appointments']['Row']
export type AppointmentInsert = Database['public']['Tables']['appointments']['Insert']
export type AppointmentSlot = Database['public']['Tables']['appointment_slots']['Row']

export type MedicalRecord = Database['public']['Tables']['medical_records']['Row']
export type BookingAnalytics = Database['public']['Tables']['booking_analytics']['Row']

export type WhatsappConversation = Database['public']['Tables']['whatsapp_conversations']['Row']
export type AuditLog = Database['public']['Tables']['audit_logs']['Row']

// Extended types with joins
export type AppointmentWithDetails = Appointment & {
  doctor: Pick<Doctor, 'id' | 'name' | 'specialization' | 'consultation_fee'>
  hospital: Pick<Hospital, 'id' | 'name' | 'address'>
  user: Pick<Patient, 'id' | 'name' | 'phone' | 'age' | 'blood_group' | 'allergies'>
}

export type DoctorWithHospital = Doctor & {
  hospital: Pick<Hospital, 'id' | 'name' | 'city'>
}
