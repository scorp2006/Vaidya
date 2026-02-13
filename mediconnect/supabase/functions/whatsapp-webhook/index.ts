import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { processMessage } from '../_shared/message-processor.ts'
import { validateTwilioSignature, sendWhatsApp } from '../_shared/whatsapp-sender.ts'
import { logMessage, getOrCreateConversation } from '../_shared/conversation-manager.ts'
import type { IncomingMessage } from '../_shared/types.ts'

const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN')!

serve(async (req: Request) => {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    // ── Parse form body (Twilio sends application/x-www-form-urlencoded) ──
    const body = await req.text()
    const params = Object.fromEntries(new URLSearchParams(body))

    // ── Validate Twilio signature ──
    const signature = req.headers.get('x-twilio-signature') ?? ''
    const url = req.url

    // Skip signature check in dev/test mode
    const isDev = Deno.env.get('TWILIO_DEV_MODE') === 'true'
    if (!isDev && TWILIO_AUTH_TOKEN) {
      const isValid = await validateTwilioSignature(
        TWILIO_AUTH_TOKEN,
        signature,
        url,
        params
      )
      if (!isValid) {
        console.warn('Invalid Twilio signature from:', req.headers.get('x-forwarded-for'))
        return new Response('Forbidden', { status: 403 })
      }
    }

    // ── Extract message fields ──
    const from = (params.From ?? '').replace('whatsapp:', '')
    const body_text = params.Body ?? ''
    const messageSid = params.MessageSid ?? ''
    const numMedia = parseInt(params.NumMedia ?? '0')

    // Handle location share
    const latitude = params.Latitude ? parseFloat(params.Latitude) : undefined
    const longitude = params.Longitude ? parseFloat(params.Longitude) : undefined

    if (!from) {
      return new Response('Bad Request: missing From', { status: 400 })
    }

    const incoming: IncomingMessage = {
      from,
      body: body_text.trim(),
      messageSid,
      numMedia,
      latitude,
      longitude,
    }

    // ── Process asynchronously ──
    // Respond to Twilio immediately (must be < 15 seconds)
    // Then process and send reply
    const responsePromise = (async () => {
      try {
        const reply = await processMessage(incoming)

        // Send the reply via Twilio
        const sid = await sendWhatsApp(from, reply)

        // Log outbound
        const conversation = await getOrCreateConversation(from)
        await logMessage(conversation.id, conversation.user_id, 'outbound', reply, sid ?? undefined)
      } catch (err) {
        console.error('Async processing error:', err)
        // Send fallback error message
        await sendWhatsApp(
          from,
          '😕 Something went wrong. Please try again in a moment.'
        )
      }
    })()

    // Fire-and-forget (Deno EdgeRuntime)
    // We return 200 immediately; Twilio doesn't need our reply content via HTTP
    // since we're sending it via the API
    ;(globalThis as unknown as { EdgeRuntime?: { waitUntil(p: Promise<unknown>): void } })
      .EdgeRuntime?.waitUntil(responsePromise)

    // Return TwiML empty response (prevents Twilio from sending a blank message)
    return new Response(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      {
        status: 200,
        headers: { 'Content-Type': 'text/xml' },
      }
    )
  } catch (err) {
    console.error('Webhook handler error:', err)
    return new Response('Internal Server Error', { status: 500 })
  }
})
