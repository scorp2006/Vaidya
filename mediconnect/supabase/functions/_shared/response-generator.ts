import type { DoctorSearchResult, SlotOption, RecordSummary } from './types.ts'

function formatTime(time: string): string {
  const [h, m] = time.split(':')
  const hour = parseInt(h)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const hour12 = hour % 12 || 12
  return `${hour12}:${m} ${ampm}`
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)

  if (dateStr === today.toISOString().split('T')[0]) return 'Today'
  if (dateStr === tomorrow.toISOString().split('T')[0]) return 'Tomorrow'

  return date.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })
}

// ─── Greeting ────────────────────────────────────────────────────────────────

export function greetingMessage(): string {
  return `👋 Hi! I'm your MediConnect health assistant.

I can help you:
🔍 Find doctors by specialty
📅 Book appointments
📋 View your medical records
🏥 Check queue status

Just tell me what you need! For example:
• "I need a cardiologist"
• "Book appointment with Dr. Sharma"
• "My records"
• "Help"`
}

// ─── Registration ─────────────────────────────────────────────────────────────

export function welcomeNewUser(): string {
  return `👋 Welcome to MediConnect!

I'll help you book doctor appointments across hospitals in your city.

Let's get you set up in 30 seconds.

*What's your name?*`
}

export function askForAge(name: string): string {
  return `Nice to meet you, *${name}*! 😊

How old are you? _(just the number, e.g. 28)_`
}

export function askForLanguage(): string {
  return `Almost done!

Which language do you prefer?

1️⃣ English
2️⃣ हिंदी (Hindi)
3️⃣ తెలుగు (Telugu)
4️⃣ தமிழ் (Tamil)

Reply with 1, 2, 3, or 4`
}

export function askForLocation(): string {
  return `Last step — share your location so I can find hospitals near you.

📍 *Option 1:* Use WhatsApp's location sharing button
📝 *Option 2:* Just type your area/city (e.g. "Banjara Hills, Hyderabad")`
}

export function registrationComplete(name: string): string {
  return `✅ You're all set, *${name}*!

You can now:
🔍 Say *"I need a cardiologist"* to find doctors
📅 Book appointments instantly
📋 Say *"my records"* to view medical records
🏥 Say *"queue status"* before your appointment

What would you like to do?`
}

// ─── Doctor Search ────────────────────────────────────────────────────────────

export function doctorListMessage(doctors: DoctorSearchResult[]): string {
  if (doctors.length === 0) {
    return `😕 Sorry, I couldn't find any doctors matching your request.

Try:
• A different specialty
• Broader location
• "Help" for more options`
  }

  let msg = `Found *${doctors.length} doctor${doctors.length > 1 ? 's' : ''}*:\n\n`

  doctors.forEach((doc, i) => {
    const promoted = doc.hospital?.promotion_level ? '⭐ ' : ''
    const slot = doc.next_available_slot
      ? `\n   📅 Next: ${formatDate(doc.next_available_slot.date)} at ${formatTime(doc.next_available_slot.time)}`
      : '\n   ❌ No slots available soon'

    msg += `*${i + 1}. Dr. ${doc.name}*\n`
    msg += `   ${promoted}${doc.specialization} | ⭐ ${doc.rating}\n`
    msg += `   🏥 ${doc.hospital?.name}\n`
    msg += `   💰 ₹${doc.consultation_fee}${slot}\n\n`
  })

  msg += `Reply with a number (1-${doctors.length}) to book`
  return msg
}

export function noSlotsMessage(doctorName: string): string {
  return `😕 Dr. ${doctorName} has no available slots in the next 30 days.

Would you like to:
1️⃣ See other doctors
2️⃣ Try a different date

Reply with 1 or 2`
}

// ─── Slot Selection ───────────────────────────────────────────────────────────

export function slotListMessage(doctor: DoctorSearchResult, slots: SlotOption[]): string {
  let msg = `*Dr. ${doctor.name}* — ${doctor.specialization}\n`
  msg += `🏥 ${doctor.hospital?.name}\n`
  msg += `⭐ ${doctor.rating} | 💰 ₹${doctor.consultation_fee}\n\n`
  msg += `*Available slots:*\n\n`

  slots.forEach((slot, i) => {
    msg += `${i + 1}️⃣ ${formatDate(slot.date)} at ${formatTime(slot.time)}\n`
  })

  msg += `\nReply with slot number`
  return msg
}

// ─── Booking Confirmation ─────────────────────────────────────────────────────

export function bookingConfirmPrompt(
  doctor: DoctorSearchResult,
  slot: SlotOption
): string {
  return `*Confirm your booking?*\n\n` +
    `👨‍⚕️ Dr. ${doctor.name}\n` +
    `🏥 ${doctor.hospital?.name}\n` +
    `📅 ${formatDate(slot.date)} at ${formatTime(slot.time)}\n` +
    `💰 ₹${doctor.consultation_fee}\n\n` +
    `Reply *YES* to confirm or *NO* to cancel`
}

export function bookingSuccessMessage(
  doctor: DoctorSearchResult,
  slot: SlotOption,
  confirmationCode: string
): string {
  return `✅ *Appointment Confirmed!*\n\n` +
    `📋 *Your Details:*\n` +
    `👨‍⚕️ ${doctor.name} - ${doctor.specialization}\n` +
    `🏥 ${doctor.hospital?.name}\n` +
    `📍 ${doctor.hospital?.address ?? doctor.hospital?.city ?? ''}\n` +
    `📅 ${formatDate(slot.date)} at ${formatTime(slot.time)}\n` +
    `💰 Fee: ₹${doctor.consultation_fee}\n` +
    `🔖 Code: *${confirmationCode}*\n\n` +
    `I'll remind you 1 day before and 1 hour before your appointment.\n\n` +
    `Reply *"queue status"* on the day to check your position.`
}

export function bookingFailedMessage(reason: string): string {
  return `❌ Booking failed: ${reason}\n\nPlease try again or choose a different slot.`
}

// ─── Medical Records ──────────────────────────────────────────────────────────

export function recordsListMessage(records: RecordSummary[]): string {
  if (records.length === 0) {
    return `📋 You don't have any medical records yet.\n\nYour records will appear here after your first consultation.`
  }

  let msg = `📋 *Your Medical Records:*\n\n`

  records.forEach((rec, i) => {
    const date = new Date(rec.created_at).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
    })
    msg += `${i + 1}️⃣ ${rec.title ?? rec.record_type}\n`
    msg += `   📅 ${date} — 🏥 ${rec.hospital_name}\n\n`
  })

  msg += `Reply with number to view securely 🔒`
  return msg
}

export function secureRecordLink(title: string, secureUrl: string, otp: string): string {
  return `🔒 *Secure Access*\n\n` +
    `To view your *${title}*:\n\n` +
    `👆 Tap this link:\n${secureUrl}\n\n` +
    `🔑 Your OTP: *${otp}*\n\n` +
    `⏰ Expires in 5 minutes`
}

// ─── Queue Status ─────────────────────────────────────────────────────────────

export function queueStatusMessage(queueInfo: {
  appointment_time: string
  patients_ahead?: number
  estimated_wait_minutes?: number
  in_consultation?: { patient_name: string | null } | null
  current_delay?: number
}): string {
  const delay = queueInfo.current_delay ?? 0
  const statusLine = delay > 15
    ? `⚠️ Doctor is running ~${delay} mins late`
    : `✅ Roughly on schedule`

  return `📊 *Queue Status*\n\n` +
    `Your appointment: ${formatTime(queueInfo.appointment_time)}\n\n` +
    `├─ 👥 ${queueInfo.patients_ahead ?? 0} patient${(queueInfo.patients_ahead ?? 0) !== 1 ? 's' : ''} ahead\n` +
    `├─ ⏱️ Est. wait: ${queueInfo.estimated_wait_minutes ?? 0} mins\n` +
    `└─ ${statusLine}\n\n` +
    `I'll notify you when you're next.`
}

export function noAppointmentTodayMessage(): string {
  return `📅 You don't have any appointments today.\n\nSay *"I need a doctor"* to book one!`
}

// ─── Cancellation ─────────────────────────────────────────────────────────────

export function appointmentsListForCancel(
  appointments: Array<{ id: string; appointment_date: string; appointment_time: string; doctor: { name: string } | null }>
): string {
  let msg = `📅 *Your Upcoming Appointments:*\n\n`

  appointments.forEach((appt, i) => {
    msg += `${i + 1}️⃣ ${formatDate(appt.appointment_date)} at ${formatTime(appt.appointment_time)}\n`
    msg += `   Dr. ${appt.doctor?.name ?? 'Unknown'}\n\n`
  })

  msg += `Reply with number to cancel, or *BACK* to go back`
  return msg
}

export function cancellationSuccessMessage(): string {
  return `✅ *Appointment Cancelled*\n\nYour appointment has been cancelled and the slot is now free.\n\nNeed to rebook? Just say *"I need a doctor"*`
}

export function cancellationFailedMessage(reason: string): string {
  return `❌ Could not cancel: ${reason}`
}

// ─── Help ─────────────────────────────────────────────────────────────────────

export function helpMessage(): string {
  return `❓ *How can I help?*\n\n` +
    `📚 *Quick commands:*\n` +
    `• *"I need a [specialty]"* — Find doctors\n` +
    `• *"My appointments"* — View upcoming\n` +
    `• *"Cancel appointment"* — Cancel booking\n` +
    `• *"My records"* — Medical records\n` +
    `• *"Queue status"* — Today's queue\n` +
    `• *"Update profile"* — Change your info\n\n` +
    `📞 *Human support:*\n` +
    `Email: support@mediconnect.com`
}

// ─── Generic ──────────────────────────────────────────────────────────────────

export function unclearMessage(): string {
  return `🤔 I didn't quite understand that.\n\nTry saying:\n• "I need a cardiologist"\n• "Book appointment"\n• "My records"\n• "Help"`
}

export function errorMessage(): string {
  return `😕 Something went wrong on my end. Please try again in a moment.\n\nType *"help"* if the issue persists.`
}

export function cancelFlowMessage(): string {
  return `↩️ Okay, cancelled. Back to the main menu.\n\nWhat would you like to do? Type *"help"* to see options.`
}
