export interface User {
  id: string
  email: string
  displayName?: string
  avatar?: string
  role: 'admin' | 'editor' | 'reviewer' | 'viewer'
  createdAt: string
}

export interface Project {
  id: string
  name: string
  description?: string
  thumbnail?: string
  duration: number
  status: 'draft' | 'processing' | 'completed' | 'published'
  userId: string
  createdAt: string
  updatedAt: string
  settings: ProjectSettings
}

export interface ProjectSettings {
  resolution: '720p' | '1080p'
  frameRate: 30 | 60
  audioQuality: 'standard' | 'high'
  voiceSettings: VoiceSettings
}

export interface VoiceSettings {
  voiceId: string
  speed: number
  stability: number
  clarity: number
  style: number
}

export interface Recording {
  id: string
  projectId: string
  videoUrl: string
  audioUrl?: string
  duration: number
  events: UIEvent[]
  transcript?: string
  createdAt: string
}

export interface UIEvent {
  id: string
  type: 'click' | 'hover' | 'keypress' | 'scroll' | 'navigation'
  timestamp: number
  position: { x: number; y: number }
  element?: string
  value?: string
  metadata?: Record<string, any>
}

export interface ScriptLine {
  id: string
  text: string
  startTime: number
  endTime: number
  audioUrl?: string
  isGenerated: boolean
}

export interface ExportFormat {
  type: 'mp4' | 'gif' | 'article' | 'interactive'
  quality: 'low' | 'medium' | 'high'
  duration?: number
  settings: Record<string, any>
}

export interface Team {
  id: string
  name: string
  members: TeamMember[]
  settings: TeamSettings
}

export interface TeamMember {
  userId: string
  role: 'admin' | 'editor' | 'reviewer' | 'viewer'
  joinedAt: string
}

export interface TeamSettings {
  allowedDomains: string[]
  ssoEnabled: boolean
  defaultRole: 'editor' | 'reviewer' | 'viewer'
}