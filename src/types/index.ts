export type TargetType = 'count' | 'progress'
export type FrequencyType = 'daily' | 'weekly' | 'custom'
export type InstanceStatus = 'pending' | 'in_progress' | 'completed' | 'archived'
export type NotificationType = 'reminder' | 'habit_tip' | 'achievement' | 'weekly_summary'

export interface User {
  id: string
  email: string
  nickname: string | null
  weekStartDay: number
  createdAt: Date
  updatedAt: Date
}

export interface Category {
  id: string
  userId: string
  name: string
  icon: string
  color: string
  targetType: TargetType
  createdAt: Date
  updatedAt: Date
}

export interface RecurringPlan {
  id: string
  userId: string
  categoryId: string
  name: string
  targetCount: number
  frequencyType: FrequencyType
  frequencyDays: number[] | null
  startDate: Date
  endDate: Date | null
  reminderEnabled: boolean
  reminderMinutes: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  category?: Category
}

export interface WeeklyInstance {
  id: string
  planId: string
  userId: string
  weekStart: Date
  weekEnd: Date
  targetCount: number
  currentCount: number
  currentProgress: number
  status: InstanceStatus
  completedAt: Date | null
  createdAt: Date
  updatedAt: Date
  plan?: RecurringPlan
  logs?: Log[]
}

export interface Log {
  id: string
  instanceId: string
  userId: string
  countValue: number
  progress: number | null
  note: string | null
  completedAt: Date
  createdAt: Date
}

export interface UserHabit {
  id: string
  userId: string
  categoryId: string
  bestDays: number[] | null
  bestTimeStart: string | null
  bestTimeEnd: string | null
  confidence: number
  dataPoints: number
  createdAt: Date
  updatedAt: Date
}

export interface Notification {
  id: string
  userId: string
  type: NotificationType
  title: string
  message: string
  isRead: boolean
  createdAt: Date
}

// API Response types
export interface ApiResponse<T> {
  data?: T
  error?: {
    message: string
    code: string
  }
}
