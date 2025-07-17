import { useState } from 'react'
import { Bell, Search, User, ChevronDown, LogOut, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import blink from '@/blink/client'

interface HeaderProps {
  user?: {
    id: string
    email: string
    displayName?: string
    avatar?: string
  }
}

export function Header({ user }: HeaderProps) {
  const [notifications] = useState(3)

  const handleLogout = () => {
    blink.auth.logout()
  }

  return (
    <header className="flex items-center justify-between h-16 px-6 bg-slate-900 border-b border-slate-800">
      {/* Search */}
      <div className="flex items-center gap-4 flex-1 max-w-md">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input 
            placeholder="Search projects, recordings..." 
            className="pl-10 bg-slate-800 border-slate-700 text-white placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4">
        {/* Notifications */}
        <Button variant="ghost" size="sm" className="relative text-slate-300 hover:text-white hover:bg-slate-800">
          <Bell className="w-4 h-4" />
          {notifications > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 w-5 h-5 text-xs flex items-center justify-center p-0 bg-red-600"
            >
              {notifications}
            </Badge>
          )}
        </Button>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 h-8 text-slate-300 hover:text-white hover:bg-slate-800">
              <Avatar className="w-6 h-6">
                <AvatarImage src={user?.avatar} />
                <AvatarFallback className="text-xs bg-slate-700 text-slate-300">
                  {user?.displayName?.[0] || user?.email?.[0] || 'U'}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium hidden sm:block">
                {user?.displayName || user?.email?.split('@')[0] || 'User'}
              </span>
              <ChevronDown className="w-3 h-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-slate-800 border-slate-700">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium text-white">{user?.displayName || 'User'}</p>
              <p className="text-xs text-slate-400">{user?.email}</p>
            </div>
            <DropdownMenuSeparator className="bg-slate-700" />
            <DropdownMenuItem className="text-slate-300 hover:bg-slate-700">
              <User className="w-4 h-4 mr-2" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem className="text-slate-300 hover:bg-slate-700">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-slate-700" />
            <DropdownMenuItem onClick={handleLogout} className="text-slate-300 hover:bg-slate-700">
              <LogOut className="w-4 h-4 mr-2" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}