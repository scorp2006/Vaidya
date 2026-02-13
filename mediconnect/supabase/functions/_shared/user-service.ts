import { supabase } from './supabase-client.ts'

export interface UserRecord {
  id: string
  phone: string
  name: string | null
  age: number | null
  preferred_language: string
  city: string | null
  latitude: number | null
  longitude: number | null
}

/**
 * Finds a user by phone number.
 */
export async function findUserByPhone(phone: string): Promise<UserRecord | null> {
  const { data } = await supabase
    .from('users')
    .select('id, phone, name, age, preferred_language, city, latitude, longitude')
    .eq('phone', phone)
    .maybeSingle()

  return data ?? null
}

/**
 * Creates a new user from WhatsApp registration.
 */
export async function createUser(data: {
  phone: string
  name: string
  age?: number
  preferredLanguage?: string
  city?: string
  latitude?: number
  longitude?: number
  whatsappName?: string
}): Promise<UserRecord> {
  const { data: created, error } = await supabase
    .from('users')
    .insert({
      phone: data.phone,
      name: data.name,
      age: data.age ?? null,
      preferred_language: data.preferredLanguage ?? 'English',
      city: data.city ?? null,
      latitude: data.latitude ?? null,
      longitude: data.longitude ?? null,
      whatsapp_name: data.whatsappName ?? null,
      registered_via: 'whatsapp',
    })
    .select()
    .single()

  if (error || !created) throw new Error(`Failed to create user: ${error?.message}`)
  return created
}

/**
 * Updates user's preferred language.
 */
export async function updateUserLanguage(userId: string, language: string): Promise<void> {
  await supabase.from('users').update({ preferred_language: language }).eq('id', userId)
}

/**
 * Geocodes a city/area name to lat/lng using a simple lookup.
 * For production, integrate Google Maps or HERE Geocoding API.
 */
export async function geocodeLocation(locationText: string): Promise<{
  city: string
  latitude: number | null
  longitude: number | null
}> {
  // Common Indian cities lookup (extend as needed)
  const cities: Record<string, { lat: number; lng: number }> = {
    hyderabad: { lat: 17.3850, lng: 78.4867 },
    'banjara hills': { lat: 17.4239, lng: 78.4738 },
    secunderabad: { lat: 17.4400, lng: 78.4980 },
    bangalore: { lat: 12.9716, lng: 77.5946 },
    bengaluru: { lat: 12.9716, lng: 77.5946 },
    mumbai: { lat: 19.0760, lng: 72.8777 },
    delhi: { lat: 28.6139, lng: 77.2090 },
    'new delhi': { lat: 28.6139, lng: 77.2090 },
    chennai: { lat: 13.0827, lng: 80.2707 },
    kolkata: { lat: 22.5726, lng: 88.3639 },
    pune: { lat: 18.5204, lng: 73.8567 },
  }

  const key = locationText.toLowerCase().trim()
  const match = cities[key]

  return {
    city: locationText,
    latitude: match?.lat ?? null,
    longitude: match?.lng ?? null,
  }
}

/**
 * Gets a user's medical records summary.
 */
export async function getUserMedicalRecords(userId: string) {
  const { data } = await supabase
    .from('medical_records')
    .select(`
      id, title, record_type, created_at,
      hospital:hospitals (name)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(10)

  return (data ?? []).map((r) => ({
    id: r.id,
    title: r.title,
    record_type: r.record_type,
    created_at: r.created_at,
    hospital_name: (r.hospital as { name: string } | null)?.name ?? 'Unknown Hospital',
  }))
}
