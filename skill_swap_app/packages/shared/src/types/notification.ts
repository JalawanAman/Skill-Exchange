export type NotificationType =
  | 'new_match'
  | 'connection_request'
  | 'connection_accepted'
  | 'new_message'
  | 'session_request'
  | 'session_confirmed'
  | 'session_reminder'
  | 'session_completed'
  | 'new_review'
  | 'credit_earned'
  | 'credit_spent'

export interface Notification {
  id: string
  userId: string
  type: NotificationType
  title: string
  body: string | null
  data: Record<string, unknown>
  isRead: boolean
  readAt: string | null
  createdAt: string
}
