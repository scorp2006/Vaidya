import { supabase } from './supabase'
import { format, addDays } from 'date-fns'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DashboardData {
  activeDoctors: number
  todayAppointments: number
  totalPatients: number
  upcomingQueue: QueueItem[]
}

export interface QueueItem {
  id: string
  appointment_time: string
  status: string
  patient_name: string | null
  doctor: {
    name: string
    specialization: string
  } | null
}

export interface AppointmentFilters {
  date?: string
  status?: string
  doctorId?: string
  search?: string
}

export interface AppointmentRow {
  id: string
  appointment_date: string
  appointment_time: string
  status: string
  patient_name: string | null
  patient_phone: string | null
  doctor: {
    id: string
    name: string
    specialization: string
  } | null
  slot: {
    id: string
  } | null
}

export interface CreateDoctorData {
  name: string
  specialization: string
  qualification?: string
  experience_years?: number
  consultation_fee?: number
  phone?: string
  email?: string
  bio?: string
  languages?: string[]
  slot_start_time?: string
  slot_end_time?: string
  slot_duration_minutes?: number
  working_days?: number[]
}

export interface UpdateDoctorData {
  name?: string
  specialization?: string
  qualification?: string
  experience_years?: number
  consultation_fee?: number
  phone?: string
  email?: string
  bio?: string
  is_active?: boolean
  languages?: string[]
}

export interface PatientRow {
  user_id: string
  name: string | null
  phone: string | null
  age: number | null
  city: string | null
  first_visit: string
  last_visit: string | null
  total_visits: number
}

export interface PatientProfile {
  user: Record<string, unknown>
  appointments: Array<{
    id: string
    appointment_date: string
    appointment_time: string
    status: string
    doctor: { name: string; specialization: string } | null
  }>
  records: Array<{
    id: string
    title: string | null
    record_type: string
    created_at: string
    hospital_id: string
  }>
}

export interface AnalyticsRow {
  date: string
  total_bookings: number
  total_revenue: number
  completed_appointments: number
  cancelled_appointments: number
}

export interface DoctorPerformanceRow {
  doctorId: string
  doctorName: string
  count: number
  revenue: number
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export async function getHmsDashboard(hospitalId: string): Promise<DashboardData> {
  const todayDate = format(new Date(), 'yyyy-MM-dd')

  const [doctorsResult, appointmentsResult, patientsResult, queueResult] = await Promise.all([
    // 1. Active doctors count
    supabase
      .from('doctors')
      .select('id', { count: 'exact', head: true })
      .eq('hospital_id', hospitalId)
      .eq('is_active', true),

    // 2. Today's appointments count
    supabase
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('hospital_id', hospitalId)
      .eq('appointment_date', todayDate)
      .in('status', ['confirmed', 'pending']),

    // 3. Total patients for this hospital
    supabase
      .from('hospital_patients')
      .select('id', { count: 'exact', head: true })
      .eq('hospital_id', hospitalId),

    // 4. Today's confirmed queue (top 5)
    supabase
      .from('appointments')
      .select(`
        id,
        appointment_time,
        status,
        patient_name,
        doctor:doctors!inner(name, specialization)
      `)
      .eq('hospital_id', hospitalId)
      .eq('appointment_date', todayDate)
      .eq('status', 'confirmed')
      .order('appointment_time', { ascending: true })
      .limit(5),
  ])

  const activeDoctors = doctorsResult.count ?? 0
  const todayAppointments = appointmentsResult.count ?? 0
  const totalPatients = patientsResult.count ?? 0

  const rawQueue = (queueResult.data ?? []) as Array<{
    id: string
    appointment_time: string
    status: string
    patient_name: string | null
    doctor: { name: string; specialization: string } | { name: string; specialization: string }[] | null
  }>

  const upcomingQueue: QueueItem[] = rawQueue.map(row => ({
    id: row.id,
    appointment_time: row.appointment_time,
    status: row.status,
    patient_name: row.patient_name,
    doctor: Array.isArray(row.doctor) ? (row.doctor[0] ?? null) : row.doctor,
  }))

  return { activeDoctors, todayAppointments, totalPatients, upcomingQueue }
}

// ─── Appointments ─────────────────────────────────────────────────────────────

export async function getAppointments(
  hospitalId: string,
  filters?: AppointmentFilters
): Promise<AppointmentRow[]> {
  let query = supabase
    .from('appointments')
    .select(`
      id,
      appointment_date,
      appointment_time,
      status,
      patient_name,
      patient_phone,
      doctor:doctors!inner(id, name, specialization),
      slot:appointment_slots(id)
    `)
    .eq('hospital_id', hospitalId)
    .order('appointment_date', { ascending: false })
    .order('appointment_time', { ascending: false })
    .limit(100)

  if (filters?.date) {
    query = query.eq('appointment_date', filters.date)
  }

  if (filters?.status) {
    query = query.eq('status', filters.status)
  }

  if (filters?.doctorId) {
    query = query.eq('doctor_id', filters.doctorId)
  }

  if (filters?.search) {
    query = query.ilike('patient_name', `%${filters.search}%`)
  }

  const { data, error } = await query

  if (error) throw error

  return (data ?? []).map(row => {
    const rawDoctor = row.doctor as
      | { id: string; name: string; specialization: string }
      | { id: string; name: string; specialization: string }[]
      | null

    const doctor = Array.isArray(rawDoctor) ? (rawDoctor[0] ?? null) : rawDoctor

    const rawSlot = row.slot as { id: string } | { id: string }[] | null
    const slot = Array.isArray(rawSlot) ? (rawSlot[0] ?? null) : rawSlot

    return {
      id: row.id,
      appointment_date: row.appointment_date,
      appointment_time: row.appointment_time,
      status: row.status,
      patient_name: row.patient_name,
      patient_phone: row.patient_phone,
      doctor,
      slot,
    }
  })
}

export async function updateAppointmentStatus(
  appointmentId: string,
  status: 'confirmed' | 'cancelled' | 'completed' | 'no_show'
): Promise<void> {
  const { error } = await supabase
    .from('appointments')
    .update({ status })
    .eq('id', appointmentId)

  if (error) throw error
}

// ─── Doctors ──────────────────────────────────────────────────────────────────

export async function getDoctors(hospitalId: string) {
  const { data, error } = await supabase
    .from('doctors')
    .select('*')
    .eq('hospital_id', hospitalId)
    .order('name', { ascending: true })

  if (error) throw error
  return data ?? []
}

export async function getDoctorById(doctorId: string) {
  const sevenDaysLater = format(addDays(new Date(), 7), 'yyyy-MM-dd')
  const today = format(new Date(), 'yyyy-MM-dd')

  const [doctorResult, slotsResult] = await Promise.all([
    supabase
      .from('doctors')
      .select('*')
      .eq('id', doctorId)
      .single(),

    supabase
      .from('appointment_slots')
      .select('*')
      .eq('doctor_id', doctorId)
      .gte('slot_date', today)
      .lte('slot_date', sevenDaysLater)
      .order('slot_date', { ascending: true })
      .order('slot_time', { ascending: true }),
  ])

  if (doctorResult.error) throw doctorResult.error

  return {
    doctor: doctorResult.data,
    slots: slotsResult.data ?? [],
  }
}

export async function createDoctor(hospitalId: string, data: CreateDoctorData) {
  const {
    name,
    specialization,
    qualification,
    experience_years,
    consultation_fee,
    phone,
    email,
    bio,
    languages = [],
    slot_start_time = '09:00',
    slot_end_time = '17:00',
    slot_duration_minutes = 30,
    working_days = [1, 2, 3, 4, 5],
  } = data

  // 1. Insert doctor
  const { data: doctor, error: doctorError } = await supabase
    .from('doctors')
    .insert({
      hospital_id: hospitalId,
      name,
      specialization,
      qualifications: qualification ?? null,
      experience_years: experience_years ?? null,
      consultation_fee: consultation_fee ?? 0,
      languages,
      working_days,
      working_hours_start: slot_start_time,
      working_hours_end: slot_end_time,
      slot_duration: slot_duration_minutes,
      is_active: true,
      bio: bio ?? null,
    })
    .select()
    .single()

  if (doctorError) throw doctorError

  // 2. Generate appointment slots for next 30 days
  const slots: Array<{
    doctor_id: string
    slot_date: string
    slot_time: string
    is_available: boolean
  }> = []

  for (let dayOffset = 0; dayOffset < 30; dayOffset++) {
    const day = addDays(new Date(), dayOffset)
    const dayOfWeek = day.getDay() // 0 = Sunday

    if (!working_days.includes(dayOfWeek)) continue

    const dateStr = format(day, 'yyyy-MM-dd')

    // Parse start and end times into minutes-from-midnight
    const [startHour, startMin] = slot_start_time.split(':').map(Number)
    const [endHour, endMin] = slot_end_time.split(':').map(Number)

    const startMinutes = startHour * 60 + startMin
    const endMinutes = endHour * 60 + endMin

    for (let minutes = startMinutes; minutes < endMinutes; minutes += slot_duration_minutes) {
      const hour = Math.floor(minutes / 60)
      const min = minutes % 60
      const timeStr = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`

      slots.push({
        doctor_id: doctor.id,
        slot_date: dateStr,
        slot_time: timeStr,
        is_available: true,
      })
    }
  }

  if (slots.length > 0) {
    const { error: slotsError } = await supabase
      .from('appointment_slots')
      .insert(slots)

    if (slotsError) throw slotsError
  }

  return doctor
}

export async function updateDoctor(doctorId: string, data: UpdateDoctorData): Promise<void> {
  const updatePayload: Record<string, unknown> = {}

  if (data.name !== undefined) updatePayload.name = data.name
  if (data.specialization !== undefined) updatePayload.specialization = data.specialization
  if (data.qualification !== undefined) updatePayload.qualifications = data.qualification
  if (data.experience_years !== undefined) updatePayload.experience_years = data.experience_years
  if (data.consultation_fee !== undefined) updatePayload.consultation_fee = data.consultation_fee
  if (data.bio !== undefined) updatePayload.bio = data.bio
  if (data.is_active !== undefined) updatePayload.is_active = data.is_active
  if (data.languages !== undefined) updatePayload.languages = data.languages

  const { error } = await supabase
    .from('doctors')
    .update(updatePayload)
    .eq('id', doctorId)

  if (error) throw error
}

// ─── Patients ─────────────────────────────────────────────────────────────────

export async function getPatients(hospitalId: string, search?: string): Promise<PatientRow[]> {
  let query = supabase
    .from('hospital_patients')
    .select(`
      user_id,
      name,
      phone,
      age,
      first_visit_at,
      last_visit_at,
      total_visits
    `)
    .eq('hospital_id', hospitalId)
    .order('last_visit_at', { ascending: false })

  if (search) {
    query = query.ilike('name', `%${search}%`)
  }

  const { data, error } = await query

  if (error) throw error

  return (data ?? []).map(row => ({
    user_id: row.user_id,
    name: row.name,
    phone: row.phone,
    age: row.age,
    city: null,
    first_visit: row.first_visit_at,
    last_visit: row.last_visit_at,
    total_visits: row.total_visits,
  }))
}

export async function getPatientProfile(
  userId: string,
  hospitalId: string
): Promise<PatientProfile> {
  const [userResult, appointmentsResult, recordsResult] = await Promise.all([
    supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single(),

    supabase
      .from('appointments')
      .select(`
        id,
        appointment_date,
        appointment_time,
        status,
        doctor:doctors!inner(name, specialization)
      `)
      .eq('user_id', userId)
      .eq('hospital_id', hospitalId)
      .order('appointment_date', { ascending: false }),

    supabase
      .from('medical_records')
      .select('id, title, record_type, created_at, hospital_id')
      .eq('user_id', userId),
  ])

  if (userResult.error) throw userResult.error

  const appointments = (appointmentsResult.data ?? []).map(row => {
    const rawDoctor = row.doctor as
      | { name: string; specialization: string }
      | { name: string; specialization: string }[]
      | null

    return {
      id: row.id,
      appointment_date: row.appointment_date,
      appointment_time: row.appointment_time,
      status: row.status,
      doctor: Array.isArray(rawDoctor) ? (rawDoctor[0] ?? null) : rawDoctor,
    }
  })

  return {
    user: userResult.data as Record<string, unknown>,
    appointments,
    records: recordsResult.data ?? [],
  }
}

// ─── Queue ────────────────────────────────────────────────────────────────────

export interface QueueEntry {
  id: string
  appointment_time: string
  patient_name: string | null
  status: string
  doctor: {
    id: string
    name: string
    specialization: string
  } | null
}

export async function getTodayQueue(
  hospitalId: string,
  doctorId?: string
): Promise<QueueEntry[]> {
  const todayDate = format(new Date(), 'yyyy-MM-dd')

  let query = supabase
    .from('appointments')
    .select(`
      id,
      appointment_time,
      patient_name,
      status,
      doctor:doctors!inner(id, name, specialization)
    `)
    .eq('hospital_id', hospitalId)
    .eq('appointment_date', todayDate)
    .in('status', ['confirmed', 'in_consultation'])
    .order('appointment_time', { ascending: true })

  if (doctorId) {
    query = query.eq('doctor_id', doctorId)
  }

  const { data, error } = await query

  if (error) throw error

  return (data ?? []).map(row => {
    const rawDoctor = row.doctor as
      | { id: string; name: string; specialization: string }
      | { id: string; name: string; specialization: string }[]
      | null

    return {
      id: row.id,
      appointment_time: row.appointment_time,
      patient_name: row.patient_name,
      status: row.status,
      doctor: Array.isArray(rawDoctor) ? (rawDoctor[0] ?? null) : rawDoctor,
    }
  })
}

export async function markPatientArrived(appointmentId: string): Promise<void> {
  const { error } = await supabase
    .from('appointments')
    .update({ status: 'in_consultation' })
    .eq('id', appointmentId)

  if (error) throw error
}

export async function completeAppointment(appointmentId: string): Promise<void> {
  const { error } = await supabase
    .from('appointments')
    .update({ status: 'completed' })
    .eq('id', appointmentId)

  if (error) throw error
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export async function getHmsAnalytics(hospitalId: string): Promise<AnalyticsRow[]> {
  const thirtyDaysAgo = format(addDays(new Date(), -30), 'yyyy-MM-dd')

  const { data, error } = await supabase
    .from('booking_analytics')
    .select('date, total_bookings, total_revenue, completed_appointments, cancelled_appointments')
    .eq('hospital_id', hospitalId)
    .gte('date', thirtyDaysAgo)
    .order('date', { ascending: true })

  if (error) throw error

  return (data ?? []).map(row => ({
    date: row.date,
    total_bookings: row.total_bookings ?? 0,
    total_revenue: row.total_revenue ?? 0,
    completed_appointments: row.completed_appointments ?? 0,
    cancelled_appointments: row.cancelled_appointments ?? 0,
  }))
}

export async function getDoctorPerformance(
  hospitalId: string
): Promise<DoctorPerformanceRow[]> {
  // Fetch all completed/confirmed appointments for this hospital joined with doctor info,
  // then aggregate client-side since Supabase PostgREST doesn't support GROUP BY directly.
  const { data, error } = await supabase
    .from('appointments')
    .select(`
      doctor_id,
      consultation_fee,
      status,
      doctor:doctors!inner(id, name)
    `)
    .eq('hospital_id', hospitalId)
    .in('status', ['completed', 'confirmed'])

  if (error) throw error

  const aggregation = new Map<
    string,
    { doctorId: string; doctorName: string; count: number; revenue: number }
  >()

  for (const row of data ?? []) {
    const rawDoctor = row.doctor as
      | { id: string; name: string }
      | { id: string; name: string }[]
      | null

    const doctor = Array.isArray(rawDoctor) ? (rawDoctor[0] ?? null) : rawDoctor
    if (!doctor) continue

    const existing = aggregation.get(row.doctor_id)
    const fee = row.consultation_fee ?? 0

    if (existing) {
      existing.count += 1
      existing.revenue += fee
    } else {
      aggregation.set(row.doctor_id, {
        doctorId: row.doctor_id,
        doctorName: doctor.name,
        count: 1,
        revenue: fee,
      })
    }
  }

  return Array.from(aggregation.values()).sort((a, b) => b.count - a.count)
}
