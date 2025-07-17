import { useState, useEffect, useCallback } from 'react'
import { 
  Download, 
  Video, 
  Image, 
  FileText, 
  Globe, 
  Settings, 
  Play,
  CheckCircle,
  Clock,
  AlertCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import blink from '@/blink/client'
import type { Project, ExportFormat } from '@/types'

interface ExportJob {
  id: string
  projectId: string
  format: ExportFormat
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number
  downloadUrl?: string
  createdAt: string
}

export function ExportCenter() {
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState<string | null>(null)
  const [exportJobs, setExportJobs] = useState<ExportJob[]>([])
  const [exportSettings, setExportSettings] = useState({
    mp4: {
      quality: 'high' as 'low' | 'medium' | 'high',
      resolution: '1080p' as '720p' | '1080p',
      frameRate: 30,
      includeSubtitles: true,
      includeWatermark: false
    },
    gif: {
      quality: 'medium' as 'low' | 'medium' | 'high',
      duration: 30,
      frameRate: 15,
      loop: true
    },
    article: {
      includeScreenshots: true,
      includeTranscript: true,
      format: 'markdown' as 'markdown' | 'html',
      theme: 'modern' as 'modern' | 'minimal' | 'professional'
    },
    interactive: {
      includeHotspots: true,
      autoPlay: false,
      showControls: true
    }
  })

  useEffect(() => {
    loadProjects()
    loadExportJobs()
  }, [loadProjects])

  const loadProjects = useCallback(async () => {
    try {
      const user = await blink.auth.me()
      const projectsData = await blink.db.projects.list({
        where: { 
          userId: user.id,
          status: 'completed'
        },
        orderBy: { updatedAt: 'desc' }
      })
      setProjects(projectsData)
      if (projectsData.length > 0 && !selectedProject) {
        setSelectedProject(projectsData[0].id)
      }
    } catch (error) {
      console.error('Failed to load projects:', error)
    }
  }, [selectedProject])

  const loadExportJobs = async () => {
    try {
      const user = await blink.auth.me()
      const jobs = await blink.db.exportJobs.list({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        limit: 20
      })
      setExportJobs(jobs)
    } catch (error) {
      console.error('Failed to load export jobs:', error)
      // Mock data for demo
      setExportJobs([
        {
          id: '1',
          projectId: 'proj1',
          format: { type: 'mp4', quality: 'high', settings: {} },
          status: 'completed',
          progress: 100,
          downloadUrl: 'mock-download-url.mp4',
          createdAt: new Date().toISOString()
        },
        {
          id: '2',
          projectId: 'proj1',
          format: { type: 'gif', quality: 'medium', duration: 30, settings: {} },
          status: 'processing',
          progress: 65,
          createdAt: new Date().toISOString()
        }
      ])
    }
  }

  const startExport = async (format: ExportFormat) => {
    if (!selectedProject) return

    try {
      const user = await blink.auth.me()
      const job = await blink.db.exportJobs.create({
        projectId: selectedProject,
        userId: user.id,
        format,
        status: 'pending',
        progress: 0
      })

      setExportJobs(prev => [job, ...prev])

      // Simulate export progress
      simulateExportProgress(job.id)
      
    } catch (error) {
      console.error('Failed to start export:', error)
    }
  }

  const simulateExportProgress = (jobId: string) => {
    let progress = 0
    const interval = setInterval(() => {
      progress += Math.random() * 15
      if (progress >= 100) {
        progress = 100
        clearInterval(interval)
        setExportJobs(prev => prev.map(job => 
          job.id === jobId 
            ? { ...job, status: 'completed', progress: 100, downloadUrl: `mock-download-${Date.now()}.mp4` }
            : job
        ))
      } else {
        setExportJobs(prev => prev.map(job => 
          job.id === jobId 
            ? { ...job, status: 'processing', progress: Math.round(progress) }
            : job
        ))
      }
    }, 1000)
  }

  const downloadFile = (job: ExportJob) => {
    if (job.downloadUrl) {
      // In real app, this would trigger actual download
      console.log('Downloading:', job.downloadUrl)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'processing': return <Clock className="w-4 h-4 text-yellow-500" />
      case 'failed': return <AlertCircle className="w-4 h-4 text-red-500" />
      default: return <Clock className="w-4 h-4 text-gray-500" />
    }
  }

  const getFormatIcon = (type: string) => {
    switch (type) {
      case 'mp4': return <Video className="w-4 h-4" />
      case 'gif': return <Image className="w-4 h-4" />
      case 'article': return <FileText className="w-4 h-4" />
      case 'interactive': return <Globe className="w-4 h-4" />
      default: return <Download className="w-4 h-4" />
    }
  }

  const selectedProjectData = projects.find(p => p.id === selectedProject)

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Export Center</h1>
          <p className="text-muted-foreground">Export your demos in multiple formats</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Export Options */}
        <div className="lg:col-span-2 space-y-6">
          {/* Project Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Select Project</CardTitle>
            </CardHeader>
            <CardContent>
              {projects.length === 0 ? (
                <Alert>
                  <AlertCircle className="w-4 h-4" />
                  <AlertDescription>
                    No completed projects available for export. Complete a recording first.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-4">
                  <Select value={selectedProject || ''} onValueChange={setSelectedProject}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a project to export" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name} ({Math.floor(project.duration / 60)}:{(project.duration % 60).toString().padStart(2, '0')})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {selectedProjectData && (
                    <div className="flex items-center gap-4 p-3 bg-muted rounded-lg">
                      <div className="w-16 h-12 bg-background rounded flex items-center justify-center">
                        <Play className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium">{selectedProjectData.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          Duration: {Math.floor(selectedProjectData.duration / 60)}:{(selectedProjectData.duration % 60).toString().padStart(2, '0')} • 
                          Updated: {new Date(selectedProjectData.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge>{selectedProjectData.status}</Badge>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Export Formats */}
          {selectedProject && (
            <Tabs defaultValue="mp4" className="space-y-4">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="mp4" className="gap-2">
                  <Video className="w-4 h-4" />
                  MP4
                </TabsTrigger>
                <TabsTrigger value="gif" className="gap-2">
                  <Image className="w-4 h-4" />
                  GIF
                </TabsTrigger>
                <TabsTrigger value="article" className="gap-2">
                  <FileText className="w-4 h-4" />
                  Article
                </TabsTrigger>
                <TabsTrigger value="interactive" className="gap-2">
                  <Globe className="w-4 h-4" />
                  Interactive
                </TabsTrigger>
              </TabsList>

              {/* MP4 Export */}
              <TabsContent value="mp4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Video className="w-5 h-5" />
                      MP4 Video Export
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Quality</Label>
                        <Select 
                          value={exportSettings.mp4.quality} 
                          onValueChange={(value: 'low' | 'medium' | 'high') => 
                            setExportSettings(prev => ({ 
                              ...prev, 
                              mp4: { ...prev.mp4, quality: value } 
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low (Fast)</SelectItem>
                            <SelectItem value="medium">Medium (Balanced)</SelectItem>
                            <SelectItem value="high">High (Best Quality)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Resolution</Label>
                        <Select 
                          value={exportSettings.mp4.resolution} 
                          onValueChange={(value: '720p' | '1080p') => 
                            setExportSettings(prev => ({ 
                              ...prev, 
                              mp4: { ...prev.mp4, resolution: value } 
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="720p">720p HD</SelectItem>
                            <SelectItem value="1080p">1080p Full HD</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>Include Subtitles</Label>
                        <Switch 
                          checked={exportSettings.mp4.includeSubtitles}
                          onCheckedChange={(checked) => 
                            setExportSettings(prev => ({ 
                              ...prev, 
                              mp4: { ...prev.mp4, includeSubtitles: checked } 
                            }))
                          }
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <Label>Include Watermark</Label>
                        <Switch 
                          checked={exportSettings.mp4.includeWatermark}
                          onCheckedChange={(checked) => 
                            setExportSettings(prev => ({ 
                              ...prev, 
                              mp4: { ...prev.mp4, includeWatermark: checked } 
                            }))
                          }
                        />
                      </div>
                    </div>

                    <Button 
                      className="w-full gap-2" 
                      onClick={() => startExport({
                        type: 'mp4',
                        quality: exportSettings.mp4.quality,
                        settings: exportSettings.mp4
                      })}
                    >
                      <Download className="w-4 h-4" />
                      Export MP4
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* GIF Export */}
              <TabsContent value="gif">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Image className="w-5 h-5" />
                      GIF Animation Export
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Duration: {exportSettings.gif.duration}s</Label>
                      <Slider
                        value={[exportSettings.gif.duration]}
                        onValueChange={([value]) => 
                          setExportSettings(prev => ({ 
                            ...prev, 
                            gif: { ...prev.gif, duration: value } 
                          }))
                        }
                        min={5}
                        max={60}
                        step={5}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Frame Rate: {exportSettings.gif.frameRate} FPS</Label>
                      <Slider
                        value={[exportSettings.gif.frameRate]}
                        onValueChange={([value]) => 
                          setExportSettings(prev => ({ 
                            ...prev, 
                            gif: { ...prev.gif, frameRate: value } 
                          }))
                        }
                        min={10}
                        max={30}
                        step={5}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label>Loop Animation</Label>
                      <Switch 
                        checked={exportSettings.gif.loop}
                        onCheckedChange={(checked) => 
                          setExportSettings(prev => ({ 
                            ...prev, 
                            gif: { ...prev.gif, loop: checked } 
                          }))
                        }
                      />
                    </div>

                    <Button 
                      className="w-full gap-2" 
                      onClick={() => startExport({
                        type: 'gif',
                        quality: exportSettings.gif.quality,
                        duration: exportSettings.gif.duration,
                        settings: exportSettings.gif
                      })}
                    >
                      <Download className="w-4 h-4" />
                      Export GIF
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Article Export */}
              <TabsContent value="article">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      Article Export
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Format</Label>
                      <Select 
                        value={exportSettings.article.format} 
                        onValueChange={(value: 'markdown' | 'html') => 
                          setExportSettings(prev => ({ 
                            ...prev, 
                            article: { ...prev.article, format: value } 
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="markdown">Markdown</SelectItem>
                          <SelectItem value="html">HTML</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>Include Screenshots</Label>
                        <Switch 
                          checked={exportSettings.article.includeScreenshots}
                          onCheckedChange={(checked) => 
                            setExportSettings(prev => ({ 
                              ...prev, 
                              article: { ...prev.article, includeScreenshots: checked } 
                            }))
                          }
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <Label>Include Transcript</Label>
                        <Switch 
                          checked={exportSettings.article.includeTranscript}
                          onCheckedChange={(checked) => 
                            setExportSettings(prev => ({ 
                              ...prev, 
                              article: { ...prev.article, includeTranscript: checked } 
                            }))
                          }
                        />
                      </div>
                    </div>

                    <Button 
                      className="w-full gap-2" 
                      onClick={() => startExport({
                        type: 'article',
                        quality: 'high',
                        settings: exportSettings.article
                      })}
                    >
                      <Download className="w-4 h-4" />
                      Export Article
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Interactive Export */}
              <TabsContent value="interactive">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Globe className="w-5 h-5" />
                      Interactive Export
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>Include Hotspots</Label>
                        <Switch 
                          checked={exportSettings.interactive.includeHotspots}
                          onCheckedChange={(checked) => 
                            setExportSettings(prev => ({ 
                              ...prev, 
                              interactive: { ...prev.interactive, includeHotspots: checked } 
                            }))
                          }
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <Label>Auto Play</Label>
                        <Switch 
                          checked={exportSettings.interactive.autoPlay}
                          onCheckedChange={(checked) => 
                            setExportSettings(prev => ({ 
                              ...prev, 
                              interactive: { ...prev.interactive, autoPlay: checked } 
                            }))
                          }
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <Label>Show Controls</Label>
                        <Switch 
                          checked={exportSettings.interactive.showControls}
                          onCheckedChange={(checked) => 
                            setExportSettings(prev => ({ 
                              ...prev, 
                              interactive: { ...prev.interactive, showControls: checked } 
                            }))
                          }
                        />
                      </div>
                    </div>

                    <Button 
                      className="w-full gap-2" 
                      onClick={() => startExport({
                        type: 'interactive',
                        quality: 'high',
                        settings: exportSettings.interactive
                      })}
                    >
                      <Download className="w-4 h-4" />
                      Export Interactive
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </div>

        {/* Export Queue */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Export Queue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {exportJobs.length === 0 ? (
                  <div className="text-center py-8">
                    <Download className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No exports yet</p>
                  </div>
                ) : (
                  exportJobs.map((job) => (
                    <div key={job.id} className="space-y-2 p-3 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getFormatIcon(job.format.type)}
                          <span className="font-medium text-sm">
                            {job.format.type.toUpperCase()}
                          </span>
                        </div>
                        {getStatusIcon(job.status)}
                      </div>
                      
                      {job.status === 'processing' && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span>Processing...</span>
                            <span>{job.progress}%</span>
                          </div>
                          <Progress value={job.progress} className="h-1" />
                        </div>
                      )}
                      
                      {job.status === 'completed' && job.downloadUrl && (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="w-full gap-2"
                          onClick={() => downloadFile(job)}
                        >
                          <Download className="w-3 h-3" />
                          Download
                        </Button>
                      )}
                      
                      <p className="text-xs text-muted-foreground">
                        {new Date(job.createdAt).toLocaleString()}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Storage Info */}
          <Card>
            <CardHeader>
              <CardTitle>Storage Usage</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span>Exports</span>
                <span>1.2GB / 5GB</span>
              </div>
              <Progress value={24} />
              <p className="text-xs text-muted-foreground">
                Exported files are kept for 30 days
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}