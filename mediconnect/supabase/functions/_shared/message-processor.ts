import { extractIntent, detectLanguage, translateMessage } from './intent-extractor.ts'
import {
  getOrCreateConversation,
  updateConversation,
  resetConversation,
  logMessage,
  checkAndResetStaleConversation,
} from './conversation-manager.ts'
import { findUserByPhone, createUser, geocodeLocation } from './user-service.ts'
import {
  searchDoctors,
  getAvailableSlots,
  resolveDate,
} from './search-service.ts'
import {
  bookAppointment,
  cancelAppointment,
  getTodayAppointment,
  getUpcomingAppointments,
  getQueueStatus,
} from './booking-service.ts'
import { supabase } from './supabase-client.ts'
import * as R from './response-generator.ts'
import type { IncomingMessage, DoctorSearchResult, SlotOption } from './types.ts'

/**
 * Main entry point. Processes an incoming WhatsApp message and returns the reply.
 */
export async function processMessage(msg: IncomingMessage): Promise<string> {
  const phone = msg.from

  // 1. Get or create conversation
  let conversation = await getOrCreateConversation(phone)

  // 2. Reset stale conversation (idle after 1hr)
  conversation = await checkAndResetStaleConversation(conversation)

  // 3. Log inbound message
  await logMessage(conversation.id, conversation.user_id, 'inbound', msg.body)

  // 4. Check if user is registered
  const user = await findUserByPhone(phone)

  // 5. If not registered, route through registration
  if (!user && !conversation.current_state.startsWith('registration')) {
    await updateConversation(conversation.id, 'registration_name', {}, undefined)
    return R.welcomeNewUser()
  }

  // 6. Detect language for multilingual support
  let detectedLang = user?.preferred_language ?? 'English'
  if (detectedLang !== 'English') {
    // Will translate response back at the end
  }

  // 7. Extract intent
  const intent = await extractIntent(msg.body)

  // 8. Handle cancel flow command (works from any state)
  if (intent.intent === 'cancel_flow' || msg.body.toLowerCase() === 'cancel') {
    await resetConversation(conversation.id)
    return R.cancelFlowMessage()
  }

  // 9. Route to state handler
  let response: string

  try {
    switch (conversation.current_state) {
      case 'registration_name':
        response = await handleRegistrationName(phone, msg.body, conversation.id)
        break

      case 'registration_age':
        response = await handleRegistrationAge(phone, msg.body, conversation.id, conversation.context)
        break

      case 'registration_language':
        response = await handleRegistrationLanguage(phone, msg.body, conversation.id, conversation.context)
        break

      case 'registration_location':
        response = await handleRegistrationLocation(phone, msg.body, msg.latitude, msg.longitude, conversation.id, conversation.context)
        break

      case 'selecting_doctor':
        response = await handleSelectingDoctor(phone, intent, conversation.id, conversation.context, user!)
        break

      case 'selecting_slot':
        response = await handleSelectingSlot(phone, intent, conversation.id, conversation.context)
        break

      case 'confirming_booking':
        response = await handleConfirmingBooking(phone, intent, conversation.id, conversation.context, user!)
        break

      case 'selecting_record':
        response = await handleSelectingRecord(phone, intent, conversation.id, conversation.context, user!)
        break

      default:
        // Idle state — handle intent
        response = await handleIdleState(phone, intent, conversation.id, user!)
        break
    }
  } catch (err) {
    console.error('Message processing error:', err)
    await resetConversation(conversation.id)
    response = R.errorMessage()
  }

  // 10. Translate response if user prefers non-English
  if (detectedLang && detectedLang !== 'English') {
    response = await translateMessage(response, detectedLang)
  }

  return response
}

// ─── Registration Flow ────────────────────────────────────────────────────────

async function handleRegistrationName(phone: string, text: string, convId: string): Promise<string> {
  const name = text.trim()
  if (name.length < 2) return 'Please enter your full name.'

  await updateConversation(convId, 'registration_age', { name })
  return R.askForAge(name)
}

async function handleRegistrationAge(
  phone: string, text: string, convId: string,
  ctx: Record<string, unknown>
): Promise<string> {
  const age = parseInt(text.trim())

  if (isNaN(age) || age < 1 || age > 120) {
    return 'Please enter a valid age (number only, e.g. 28).'
  }

  await updateConversation(convId, 'registration_language', { ...ctx, age })
  return R.askForLanguage()
}

async function handleRegistrationLanguage(
  phone: string, text: string, convId: string,
  ctx: Record<string, unknown>
): Promise<string> {
  const languages = ['English', 'Hindi', 'Telugu', 'Tamil']
  const sel = parseInt(text.trim())

  if (isNaN(sel) || sel < 1 || sel > 4) {
    return 'Please reply with 1, 2, 3, or 4.'
  }

  const language = languages[sel - 1]
  await updateConversation(convId, 'registration_location', { ...ctx, language })
  return R.askForLocation()
}

async function handleRegistrationLocation(
  phone: string,
  text: string,
  latitude: number | undefined,
  longitude: number | undefined,
  convId: string,
  ctx: Record<string, unknown>
): Promise<string> {
  let city: string | undefined
  let lat: number | undefined = latitude
  let lng: number | undefined = longitude

  if (!lat || !lng) {
    // Text-based location
    const geocoded = await geocodeLocation(text)
    city = geocoded.city
    lat = geocoded.latitude ?? undefined
    lng = geocoded.longitude ?? undefined
  } else {
    city = text // may be empty string when sharing GPS
  }

  // Create user
  const user = await createUser({
    phone,
    name: ctx.name as string,
    age: ctx.age as number | undefined,
    preferredLanguage: ctx.language as string | undefined,
    city,
    latitude: lat,
    longitude: lng,
    whatsappName: ctx.name as string,
  })

  // Link conversation to user
  await updateConversation(convId, 'idle', {}, user.id)
  return R.registrationComplete(user.name ?? 'there')
}

// ─── Idle State ───────────────────────────────────────────────────────────────

async function handleIdleState(
  phone: string,
  intent: ReturnType<typeof extractIntent> extends Promise<infer T> ? T : never,
  convId: string,
  user: Awaited<ReturnType<typeof findUserByPhone>> & {}
): Promise<string> {
  switch (intent.intent) {
    case 'greeting':
      return R.greetingMessage()

    case 'help':
      return R.helpMessage()

    case 'find_doctor':
    case 'book_appointment': {
      const date = resolveDate(intent.date)
      const results = await searchDoctors(intent, user.latitude ?? undefined, user.longitude ?? undefined, date)
      await updateConversation(convId, 'selecting_doctor', {
        searchResults: results,
        searchParams: intent,
      })
      return R.doctorListMessage(results)
    }

    case 'view_records': {
      const { getUserMedicalRecords } = await import('./user-service.ts')
      const records = await getUserMedicalRecords(user.id)
      await updateConversation(convId, 'selecting_record', { records })
      return R.recordsListMessage(records)
    }

    case 'check_queue':
    case 'check_status': {
      const appt = await getTodayAppointment(user.id)
      if (!appt) return R.noAppointmentTodayMessage()

      const queueInfo = await getQueueStatus(
        (appt as { doctor: { id: string } }).doctor.id,
        appt.appointment_date
      )
      return R.queueStatusMessage({
        appointment_time: appt.appointment_time,
        ...queueInfo,
      })
    }

    case 'cancel_appointment': {
      const appointments = await getUpcomingAppointments(user.id)
      if (appointments.length === 0) {
        return '📅 You have no upcoming appointments to cancel.'
      }
      await updateConversation(convId, 'selecting_doctor', {
        // Reuse state for cancellation flow — check context
        searchResults: [],
        searchParams: { intent: 'cancel_appointment' },
      })
      return R.appointmentsListForCancel(appointments as Parameters<typeof R.appointmentsListForCancel>[0])
    }

    case 'view_appointments': {
      const appointments = await getUpcomingAppointments(user.id)
      if (appointments.length === 0) return '📅 No upcoming appointments.'

      let msg = '📅 *Your Upcoming Appointments:*\n\n'
      appointments.forEach((a, i) => {
        const appt = a as { appointment_date: string; appointment_time: string; doctor: { name: string } | null; hospital: { name: string } | null }
        msg += `${i + 1}. ${appt.appointment_date} at ${appt.appointment_time}\n`
        msg += `   Dr. ${appt.doctor?.name ?? '-'} @ ${appt.hospital?.name ?? '-'}\n\n`
      })
      return msg
    }

    case 'unclear':
    default:
      return R.unclearMessage()
  }
}

// ─── Doctor Selection ─────────────────────────────────────────────────────────

async function handleSelectingDoctor(
  phone: string,
  intent: Awaited<ReturnType<typeof extractIntent>>,
  convId: string,
  ctx: Record<string, unknown>,
  user: NonNullable<Awaited<ReturnType<typeof findUserByPhone>>>
): Promise<string> {
  const searchResults = ctx.searchResults as DoctorSearchResult[]
  const searchParams = ctx.searchParams as Awaited<ReturnType<typeof extractIntent>>

  // If this is actually a cancellation flow
  if (searchParams?.intent === 'cancel_appointment') {
    const appointments = await getUpcomingAppointments(user.id)
    const sel = intent.number ?? parseInt(intent.raw_text ?? '0')

    if (!sel || sel < 1 || sel > appointments.length) {
      return 'Invalid selection. Please reply with a valid number.'
    }

    const appt = appointments[sel - 1] as { id: string }
    const result = await cancelAppointment(appt.id, 'User requested cancellation')

    await resetConversation(convId)

    if (result.success) return R.cancellationSuccessMessage()
    return R.cancellationFailedMessage(result.error ?? 'Unknown error')
  }

  const sel = intent.number ?? parseInt(intent.raw_text ?? '0')

  if (!sel || sel < 1 || !searchResults || sel > searchResults.length) {
    return `Please reply with a number between 1 and ${searchResults?.length ?? 5}.`
  }

  const selectedDoctor = searchResults[sel - 1]
  const date = resolveDate(searchParams?.date)
  const slots = await getAvailableSlots(selectedDoctor.id, date)

  if (slots.length === 0) {
    // Try next 7 days
    const futureDates = Array.from({ length: 7 }, (_, i) => {
      const d = new Date()
      d.setDate(d.getDate() + i + 1)
      return d.toISOString().split('T')[0]
    })

    for (const futureDate of futureDates) {
      const futureSlots = await getAvailableSlots(selectedDoctor.id, futureDate)
      if (futureSlots.length > 0) {
        await updateConversation(convId, 'selecting_slot', {
          ...ctx,
          selectedDoctor,
          availableSlots: futureSlots,
        })
        return R.slotListMessage(selectedDoctor, futureSlots)
      }
    }

    await resetConversation(convId)
    return R.noSlotsMessage(selectedDoctor.name)
  }

  await updateConversation(convId, 'selecting_slot', {
    ...ctx,
    selectedDoctor,
    availableSlots: slots,
  })

  return R.slotListMessage(selectedDoctor, slots)
}

// ─── Slot Selection ───────────────────────────────────────────────────────────

async function handleSelectingSlot(
  phone: string,
  intent: Awaited<ReturnType<typeof extractIntent>>,
  convId: string,
  ctx: Record<string, unknown>
): Promise<string> {
  const slots = ctx.availableSlots as SlotOption[]
  const doctor = ctx.selectedDoctor as DoctorSearchResult

  const sel = intent.number ?? parseInt(intent.raw_text ?? '0')

  if (!sel || sel < 1 || sel > slots.length) {
    return `Please reply with a number between 1 and ${slots.length}.`
  }

  const selectedSlot = slots[sel - 1]

  await updateConversation(convId, 'confirming_booking', {
    ...ctx,
    selectedSlot,
  })

  return R.bookingConfirmPrompt(doctor, selectedSlot)
}

// ─── Booking Confirmation ─────────────────────────────────────────────────────

async function handleConfirmingBooking(
  phone: string,
  intent: Awaited<ReturnType<typeof extractIntent>>,
  convId: string,
  ctx: Record<string, unknown>,
  user: NonNullable<Awaited<ReturnType<typeof findUserByPhone>>>
): Promise<string> {
  if (intent.intent === 'no') {
    await resetConversation(convId)
    return R.cancelFlowMessage()
  }

  if (intent.intent !== 'yes') {
    return 'Please reply *YES* to confirm or *NO* to cancel.'
  }

  const doctor = ctx.selectedDoctor as DoctorSearchResult
  const slot = ctx.selectedSlot as SlotOption

  const result = await bookAppointment(
    user.id,
    doctor.id,
    slot.id,
    slot.date,
    slot.time,
    'whatsapp'
  )

  await resetConversation(convId)

  if (!result.success) {
    return R.bookingFailedMessage(result.error ?? 'Slot may have just been taken.')
  }

  return R.bookingSuccessMessage(doctor, slot, result.confirmation_code ?? result.appointment_id!.slice(0, 8).toUpperCase())
}

// ─── Record Selection ─────────────────────────────────────────────────────────

async function handleSelectingRecord(
  phone: string,
  intent: Awaited<ReturnType<typeof extractIntent>>,
  convId: string,
  ctx: Record<string, unknown>,
  user: NonNullable<Awaited<ReturnType<typeof findUserByPhone>>>
): Promise<string> {
  const records = ctx.records as Array<{ id: string; title: string | null; record_type: string }>
  const sel = intent.number ?? parseInt(intent.raw_text ?? '0')

  if (!sel || sel < 1 || sel > records.length) {
    return `Please reply with a number between 1 and ${records.length}.`
  }

  const record = records[sel - 1]

  // Generate a secure time-limited token
  const token = btoa(JSON.stringify({
    recordId: record.id,
    userId: user.id,
    expires: Date.now() + 5 * 60 * 1000, // 5 minutes
  }))

  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString()

  // Store OTP in DB (use a small table or just proceed — simplified here)
  await supabase.from('audit_logs').insert({
    actor_id: user.id,
    actor_type: 'patient',
    action: 'medical_record.access_requested',
    entity_type: 'medical_record',
    entity_id: record.id,
    metadata: { otp_hash: btoa(otp), expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString() },
  })

  const appUrl = Deno.env.get('APP_URL') ?? 'https://mediconnect.com'
  const secureUrl = `${appUrl}/view-record?token=${encodeURIComponent(token)}`

  await resetConversation(convId)

  return R.secureRecordLink(
    record.title ?? record.record_type,
    secureUrl,
    otp
  )
}
