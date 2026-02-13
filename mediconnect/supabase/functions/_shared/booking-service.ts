import { supabase } from './supabase-client.ts'

interface BookingResult {
  success: boolean
  error?: string
  appointment_id?: string
  confirmation_code?: string
}

/**
 * Atomically books an appointment using the DB function.
 * Prevents race conditions / double bookings.
 */
export async function bookAppointment(
  userId: string,
  doctorId: string,
  slotId: string,
  appointmentDate: string,
  appointmentTime: string,
  bookingSource: string = 'whatsapp',
  reason?: string
): Promise<BookingResult> {
  const { data, error } = await supabase.rpc('book_appointment_atomic', {
    p_user_id: userId,
    p_doctor_id: doctorId,
    p_slot_id: slotId,
    p_appointment_date: appointmentDate,
    p_appointment_time: appointmentTime,
    p_booking_source: bookingSource,
    p_reason: reason ?? null,
  })

  if (error) {
    console.error('Booking RPC error:', error.message)
    return { success: false, error: 'Booking failed. Please try again.' }
  }

  const result = data as BookingResult
  return result
}

/**
 * Cancels an appointment and frees the slot.
 */
export async function cancelAppointment(
  appointmentId: string,
  reason: string,
  cancelledBy: 'patient' | 'hospital' = 'patient'
): Promise<{ success: boolean; error?: string }> {
  // Get appointment first to check it exists and get slot_id
  const { data: appointment } = await supabase
    .from('appointments')
    .select('id, slot_id, status, appointment_date, appointment_time')
    .eq('id', appointmentId)
    .maybeSingle()

  if (!appointment) return { success: false, error: 'Appointment not found.' }

  if (appointment.status === 'completed') {
    return { success: false, error: 'Cannot cancel a completed appointment.' }
  }

  if (appointment.status === 'cancelled') {
    return { success: false, error: 'Appointment is already cancelled.' }
  }

  // Check 2-hour rule
  const apptDateTime = new Date(
    `${appointment.appointment_date}T${appointment.appointment_time}`
  )
  const twoHoursFromNow = new Date(Date.now() + 2 * 60 * 60 * 1000)
  if (apptDateTime <= twoHoursFromNow) {
    return {
      success: false,
      error: 'Appointments can only be cancelled at least 2 hours in advance.',
    }
  }

  // Cancel
  const { error: cancelError } = await supabase
    .from('appointments')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      cancellation_reason: `${cancelledBy}: ${reason}`,
    })
    .eq('id', appointmentId)

  if (cancelError) return { success: false, error: 'Failed to cancel. Try again.' }

  // Free the slot
  if (appointment.slot_id) {
    await supabase
      .from('appointment_slots')
      .update({ is_available: true })
      .eq('id', appointment.slot_id)
  }

  return { success: true }
}

/**
 * Gets today's appointment for a user (if any).
 */
export async function getTodayAppointment(userId: string) {
  const today = new Date().toISOString().split('T')[0]

  const { data } = await supabase
    .from('appointments')
    .select(`
      id, appointment_date, appointment_time, status, queue_position,
      doctor:doctors (id, name, specialization),
      hospital:hospitals (id, name, address, city)
    `)
    .eq('user_id', userId)
    .eq('appointment_date', today)
    .in('status', ['confirmed', 'checked_in', 'in_consultation'])
    .order('appointment_time', { ascending: true })
    .limit(1)
    .maybeSingle()

  return data
}

/**
 * Gets upcoming appointments for a user.
 */
export async function getUpcomingAppointments(userId: string, limit = 5) {
  const today = new Date().toISOString().split('T')[0]

  const { data } = await supabase
    .from('appointments')
    .select(`
      id, appointment_date, appointment_time, status,
      doctor:doctors (id, name, specialization),
      hospital:hospitals (id, name)
    `)
    .eq('user_id', userId)
    .gte('appointment_date', today)
    .in('status', ['confirmed'])
    .order('appointment_date', { ascending: true })
    .order('appointment_time', { ascending: true })
    .limit(limit)

  return data ?? []
}

/**
 * Gets queue status for a specific appointment.
 */
export async function getQueueStatus(doctorId: string, date: string) {
  const { data: queue } = await supabase
    .from('appointments')
    .select('id, patient_name, appointment_time, status, checked_in_at, consultation_started_at, consultation_ended_at, queue_position')
    .eq('doctor_id', doctorId)
    .eq('appointment_date', date)
    .in('status', ['confirmed', 'checked_in', 'in_consultation'])
    .order('appointment_time', { ascending: true })

  if (!queue || queue.length === 0) {
    return { patients_ahead: 0, estimated_wait_minutes: 0, estimated_call_time: null, current_delay: 0 }
  }

  // Find current patient in consultation
  const inConsultation = queue.find((a) => a.status === 'in_consultation')
  const checkedIn = queue.filter((a) => a.status === 'checked_in').length

  // Estimate average consultation time (30 min default)
  const avgConsultTime = 30

  return {
    in_consultation: inConsultation
      ? { patient_name: inConsultation.patient_name, started_at: inConsultation.consultation_started_at }
      : null,
    checked_in_count: checkedIn,
    waiting_count: queue.filter((a) => a.status === 'confirmed').length,
    estimated_wait_minutes: checkedIn * avgConsultTime,
    current_delay: inConsultation
      ? Math.max(
          0,
          Math.round(
            (Date.now() - new Date(inConsultation.consultation_started_at ?? Date.now()).getTime()) / 60000
          ) - avgConsultTime
        )
      : 0,
  }
}
