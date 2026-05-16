export type SessionStatus =
  | 'pending'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'disputed'

export type SessionFormat = 'video' | 'in-person' | 'async'

export type SessionDuration = 30 | 60 | 90 | 120

export interface Session {
  id: string
  teacherId: string
  learnerId: string
  skillId: string
  skillName: string
  conversationId: string | null
  scheduledAt: string
  durationMinutes: SessionDuration
  format: SessionFormat
  meetingLink: string | null
  creditsAmount: number
  status: SessionStatus
  teacherConfirmed: boolean
  learnerConfirmed: boolean
  cancelledBy: string | null
  cancelReason: string | null
  createdAt: string
  updatedAt: string
}
