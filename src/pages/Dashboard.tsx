import { useState, useEffect } from 'react'
import { Plus, Play, Clock, Users, TrendingUp, Video, Mic, Download, Search, Filter, MoreVertical, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Link } from 'react-router-dom'
import blink from '@/blink/client'
import type { Project } from '@/types'
import { 
  loadProjectsFromStorage, 
  saveProjectsToStorage, 
  generateProjectId, 
  calculateStats,
  mockActivity
} from '@/lib/mockData'

export function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [isDemoMode, setIsDemoMode] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [stats, setStats] = useState({
    totalProjects: 0,
    totalDuration: 0,
    teamMembers: 5,
    completedThisWeek: 0
  })

  // Load dashboard data
  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true)

        // Wait for auth to be ready
        const unsubscribe = blink.auth.onAuthStateChanged(async (authState) => {
          if (authState.isLoading) return
          
          if (authState.user) {
            setUser(authState.user)
            
            try {
              // Try to load projects from database
              const projectsData = await blink.db.projects.list({
                where: { userId: authState.user.id },
                orderBy: { updatedAt: 'desc' },
                limit: 20
              })
              
              setProjects(projectsData)
              setStats(calculateStats(projectsData))
              setIsDemoMode(false)
            } catch (dbError) {
              console.log('Database not available, using enhanced demo mode:', dbError)
              // Load from localStorage with mock data fallback
              const demoProjects = loadProjectsFromStorage()
              setProjects(demoProjects)
              setStats(calculateStats(demoProjects))
              setIsDemoMode(true)
            }
          } else {
            // User not authenticated, show demo data
            const demoProjects = loadProjectsFromStorage()
            setProjects(demoProjects)
            setStats(calculateStats(demoProjects))
            setIsDemoMode(true)
          }
          
          setLoading(false)
        })

        return unsubscribe
      } catch (err) {
        console.error('Failed to load dashboard data:', err)
        // Fallback to demo data
        const demoProjects = loadProjectsFromStorage()
        setProjects(demoProjects)
        setStats(calculateStats(demoProjects))
        setIsDemoMode(true)
        setLoading(false)
      }
    }

    loadDashboardData()
  }, [])

  const createNewProject = async () => {
    const newProject: Project = {
      id: generateProjectId(),
      name: 'Untitled Demo',
      description: 'New demo recording project',
      duration: 0,
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      userId: user?.id || 'demo_user',
      settings: {
        resolution: '1080p',
        frameRate: 30,
        audioQuality: 'high',
        voiceSettings: {
          voiceId: 'default',
          speed: 1.0,
          stability: 0.5,
          clarity: 0.75,
          style: 0.0
        }
      }
    }

    try {
      if (!isDemoMode && user) {
        // Try to save to database first
        await blink.db.projects.create(newProject)
      }
    } catch (dbError) {
      console.log('Database not available, saving to local storage:', dbError)
    }

    // Update local state and storage
    const updatedProjects = [newProject, ...projects]
    setProjects(updatedProjects)
    setStats(calculateStats(updatedProjects))
    saveProjectsToStorage(updatedProjects)
  }

  const deleteProject = async (projectId: string) => {
    try {
      if (!isDemoMode && user) {
        await blink.db.projects.delete(projectId)
      }
    } catch (dbError) {
      console.log('Database not available, removing from local storage:', dbError)
    }

    // Update local state and storage
    const updatedProjects = projects.filter(p => p.id !== projectId)
    setProjects(updatedProjects)
    setStats(calculateStats(updatedProjects))
    saveProjectsToStorage(updatedProjects)
  }

  const duplicateProject = async (project: Project) => {
    const duplicatedProject: Project = {
      ...project,
      id: generateProjectId(),
      name: `${project.name} (Copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'draft'
    }

    try {
      if (!isDemoMode && user) {
        await blink.db.projects.create(duplicatedProject)
      }
    } catch (dbError) {
      console.log('Database not available, saving to local storage:', dbError)
    }

    // Update local state and storage
    const updatedProjects = [duplicatedProject, ...projects]
    setProjects(updatedProjects)
    setStats(calculateStats(updatedProjects))
    saveProjectsToStorage(updatedProjects)
  }

  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500'
      case 'processing': return 'bg-amber-500'
      case 'draft': return 'bg-slate-500'
      default: return 'bg-blue-500'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4"></div>
          <p className="text-slate-400">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="p-6 space-y-6">
        {/* Demo Mode Alert */}
        {isDemoMode && (
          <Alert className="bg-blue-500/10 border-blue-500/20 text-blue-400">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <span className="font-medium">Demo Mode:</span> You're exploring SmartDemo Studio with sample data. 
              Your changes are saved locally and will persist during this session.
            </AlertDescription>
          </Alert>
        )}

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-white">Dashboard</h1>
              {isDemoMode && (
                <Badge variant="outline" className="border-blue-500/30 text-blue-400 bg-blue-500/10">
                  Demo Mode
                </Badge>
              )}
            </div>
            <p className="text-slate-400">Welcome back! Here's what's happening with your demos.</p>
          </div>
          <div className="flex gap-3">
            <Link to="/record">
              <Button className="gap-2 bg-indigo-600 hover:bg-indigo-700">
                <Video className="w-4 h-4" />
                New Recording
              </Button>
            </Link>
            <Button onClick={createNewProject} variant="outline" className="gap-2 border-slate-700 text-slate-300 hover:bg-slate-800">
              <Plus className="w-4 h-4" />
              New Project
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-slate-900 border-slate-800 hover:bg-slate-800 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">Total Projects</CardTitle>
              <div className="p-2 bg-indigo-500/10 rounded-lg">
                <Video className="w-4 h-4 text-indigo-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stats.totalProjects}</div>
              <p className="text-xs text-slate-400">
                +2 from last week
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800 hover:bg-slate-800 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">Total Duration</CardTitle>
              <div className="p-2 bg-amber-500/10 rounded-lg">
                <Clock className="w-4 h-4 text-amber-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{formatDuration(stats.totalDuration)}</div>
              <p className="text-xs text-slate-400">
                Across all projects
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800 hover:bg-slate-800 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">Team Members</CardTitle>
              <div className="p-2 bg-green-500/10 rounded-lg">
                <Users className="w-4 h-4 text-green-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stats.teamMembers}</div>
              <p className="text-xs text-slate-400">
                Active collaborators
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800 hover:bg-slate-800 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">Completed This Week</CardTitle>
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <TrendingUp className="w-4 h-4 text-blue-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stats.completedThisWeek}</div>
              <p className="text-xs text-slate-400">
                +12% from last week
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <Input
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-slate-900 border-slate-700 text-white placeholder:text-slate-400"
            />
          </div>
          <Button variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800">
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </Button>
        </div>

        {/* Projects Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <Card key={project.id} className="bg-slate-900 border-slate-800 hover:bg-slate-800 transition-colors cursor-pointer group">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg font-semibold text-white mb-1 group-hover:text-indigo-400 transition-colors">
                      {project.name}
                    </CardTitle>
                    <p className="text-sm text-slate-400 line-clamp-2">
                      {project.description}
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white hover:bg-slate-700">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700">
                      <DropdownMenuItem className="text-slate-300 hover:bg-slate-700">
                        <Link to={`/editor/${project.id}`} className="w-full">Edit</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="text-slate-300 hover:bg-slate-700"
                        onClick={() => duplicateProject(project)}
                      >
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-slate-300 hover:bg-slate-700">
                        <Link to="/export" className="w-full">Export</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="text-red-400 hover:bg-slate-700"
                        onClick={() => deleteProject(project.id)}
                      >
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                <div className="aspect-video bg-slate-800 rounded-lg mb-4 flex items-center justify-center group-hover:bg-slate-700 transition-colors overflow-hidden">
                  {project.thumbnail ? (
                    <img 
                      src={project.thumbnail} 
                      alt={project.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Play className="w-12 h-12 text-slate-500 group-hover:text-indigo-400 transition-colors" />
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="flex items-center gap-1 bg-slate-800 text-slate-300">
                      <div className={`w-2 h-2 rounded-full ${getStatusColor(project.status)}`} />
                      {project.status}
                    </Badge>
                    <span className="text-sm text-slate-400">
                      {formatDuration(project.duration)}
                    </span>
                  </div>
                  <span className="text-xs text-slate-500">
                    {new Date(project.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Link to="/record">
                <Button variant="outline" className="w-full justify-start gap-3 h-12 border-slate-700 text-slate-300 hover:bg-slate-800 hover:border-indigo-500/50 hover:bg-indigo-500/5">
                  <div className="p-2 bg-indigo-500/10 rounded-lg">
                    <Video className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div className="text-left">
                    <div className="font-medium text-white">Start Recording</div>
                    <div className="text-xs text-slate-400">Capture your screen with AI</div>
                  </div>
                </Button>
              </Link>

              <Link to="/voice">
                <Button variant="outline" className="w-full justify-start gap-3 h-12 border-slate-700 text-slate-300 hover:bg-slate-800 hover:border-amber-500/50 hover:bg-amber-500/5">
                  <div className="p-2 bg-amber-500/10 rounded-lg">
                    <Mic className="w-5 h-5 text-amber-400" />
                  </div>
                  <div className="text-left">
                    <div className="font-medium text-white">AI Voice Lab</div>
                    <div className="text-xs text-slate-400">Generate professional voiceovers</div>
                  </div>
                </Button>
              </Link>

              <Link to="/export">
                <Button variant="outline" className="w-full justify-start gap-3 h-12 border-slate-700 text-slate-300 hover:bg-slate-800 hover:border-green-500/50 hover:bg-green-500/5">
                  <div className="p-2 bg-green-500/10 rounded-lg">
                    <Download className="w-5 h-5 text-green-400" />
                  </div>
                  <div className="text-left">
                    <div className="font-medium text-white">Export Center</div>
                    <div className="text-xs text-slate-400">Download in multiple formats</div>
                  </div>
                </Button>
              </Link>

              <div className="pt-4 border-t border-slate-800">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-slate-300">Storage Usage</span>
                  <span className="text-slate-400">2.4GB / 10GB</span>
                </div>
                <Progress value={24} className="h-2 bg-slate-800" />
              </div>
            </CardContent>
          </Card>

          {/* Activity Feed */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockActivity.map((activity, index) => (
                  <div key={index} className="flex items-center gap-4">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={activity.avatar} />
                      <AvatarFallback className="text-xs bg-slate-800 text-slate-300">
                        {activity.user === 'You' ? 'Y' : activity.user[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-sm text-slate-300">
                        <span className="font-medium text-white">{activity.user}</span> {activity.action}{' '}
                        <span className="font-medium text-white">{activity.project}</span>
                      </p>
                      <p className="text-xs text-slate-500">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default Dashboard