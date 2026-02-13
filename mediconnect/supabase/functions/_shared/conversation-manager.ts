import { supabase } from './supabase-client.ts'
import type { ConversationState, ConversationContext } from './types.ts'

export interface Conversation {
  id: string
  user_id: string | null
  phone: string
  current_state: ConversationState
  context: ConversationContext
  last_message_at: string
}

/**
 * Gets or creates a conversation record for a phone number.
 */
export async function getOrCreateConversation(phone: string): Promise<Conversation> {
  const { data: existing } = await supabase
    .from('whatsapp_conversations')
    .select('*')
    .eq('phone', phone)
    .maybeSingle()

  if (existing) {
    return {
      ...existing,
      context: (existing.context as ConversationContext) ?? {},
      current_state: (existing.current_state as ConversationState) ?? 'idle',
    }
  }

  const { data: created, error } = await supabase
    .from('whatsapp_conversations')
    .insert({ phone, current_state: 'idle', context: {} })
    .select()
    .single()

  if (error || !created) throw new Error(`Failed to create conversation: ${error?.message}`)

  return {
    ...created,
    context: {},
    current_state: 'idle',
  }
}

/**
 * Transitions conversation to a new state with updated context.
 */
export async function updateConversation(
  conversationId: string,
  state: ConversationState,
  context: ConversationContext,
  userId?: string
): Promise<void> {
  const updateData: Record<string, unknown> = {
    current_state: state,
    context,
    last_message_at: new Date().toISOString(),
    last_message_from: 'bot',
  }

  if (userId) updateData.user_id = userId

  await supabase
    .from('whatsapp_conversations')
    .update(updateData)
    .eq('id', conversationId)
}

/**
 * Resets conversation to idle (used after booking, errors, cancel).
 */
export async function resetConversation(conversationId: string): Promise<void> {
  await supabase
    .from('whatsapp_conversations')
    .update({
      current_state: 'idle',
      context: {},
      last_message_at: new Date().toISOString(),
    })
    .eq('id', conversationId)
}

/**
 * Logs a WhatsApp message to the audit trail.
 */
export async function logMessage(
  conversationId: string,
  userId: string | null,
  direction: 'inbound' | 'outbound',
  messageText: string,
  twilioSid?: string
): Promise<void> {
  await supabase.from('whatsapp_messages').insert({
    conversation_id: conversationId,
    user_id: userId,
    direction,
    message_text: messageText,
    message_type: 'text',
    twilio_message_sid: twilioSid ?? null,
  })
}

/**
 * Checks if conversation has been idle for > 1 hour and resets if so.
 */
export async function checkAndResetStaleConversation(conversation: Conversation): Promise<Conversation> {
  const lastActivity = new Date(conversation.last_message_at)
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)

  if (
    conversation.current_state !== 'idle' &&
    lastActivity < oneHourAgo
  ) {
    await resetConversation(conversation.id)
    return { ...conversation, current_state: 'idle', context: {} }
  }

  return conversation
}
