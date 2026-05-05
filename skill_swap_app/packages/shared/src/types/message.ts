export type MessageType = 'text' | 'image' | 'file' | 'system'

export interface Message {
  id: string
  conversationId: string
  senderId: string
  content: string
  messageType: MessageType
  fileUrl: string | null
  isRead: boolean
  readAt: string | null
  createdAt: string
}

export interface Conversation {
  id: string
  participantA: string
  participantB: string
  lastMessageAt: string | null
  createdAt: string
}

export interface ConversationWithDetails extends Conversation {
  otherUser: PublicUser
  lastMessage: Message | null
  unreadCount: number
}

// Socket.io event payloads
export interface MessageSendPayload {
  conversationId: string
  content: string
  messageType: MessageType
}

export interface MessageReceivePayload {
  id: string
  conversationId: string
  senderId: string
  content: string
  messageType: MessageType
  createdAt: string
}

export interface TypingPayload {
  conversationId: string
  userId: string
  isTyping: boolean
}

export interface PresencePayload {
  userId: string
  status: 'online' | 'offline'
  lastSeenAt: string | null
}
