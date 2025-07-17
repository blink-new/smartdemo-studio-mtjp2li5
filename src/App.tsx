import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { Dashboard } from '@/pages/Dashboard'
import { RecordingStudio } from '@/pages/RecordingStudio'
import { ProjectEditor } from '@/pages/ProjectEditor'
import { ExportCenter } from '@/pages/ExportCenter'
import { Toaster } from '@/components/ui/sonner'
import blink from '@/blink/client'

interface User {
  id: string
  email: string
  displayName?: string
  avatar?: string
}

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = blink.auth.onAuthStateChanged((state) => {
      setUser(state.user)
      setLoading(state.isLoading)
    })
    return unsubscribe
  }, [])



  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-950">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Loading SmartDemo Studio...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-950">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M13 10V3L4 14h7v7l9-11h-7z"/>
            </svg>
          </div>
          <h1 className="text-3xl font-bold mb-2 text-white">SmartDemo Studio</h1>
          <p className="text-slate-400 mb-8">
            AI-powered demo recording platform for creating professional product walkthroughs
          </p>
          <div className="space-y-4">
            <div className="text-sm text-slate-500">
              Please sign in to continue
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <Router>
      <div className="h-screen flex bg-slate-950">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header user={user} />
          <main className="flex-1 overflow-auto bg-slate-950">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/projects" element={<Dashboard />} />
              <Route path="/record" element={<RecordingStudio />} />
              <Route path="/editor/:projectId?" element={<ProjectEditor />} />
              <Route path="/voice" element={<ProjectEditor />} />
              <Route path="/export" element={<ExportCenter />} />
              <Route path="/analytics" element={<Dashboard />} />
              <Route path="/team" element={<Dashboard />} />
              <Route path="/settings" element={<Dashboard />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
        <Toaster />
      </div>
    </Router>
  )
}

export default App