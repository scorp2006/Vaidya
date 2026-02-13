import type { ExtractedIntent } from './types.ts'

const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY')!
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'

// Fast model for intent extraction (structured JSON, low latency)
const INTENT_MODEL = 'llama-3.1-8b-instant'
// Better model for multilingual translation
const TRANSLATE_MODEL = 'llama-3.3-70b-versatile'

function groqHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${GROQ_API_KEY}`,
  }
}

/**
 * Uses Groq (Llama 3.1 8B) to extract structured intent from a WhatsApp message.
 * Returns a structured JSON object describing the user's intent.
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
    { role: 'system' as const, content: systemPrompt },
    ...conversationHistory.slice(-4),
    { role: 'user' as const, content: userMessage },
  ]

  try {
    const response = await fetch(GROQ_URL, {
      method: 'POST',
      headers: groqHeaders(),
      body: JSON.stringify({
        model: INTENT_MODEL,
        messages,
        max_tokens: 200,
        temperature: 0.1,  // low temp for consistent structured output
        response_format: { type: 'json_object' },
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      console.error('Groq API error:', err)
      return { intent: 'unclear', raw_text: userMessage }
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content?.trim()

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
 * Detects the language of a message.
 */
export async function detectLanguage(message: string): Promise<string> {
  try {
    const response = await fetch(GROQ_URL, {
      method: 'POST',
      headers: groqHeaders(),
      body: JSON.stringify({
        model: INTENT_MODEL,
        messages: [
          {
            role: 'user',
            content: `Detect the language. Reply with ONLY one word: English, Hindi, Telugu, Tamil, Kannada, or Other.\n\nMessage: "${message}"`,
          },
        ],
        max_tokens: 10,
        temperature: 0.0,
      }),
    })

    const data = await response.json()
    return data.choices?.[0]?.message?.content?.trim() ?? 'English'
  } catch {
    return 'English'
  }
}

/**
 * Translates a message to the target language using Llama 70B for quality.
 */
export async function translateMessage(message: string, targetLanguage: string): Promise<string> {
  if (targetLanguage === 'English') return message

  try {
    const response = await fetch(GROQ_URL, {
      method: 'POST',
      headers: groqHeaders(),
      body: JSON.stringify({
        model: TRANSLATE_MODEL,
        messages: [
          {
            role: 'user',
            content: `Translate this message to ${targetLanguage}. Keep emoji, numbers, WhatsApp formatting (*bold*, _italic_). Return ONLY the translation.\n\n"${message}"`,
          },
        ],
        max_tokens: 600,
        temperature: 0.3,
      }),
    })

    const data = await response.json()
    return data.choices?.[0]?.message?.content?.trim() ?? message
  } catch {
    return message
  }
}
