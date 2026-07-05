'use server'

import { serverApiFetch } from '@/lib/api-server'
import type { ChatMessage } from './[conversationId]/ChatWindow'

type HistoryResponse = { messages: ChatMessage[]; hasMore: boolean; nextBefore: string | null }

/** Load a page of older messages (cursor = `before` ISO timestamp). */
export async function loadOlderMessages(conversationId: string, before: string): Promise<HistoryResponse> {
  const qs = new URLSearchParams({ before, limit: '30' })
  return serverApiFetch<HistoryResponse>(`/api/conversations/${conversationId}/messages?${qs.toString()}`)
}

/** Mark the other party's messages in this conversation as read (also emits a receipt). */
export async function markConversationRead(conversationId: string): Promise<void> {
  await serverApiFetch(`/api/conversations/${conversationId}/read`, { method: 'PATCH' })
}
