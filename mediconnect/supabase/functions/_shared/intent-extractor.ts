import type { ExtractedIntent } from './types.ts'

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!

/**
 * Uses Claude to extract structured intent from a user's WhatsApp message.
 * Designed to be cheap: small prompt, max_tokens 200, Haiku model.
 */
export async function extractIntent(
  userMessage: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = []
): Promise<ExtractedIntent> {
  const systemPrompt = `You are an intent extraction engine for a healthcare booking WhatsApp bot in India.
Extract structured data from the user's message.

Return ONLY valid JSON — no explanation, no markdown, no code blocks.

JSON schema:
{
  "intent": one of: "find_doctor"|"book_appointment"|"view_records"|"cancel_appointment"|"check_queue"|"check_status"|"view_appointments"|"update_profile"|"add_family"|"favorites"|"help"|"greeting"|"yes"|"no"|"number"|"cancel_flow"|"unclear",
  "specialty": string or null,
  "location": string or null,
  "date": "today"|"tomorrow"|"YYYY-MM-DD" or null,
  "hospital_preference": string or null,
  "language": "English"|"Hindi"|"Telugu"|"Tamil"|"Kannada" or null,
  "number": integer or null (if user replied with a number like "1","2","3")
}

Rules:
- "yes"/"ok"/"confirm"/"haan"/"yes please" → intent: "yes"
- "no"/"cancel"/"nahi"/"stop" → intent: "no"
- A single digit like "1","2","3" → intent: "number", number: <that digit>
- "hi"/"hello"/"helo"/"start" → intent: "greeting"
- "cancel","quit","restart","main menu" → intent: "cancel_flow"
- Specialties: cardiology, dentistry, orthopedics, dermatology, gynecology, pediatrics, ENT, ophthalmology, neurology, psychiatry, general physician, etc.`

  const messages = [
    ...conversationHistory.slice(-4), // last 4 turns for context
    { role: 'user' as const, content: userMessage },
  ]

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 200,
        system: systemPrompt,
        messages,
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      console.error('Claude API error:', err)
      return { intent: 'unclear', raw_text: userMessage }
    }

    const data = await response.json()
    const content = data.content?.[0]?.text?.trim()

    if (!content) return { intent: 'unclear', raw_text: userMessage }

    const parsed = JSON.parse(content) as ExtractedIntent
    parsed.raw_text = userMessage
    return parsed
  } catch (err) {
    console.error('Intent extraction error:', err)
    return { intent: 'unclear', raw_text: userMessage }
  }
}

/**
 * Detects the language of a message using Claude.
 */
export async function detectLanguage(message: string): Promise<string> {
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 20,
        messages: [{
          role: 'user',
          content: `Detect the language. Reply with ONLY one word: English, Hindi, Telugu, Tamil, Kannada, or Other.\n\nMessage: "${message}"`,
        }],
      }),
    })

    const data = await response.json()
    return data.content?.[0]?.text?.trim() ?? 'English'
  } catch {
    return 'English'
  }
}

/**
 * Translates a message to the target language.
 */
export async function translateMessage(message: string, targetLanguage: string): Promise<string> {
  if (targetLanguage === 'English') return message

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 600,
        messages: [{
          role: 'user',
          content: `Translate this message to ${targetLanguage}. Keep emoji, numbers, and formatting. Return ONLY the translation.\n\n"${message}"`,
        }],
      }),
    })

    const data = await response.json()
    return data.content?.[0]?.text?.trim() ?? message
  } catch {
    return message
  }
}
