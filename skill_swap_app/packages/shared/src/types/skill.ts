export interface Skill {
  id: string
  name: string
  category: string
  slug: string
  iconName: string | null
  isActive: boolean
}

export type SkillCategory =
  | 'Tech'
  | 'Language'
  | 'Creative'
  | 'Business'
  | 'Fitness'
  | 'Other'

export interface Match {
  id: string
  user: PublicUser
  compatibilityScore: number
  matchedSkills: MatchedSkill[]
  status: 'pending' | 'connected' | 'dismissed'
  createdAt: string
}

export interface MatchedSkill {
  offeredByMatch?: string
  wantedByMe?: string
  offeredByMe?: string
  wantedByMatch?: string
}
