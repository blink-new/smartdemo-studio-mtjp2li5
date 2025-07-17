import { useState, useEffect, useCallback } from 'react'
import { 
  Settings as SettingsIcon, 
  User, 
  Bell, 
  Shield, 
  Palette,
  Monitor,
  Save,
  Upload,
  Trash2,
  Key,
  Globe,
  Download
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Textarea } from '@/components/ui/textarea'
import { Slider } from '@/components/ui/slider'
import blink from '@/blink/client'

interface UserSettings {
  profile: {
    displayName: string
    email: string
    avatar?: string
    bio?: string
    timezone: string
    language: string
  }
  preferences: {
    theme: 'light' | 'dark' | 'system'
    autoSave: boolean
    defaultQuality: '720p' | '1080p'
    defaultFrameRate: 30 | 60
    notifications: {
      email: boolean
      push: boolean
      desktop: boolean
    }
  }
  privacy: {
    profileVisibility: 'public' | 'team' | 'private'
    allowAnalytics: boolean
    shareUsageData: boolean
  }
  integrations: {
    elevenLabs: {
      enabled: boolean
      apiKey?: string
    }
    openai: {
      enabled: boolean
      apiKey?: string
    }
  }
}

export function Settings() {
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const unsubscribe = blink.auth.onAuthStateChanged(async (state) => {
      if (state.user) {
        setUser(state.user)
        await loadSettings()
      }
      setLoading(state.isLoading)
    })
    return unsubscribe
  }, [loadSettings])

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true)
      
      // Try to load real settings
      // const userSettings = await blink.db.userSettings.get(user?.id)
      
      // Mock settings for demo
      const mockSettings: UserSettings = {
        profile: {
          displayName: user?.displayName || 'John Doe',
          email: user?.email || 'john@company.com',
          avatar: user?.avatar,
          bio: 'Product demo specialist focused on creating engaging walkthroughs.',
          timezone: 'America/New_York',
          language: 'en'
        },
        preferences: {
          theme: 'dark',
          autoSave: true,
          defaultQuality: '1080p',
          defaultFrameRate: 30,
          notifications: {
            email: true,
            push: true,
            desktop: false
          }
        },
        privacy: {
          profileVisibility: 'team',
          allowAnalytics: true,
          shareUsageData: false
        },
        integrations: {
          elevenLabs: {
            enabled: false
          },
          openai: {
            enabled: false
          }
        }
      }
      
      setSettings(mockSettings)
    } catch (error) {
      console.error('Failed to load settings:', error)
      // Use default settings as fallback
      setSettings({
        profile: {
          displayName: 'User',
          email: 'user@example.com',
          timezone: 'UTC',
          language: 'en'
        },
        preferences: {
          theme: 'dark',
          autoSave: true,
          defaultQuality: '1080p',
          defaultFrameRate: 30,
          notifications: {
            email: true,
            push: false,
            desktop: false
          }
        },
        privacy: {
          profileVisibility: 'private',
          allowAnalytics: false,
          shareUsageData: false
        },
        integrations: {
          elevenLabs: { enabled: false },
          openai: { enabled: false }
        }
      })
    } finally {
      setLoading(false)
    }
  }, [user?.displayName, user?.email, user?.avatar])

  const saveSettings = async () => {
    if (!settings) return

    try {
      setSaving(true)
      
      // In real app, this would save to database
      // await blink.db.userSettings.upsert(user.id, settings)
      
      console.log('Settings saved:', settings)
      
      // Update user profile if changed
      if (settings.profile.displayName !== user?.displayName) {
        await blink.auth.updateMe({
          displayName: settings.profile.displayName
        })
      }
      
    } catch (error) {
      console.error('Failed to save settings:', error)
    } finally {
      setSaving(false)
    }
  }

  const updateProfile = (field: string, value: any) => {
    setSettings(prev => prev ? {
      ...prev,
      profile: { ...prev.profile, [field]: value }
    } : null)
  }

  const updatePreferences = (field: string, value: any) => {
    setSettings(prev => prev ? {
      ...prev,
      preferences: { ...prev.preferences, [field]: value }
    } : null)
  }

  const updateNotifications = (field: string, value: boolean) => {
    setSettings(prev => prev ? {
      ...prev,
      preferences: {
        ...prev.preferences,
        notifications: { ...prev.preferences.notifications, [field]: value }
      }
    } : null)
  }

  const updatePrivacy = (field: string, value: any) => {
    setSettings(prev => prev ? {
      ...prev,
      privacy: { ...prev.privacy, [field]: value }
    } : null)
  }

  const updateIntegration = (service: string, field: string, value: any) => {
    setSettings(prev => prev ? {
      ...prev,
      integrations: {
        ...prev.integrations,
        [service]: { ...prev.integrations[service as keyof typeof prev.integrations], [field]: value }
      }
    } : null)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4"></div>
          <p className="text-slate-400">Loading settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Settings</h1>
            <p className="text-slate-400">Manage your account and application preferences</p>
          </div>
          <Button onClick={saveSettings} disabled={saving} className="gap-2 bg-indigo-600 hover:bg-indigo-700">
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>

        <Tabs defaultValue="profile" className="space-y-4">
          <TabsList className="bg-slate-900 border-slate-800">
            <TabsTrigger value="profile" className="data-[state=active]:bg-slate-700">Profile</TabsTrigger>
            <TabsTrigger value="preferences" className="data-[state=active]:bg-slate-700">Preferences</TabsTrigger>
            <TabsTrigger value="privacy" className="data-[state=active]:bg-slate-700">Privacy</TabsTrigger>
            <TabsTrigger value="integrations" className="data-[state=active]:bg-slate-700">Integrations</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Profile Information */}
              <Card className="bg-slate-900 border-slate-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <User className="w-5 h-5" />
                    Profile Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="w-20 h-20">
                      <AvatarImage src={settings?.profile.avatar} />
                      <AvatarFallback className="bg-slate-700 text-slate-300 text-lg">
                        {settings?.profile.displayName?.split(' ').map(n => n[0]).join('') || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="space-y-2">
                      <Button variant="outline" size="sm" className="gap-2 border-slate-700 text-slate-300 hover:bg-slate-800">
                        <Upload className="w-3 h-3" />
                        Upload Photo
                      </Button>
                      <Button variant="outline" size="sm" className="gap-2 border-slate-700 text-slate-300 hover:bg-slate-800">
                        <Trash2 className="w-3 h-3" />
                        Remove
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-300">Display Name</Label>
                    <Input
                      value={settings?.profile.displayName || ''}
                      onChange={(e) => updateProfile('displayName', e.target.value)}
                      className="bg-slate-800 border-slate-700 text-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-300">Email</Label>
                    <Input
                      value={settings?.profile.email || ''}
                      onChange={(e) => updateProfile('email', e.target.value)}
                      className="bg-slate-800 border-slate-700 text-white"
                      disabled
                    />
                    <p className="text-xs text-slate-400">Email cannot be changed here. Contact support if needed.</p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-300">Bio</Label>
                    <Textarea
                      value={settings?.profile.bio || ''}
                      onChange={(e) => updateProfile('bio', e.target.value)}
                      placeholder="Tell us about yourself..."
                      className="bg-slate-800 border-slate-700 text-white"
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Regional Settings */}
              <Card className="bg-slate-900 border-slate-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Globe className="w-5 h-5" />
                    Regional Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-slate-300">Timezone</Label>
                    <Select 
                      value={settings?.profile.timezone || 'UTC'} 
                      onValueChange={(value) => updateProfile('timezone', value)}
                    >
                      <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        <SelectItem value="UTC">UTC</SelectItem>
                        <SelectItem value="America/New_York">Eastern Time</SelectItem>
                        <SelectItem value="America/Chicago">Central Time</SelectItem>
                        <SelectItem value="America/Denver">Mountain Time</SelectItem>
                        <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                        <SelectItem value="Europe/London">London</SelectItem>
                        <SelectItem value="Europe/Paris">Paris</SelectItem>
                        <SelectItem value="Asia/Tokyo">Tokyo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-300">Language</Label>
                    <Select 
                      value={settings?.profile.language || 'en'} 
                      onValueChange={(value) => updateProfile('language', value)}
                    >
                      <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="es">Spanish</SelectItem>
                        <SelectItem value="fr">French</SelectItem>
                        <SelectItem value="de">German</SelectItem>
                        <SelectItem value="ja">Japanese</SelectItem>
                        <SelectItem value="zh">Chinese</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="preferences" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Appearance */}
              <Card className="bg-slate-900 border-slate-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Palette className="w-5 h-5" />
                    Appearance
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-slate-300">Theme</Label>
                    <Select 
                      value={settings?.preferences.theme || 'dark'} 
                      onValueChange={(value: 'light' | 'dark' | 'system') => updatePreferences('theme', value)}
                    >
                      <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        <SelectItem value="light">Light</SelectItem>
                        <SelectItem value="dark">Dark</SelectItem>
                        <SelectItem value="system">System</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Recording Defaults */}
              <Card className="bg-slate-900 border-slate-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Monitor className="w-5 h-5" />
                    Recording Defaults
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-slate-300">Default Quality</Label>
                    <Select 
                      value={settings?.preferences.defaultQuality || '1080p'} 
                      onValueChange={(value: '720p' | '1080p') => updatePreferences('defaultQuality', value)}
                    >
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
                    <Label className="text-slate-300">Default Frame Rate</Label>
                    <Select 
                      value={settings?.preferences.defaultFrameRate?.toString() || '30'} 
                      onValueChange={(value) => updatePreferences('defaultFrameRate', parseInt(value))}
                    >
                      <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        <SelectItem value="30">30 FPS</SelectItem>
                        <SelectItem value="60">60 FPS</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-slate-300">Auto-save Projects</Label>
                      <p className="text-xs text-slate-400">Automatically save changes while editing</p>
                    </div>
                    <Switch 
                      checked={settings?.preferences.autoSave || false}
                      onCheckedChange={(checked) => updatePreferences('autoSave', checked)}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Notifications */}
              <Card className="bg-slate-900 border-slate-800 lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Bell className="w-5 h-5" />
                    Notifications
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-slate-300">Email Notifications</Label>
                        <p className="text-xs text-slate-400">Receive updates via email</p>
                      </div>
                      <Switch 
                        checked={settings?.preferences.notifications.email || false}
                        onCheckedChange={(checked) => updateNotifications('email', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-slate-300">Push Notifications</Label>
                        <p className="text-xs text-slate-400">Browser push notifications</p>
                      </div>
                      <Switch 
                        checked={settings?.preferences.notifications.push || false}
                        onCheckedChange={(checked) => updateNotifications('push', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-slate-300">Desktop Notifications</Label>
                        <p className="text-xs text-slate-400">System desktop notifications</p>
                      </div>
                      <Switch 
                        checked={settings?.preferences.notifications.desktop || false}
                        onCheckedChange={(checked) => updateNotifications('desktop', checked)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="privacy" className="space-y-6">
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Shield className="w-5 h-5" />
                  Privacy Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-slate-300">Profile Visibility</Label>
                  <Select 
                    value={settings?.privacy.profileVisibility || 'private'} 
                    onValueChange={(value: 'public' | 'team' | 'private') => updatePrivacy('profileVisibility', value)}
                  >
                    <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      <SelectItem value="public">Public - Anyone can see your profile</SelectItem>
                      <SelectItem value="team">Team - Only team members can see your profile</SelectItem>
                      <SelectItem value="private">Private - Only you can see your profile</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator className="bg-slate-800" />

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-slate-300">Allow Analytics</Label>
                      <p className="text-xs text-slate-400">Help us improve by sharing anonymous usage data</p>
                    </div>
                    <Switch 
                      checked={settings?.privacy.allowAnalytics || false}
                      onCheckedChange={(checked) => updatePrivacy('allowAnalytics', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-slate-300">Share Usage Data</Label>
                      <p className="text-xs text-slate-400">Share aggregated usage statistics with our partners</p>
                    </div>
                    <Switch 
                      checked={settings?.privacy.shareUsageData || false}
                      onCheckedChange={(checked) => updatePrivacy('shareUsageData', checked)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="integrations" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* ElevenLabs Integration */}
              <Card className="bg-slate-900 border-slate-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Key className="w-5 h-5" />
                    ElevenLabs Integration
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-slate-300">Enable ElevenLabs</Label>
                      <p className="text-xs text-slate-400">AI voice generation for demos</p>
                    </div>
                    <Switch 
                      checked={settings?.integrations.elevenLabs.enabled || false}
                      onCheckedChange={(checked) => updateIntegration('elevenLabs', 'enabled', checked)}
                    />
                  </div>

                  {settings?.integrations.elevenLabs.enabled && (
                    <div className="space-y-2">
                      <Label className="text-slate-300">API Key</Label>
                      <Input
                        type="password"
                        value={settings?.integrations.elevenLabs.apiKey || ''}
                        onChange={(e) => updateIntegration('elevenLabs', 'apiKey', e.target.value)}
                        placeholder="Enter your ElevenLabs API key"
                        className="bg-slate-800 border-slate-700 text-white"
                      />
                      <p className="text-xs text-slate-400">
                        Get your API key from{' '}
                        <a href="https://elevenlabs.io" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">
                          ElevenLabs Dashboard
                        </a>
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* OpenAI Integration */}
              <Card className="bg-slate-900 border-slate-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Key className="w-5 h-5" />
                    OpenAI Integration
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-slate-300">Enable OpenAI</Label>
                      <p className="text-xs text-slate-400">AI-powered script generation</p>
                    </div>
                    <Switch 
                      checked={settings?.integrations.openai.enabled || false}
                      onCheckedChange={(checked) => updateIntegration('openai', 'enabled', checked)}
                    />
                  </div>

                  {settings?.integrations.openai.enabled && (
                    <div className="space-y-2">
                      <Label className="text-slate-300">API Key</Label>
                      <Input
                        type="password"
                        value={settings?.integrations.openai.apiKey || ''}
                        onChange={(e) => updateIntegration('openai', 'apiKey', e.target.value)}
                        placeholder="Enter your OpenAI API key"
                        className="bg-slate-800 border-slate-700 text-white"
                      />
                      <p className="text-xs text-slate-400">
                        Get your API key from{' '}
                        <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">
                          OpenAI Platform
                        </a>
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Data Export */}
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Download className="w-5 h-5" />
                  Data Export
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-slate-400">
                  Export your data including projects, recordings, and settings for backup or migration purposes.
                </p>
                <div className="flex gap-3">
                  <Button variant="outline" className="gap-2 border-slate-700 text-slate-300 hover:bg-slate-800">
                    <Download className="w-4 h-4" />
                    Export All Data
                  </Button>
                  <Button variant="outline" className="gap-2 border-slate-700 text-slate-300 hover:bg-slate-800">
                    <Download className="w-4 h-4" />
                    Export Projects Only
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

export default Settings