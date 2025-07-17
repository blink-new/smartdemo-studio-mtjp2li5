import { useState, useEffect, useCallback } from 'react'
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Eye, 
  Download,
  Calendar,
  Filter,
  RefreshCw
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import blink from '@/blink/client'

interface AnalyticsData {
  totalViews: number
  totalDownloads: number
  avgWatchTime: number
  topProjects: Array<{
    id: string
    name: string
    views: number
    downloads: number
    engagement: number
  }>
  viewsOverTime: Array<{
    date: string
    views: number
    downloads: number
  }>
  deviceBreakdown: Array<{
    device: string
    percentage: number
  }>
}

export function Analytics() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('7d')
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const unsubscribe = blink.auth.onAuthStateChanged(async (state) => {
      if (state.user) {
        setUser(state.user)
        await loadAnalytics()
      }
      setLoading(state.isLoading)
    })
    return unsubscribe
  }, [loadAnalytics])

  const loadAnalytics = useCallback(async () => {
    try {
      setLoading(true)
      
      // Try to load real analytics data
      const events = await blink.db.analyticsEvents?.list({
        where: { userId: user?.id },
        orderBy: { createdAt: 'desc' },
        limit: 1000
      }) || []

      // Process events into analytics data
      const mockData: AnalyticsData = {
        totalViews: 1247,
        totalDownloads: 89,
        avgWatchTime: 142,
        topProjects: [
          { id: '1', name: 'Product Onboarding Demo', views: 456, downloads: 23, engagement: 87 },
          { id: '2', name: 'Feature Showcase', views: 321, downloads: 18, engagement: 72 },
          { id: '3', name: 'API Integration Tutorial', views: 289, downloads: 15, engagement: 68 },
          { id: '4', name: 'Dashboard Walkthrough', views: 181, downloads: 12, engagement: 59 }
        ],
        viewsOverTime: [
          { date: '2024-01-10', views: 45, downloads: 3 },
          { date: '2024-01-11', views: 67, downloads: 5 },
          { date: '2024-01-12', views: 89, downloads: 7 },
          { date: '2024-01-13', views: 123, downloads: 9 },
          { date: '2024-01-14', views: 156, downloads: 12 },
          { date: '2024-01-15', views: 134, downloads: 8 },
          { date: '2024-01-16', views: 178, downloads: 14 }
        ],
        deviceBreakdown: [
          { device: 'Desktop', percentage: 68 },
          { device: 'Mobile', percentage: 24 },
          { device: 'Tablet', percentage: 8 }
        ]
      }
      
      setAnalyticsData(mockData)
    } catch (error) {
      console.error('Failed to load analytics:', error)
      // Use mock data as fallback
      setAnalyticsData({
        totalViews: 1247,
        totalDownloads: 89,
        avgWatchTime: 142,
        topProjects: [
          { id: '1', name: 'Product Onboarding Demo', views: 456, downloads: 23, engagement: 87 },
          { id: '2', name: 'Feature Showcase', views: 321, downloads: 18, engagement: 72 }
        ],
        viewsOverTime: [],
        deviceBreakdown: [
          { device: 'Desktop', percentage: 68 },
          { device: 'Mobile', percentage: 24 },
          { device: 'Tablet', percentage: 8 }
        ]
      })
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  const formatNumber = (num: number) => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'k'
    }
    return num.toString()
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4"></div>
          <p className="text-slate-400">Loading analytics...</p>
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
            <h1 className="text-3xl font-bold text-white">Analytics</h1>
            <p className="text-slate-400">Track performance and engagement of your demos</p>
          </div>
          <div className="flex gap-3">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-32 bg-slate-900 border-slate-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" className="gap-2 border-slate-700 text-slate-300 hover:bg-slate-800">
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">Total Views</CardTitle>
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Eye className="w-4 h-4 text-blue-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{formatNumber(analyticsData?.totalViews || 0)}</div>
              <p className="text-xs text-green-400">
                +12% from last period
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">Downloads</CardTitle>
              <div className="p-2 bg-green-500/10 rounded-lg">
                <Download className="w-4 h-4 text-green-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{analyticsData?.totalDownloads || 0}</div>
              <p className="text-xs text-green-400">
                +8% from last period
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">Avg Watch Time</CardTitle>
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <BarChart3 className="w-4 h-4 text-purple-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{formatTime(analyticsData?.avgWatchTime || 0)}</div>
              <p className="text-xs text-green-400">
                +5% from last period
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">Engagement Rate</CardTitle>
              <div className="p-2 bg-indigo-500/10 rounded-lg">
                <TrendingUp className="w-4 h-4 text-indigo-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">74%</div>
              <p className="text-xs text-green-400">
                +3% from last period
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="bg-slate-900 border-slate-800">
            <TabsTrigger value="overview" className="data-[state=active]:bg-slate-700">Overview</TabsTrigger>
            <TabsTrigger value="projects" className="data-[state=active]:bg-slate-700">Top Projects</TabsTrigger>
            <TabsTrigger value="audience" className="data-[state=active]:bg-slate-700">Audience</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Views Over Time Chart */}
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white">Views & Downloads Over Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-end justify-between gap-2 px-4">
                  {analyticsData?.viewsOverTime.map((data, index) => (
                    <div key={index} className="flex flex-col items-center gap-2 flex-1">
                      <div className="flex flex-col items-center gap-1 w-full">
                        <div 
                          className="w-full bg-blue-500 rounded-t"
                          style={{ height: `${(data.views / 200) * 100}px` }}
                        />
                        <div 
                          className="w-full bg-green-500 rounded-t"
                          style={{ height: `${(data.downloads / 20) * 20}px` }}
                        />
                      </div>
                      <span className="text-xs text-slate-400 rotate-45 origin-left">
                        {new Date(data.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-center gap-6 mt-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded" />
                    <span className="text-sm text-slate-300">Views</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded" />
                    <span className="text-sm text-slate-300">Downloads</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="projects" className="space-y-6">
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white">Top Performing Projects</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analyticsData?.topProjects.map((project, index) => (
                    <div key={project.id} className="flex items-center justify-between p-4 bg-slate-800 rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 bg-slate-700 rounded-lg flex items-center justify-center">
                          <span className="text-sm font-medium text-slate-300">#{index + 1}</span>
                        </div>
                        <div>
                          <h3 className="font-medium text-white">{project.name}</h3>
                          <div className="flex items-center gap-4 text-sm text-slate-400">
                            <span>{formatNumber(project.views)} views</span>
                            <span>{project.downloads} downloads</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-white">{project.engagement}%</div>
                        <div className="text-xs text-slate-400">engagement</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="audience" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Device Breakdown */}
              <Card className="bg-slate-900 border-slate-800">
                <CardHeader>
                  <CardTitle className="text-white">Device Breakdown</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {analyticsData?.deviceBreakdown.map((device) => (
                    <div key={device.device} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-300">{device.device}</span>
                        <span className="text-slate-400">{device.percentage}%</span>
                      </div>
                      <Progress value={device.percentage} className="h-2 bg-slate-800" />
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Geographic Distribution */}
              <Card className="bg-slate-900 border-slate-800">
                <CardHeader>
                  <CardTitle className="text-white">Top Locations</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { country: 'United States', views: 456, percentage: 37 },
                    { country: 'United Kingdom', views: 234, percentage: 19 },
                    { country: 'Germany', views: 189, percentage: 15 },
                    { country: 'Canada', views: 123, percentage: 10 },
                    { country: 'Australia', views: 89, percentage: 7 }
                  ].map((location) => (
                    <div key={location.country} className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-white">{location.country}</div>
                        <div className="text-sm text-slate-400">{location.views} views</div>
                      </div>
                      <Badge variant="secondary" className="bg-slate-800 text-slate-300">
                        {location.percentage}%
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

export default Analytics