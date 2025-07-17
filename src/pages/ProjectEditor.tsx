import { useState, useEffect, useRef } from 'react'
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Volume2, 
  Scissors, 
  Type,
  Wand2,
  Save,
  Undo,
  Redo,
  Eye,
  ZoomIn,
  Highlighter,
  Clock,
  FileText
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Slider } from '@/components/ui/slider'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Progress } from '@/components/ui/progress'
import blink from '@/blink/client'
import type { Project, ScriptLine, UIEvent } from '@/types'

interface Scene {
  id: string
  title: string
  startTime: number
  endTime: number
  scriptText: string
  audioUrl?: string
  effects: string[]
}

// Mock data for demonstration
const mockScenes: Scene[] = [
  {
    id: 'scene_1',
    title: 'Introduction',
    startTime: 0,
    endTime: 15,
    scriptText: 'Welcome to our product demo. Today I\'ll show you how to get started with our platform and explore its key features.',
    effects: ['highlight_clicks']
  },
  {
    id: 'scene_2',
    title: 'Dashboard Overview',
    startTime: 15,
    endTime: 45,
    scriptText: 'First, let\'s navigate to the dashboard where you can see all your projects, analytics, and recent activity.',
    effects: ['zoom_in', 'highlight_clicks']
  },
  {
    id: 'scene_3',
    title: 'Creating New Project',
    startTime: 45,
    endTime: 75,
    scriptText: 'Click on the "New Project" button to create your first project. You can choose from various templates or start from scratch.',
    effects: ['blur_sensitive', 'highlight_clicks']
  },
  {
    id: 'scene_4',
    title: 'Project Settings',
    startTime: 75,
    endTime: 105,
    scriptText: 'Configure your project settings including quality, frame rate, and audio preferences for optimal recording.',
    effects: ['zoom_in']
  }
]

export function ProjectEditor() {
  const [project, setProject] = useState<Project | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(105) // Total duration based on scenes
  const [volume, setVolume] = useState([80])
  const [scenes, setScenes] = useState<Scene[]>(mockScenes)
  const [selectedScene, setSelectedScene] = useState<string | null>(null)
  const [isGeneratingVoice, setIsGeneratingVoice] = useState(false)
  const [voiceSettings, setVoiceSettings] = useState({
    voiceId: 'rachel',
    speed: 1.0,
    stability: 0.5,
    clarity: 0.75
  })
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const timelineRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Auto-play simulation
    const interval = setInterval(() => {
      if (isPlaying) {
        setCurrentTime(prev => {
          const newTime = prev + 0.1
          return newTime >= duration ? 0 : newTime
        })
      }
    }, 100)

    return () => clearInterval(interval)
  }, [isPlaying, duration])

  const togglePlayback = () => {
    setIsPlaying(!isPlaying)
  }

  const seekTo = (time: number) => {
    setCurrentTime(Math.max(0, Math.min(duration, time)))
  }

  const updateSceneScript = (sceneId: string, newText: string) => {
    setScenes(prev => prev.map(scene => 
      scene.id === sceneId ? { ...scene, scriptText: newText } : scene
    ))
  }

  const generateVoiceover = async (sceneId: string) => {
    const scene = scenes.find(s => s.id === sceneId)
    if (!scene) return

    setIsGeneratingVoice(true)
    try {
      // Generate AI voiceover using Blink SDK
      const { url: audioUrl } = await blink.ai.generateSpeech({
        text: scene.scriptText,
        voice: voiceSettings.voiceId as any,
        speed: voiceSettings.speed
      })
      
      // Update scene with audio URL
      setScenes(prev => prev.map(s => 
        s.id === sceneId ? { ...s, audioUrl } : s
      ))
      
    } catch (error) {
      console.error('Failed to generate voiceover:', error)
      // Fallback to mock data
      setScenes(prev => prev.map(s => 
        s.id === sceneId ? { ...s, audioUrl: `mock-audio-${sceneId}.mp3` } : s
      ))
    } finally {
      setIsGeneratingVoice(false)
    }
  }

  const generateAllVoiceovers = async () => {
    setIsGeneratingVoice(true)
    try {
      for (const scene of scenes) {
        if (!scene.audioUrl) {
          try {
            const { url: audioUrl } = await blink.ai.generateSpeech({
              text: scene.scriptText,
              voice: voiceSettings.voiceId as any,
              speed: voiceSettings.speed
            })
            
            setScenes(prev => prev.map(s => 
              s.id === scene.id ? { ...s, audioUrl } : s
            ))
            
            // Small delay between generations to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 500))
          } catch (error) {
            console.error(`Failed to generate voiceover for scene ${scene.id}:`, error)
            // Continue with next scene
          }
        }
      }
    } finally {
      setIsGeneratingVoice(false)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getTimelinePosition = (time: number) => {
    return (time / duration) * 100
  }

  const getCurrentScene = () => {
    return scenes.find(scene => currentTime >= scene.startTime && currentTime < scene.endTime)
  }

  const currentScene = getCurrentScene()

  return (
    <div className="h-screen flex flex-col bg-slate-950 text-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold text-white">
            {project?.name || 'Product Demo Editor'}
          </h1>
          <Badge variant="secondary" className="bg-slate-800 text-slate-300">
            {project?.status || 'editing'}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2 border-slate-700 text-slate-300 hover:bg-slate-800">
            <Undo className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" className="gap-2 border-slate-700 text-slate-300 hover:bg-slate-800">
            <Redo className="w-4 h-4" />
          </Button>
          <Button size="sm" className="gap-2 bg-indigo-600 hover:bg-indigo-700">
            <Save className="w-4 h-4" />
            Save
          </Button>
        </div>
      </div>

      <div className="flex-1 flex">
        {/* Main Editor */}
        <div className="flex-1 flex flex-col">
          {/* Video Preview */}
          <div className="flex-1 bg-black relative">
            {/* Mock video preview */}
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
              <div className="text-center">
                <div className="w-24 h-24 bg-slate-700 rounded-full flex items-center justify-center mb-4 mx-auto">
                  <Play className="w-12 h-12 text-slate-400" />
                </div>
                <p className="text-slate-400 text-lg mb-2">Demo Video Preview</p>
                {currentScene && (
                  <div className="bg-black/50 rounded-lg p-4 max-w-md">
                    <h3 className="text-white font-medium mb-2">{currentScene.title}</h3>
                    <p className="text-slate-300 text-sm">{currentScene.scriptText}</p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Playback Controls Overlay */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/80 rounded-lg p-3 flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => seekTo(Math.max(0, currentTime - 10))} className="text-white hover:bg-white/20">
                <SkipBack className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={togglePlayback} className="text-white hover:bg-white/20">
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => seekTo(Math.min(duration, currentTime + 10))} className="text-white hover:bg-white/20">
                <SkipForward className="w-4 h-4" />
              </Button>
              <span className="text-white text-sm mx-2 min-w-[80px]">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
              <Volume2 className="w-4 h-4 text-white" />
              <div className="w-20">
                <Slider
                  value={volume}
                  onValueChange={setVolume}
                  max={100}
                  step={1}
                  className="w-full"
                />
              </div>
            </div>

            {/* Visual Effects Toolbar */}
            <div className="absolute top-4 right-4 bg-black/80 rounded-lg p-2 flex flex-col gap-2">
              <Button variant="ghost" size="sm" title="Blur Tool" className="text-white hover:bg-white/20">
                <Eye className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" title="Zoom Tool" className="text-white hover:bg-white/20">
                <ZoomIn className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" title="Highlight Tool" className="text-white hover:bg-white/20">
                <Highlighter className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Timeline */}
          <div className="h-40 bg-slate-900 border-t border-slate-800 p-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-medium text-slate-300">Timeline & Scenes</h3>
              <div className="text-xs text-slate-400">
                {scenes.length} scenes • {formatTime(duration)} total
              </div>
            </div>
            
            <div className="h-24 relative bg-slate-800 rounded-lg overflow-hidden" ref={timelineRef}>
              {/* Waveform Background */}
              <div className="absolute inset-0 flex items-end px-2 gap-0.5">
                {Array.from({ length: 200 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex-1 bg-slate-600 rounded-t transition-all duration-100"
                    style={{ 
                      height: `${Math.random() * 60 + 20}%`,
                      opacity: i / 200 < currentTime / duration ? 1 : 0.3
                    }}
                  />
                ))}
              </div>

              {/* Scene Blocks */}
              {scenes.map((scene, index) => (
                <div
                  key={scene.id}
                  className={`absolute top-2 h-8 rounded cursor-pointer transition-all duration-200 border-2 ${
                    selectedScene === scene.id 
                      ? 'bg-indigo-500/30 border-indigo-400' 
                      : 'bg-slate-700/80 border-slate-600 hover:bg-slate-600/80'
                  }`}
                  style={{
                    left: `${getTimelinePosition(scene.startTime)}%`,
                    width: `${getTimelinePosition(scene.endTime - scene.startTime)}%`
                  }}
                  onClick={() => {
                    setSelectedScene(scene.id)
                    seekTo(scene.startTime)
                  }}
                >
                  <div className="flex items-center h-full px-2">
                    <span className="text-xs text-white font-medium truncate">
                      {scene.title}
                    </span>
                    {scene.audioUrl && (
                      <div className="w-1.5 h-1.5 bg-green-400 rounded-full ml-1 flex-shrink-0" />
                    )}
                  </div>
                </div>
              ))}

              {/* Playhead */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10 transition-all duration-100"
                style={{ left: `${getTimelinePosition(currentTime)}%` }}
              >
                <div className="w-3 h-3 bg-red-500 rounded-full -translate-x-1/2 -translate-y-1" />
              </div>

              {/* Time Markers */}
              <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-slate-400 px-2 pb-1">
                {Array.from({ length: 8 }).map((_, i) => (
                  <span key={i}>{formatTime((duration / 7) * i)}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <div className="w-96 border-l border-slate-800 bg-slate-900">
          <Tabs defaultValue="script" className="h-full">
            <TabsList className="grid w-full grid-cols-3 bg-slate-800">
              <TabsTrigger value="script" className="data-[state=active]:bg-slate-700">Script</TabsTrigger>
              <TabsTrigger value="voice" className="data-[state=active]:bg-slate-700">Voice</TabsTrigger>
              <TabsTrigger value="effects" className="data-[state=active]:bg-slate-700">Effects</TabsTrigger>
            </TabsList>

            {/* Script Editor */}
            <TabsContent value="script" className="flex-1 p-4 space-y-4 h-full overflow-y-auto">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-white">Scene Scripts</h3>
                <Button size="sm" variant="outline" className="gap-2 border-slate-700 text-slate-300 hover:bg-slate-800">
                  <Type className="w-4 h-4" />
                  Add Scene
                </Button>
              </div>

              <div className="space-y-3">
                {scenes.map((scene) => (
                  <Card 
                    key={scene.id} 
                    className={`cursor-pointer transition-all duration-200 bg-slate-800 border-slate-700 hover:bg-slate-750 ${
                      selectedScene === scene.id ? 'ring-2 ring-indigo-500 bg-slate-750' : ''
                    }`}
                    onClick={() => {
                      setSelectedScene(scene.id)
                      seekTo(scene.startTime)
                    }}
                  >
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-slate-400" />
                          <span className="font-medium text-white">{scene.title}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span className="text-xs text-slate-400">
                            {formatTime(scene.startTime)} - {formatTime(scene.endTime)}
                          </span>
                        </div>
                      </div>
                      
                      <Textarea
                        value={scene.scriptText}
                        onChange={(e) => updateSceneScript(scene.id, e.target.value)}
                        className="min-h-[80px] text-sm bg-slate-900 border-slate-600 text-white placeholder:text-slate-400"
                        placeholder="Enter script text for this scene..."
                      />
                      
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="gap-2 flex-1 border-slate-600 text-slate-300 hover:bg-slate-700"
                          onClick={(e) => {
                            e.stopPropagation()
                            generateVoiceover(scene.id)
                          }}
                          disabled={isGeneratingVoice}
                        >
                          <Wand2 className={`w-3 h-3 ${isGeneratingVoice ? 'animate-spin' : ''}`} />
                          {isGeneratingVoice ? 'Generating...' : 'Generate Voice'}
                        </Button>
                        {scene.audioUrl && (
                          <Button size="sm" variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700">
                            <Play className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                      
                      {scene.effects.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {scene.effects.map((effect) => (
                            <Badge key={effect} variant="secondary" className="text-xs bg-slate-700 text-slate-300">
                              {effect.replace('_', ' ')}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Voice Settings */}
            <TabsContent value="voice" className="flex-1 p-4 space-y-4 h-full overflow-y-auto">
              <h3 className="font-medium text-white">Voice Settings</h3>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">Voice</Label>
                  <Select value={voiceSettings.voiceId} onValueChange={(value) => 
                    setVoiceSettings(prev => ({ ...prev, voiceId: value }))
                  }>
                    <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      <SelectItem value="rachel">Rachel (Female, Professional)</SelectItem>
                      <SelectItem value="josh">Josh (Male, Friendly)</SelectItem>
                      <SelectItem value="bella">Bella (Female, Warm)</SelectItem>
                      <SelectItem value="antoni">Antoni (Male, Confident)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-300">Speed: {voiceSettings.speed}x</Label>
                  <Slider
                    value={[voiceSettings.speed]}
                    onValueChange={([value]) => 
                      setVoiceSettings(prev => ({ ...prev, speed: value }))
                    }
                    min={0.5}
                    max={2.0}
                    step={0.1}
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-300">Stability: {Math.round(voiceSettings.stability * 100)}%</Label>
                  <Slider
                    value={[voiceSettings.stability]}
                    onValueChange={([value]) => 
                      setVoiceSettings(prev => ({ ...prev, stability: value }))
                    }
                    min={0}
                    max={1}
                    step={0.1}
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-300">Clarity: {Math.round(voiceSettings.clarity * 100)}%</Label>
                  <Slider
                    value={[voiceSettings.clarity]}
                    onValueChange={([value]) => 
                      setVoiceSettings(prev => ({ ...prev, clarity: value }))
                    }
                    min={0}
                    max={1}
                    step={0.1}
                    className="w-full"
                  />
                </div>

                <Separator className="bg-slate-800" />

                <Button 
                  className="w-full gap-2 bg-indigo-600 hover:bg-indigo-700"
                  onClick={generateAllVoiceovers}
                  disabled={isGeneratingVoice}
                >
                  <Wand2 className={`w-4 h-4 ${isGeneratingVoice ? 'animate-spin' : ''}`} />
                  {isGeneratingVoice ? 'Generating...' : 'Generate All Voiceovers'}
                </Button>
              </div>
            </TabsContent>

            {/* Visual Effects */}
            <TabsContent value="effects" className="flex-1 p-4 space-y-4 h-full overflow-y-auto">
              <h3 className="font-medium text-white">Visual Effects</h3>
              
              <div className="space-y-4">
                <Card className="bg-slate-800 border-slate-700">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-white">Blur Effects</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm text-slate-300">Auto-blur sensitive data</Label>
                      <Switch />
                    </div>
                    <Button variant="outline" size="sm" className="w-full gap-2 border-slate-600 text-slate-300 hover:bg-slate-700">
                      <Eye className="w-4 h-4" />
                      Add Blur Region
                    </Button>
                  </CardContent>
                </Card>

                <Card className="bg-slate-800 border-slate-700">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-white">Zoom & Pan</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button variant="outline" size="sm" className="w-full gap-2 border-slate-600 text-slate-300 hover:bg-slate-700">
                      <ZoomIn className="w-4 h-4" />
                      Add Zoom Effect
                    </Button>
                    <div className="space-y-2">
                      <Label className="text-sm text-slate-300">Zoom Level</Label>
                      <Slider defaultValue={[1.5]} min={1} max={3} step={0.1} />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-slate-800 border-slate-700">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-white">Highlights</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm text-slate-300">Auto-highlight clicks</Label>
                      <Switch defaultChecked />
                    </div>
                    <Button variant="outline" size="sm" className="w-full gap-2 border-slate-600 text-slate-300 hover:bg-slate-700">
                      <Highlighter className="w-4 h-4" />
                      Add Highlight
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}

export default ProjectEditor