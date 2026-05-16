export type CreditTransactionType =
  | 'earned_teaching'
  | 'spent_learning'
  | 'escrow_lock'
  | 'escrow_release'
  | 'starter_bonus'
  | 'admin_adjustment'

export interface CreditTransaction {
  id: string
  userId: string
  sessionId: string | null
  type: CreditTransactionType
  amount: number
  balanceAfter: number
  note: string | null
  createdAt: string
}

export interface CreditBalance {
  balance: number
  escrowed: number
  available: number
}
