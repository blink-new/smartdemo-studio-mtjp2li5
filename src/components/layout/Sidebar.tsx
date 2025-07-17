import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { 
  Home, 
  Video, 
  Mic, 
  Download, 
  Users, 
  Settings, 
  Play,
  Folder,
  BarChart3,
  Zap
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

const navigation = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Projects', href: '/projects', icon: Folder },
  { name: 'Recording Studio', href: '/record', icon: Video },
  { name: 'AI Voice Lab', href: '/voice', icon: Mic },
  { name: 'Export Center', href: '/export', icon: Download },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Team', href: '/team', icon: Users },
  { name: 'Settings', href: '/settings', icon: Settings },
]

export function Sidebar() {
  const location = useLocation()
  const [isCollapsed, setIsCollapsed] = useState(false)

  return (
    <div className={cn(
      "flex flex-col h-screen bg-slate-900 border-r border-slate-800 transition-all duration-300",
      isCollapsed ? "w-16" : "w-64"
    )}>
      {/* Logo */}
      <div className="flex items-center gap-3 p-6 border-b border-slate-800">
        <div className="flex items-center justify-center w-8 h-8 bg-indigo-600 rounded-lg">
          <Zap className="w-5 h-5 text-white" />
        </div>
        {!isCollapsed && (
          <div>
            <h1 className="text-lg font-semibold text-white">SmartDemo</h1>
            <p className="text-xs text-slate-400">Studio</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href
          return (
            <Link key={item.name} to={item.href}>
              <Button
                variant={isActive ? "default" : "ghost"}
                className={cn(
                  "w-full justify-start gap-3 h-10 text-slate-300 hover:text-white hover:bg-slate-800",
                  isActive && "bg-indigo-600 text-white hover:bg-indigo-700",
                  isCollapsed && "justify-center px-2"
                )}
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                {!isCollapsed && (
                  <span className="truncate">{item.name}</span>
                )}
              </Button>
            </Link>
          )
        })}
      </nav>

      {/* Quick Actions */}
      {!isCollapsed && (
        <div className="p-4 border-t border-slate-800">
          <div className="space-y-3">
            <Button className="w-full gap-2 bg-indigo-600 hover:bg-indigo-700" size="sm">
              <Play className="w-4 h-4" />
              Quick Record
            </Button>
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Storage Used</span>
              <Badge variant="secondary" className="bg-slate-800 text-slate-300">2.4GB / 10GB</Badge>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-1.5">
              <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: '24%' }} />
            </div>
          </div>
        </div>
      )}

      {/* Collapse Toggle */}
      <Button
        variant="ghost"
        size="sm"
        className="m-2 text-slate-400 hover:text-white hover:bg-slate-800"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        {isCollapsed ? '→' : '←'}
      </Button>
    </div>
  )
}