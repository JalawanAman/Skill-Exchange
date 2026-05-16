export interface User {
  id: string
  clerkId: string
  username: string
  email: string
  fullName: string
  avatarUrl: string | null
  bio: string | null
  location: string | null
  timezone: string | null
  languages: string[]
  creditBalance: number
  isPremium: boolean
  isActive: boolean
  lastSeenAt: string | null
  createdAt: string
  updatedAt: string
}

export interface PublicUser {
  id: string
  username: string
  fullName: string
  avatarUrl: string | null
  bio: string | null
  location: string | null
  languages: string[]
  isPremium: boolean
  averageRating: number
  sessionCount: number
  createdAt: string
}

export interface UserWithSkills extends PublicUser {
  skillOffers: SkillOffer[]
  skillWants: SkillWant[]
}

export interface SkillOffer {
  id: string
  skillId: string
  skillName: string
  proficiency: 'beginner' | 'intermediate' | 'expert'
  yearsExperience: number | null
  description: string | null
  isVerified: boolean
}

export interface SkillWant {
  id: string
  skillId: string
  skillName: string
  levelTarget: 'beginner' | 'intermediate' | 'advanced'
  notes: string | null
}
