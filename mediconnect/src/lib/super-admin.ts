import { supabase } from './supabase'

// ─── Dashboard ────────────────────────────────────────────────────────────────

export interface PlatformStats {
  totalHospitals: number
  activeHospitals: number
  totalDoctors: number
  totalPatients: number
  totalAppointmentsToday: number
  totalRevenueThisMonth: number
}

export async function getPlatformStats(): Promise<PlatformStats> {
  const today = new Date().toISOString().split('T')[0]

  // Start of current month and end of current month for filtering booking_analytics
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

  const [
    totalHospitalsResult,
    activeHospitalsResult,
    totalDoctorsResult,
    totalPatientsResult,
    totalAppointmentsTodayResult,
    revenueResult,
  ] = await Promise.all([
    supabase.from('hospitals').select('*', { count: 'exact', head: true }),
    supabase
      .from('hospitals')
      .select('*', { count: 'exact', head: true })
      .eq('subscription_status', 'active'),
    supabase.from('doctors').select('*', { count: 'exact', head: true }),
    supabase.from('users').select('*', { count: 'exact', head: true }),
    supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('appointment_date', today),
    supabase
      .from('booking_analytics')
      .select('total_revenue')
      .gte('date', monthStart)
      .lte('date', monthEnd),
  ])

  if (totalHospitalsResult.error) throw totalHospitalsResult.error
  if (activeHospitalsResult.error) throw activeHospitalsResult.error
  if (totalDoctorsResult.error) throw totalDoctorsResult.error
  if (totalPatientsResult.error) throw totalPatientsResult.error
  if (totalAppointmentsTodayResult.error) throw totalAppointmentsTodayResult.error
  if (revenueResult.error) throw revenueResult.error

  const totalRevenueThisMonth = (revenueResult.data ?? []).reduce(
    (sum, row) => sum + (row.total_revenue ?? 0),
    0,
  )

  return {
    totalHospitals: totalHospitalsResult.count ?? 0,
    activeHospitals: activeHospitalsResult.count ?? 0,
    totalDoctors: totalDoctorsResult.count ?? 0,
    totalPatients: totalPatientsResult.count ?? 0,
    totalAppointmentsToday: totalAppointmentsTodayResult.count ?? 0,
    totalRevenueThisMonth,
  }
}

export interface RecentHospital {
  id: string
  name: string
  city: string | null
  subscription_status: 'trial' | 'active' | 'suspended'
  subscription_plan: 'basic' | 'growth' | 'enterprise'
  created_at: string
}

export async function getRecentHospitals(limit = 5): Promise<RecentHospital[]> {
  const { data, error } = await supabase
    .from('hospitals')
    .select('id, name, city, subscription_status, subscription_plan, created_at')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data ?? []
}

export interface MonthlyStat {
  month: number
  year: number
  total_appointments: number
  total_revenue: number
  active_hospitals: number
}

export async function getMonthlyStats(): Promise<MonthlyStat[]> {
  // Aggregate booking_analytics grouped by year+month (last 12 calendar months)
  const now = new Date()
  const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1)
    .toISOString()
    .split('T')[0]

  const { data, error } = await supabase
    .from('booking_analytics')
    .select('*')
    .gte('date', twelveMonthsAgo)
    .order('date', { ascending: false })

  if (error) throw error

  // Group by year-month
  const grouped = new Map<
    string,
    { month: number; year: number; total_appointments: number; total_revenue: number; hospitalIds: Set<string> }
  >()

  for (const row of data ?? []) {
    const d = new Date(row.date)
    const key = `${d.getFullYear()}-${d.getMonth() + 1}`
    if (!grouped.has(key)) {
      grouped.set(key, {
        month: d.getMonth() + 1,
        year: d.getFullYear(),
        total_appointments: 0,
        total_revenue: 0,
        hospitalIds: new Set(),
      })
    }
    const entry = grouped.get(key)!
    entry.total_appointments += row.total_bookings ?? 0
    entry.total_revenue += row.total_revenue ?? 0
    if (row.hospital_id) entry.hospitalIds.add(row.hospital_id)
  }

  return Array.from(grouped.values())
    .map(({ hospitalIds, ...rest }) => ({
      ...rest,
      active_hospitals: hospitalIds.size,
    }))
    .sort((a, b) => b.year - a.year || b.month - a.month)
    .slice(0, 12)
}

// ─── Hospitals ────────────────────────────────────────────────────────────────

export interface HospitalWithDoctorCount {
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
  settings: unknown
  created_at: string
  updated_at: string
  doctor_count: number
}

export async function getAllHospitals(): Promise<HospitalWithDoctorCount[]> {
  const [hospitalsResult, doctorCountsResult] = await Promise.all([
    supabase.from('hospitals').select('*').order('created_at', { ascending: false }),
    supabase.from('doctors').select('hospital_id'),
  ])

  if (hospitalsResult.error) throw hospitalsResult.error
  if (doctorCountsResult.error) throw doctorCountsResult.error

  // Build a count map for doctors per hospital
  const doctorCountMap = new Map<string, number>()
  for (const doc of doctorCountsResult.data ?? []) {
    doctorCountMap.set(doc.hospital_id, (doctorCountMap.get(doc.hospital_id) ?? 0) + 1)
  }

  return (hospitalsResult.data ?? []).map((hospital) => ({
    ...hospital,
    doctor_count: doctorCountMap.get(hospital.id) ?? 0,
  }))
}

export interface HospitalAdmin {
  id: string
  email: string
  name: string
  role: 'admin' | 'manager' | 'receptionist'
  is_active: boolean
  created_at: string
}

export interface HospitalDetail {
  hospital: NonNullable<Awaited<ReturnType<typeof supabase.from<'hospitals', any>['select']>>['data']>[0]
  admins: HospitalAdmin[]
}

export async function getHospitalById(id: string): Promise<{
  hospital: HospitalWithDoctorCount
  admins: HospitalAdmin[]
}> {
  const [hospitalResult, adminsResult, doctorCountResult] = await Promise.all([
    supabase.from('hospitals').select('*').eq('id', id).single(),
    supabase
      .from('hospital_admins')
      .select('id, email, name, role, is_active, created_at')
      .eq('hospital_id', id),
    supabase
      .from('doctors')
      .select('*', { count: 'exact', head: true })
      .eq('hospital_id', id),
  ])

  if (hospitalResult.error) throw hospitalResult.error
  if (adminsResult.error) throw adminsResult.error
  if (doctorCountResult.error) throw doctorCountResult.error

  return {
    hospital: {
      ...hospitalResult.data,
      doctor_count: doctorCountResult.count ?? 0,
    },
    admins: adminsResult.data ?? [],
  }
}

export interface HospitalStats {
  doctorCount: number
  appointmentCount: number
  patientCount: number
}

export async function getHospitalStats(hospitalId: string): Promise<HospitalStats> {
  // Get doctor IDs for this hospital first, then count appointments
  const [doctorResult, patientResult] = await Promise.all([
    supabase
      .from('doctors')
      .select('id', { count: 'exact' })
      .eq('hospital_id', hospitalId),
    supabase
      .from('hospital_patients')
      .select('*', { count: 'exact', head: true })
      .eq('hospital_id', hospitalId),
  ])

  if (doctorResult.error) throw doctorResult.error
  if (patientResult.error) throw patientResult.error

  // Count appointments directly via hospital_id column on appointments table
  const { count: appointmentCount, error: apptError } = await supabase
    .from('appointments')
    .select('*', { count: 'exact', head: true })
    .eq('hospital_id', hospitalId)

  if (apptError) throw apptError

  return {
    doctorCount: doctorResult.count ?? 0,
    appointmentCount: appointmentCount ?? 0,
    patientCount: patientResult.count ?? 0,
  }
}

export interface CreateHospitalData {
  name: string
  city: string
  address: string
  phone: string
  email: string
  website?: string
  subscription_plan: 'basic' | 'growth' | 'enterprise'
  lat?: number
  lng?: number
}

export async function createHospital(data: CreateHospitalData) {
  const now = new Date()
  const oneYearFromNow = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate())

  // Generate a subdomain from the hospital name
  const subdomain = data.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50)

  const { data: hospital, error } = await supabase
    .from('hospitals')
    .insert({
      name: data.name,
      subdomain,
      city: data.city,
      address: data.address,
      phone: data.phone,
      email: data.email,
      subscription_plan: data.subscription_plan,
      subscription_status: 'active' as const,
      subscription_starts_at: now.toISOString(),
      subscription_ends_at: oneYearFromNow.toISOString(),
      latitude: data.lat ?? null,
      longitude: data.lng ?? null,
      is_active: true,
      is_promoted: false,
      settings: {},
    })
    .select()
    .single()

  if (error) throw error
  return hospital
}

export async function updateHospitalStatus(
  id: string,
  status: 'trial' | 'active' | 'suspended',
) {
  const { error } = await supabase
    .from('hospitals')
    .update({ subscription_status: status })
    .eq('id', id)

  if (error) throw error
}

export async function updateHospitalTier(
  id: string,
  plan: 'basic' | 'growth' | 'enterprise',
) {
  const { error } = await supabase
    .from('hospitals')
    .update({ subscription_plan: plan })
    .eq('id', id)

  if (error) throw error
}

export async function toggleHospitalPromotion(id: string, isPromoted: boolean) {
  const { error } = await supabase
    .from('hospitals')
    .update({
      is_promoted: isPromoted,
      promotion_level: isPromoted ? 'promoted' : null,
    })
    .eq('id', id)

  if (error) throw error
}

// ─── Admin Users ──────────────────────────────────────────────────────────────

export interface CreateHospitalAdminData {
  hospitalId: string
  email: string
  name: string
  password: string
}

export async function createHospitalAdmin(data: CreateHospitalAdminData) {
  // Calls the Edge Function which uses service role to create the auth user
  // and insert the hospital_admin record atomically
  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData?.session?.access_token
  if (!token) throw new Error('Not authenticated')

  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-hospital-admin`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        hospitalId: data.hospitalId,
        email: data.email,
        name: data.name,
        password: data.password,
        role: 'admin',
      }),
    }
  )

  const result = await res.json()
  if (!result.success) throw new Error(result.error ?? 'Failed to create admin')
  return result.admin
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export interface PlatformAnalyticsRow {
  month: number
  year: number
  total_appointments: number
  total_revenue: number
}

export async function getPlatformAnalytics(): Promise<PlatformAnalyticsRow[]> {
  const now = new Date()
  const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1)
    .toISOString()
    .split('T')[0]

  const { data, error } = await supabase
    .from('booking_analytics')
    .select('date, total_bookings, total_revenue')
    .gte('date', twelveMonthsAgo)
    .order('date', { ascending: true })

  if (error) throw error

  // Group by year-month, ascending for chart display
  const grouped = new Map<
    string,
    { month: number; year: number; total_appointments: number; total_revenue: number }
  >()

  for (const row of data ?? []) {
    const d = new Date(row.date)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (!grouped.has(key)) {
      grouped.set(key, {
        month: d.getMonth() + 1,
        year: d.getFullYear(),
        total_appointments: 0,
        total_revenue: 0,
      })
    }
    const entry = grouped.get(key)!
    entry.total_appointments += row.total_bookings ?? 0
    entry.total_revenue += row.total_revenue ?? 0
  }

  return Array.from(grouped.values()).sort(
    (a, b) => a.year - b.year || a.month - b.month,
  )
}

export interface HospitalRevenueRow {
  id: string
  name: string
  revenue: number
}

export async function getHospitalRevenue(): Promise<HospitalRevenueRow[]> {
  // Fetch all hospitals and their analytics, then aggregate
  const [hospitalsResult, analyticsResult] = await Promise.all([
    supabase.from('hospitals').select('id, name'),
    supabase.from('booking_analytics').select('hospital_id, total_revenue'),
  ])

  if (hospitalsResult.error) throw hospitalsResult.error
  if (analyticsResult.error) throw analyticsResult.error

  // Build a revenue map
  const revenueMap = new Map<string, number>()
  for (const row of analyticsResult.data ?? []) {
    if (!row.hospital_id) continue
    revenueMap.set(
      row.hospital_id,
      (revenueMap.get(row.hospital_id) ?? 0) + (row.total_revenue ?? 0),
    )
  }

  return (hospitalsResult.data ?? [])
    .map((hospital) => ({
      id: hospital.id,
      name: hospital.name,
      revenue: revenueMap.get(hospital.id) ?? 0,
    }))
    .sort((a, b) => b.revenue - a.revenue)
}

// ─── Promotions ───────────────────────────────────────────────────────────────

export interface PromotionHospital {
  id: string
  name: string
  city: string | null
  subscription_plan: 'basic' | 'growth' | 'enterprise'
  promotion_level: 'promoted' | 'premium' | null
  is_promoted: boolean
}

export async function getPromotedHospitals(): Promise<PromotionHospital[]> {
  const { data, error } = await supabase
    .from('hospitals')
    .select('id, name, city, subscription_plan, promotion_level, is_promoted')
    .eq('is_promoted', true)

  if (error) throw error
  return data ?? []
}

export async function getAllHospitalsForPromotion(): Promise<PromotionHospital[]> {
  const { data, error } = await supabase
    .from('hospitals')
    .select('id, name, city, subscription_plan, promotion_level, is_promoted')
    .order('name', { ascending: true })

  if (error) throw error
  return data ?? []
}

export async function updatePromotionTier(
  id: string,
  level: 'none' | 'promoted' | 'premium',
) {
  const isPromoted = level !== 'none'
  const promotion_level = isPromoted ? (level as 'promoted' | 'premium') : null

  const { error } = await supabase
    .from('hospitals')
    .update({
      promotion_level,
      is_promoted: isPromoted,
    })
    .eq('id', id)

  if (error) throw error
}
