/**
 * regenerate-slots Edge Function
 * Called daily by pg_cron to keep appointment slots rolling 30 days ahead.
 * Generates slots for all active doctors who have < 30 days of future slots.
 */

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { supabase } from '../_shared/supabase-client.ts'

serve(async (req: Request) => {
  const authHeader = req.headers.get('Authorization')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!authHeader?.includes(serviceKey ?? '')) {
    return new Response('Unauthorized', { status: 401 })
  }

  const stats = { doctors_processed: 0, slots_created: 0, errors: 0 }

  try {
    // Get all active doctors with their working schedule
    const { data: doctors } = await supabase
      .from('doctors')
      .select('id, working_days, working_hours_start, working_hours_end, slot_duration')
      .eq('is_active', true)

    if (!doctors?.length) {
      return jsonResponse({ success: true, stats })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const horizon = new Date(today)
    horizon.setDate(today.getDate() + 30)

    for (const doctor of doctors) {
      try {
        // Find the furthest slot date for this doctor
        const { data: latestSlot } = await supabase
          .from('appointment_slots')
          .select('slot_date')
          .eq('doctor_id', doctor.id)
          .gte('slot_date', today.toISOString().split('T')[0])
          .order('slot_date', { ascending: false })
          .limit(1)
          .single()

        const startFrom = latestSlot
          ? (() => {
              const d = new Date(latestSlot.slot_date)
              d.setDate(d.getDate() + 1)
              return d
            })()
          : new Date(today)

        if (startFrom >= horizon) {
          // Doctor already has slots beyond the 30-day horizon
          stats.doctors_processed++
          continue
        }

        const workingDays: number[] = doctor.working_days ?? [1, 2, 3, 4, 5]
        const startTime: string = doctor.working_hours_start ?? '09:00'
        const endTime: string = doctor.working_hours_end ?? '17:00'
        const duration: number = doctor.slot_duration ?? 30

        const slotsToInsert: { doctor_id: string; slot_date: string; slot_time: string; is_available: boolean }[] = []

        const cursor = new Date(startFrom)
        while (cursor < horizon) {
          const dayOfWeek = cursor.getDay()
          if (workingDays.includes(dayOfWeek)) {
            const dateStr = cursor.toISOString().split('T')[0]
            const slots = generateTimeSlots(startTime, endTime, duration)
            for (const time of slots) {
              slotsToInsert.push({
                doctor_id: doctor.id,
                slot_date: dateStr,
                slot_time: time,
                is_available: true,
              })
            }
          }
          cursor.setDate(cursor.getDate() + 1)
        }

        if (slotsToInsert.length > 0) {
          // Insert in batches of 200
          for (let i = 0; i < slotsToInsert.length; i += 200) {
            const batch = slotsToInsert.slice(i, i + 200)
            const { error } = await supabase
              .from('appointment_slots')
              .insert(batch)
              .throwOnError()
            if (!error) stats.slots_created += batch.length
          }
        }

        stats.doctors_processed++
      } catch (err) {
        console.error(`Error processing doctor ${doctor.id}:`, err)
        stats.errors++
      }
    }

    console.log('Slot regeneration complete:', stats)
    return jsonResponse({ success: true, stats })
  } catch (err) {
    console.error('regenerate-slots error:', err)
    return jsonResponse({ success: false, error: String(err) }, 500)
  }
})

function generateTimeSlots(start: string, end: string, durationMinutes: number): string[] {
  const slots: string[] = []
  const [startH, startM] = start.split(':').map(Number)
  const [endH, endM] = end.split(':').map(Number)
  let current = startH * 60 + startM
  const endTotal = endH * 60 + endM

  while (current + durationMinutes <= endTotal) {
    const h = Math.floor(current / 60).toString().padStart(2, '0')
    const m = (current % 60).toString().padStart(2, '0')
    slots.push(`${h}:${m}`)
    current += durationMinutes
  }
  return slots
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
