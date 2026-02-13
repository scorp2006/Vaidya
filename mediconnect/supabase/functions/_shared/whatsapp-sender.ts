const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID')!
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN')!
const TWILIO_WHATSAPP_NUMBER = Deno.env.get('TWILIO_WHATSAPP_NUMBER')! // e.g. +14155238886

/**
 * Sends a WhatsApp message via Twilio.
 * Returns the Twilio message SID.
 */
export async function sendWhatsApp(to: string, body: string): Promise<string | null> {
  const toNumber = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`
  const fromNumber = TWILIO_WHATSAPP_NUMBER.startsWith('whatsapp:')
    ? TWILIO_WHATSAPP_NUMBER
    : `whatsapp:${TWILIO_WHATSAPP_NUMBER}`

  const credentials = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)

  try {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          From: fromNumber,
          To: toNumber,
          Body: body,
        }).toString(),
      }
    )

    if (!response.ok) {
      const err = await response.text()
      console.error('Twilio send error:', err)
      return null
    }

    const data = await response.json()
    return data.sid ?? null
  } catch (err) {
    console.error('Twilio send failed:', err)
    return null
  }
}

/**
 * Validates that an incoming webhook request is genuinely from Twilio.
 * Uses HMAC-SHA1 signature verification.
 */
export async function validateTwilioSignature(
  authToken: string,
  signature: string,
  url: string,
  params: Record<string, string>
): Promise<boolean> {
  // Build the validation string: URL + sorted params concatenated
  const sortedKeys = Object.keys(params).sort()
  let validationStr = url
  for (const key of sortedKeys) {
    validationStr += key + params[key]
  }

  // HMAC-SHA1
  const encoder = new TextEncoder()
  const keyData = encoder.encode(authToken)
  const msgData = encoder.encode(validationStr)

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  )

  const sigBuffer = await crypto.subtle.sign('HMAC', cryptoKey, msgData)
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sigBuffer)))

  return sigB64 === signature
}
