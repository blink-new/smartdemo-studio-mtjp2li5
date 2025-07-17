import type { Project, User } from '@/types'

// Mock user data
export const mockUser: User = {
  id: 'demo_user_1',
  email: 'demo@smartdemo.studio',
  displayName: 'Demo User',
  avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=32&h=32&fit=crop&crop=face',
  role: 'admin',
  createdAt: new Date().toISOString()
}

// Enhanced mock projects with more realistic data
export const mockProjects: Project[] = [
  {
    id: 'proj_onboarding_demo',
    name: 'Product Onboarding Demo',
    description: 'Complete walkthrough of user registration and first-time setup process with interactive elements',
    thumbnail: 'https://images.unsplash.com/photo-1551650975-87deedd944c3?w=400&h=225&fit=crop',
    duration: 180,
    status: 'completed',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(), // 2 days ago
    updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(), // 2 hours ago
    userId: 'demo_user_1',
    settings: {
      resolution: '1080p',
      frameRate: 30,
      audioQuality: 'high',
      voiceSettings: {
        voiceId: 'rachel',
        speed: 1.0,
        stability: 0.5,
        clarity: 0.75,
        style: 0.0
      }
    }
  },
  {
    id: 'proj_feature_showcase',
    name: 'Dashboard Feature Showcase',
    description: 'Highlighting new dashboard features, analytics, and user interface improvements',
    thumbnail: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=225&fit=crop',
    duration: 120,
    status: 'processing',
    createdAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    updatedAt: new Date(Date.now() - 3600000 * 5).toISOString(), // 5 hours ago
    userId: 'demo_user_1',
    settings: {
      resolution: '1080p',
      frameRate: 60,
      audioQuality: 'high',
      voiceSettings: {
        voiceId: 'adam',
        speed: 1.1,
        stability: 0.6,
        clarity: 0.8,
        style: 0.2
      }
    }
  },
  {
    id: 'proj_api_tutorial',
    name: 'API Integration Tutorial',
    description: 'Step-by-step guide for developers on integrating with our REST API and webhooks',
    thumbnail: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=400&h=225&fit=crop',
    duration: 0,
    status: 'draft',
    createdAt: new Date(Date.now() - 3600000 * 6).toISOString(), // 6 hours ago
    updatedAt: new Date(Date.now() - 3600000 * 1).toISOString(), // 1 hour ago
    userId: 'demo_user_1',
    settings: {
      resolution: '1080p',
      frameRate: 30,
      audioQuality: 'standard',
      voiceSettings: {
        voiceId: 'bella',
        speed: 0.9,
        stability: 0.4,
        clarity: 0.7,
        style: 0.1
      }
    }
  },
  {
    id: 'proj_mobile_walkthrough',
    name: 'Mobile App Walkthrough',
    description: 'Comprehensive tour of mobile application features and user experience',
    thumbnail: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=400&h=225&fit=crop',
    duration: 240,
    status: 'completed',
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(), // 3 days ago
    updatedAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    userId: 'demo_user_1',
    settings: {
      resolution: '720p',
      frameRate: 30,
      audioQuality: 'high',
      voiceSettings: {
        voiceId: 'josh',
        speed: 1.0,
        stability: 0.5,
        clarity: 0.75,
        style: 0.0
      }
    }
  },
  {
    id: 'proj_security_features',
    name: 'Security Features Demo',
    description: 'Demonstration of enterprise security features including SSO, 2FA, and audit logs',
    thumbnail: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=400&h=225&fit=crop',
    duration: 195,
    status: 'completed',
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(), // 5 days ago
    updatedAt: new Date(Date.now() - 86400000 * 3).toISOString(), // 3 days ago
    userId: 'demo_user_1',
    settings: {
      resolution: '1080p',
      frameRate: 30,
      audioQuality: 'high',
      voiceSettings: {
        voiceId: 'antoni',
        speed: 0.95,
        stability: 0.6,
        clarity: 0.8,
        style: 0.1
      }
    }
  },
  {
    id: 'proj_collaboration_demo',
    name: 'Team Collaboration Demo',
    description: 'Showcasing real-time collaboration features, comments, and approval workflows',
    thumbnail: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=400&h=225&fit=crop',
    duration: 165,
    status: 'processing',
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString(), // 12 hours ago
    updatedAt: new Date(Date.now() - 3600000 * 3).toISOString(), // 3 hours ago
    userId: 'demo_user_1',
    settings: {
      resolution: '1080p',
      frameRate: 30,
      audioQuality: 'high',
      voiceSettings: {
        voiceId: 'domi',
        speed: 1.05,
        stability: 0.5,
        clarity: 0.75,
        style: 0.2
      }
    }
  }
]

// Mock activity data
export const mockActivity = [
  { 
    action: 'completed', 
    project: 'Product Onboarding Demo', 
    time: '2 hours ago', 
    user: 'You',
    avatar: mockUser.avatar
  },
  { 
    action: 'started', 
    project: 'Team Collaboration Demo', 
    time: '3 hours ago', 
    user: 'Sarah Chen',
    avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=32&h=32&fit=crop&crop=face'
  },
  { 
    action: 'exported', 
    project: 'Security Features Demo', 
    time: '1 day ago', 
    user: 'Mike Johnson',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=32&h=32&fit=crop&crop=face'
  },
  { 
    action: 'commented', 
    project: 'API Integration Tutorial', 
    time: '2 days ago', 
    user: 'Alex Kim',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=32&h=32&fit=crop&crop=face'
  },
  { 
    action: 'shared', 
    project: 'Mobile App Walkthrough', 
    time: '3 days ago', 
    user: 'Emma Davis',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=32&h=32&fit=crop&crop=face'
  }
]

// Local storage helpers for demo persistence
export const STORAGE_KEYS = {
  PROJECTS: 'smartdemo_projects',
  USER_PREFERENCES: 'smartdemo_user_prefs'
}

export function loadProjectsFromStorage(): Project[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.PROJECTS)
    if (stored) {
      const projects = JSON.parse(stored)
      // Merge with mock projects, prioritizing stored ones
      const storedIds = projects.map((p: Project) => p.id)
      const mockProjectsFiltered = mockProjects.filter(p => !storedIds.includes(p.id))
      return [...projects, ...mockProjectsFiltered]
    }
  } catch (error) {
    console.warn('Failed to load projects from storage:', error)
  }
  return mockProjects
}

export function saveProjectsToStorage(projects: Project[]): void {
  try {
    // Only save user-created projects (not the original mock ones)
    const userProjects = projects.filter(p => 
      !mockProjects.some(mock => mock.id === p.id) || 
      p.updatedAt !== mockProjects.find(mock => mock.id === p.id)?.updatedAt
    )
    localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(userProjects))
  } catch (error) {
    console.warn('Failed to save projects to storage:', error)
  }
}

export function generateProjectId(): string {
  return `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

export function calculateStats(projects: Project[]) {
  const now = Date.now()
  const weekAgo = now - (7 * 24 * 60 * 60 * 1000)
  
  return {
    totalProjects: projects.length,
    totalDuration: projects.reduce((acc, p) => acc + p.duration, 0),
    teamMembers: 5, // Static for demo
    completedThisWeek: projects.filter(p => 
      p.status === 'completed' && 
      new Date(p.updatedAt).getTime() > weekAgo
    ).length
  }
}