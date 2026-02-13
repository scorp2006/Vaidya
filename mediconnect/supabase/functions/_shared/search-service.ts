import { supabase } from './supabase-client.ts'
import type { DoctorSearchResult, SlotOption, ExtractedIntent } from './types.ts'

/**
 * Searches doctors based on extracted intent.
 * Applies ranking: promoted > tier > rating > proximity.
 */
export async function searchDoctors(
  intent: ExtractedIntent,
  userLat?: number,
  userLng?: number,
  targetDate?: string
): Promise<DoctorSearchResult[]> {
  let query = supabase
    .from('doctors')
    .select(`
      id, name, specialization, qualifications, experience_years,
      consultation_fee, rating, languages,
      hospital:hospitals (
        id, name, address, city, tier, is_promoted, promotion_level
      )
    `)
    .eq('is_active', true)

  // Filter by specialization (fuzzy match)
  if (intent.specialty) {
    query = query.ilike('specialization', `%${intent.specialty}%`)
  }

  // Filter by city if location specified
  if (intent.location) {
    query = query.ilike('hospitals.city', `%${intent.location}%`)
  }

  // Filter by max fee if provided
  if (intent.hospital_preference) {
    query = query.ilike('hospitals.name', `%${intent.hospital_preference}%`)
  }

  const { data: doctors, error } = await query.limit(50)

  if (error || !doctors) {
    console.error('Doctor search error:', error?.message)
    return []
  }

  // Enrich with next available slot
  const date = targetDate ?? new Date().toISOString().split('T')[0]
  const enriched = await Promise.all(
    (doctors as DoctorSearchResult[]).map(async (doc) => {
      const slot = await getNextAvailableSlot(doc.id, date)
      return { ...doc, next_available_slot: slot }
    })
  )

  // Rank results
  const ranked = enriched.sort((a, b) => {
    let scoreA = 0
    let scoreB = 0

    // Promotion boost
    if (a.hospital?.promotion_level === 'premium') scoreA += 1000
    else if (a.hospital?.promotion_level === 'promoted') scoreA += 500
    if (b.hospital?.promotion_level === 'premium') scoreB += 1000
    else if (b.hospital?.promotion_level === 'promoted') scoreB += 500

    // Tier (1 = best)
    scoreA += (4 - (a.hospital?.tier ?? 3)) * 100
    scoreB += (4 - (b.hospital?.tier ?? 3)) * 100

    // Rating
    scoreA += (a.rating ?? 0) * 50
    scoreB += (b.rating ?? 0) * 50

    // Availability bonus
    if (a.next_available_slot) scoreA += 50
    if (b.next_available_slot) scoreB += 50

    return scoreB - scoreA
  })

  return ranked.slice(0, 5) // top 5
}

/**
 * Gets the next available slot for a doctor on or after a given date.
 */
export async function getNextAvailableSlot(
  doctorId: string,
  fromDate: string
): Promise<SlotOption | null> {
  const { data } = await supabase
    .from('appointment_slots')
    .select('id, slot_date, slot_time')
    .eq('doctor_id', doctorId)
    .eq('is_available', true)
    .gte('slot_date', fromDate)
    .order('slot_date', { ascending: true })
    .order('slot_time', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (!data) return null

  return {
    id: data.id,
    date: data.slot_date,
    time: data.slot_time,
  }
}

/**
 * Gets all available slots for a specific doctor on a specific date.
 */
export async function getAvailableSlots(
  doctorId: string,
  date: string
): Promise<SlotOption[]> {
  const { data } = await supabase
    .from('appointment_slots')
    .select('id, slot_date, slot_time')
    .eq('doctor_id', doctorId)
    .eq('slot_date', date)
    .eq('is_available', true)
    .order('slot_time', { ascending: true })
    .limit(10)

  if (!data) return []

  return data.map((s) => ({
    id: s.id,
    date: s.slot_date,
    time: s.slot_time,
  }))
}

/**
 * Generates appointment slots for a doctor for the next N days.
 * Called when adding a new doctor or changing schedule.
 */
export async function generateSlots(
  doctorId: string,
  workingDays: number[],   // 0=Sun ... 6=Sat
  startTime: string,       // "09:00"
  endTime: string,         // "17:00"
  slotDuration: number,    // minutes
  daysAhead = 30
): Promise<void> {
  const slots: Array<{ doctor_id: string; slot_date: string; slot_time: string }> = []

  const today = new Date()

  for (let d = 0; d < daysAhead; d++) {
    const date = new Date(today)
    date.setDate(today.getDate() + d)
    const dayOfWeek = date.getDay()

    if (!workingDays.includes(dayOfWeek)) continue

    const dateStr = date.toISOString().split('T')[0]
    const [startH, startM] = startTime.split(':').map(Number)
    const [endH, endM] = endTime.split(':').map(Number)
    const startMinutes = startH * 60 + startM
    const endMinutes = endH * 60 + endM

    for (let m = startMinutes; m < endMinutes; m += slotDuration) {
      const h = Math.floor(m / 60).toString().padStart(2, '0')
      const min = (m % 60).toString().padStart(2, '0')
      slots.push({
        doctor_id: doctorId,
        slot_date: dateStr,
        slot_time: `${h}:${min}:00`,
      })
    }
  }

  if (slots.length > 0) {
    // Insert in batches of 100
    for (let i = 0; i < slots.length; i += 100) {
      await supabase
        .from('appointment_slots')
        .upsert(slots.slice(i, i + 100), {
          onConflict: 'doctor_id,slot_date,slot_time',
          ignoreDuplicates: true,
        })
    }
  }
}

/**
 * Resolves a relative date string to YYYY-MM-DD.
 */
export function resolveDate(dateStr: string | null | undefined): string {
  const today = new Date()

  if (!dateStr || dateStr === 'today') {
    return today.toISOString().split('T')[0]
  }

  if (dateStr === 'tomorrow') {
    const tomorrow = new Date(today)
    tomorrow.setDate(today.getDate() + 1)
    return tomorrow.toISOString().split('T')[0]
  }

  // Already a YYYY-MM-DD
  return dateStr
}
