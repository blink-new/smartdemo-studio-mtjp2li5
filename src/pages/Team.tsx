import { useState, useEffect, useCallback } from 'react'
import { 
  Users, 
  UserPlus, 
  Crown, 
  Edit, 
  Trash2, 
  Mail,
  Shield,
  Settings,
  MoreVertical
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import blink from '@/blink/client'
import type { TeamMember } from '@/types'

interface TeamData {
  id: string
  name: string
  members: TeamMember[]
  settings: {
    allowedDomains: string[]
    ssoEnabled: boolean
    defaultRole: 'editor' | 'reviewer' | 'viewer'
  }
}

export function Team() {
  const [teamData, setTeamData] = useState<TeamData | null>(null)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'editor' | 'reviewer' | 'viewer'>('editor')
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false)

  useEffect(() => {
    const unsubscribe = blink.auth.onAuthStateChanged(async (state) => {
      if (state.user) {
        setUser(state.user)
        await loadTeamData()
      }
      setLoading(state.isLoading)
    })
    return unsubscribe
  }, [loadTeamData])

  const loadTeamData = useCallback(async () => {
    try {
      setLoading(true)
      
      // Try to load real team data
      const teams = await blink.db.teams?.list({
        where: { userId: user?.id },
        limit: 1
      }) || []

      // Mock team data for demo
      const mockTeam: TeamData = {
        id: 'team_1',
        name: 'SmartDemo Team',
        members: [
          {
            userId: 'user_1',
            role: 'admin',
            joinedAt: '2024-01-01T00:00:00Z'
          },
          {
            userId: 'user_2', 
            role: 'editor',
            joinedAt: '2024-01-05T00:00:00Z'
          },
          {
            userId: 'user_3',
            role: 'reviewer', 
            joinedAt: '2024-01-10T00:00:00Z'
          },
          {
            userId: 'user_4',
            role: 'viewer',
            joinedAt: '2024-01-15T00:00:00Z'
          }
        ],
        settings: {
          allowedDomains: ['company.com', 'contractor.com'],
          ssoEnabled: false,
          defaultRole: 'editor'
        }
      }
      
      setTeamData(mockTeam)
    } catch (error) {
      console.error('Failed to load team data:', error)
      // Use mock data as fallback
      setTeamData({
        id: 'team_1',
        name: 'SmartDemo Team',
        members: [
          {
            userId: 'user_1',
            role: 'admin',
            joinedAt: '2024-01-01T00:00:00Z'
          }
        ],
        settings: {
          allowedDomains: [],
          ssoEnabled: false,
          defaultRole: 'editor'
        }
      })
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  const sendInvite = async () => {
    if (!inviteEmail.trim()) return

    try {
      // In real app, this would send an invitation
      console.log('Sending invite to:', inviteEmail, 'with role:', inviteRole)
      
      // Add to team members list (mock)
      const newMember: TeamMember = {
        userId: `user_${Date.now()}`,
        role: inviteRole,
        joinedAt: new Date().toISOString()
      }
      
      setTeamData(prev => prev ? {
        ...prev,
        members: [...prev.members, newMember]
      } : null)
      
      setInviteEmail('')
      setInviteRole('editor')
      setIsInviteDialogOpen(false)
    } catch (error) {
      console.error('Failed to send invite:', error)
    }
  }

  const removeMember = async (userId: string) => {
    try {
      setTeamData(prev => prev ? {
        ...prev,
        members: prev.members.filter(m => m.userId !== userId)
      } : null)
    } catch (error) {
      console.error('Failed to remove member:', error)
    }
  }

  const updateMemberRole = async (userId: string, newRole: 'admin' | 'editor' | 'reviewer' | 'viewer') => {
    try {
      setTeamData(prev => prev ? {
        ...prev,
        members: prev.members.map(m => 
          m.userId === userId ? { ...m, role: newRole } : m
        )
      } : null)
    } catch (error) {
      console.error('Failed to update member role:', error)
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800 border-red-200'
      case 'editor': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'reviewer': return 'bg-green-100 text-green-800 border-green-200'
      case 'viewer': return 'bg-slate-100 text-slate-800 border-slate-200'
      default: return 'bg-slate-100 text-slate-800 border-slate-200'
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <Crown className="w-3 h-3" />
      case 'editor': return <Edit className="w-3 h-3" />
      case 'reviewer': return <Shield className="w-3 h-3" />
      default: return <Users className="w-3 h-3" />
    }
  }

  const getMockUserData = (userId: string) => {
    const users = {
      'user_1': { name: 'John Doe', email: 'john@company.com', avatar: null },
      'user_2': { name: 'Sarah Chen', email: 'sarah@company.com', avatar: null },
      'user_3': { name: 'Mike Johnson', email: 'mike@company.com', avatar: null },
      'user_4': { name: 'Alex Kim', email: 'alex@company.com', avatar: null }
    }
    return users[userId as keyof typeof users] || { name: 'Unknown User', email: 'unknown@company.com', avatar: null }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4"></div>
          <p className="text-slate-400">Loading team...</p>
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
            <h1 className="text-3xl font-bold text-white">Team Management</h1>
            <p className="text-slate-400">Manage team members and collaboration settings</p>
          </div>
          <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-indigo-600 hover:bg-indigo-700">
                <UserPlus className="w-4 h-4" />
                Invite Member
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-slate-800 text-white">
              <DialogHeader>
                <DialogTitle>Invite Team Member</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Email Address</Label>
                  <Input
                    type="email"
                    placeholder="colleague@company.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={inviteRole} onValueChange={(value: 'editor' | 'reviewer' | 'viewer') => setInviteRole(value)}>
                    <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      <SelectItem value="editor">Editor - Can create and edit demos</SelectItem>
                      <SelectItem value="reviewer">Reviewer - Can review and comment</SelectItem>
                      <SelectItem value="viewer">Viewer - Can only view demos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2 pt-4">
                  <Button onClick={sendInvite} className="flex-1 bg-indigo-600 hover:bg-indigo-700">
                    Send Invitation
                  </Button>
                  <Button variant="outline" onClick={() => setIsInviteDialogOpen(false)} className="border-slate-700 text-slate-300 hover:bg-slate-800">
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="members" className="space-y-4">
          <TabsList className="bg-slate-900 border-slate-800">
            <TabsTrigger value="members" className="data-[state=active]:bg-slate-700">Members</TabsTrigger>
            <TabsTrigger value="settings" className="data-[state=active]:bg-slate-700">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="members" className="space-y-6">
            {/* Team Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="bg-slate-900 border-slate-800">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-300">Total Members</CardTitle>
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <Users className="w-4 h-4 text-blue-400" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">{teamData?.members.length || 0}</div>
                  <p className="text-xs text-slate-400">
                    Active team members
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-slate-900 border-slate-800">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-300">Admins</CardTitle>
                  <div className="p-2 bg-red-500/10 rounded-lg">
                    <Crown className="w-4 h-4 text-red-400" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">
                    {teamData?.members.filter(m => m.role === 'admin').length || 0}
                  </div>
                  <p className="text-xs text-slate-400">
                    Team administrators
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-slate-900 border-slate-800">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-300">Editors</CardTitle>
                  <div className="p-2 bg-green-500/10 rounded-lg">
                    <Edit className="w-4 h-4 text-green-400" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">
                    {teamData?.members.filter(m => m.role === 'editor').length || 0}
                  </div>
                  <p className="text-xs text-slate-400">
                    Content editors
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Members List */}
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white">Team Members</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {teamData?.members.map((member) => {
                    const userData = getMockUserData(member.userId)
                    return (
                      <div key={member.userId} className="flex items-center justify-between p-4 bg-slate-800 rounded-lg">
                        <div className="flex items-center gap-4">
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={userData.avatar || undefined} />
                            <AvatarFallback className="bg-slate-700 text-slate-300">
                              {userData.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h3 className="font-medium text-white">{userData.name}</h3>
                            <div className="flex items-center gap-2 text-sm text-slate-400">
                              <Mail className="w-3 h-3" />
                              {userData.email}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant="secondary" className={`flex items-center gap-1 ${getRoleColor(member.role)}`}>
                            {getRoleIcon(member.role)}
                            {member.role}
                          </Badge>
                          <span className="text-xs text-slate-500">
                            Joined {new Date(member.joinedAt).toLocaleDateString()}
                          </span>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white hover:bg-slate-700">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700">
                              <DropdownMenuItem 
                                onClick={() => updateMemberRole(member.userId, 'admin')}
                                className="text-slate-300 hover:bg-slate-700"
                              >
                                Make Admin
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => updateMemberRole(member.userId, 'editor')}
                                className="text-slate-300 hover:bg-slate-700"
                              >
                                Make Editor
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => updateMemberRole(member.userId, 'reviewer')}
                                className="text-slate-300 hover:bg-slate-700"
                              >
                                Make Reviewer
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => updateMemberRole(member.userId, 'viewer')}
                                className="text-slate-300 hover:bg-slate-700"
                              >
                                Make Viewer
                              </DropdownMenuItem>
                              <Separator className="bg-slate-700" />
                              <DropdownMenuItem 
                                onClick={() => removeMember(member.userId)}
                                className="text-red-400 hover:bg-slate-700"
                              >
                                <Trash2 className="w-3 h-3 mr-2" />
                                Remove
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Team Settings */}
              <Card className="bg-slate-900 border-slate-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Settings className="w-5 h-5" />
                    Team Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-slate-300">Team Name</Label>
                    <Input
                      value={teamData?.name || ''}
                      onChange={(e) => setTeamData(prev => prev ? { ...prev, name: e.target.value } : null)}
                      className="bg-slate-800 border-slate-700 text-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-300">Default Role for New Members</Label>
                    <Select 
                      value={teamData?.settings.defaultRole || 'editor'} 
                      onValueChange={(value: 'editor' | 'reviewer' | 'viewer') => 
                        setTeamData(prev => prev ? {
                          ...prev,
                          settings: { ...prev.settings, defaultRole: value }
                        } : null)
                      }
                    >
                      <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        <SelectItem value="editor">Editor</SelectItem>
                        <SelectItem value="reviewer">Reviewer</SelectItem>
                        <SelectItem value="viewer">Viewer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-slate-300">Enable SSO</Label>
                      <p className="text-xs text-slate-400">Single Sign-On integration</p>
                    </div>
                    <Switch 
                      checked={teamData?.settings.ssoEnabled || false}
                      onCheckedChange={(checked) => 
                        setTeamData(prev => prev ? {
                          ...prev,
                          settings: { ...prev.settings, ssoEnabled: checked }
                        } : null)
                      }
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Security Settings */}
              <Card className="bg-slate-900 border-slate-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Shield className="w-5 h-5" />
                    Security Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-slate-300">Allowed Email Domains</Label>
                    <div className="space-y-2">
                      {teamData?.settings.allowedDomains.map((domain, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <Input
                            value={domain}
                            onChange={(e) => {
                              const newDomains = [...(teamData?.settings.allowedDomains || [])]
                              newDomains[index] = e.target.value
                              setTeamData(prev => prev ? {
                                ...prev,
                                settings: { ...prev.settings, allowedDomains: newDomains }
                              } : null)
                            }}
                            className="bg-slate-800 border-slate-700 text-white"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const newDomains = teamData?.settings.allowedDomains.filter((_, i) => i !== index) || []
                              setTeamData(prev => prev ? {
                                ...prev,
                                settings: { ...prev.settings, allowedDomains: newDomains }
                              } : null)
                            }}
                            className="border-slate-700 text-slate-300 hover:bg-slate-800"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const newDomains = [...(teamData?.settings.allowedDomains || []), '']
                          setTeamData(prev => prev ? {
                            ...prev,
                            settings: { ...prev.settings, allowedDomains: newDomains }
                          } : null)
                        }}
                        className="border-slate-700 text-slate-300 hover:bg-slate-800"
                      >
                        Add Domain
                      </Button>
                    </div>
                    <p className="text-xs text-slate-400">
                      Only users with these email domains can join the team
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

export default Team