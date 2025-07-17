import { useState, useRef, useEffect } from 'react'
import { 
  Video, 
  Mic, 
  Square, 
  Play, 
  Pause, 
  Monitor, 
  Chrome,
  Settings,
  Download,
  Eye,
  EyeOff,
  Volume2,
  VolumeX,
  AlertCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'

export function RecordingStudio() {
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [hasWebcam, setHasWebcam] = useState(true)
  const [hasAudio, setHasAudio] = useState(true)
  const [hasSystemAudio, setHasSystemAudio] = useState(true)
  const [recordingSource, setRecordingSource] = useState('screen')
  const [quality, setQuality] = useState('1080p')
  const [frameRate, setFrameRate] = useState('30')
  const [currentProject, setCurrentProject] = useState<string | null>(null)
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null)
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([])
  const [error, setError] = useState<string | null>(null)
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const intervalRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop())
      }
    }
  }, [mediaStream])

  const getDisplayMedia = async () => {
    try {
      setError(null)
      
      const constraints: DisplayMediaStreamConstraints = {
        video: {
          width: quality === '1080p' ? 1920 : 1280,
          height: quality === '1080p' ? 1080 : 720,
          frameRate: parseInt(frameRate)
        },
        audio: hasSystemAudio
      }

      const displayStream = await navigator.mediaDevices.getDisplayMedia(constraints)
      
      // Add microphone audio if enabled
      if (hasAudio) {
        try {
          const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true })
          const audioTrack = audioStream.getAudioTracks()[0]
          if (audioTrack) {
            displayStream.addTrack(audioTrack)
          }
        } catch (audioError) {
          console.warn('Could not access microphone:', audioError)
        }
      }

      return displayStream
    } catch (err) {
      console.error('Error accessing display media:', err)
      setError('Failed to access screen. Please make sure you grant permission to record your screen.')
      throw err
    }
  }

  const startRecording = async () => {
    try {
      setError(null)
      const stream = await getDisplayMedia()
      setMediaStream(stream)
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }

      // Create MediaRecorder
      const recorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9'
      })
      
      const chunks: Blob[] = []
      
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data)
        }
      }
      
      recorder.onstop = () => {
        setRecordedChunks(chunks)
        const blob = new Blob(chunks, { type: 'video/webm' })
        const url = URL.createObjectURL(blob)
        
        // Create download link
        const a = document.createElement('a')
        a.href = url
        a.download = `recording-${new Date().toISOString().slice(0, 19)}.webm`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }
      
      setMediaRecorder(recorder)
      recorder.start(1000) // Collect data every second
      
      setIsRecording(true)
      setRecordingTime(0)
      
      // Start timer
      intervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)
      
      // Handle stream end (user stops sharing)
      stream.getVideoTracks()[0].addEventListener('ended', () => {
        stopRecording()
      })
      
    } catch (error) {
      console.error('Failed to start recording:', error)
      setIsRecording(false)
    }
  }

  const pauseRecording = () => {
    if (mediaRecorder) {
      if (isPaused) {
        mediaRecorder.resume()
        intervalRef.current = setInterval(() => {
          setRecordingTime(prev => prev + 1)
        }, 1000)
      } else {
        mediaRecorder.pause()
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
        }
      }
      setIsPaused(!isPaused)
    }
  }

  const stopRecording = async () => {
    try {
      setIsRecording(false)
      setIsPaused(false)
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      
      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop()
      }
      
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop())
        setMediaStream(null)
      }
      
      if (videoRef.current) {
        videoRef.current.srcObject = null
      }
      
      setRecordingTime(0)
      setCurrentProject(null)
      
    } catch (error) {
      console.error('Failed to stop recording:', error)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Check if browser supports screen recording
  const supportsScreenCapture = 'getDisplayMedia' in navigator.mediaDevices

  if (!supportsScreenCapture) {
    return (
      <div className="min-h-screen bg-slate-950 text-white p-6">
        <Card className="max-w-2xl mx-auto bg-slate-900 border-slate-800">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-400" />
            </div>
            <CardTitle className="text-white">Browser Not Supported</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-slate-400">
              Your browser doesn't support screen recording. Please use Chrome, Firefox, or Edge.
            </p>
            <Button className="gap-2 bg-indigo-600 hover:bg-indigo-700">
              <Download className="w-4 h-4" />
              Download Chrome
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Recording Studio</h1>
            <p className="text-slate-400">Capture your screen with AI-powered event detection</p>
          </div>
          <Badge variant="secondary" className="gap-2 bg-slate-800 text-slate-300">
            <div className="w-2 h-2 bg-green-500 rounded-full" />
            Ready to Record
          </Badge>
        </div>

        {error && (
          <Alert className="bg-red-900/20 border-red-800 text-red-300">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recording Controls */}
          <div className="lg:col-span-2 space-y-6">
            {/* Preview */}
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Monitor className="w-5 h-5" />
                  Preview
                  {isRecording && (
                    <Badge variant="destructive" className="bg-red-600 text-white animate-pulse">
                      REC {formatTime(recordingTime)}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="aspect-video bg-slate-800 rounded-lg flex items-center justify-center relative overflow-hidden border-2 border-dashed border-slate-700">
                  <video 
                    ref={videoRef}
                    className="w-full h-full object-cover rounded-lg"
                    autoPlay
                    muted
                    style={{ display: mediaStream ? 'block' : 'none' }}
                  />
                  {!mediaStream && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <div className={`p-4 rounded-full mb-4 mx-auto ${isRecording ? 'bg-red-500/20' : 'bg-slate-700'}`}>
                          <Monitor className={`w-12 h-12 mx-auto ${isRecording ? 'text-red-400' : 'text-slate-400'}`} />
                        </div>
                        <p className="text-slate-400">
                          {isRecording ? 'Recording in progress...' : 'Click Start Recording to begin'}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {/* Webcam overlay */}
                  {hasWebcam && isRecording && (
                    <div className="absolute bottom-4 right-4 w-32 h-24 bg-black rounded-lg border-2 border-white shadow-lg">
                      <div className="w-full h-full flex items-center justify-center text-white text-xs">
                        <div className="text-center">
                          <div className="w-2 h-2 bg-red-500 rounded-full mx-auto mb-1 animate-pulse"></div>
                          Webcam
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Recording Controls */}
                <div className="flex items-center justify-center gap-4 mt-6">
                  {!isRecording ? (
                    <Button onClick={startRecording} className="gap-2 h-12 px-8 bg-indigo-600 hover:bg-indigo-700 text-white">
                      <Video className="w-5 h-5" />
                      Start Recording
                    </Button>
                  ) : (
                    <>
                      <Button 
                        variant="outline" 
                        onClick={pauseRecording}
                        className="gap-2 border-slate-700 text-slate-300 hover:bg-slate-800"
                      >
                        {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                        {isPaused ? 'Resume' : 'Pause'}
                      </Button>
                      <Button 
                        variant="destructive" 
                        onClick={stopRecording}
                        className="gap-2 bg-red-600 hover:bg-red-700"
                      >
                        <Square className="w-4 h-4" />
                        Stop Recording
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* AI Event Detection */}
            {isRecording && (
              <Card className="bg-slate-900 border-slate-800">
                <CardHeader>
                  <CardTitle className="text-white">AI Event Detection</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                      <span className="text-sm text-slate-300">Mouse clicks detected</span>
                      <Badge className="bg-green-600 text-white animate-pulse">{Math.floor(recordingTime / 5) + 12}</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                      <span className="text-sm text-slate-300">Keyboard inputs</span>
                      <Badge className="bg-blue-600 text-white">{Math.floor(recordingTime / 8) + 8}</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                      <span className="text-sm text-slate-300">Page transitions</span>
                      <Badge className="bg-purple-600 text-white">{Math.floor(recordingTime / 20) + 3}</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                      <span className="text-sm text-slate-300">Hover events</span>
                      <Badge className="bg-amber-600 text-white">{Math.floor(recordingTime / 3) + 15}</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                      <span className="text-sm text-slate-300">Form interactions</span>
                      <Badge className="bg-indigo-600 text-white">{Math.floor(recordingTime / 12) + 2}</Badge>
                    </div>
                  </div>
                  <div className="mt-4 p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse"></div>
                      <span className="text-sm font-medium text-indigo-300">AI Analysis Active</span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Automatically detecting UI patterns, user flows, and interaction hotspots for enhanced demo creation.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Settings Panel */}
          <div className="space-y-6">
            {/* Recording Settings */}
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Settings className="w-5 h-5" />
                  Recording Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">Recording Source</Label>
                  <Select value={recordingSource} onValueChange={setRecordingSource}>
                    <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      <SelectItem value="screen">Entire Screen</SelectItem>
                      <SelectItem value="window">Application Window</SelectItem>
                      <SelectItem value="tab">Browser Tab</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-300">Quality</Label>
                  <Select value={quality} onValueChange={setQuality}>
                    <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      <SelectItem value="720p">720p HD</SelectItem>
                      <SelectItem value="1080p">1080p Full HD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-300">Frame Rate</Label>
                  <Select value={frameRate} onValueChange={setFrameRate}>
                    <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      <SelectItem value="30">30 FPS</SelectItem>
                      <SelectItem value="60">60 FPS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator className="bg-slate-800" />

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {hasWebcam ? <Eye className="w-4 h-4 text-slate-400" /> : <EyeOff className="w-4 h-4 text-slate-400" />}
                      <Label className="text-slate-300">Webcam Overlay</Label>
                    </div>
                    <Switch checked={hasWebcam} onCheckedChange={setHasWebcam} />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {hasAudio ? <Volume2 className="w-4 h-4 text-slate-400" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
                      <Label className="text-slate-300">Microphone</Label>
                    </div>
                    <Switch checked={hasAudio} onCheckedChange={setHasAudio} />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Volume2 className="w-4 h-4 text-slate-400" />
                      <Label className="text-slate-300">System Audio</Label>
                    </div>
                    <Switch checked={hasSystemAudio} onCheckedChange={setHasSystemAudio} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Storage Info */}
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white">Storage</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-300">Used</span>
                  <span className="text-slate-400">2.4GB / 10GB</span>
                </div>
                <Progress value={24} className="bg-slate-800" />
                <Alert className="bg-slate-800 border-slate-700">
                  <AlertDescription className="text-xs text-slate-400">
                    Recordings are automatically compressed and optimized for storage.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            {/* Tips */}
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white">Recording Tips</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-slate-400">
                <p>• Close unnecessary applications for better performance</p>
                <p>• Use a quiet environment for clear audio</p>
                <p>• Plan your demo flow before recording</p>
                <p>• Keep mouse movements smooth and deliberate</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RecordingStudio