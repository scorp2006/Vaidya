/**
 * send-reminders Edge Function
 * Called by Supabase cron every hour.
 *
 * Schedule in Supabase SQL Editor:
 *   select cron.schedule(
 *     'send-appointment-reminders',
 *     '0 * * * *',
 *     $$
 *       select net.http_post(
 *         url := 'https://qpwtgdephdjdodknjsqv.supabase.co/functions/v1/send-reminders',
 *         headers := '{"Authorization": "Bearer <SERVICE_ROLE_KEY>"}'::jsonb
 *       )
 *     $$
 *   );
 */

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { supabase } from '../_shared/supabase-client.ts'
import { sendWhatsApp } from '../_shared/whatsapp-sender.ts'

serve(async (req: Request) => {
  // Verify the request is from Supabase scheduler (via service role)
  const authHeader = req.headers.get('Authorization')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!authHeader?.includes(serviceKey ?? '')) {
    return new Response('Unauthorized', { status: 401 })
  }

  const now = new Date()
  const results = { sent_24h: 0, sent_1h: 0, errors: 0 }

  try {
    // ── 24-hour reminders ──
    const tomorrow = new Date(now)
    tomorrow.setDate(now.getDate() + 1)
    const tomorrowStr = tomorrow.toISOString().split('T')[0]

    const { data: upcoming24h } = await supabase
      .from('appointments')
      .select(`
        id, appointment_date, appointment_time, patient_phone, patient_name,
        doctor:doctors (name, specialization),
        hospital:hospitals (name)
      `)
      .eq('appointment_date', tomorrowStr)
      .eq('status', 'confirmed')
      .eq('reminder_sent_24h', false)

    for (const appt of upcoming24h ?? []) {
      const d = appt as {
        id: string
        appointment_time: string
        patient_phone: string | null
        patient_name: string | null
        doctor: { name: string } | null
        hospital: { name: string } | null
      }

      if (!d.patient_phone) continue

      const msg = `⏰ *Reminder* — You have an appointment *tomorrow* at *${d.appointment_time}*\n\n` +
        `👨‍⚕️ Dr. ${d.doctor?.name ?? 'Doctor'}\n` +
        `🏥 ${d.hospital?.name ?? 'Hospital'}\n\n` +
        `Reply *CANCEL* if you need to cancel.`

      const sid = await sendWhatsApp(d.patient_phone, msg)

      if (sid) {
        await supabase
          .from('appointments')
          .update({ reminder_sent_24h: true })
          .eq('id', d.id)
        results.sent_24h++
      } else {
        results.errors++
      }
    }

    // ── 1-hour reminders ──
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000)
    const todayStr = now.toISOString().split('T')[0]
    const oneHourTimeStr = oneHourFromNow.toTimeString().slice(0, 5) // HH:MM

    const { data: upcoming1h } = await supabase
      .from('appointments')
      .select(`
        id, appointment_date, appointment_time, patient_phone, patient_name,
        doctor:doctors (name),
        hospital:hospitals (name, address)
      `)
      .eq('appointment_date', todayStr)
      .eq('status', 'confirmed')
      .eq('reminder_sent_1h', false)
      .lte('appointment_time', oneHourTimeStr)
      .gte('appointment_time', now.toTimeString().slice(0, 5))

    for (const appt of upcoming1h ?? []) {
      const d = appt as {
        id: string
        appointment_time: string
        patient_phone: string | null
        doctor: { name: string } | null
        hospital: { name: string; address: string | null } | null
      }

      if (!d.patient_phone) continue

      const msg = `🔔 *1-hour reminder* — Your appointment is in ~1 hour!\n\n` +
        `👨‍⚕️ Dr. ${d.doctor?.name ?? 'Doctor'} at ${d.appointment_time}\n` +
        `🏥 ${d.hospital?.name ?? 'Hospital'}\n` +
        `📍 ${d.hospital?.address ?? ''}\n\n` +
        `Reply *"queue status"* to check your position in the queue.`

      const sid = await sendWhatsApp(d.patient_phone, msg)

      if (sid) {
        await supabase
          .from('appointments')
          .update({ reminder_sent_1h: true })
          .eq('id', d.id)
        results.sent_1h++
      } else {
        results.errors++
      }
    }

    console.log('Reminders sent:', results)
    return new Response(JSON.stringify({ success: true, results }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Reminder cron error:', err)
    return new Response(JSON.stringify({ success: false, error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
