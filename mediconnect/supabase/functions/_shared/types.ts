// ─── Conversation States ────────────────────────────────────────────────────
export type ConversationState =
  | 'idle'
  | 'registration_name'
  | 'registration_age'
  | 'registration_language'
  | 'registration_location'
  | 'selecting_doctor'
  | 'selecting_slot'
  | 'confirming_booking'
  | 'updating_profile'
  | 'selecting_record'

export interface ConversationContext {
  searchResults?: DoctorSearchResult[]
  selectedDoctor?: DoctorSearchResult
  availableSlots?: SlotOption[]
  selectedSlot?: SlotOption
  records?: RecordSummary[]
  // Registration flow
  name?: string
  age?: number
  language?: string
  searchParams?: ExtractedIntent
}

// ─── Intent ─────────────────────────────────────────────────────────────────
export interface ExtractedIntent {
  intent:
    | 'find_doctor'
    | 'book_appointment'
    | 'view_records'
    | 'cancel_appointment'
    | 'check_queue'
    | 'check_status'
    | 'view_appointments'
    | 'update_profile'
    | 'add_family'
    | 'favorites'
    | 'help'
    | 'greeting'
    | 'yes'
    | 'no'
    | 'number'
    | 'cancel_flow'
    | 'unclear'
  specialty?: string | null
  location?: string | null
  date?: string | null // 'today' | 'tomorrow' | 'YYYY-MM-DD'
  hospital_preference?: string | null
  language?: string | null
  number?: number | null // when user replies with a number
  raw_text?: string
}

// ─── Domain objects ──────────────────────────────────────────────────────────
export interface DoctorSearchResult {
  id: string
  name: string
  specialization: string
  qualifications: string | null
  experience_years: number | null
  consultation_fee: number
  rating: number
  languages: string[]
  hospital: {
    id: string
    name: string
    address: string | null
    city: string | null
    tier: number
    is_promoted: boolean
    promotion_level: string | null
  }
  next_available_slot?: SlotOption | null
}

export interface SlotOption {
  id: string
  date: string
  time: string
}

export interface RecordSummary {
  id: string
  title: string | null
  record_type: string
  created_at: string
  hospital_name: string
}

export interface IncomingMessage {
  from: string          // e.g. "+919876543210"
  body: string
  messageSid: string
  numMedia: number
  latitude?: number     // if location share
  longitude?: number
  mediaUrl?: string
  mediaContentType?: string
}
