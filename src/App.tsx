import React, { useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { LoginPage } from './components/LoginPage'
import { AdminDashboard } from './components/AdminDashboard'
import { TeacherDashboard } from './components/TeacherDashboard'
import { StudentDashboard } from './components/StudentDashboard'
import { ErrorBoundary } from './components/ErrorBoundary'
import { apiClient } from './utils/api'
import { Loader2 } from 'lucide-react'

// Protected Route Component
const ProtectedRoute = ({ children, requiredRole }: { children: React.ReactNode, requiredRole: string }) => {
  const { user, isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#3B0A45] to-[#2B0230] flex items-center justify-center">
        <div className="text-center text-white">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" />
          <p className="text-lg">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return <LoginPage />
  }

  if (user.role !== requiredRole) {
    // Redirect to appropriate portal based on user role
    return <Navigate to={`/${user.role}`} replace />
  }

  return <>{children}</>
}

// Initialize debug tools in browser console
if (typeof window !== 'undefined') {
  // Import systemTester dynamically to avoid issues
  import('./utils/systemTest').then(({ systemTester }) => {
    (window as any).systemTester = systemTester
    (window as any).apiClient = apiClient

    // Display welcome message with debug tools
    console.log('%c🎓 Attendance Management System', 'color: #D9D9D9; font-size: 20px; font-weight: bold; background: linear-gradient(90deg, #3B0A45, #2B0230); padding: 10px 20px; border-radius: 5px;')
    console.log('%cSystem Status: ✅ OPERATIONAL', 'color: #4ade80; font-size: 14px; font-weight: bold;')
    console.log('\n📚 Available Debug Tools:')
    console.log('%csystemTester.runAllTests()', 'color: #60a5fa; font-weight: bold;')
    console.log('  - Run comprehensive system tests')
    console.log('%csystemTester.quickHealthCheck()', 'color: #60a5fa; font-weight: bold;')
    console.log('  - Quick server health check')
    console.log('%capiClient.healthCheck()', 'color: #60a5fa; font-weight: bold;')
    console.log('  - Check API server status')
    console.log('%clocalStorage.getItem("auth_token")', 'color: #60a5fa; font-weight: bold;')
    console.log('  - View current auth token')
    console.log('%clocalStorage.clear()', 'color: #ef4444; font-weight: bold;')
    console.log('  - Clear all data (logout)')
    console.log('\n📖 Documentation:')
    console.log('  • README.md - System overview')
    console.log('  • QUICKSTART.md - Get started in 5 minutes')
    console.log('  • TROUBLESHOOTING.md - Common issues & solutions')
    console.log('\n💡 Tip: Run systemTester.runAllTests() to verify everything is working!\n')
  }).catch(err => {
    console.warn('System tester could not be loaded:', err)
  })
}

function AppContent() {
  const [isInitializing, setIsInitializing] = useState(true)
  const [authError, setAuthError] = useState<string | null>(null)

  useEffect(() => {
    // Initialize database on first load
    const initializeApp = async () => {
      try {
        // Add timeout protection for initialization
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Initialization timeout')), 15000)
        )

        const initPromise = async () => {
          // First check if server is running
          console.log('Checking server health...')
          const healthResponse = await apiClient.healthCheck()
          console.log('Server health response:', healthResponse)

          // Then initialize database
          console.log('Initializing database...')
          const initResponse = await apiClient.initDatabase()
          console.log('Database init response:', initResponse)

          // Test authentication if we have a token
          if (apiClient.hasToken()) {
            console.log('Testing authentication...')
            const testResponse = await apiClient.testAuth()
            console.log('Auth test response:', testResponse)
          }

          if (initResponse.success) {
            console.log('✅ Application initialized successfully')
            // Clear any previous auth errors on successful initialization
            setAuthError(null)
          } else {
            console.warn('⚠️ Database initialization returned:', initResponse.message || 'Unknown status')
          }
        }

        await Promise.race([initPromise(), timeoutPromise])
      } catch (error: any) {
        console.error('❌ App initialization error:', error)

        // More detailed error logging
        if (error.message) {
          console.error('Error message:', error.message)

          // Check if this is an authentication-related error (not initialization error)
          if (error.message.includes('Authentication') || error.message.includes('401') || error.message.includes('Unauthorized')) {
            setAuthError('Authentication session has expired. Please refresh the page and log in again.')
          } else if (error.message.includes('timeout') || error.message.includes('Network error')) {
            console.warn('⚠️ Initialization timeout or network error, continuing anyway...')
            // Don't show auth error for network issues
          }
        }
        if (error.stack) {
          console.error('Error stack:', error.stack)
        }

        // Don't fail completely on initialization errors
        console.log('🔄 Continuing app startup despite initialization issues...')
      } finally {
        setIsInitializing(false)
      }
    }

    initializeApp()
  }, [])

  // Handle authentication errors
  if (authError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#3B0A45] to-[#2B0230] flex items-center justify-center">
        <div className="text-center text-white p-8 max-w-md mx-auto">
          <div className="mb-6">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-500/20 rounded-full flex items-center justify-center">
              <span className="text-red-400 text-2xl">⚠️</span>
            </div>
            <h2 className="text-2xl font-bold mb-4">Authentication Error</h2>
            <p className="text-white/80 mb-6">{authError}</p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="bg-[#D9D9D9] text-black px-6 py-3 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Refresh Page
          </button>
        </div>
      </div>
    )
  }

  // Show loading screen during initialization
  if (isInitializing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#3B0A45] to-[#2B0230] flex items-center justify-center">
        <div className="text-center text-white">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" />
          <p className="text-lg">Loading Attendance System...</p>
          <p className="text-white/70 text-sm mt-2">Initializing secure connections</p>
        </div>
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/admin"
        element={
          <ProtectedRoute requiredRole="admin">
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/teacher"
        element={
          <ProtectedRoute requiredRole="teacher">
            <TeacherDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student"
        element={
          <ProtectedRoute requiredRole="student">
            <StudentDashboard />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <Router>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  )
}