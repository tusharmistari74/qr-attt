import React, { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { apiClient } from '../utils/api'
import { useAuth } from '../contexts/AuthContext'
import { CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react'

export function SystemDebugPanel() {
  const { user, isAuthenticated } = useAuth()
  const [serverHealth, setServerHealth] = useState<any>(null)
  const [authTest, setAuthTest] = useState<any>(null)
  const [isChecking, setIsChecking] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'online' | 'offline'>('checking')

  useEffect(() => {
    checkSystemHealth()
  }, [])

  const checkSystemHealth = async () => {
    setIsChecking(true)
    setConnectionStatus('checking')

    try {
      // Check server health
      const health = await apiClient.healthCheck()
      setServerHealth(health)

      // Check auth if user is logged in
      if (apiClient.hasToken()) {
        try {
          const auth = await apiClient.testAuth()
          setAuthTest(auth)
        } catch (error) {
          setAuthTest({ error: error.message })
        }
      }

      setConnectionStatus('online')
    } catch (error: any) {
      console.error('Health check failed:', error)
      setServerHealth({ error: error.message })
      setConnectionStatus('offline')
    } finally {
      setIsChecking(false)
    }
  }

  const getStatusIcon = (status: boolean | undefined) => {
    if (status === undefined) return <AlertCircle className="h-5 w-5 text-yellow-400" />
    return status ? 
      <CheckCircle className="h-5 w-5 text-green-400" /> : 
      <XCircle className="h-5 w-5 text-red-400" />
  }

  const getStatusColor = (status: boolean | undefined) => {
    if (status === undefined) return 'bg-yellow-500/20 border-yellow-500/30 text-yellow-300'
    return status ? 
      'bg-green-500/20 border-green-500/30 text-green-300' : 
      'bg-red-500/20 border-red-500/30 text-red-300'
  }

  return (
    <Card className="bg-white/10 backdrop-blur-md border-white/20 mb-6">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-white flex items-center gap-2">
              System Status
            </CardTitle>
            <CardDescription className="text-white/70">
              Real-time system health monitoring
            </CardDescription>
          </div>
          <Button
            onClick={checkSystemHealth}
            disabled={isChecking}
            size="sm"
            className="bg-[#D9D9D9] text-black hover:bg-[#C0C0C0]"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isChecking ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Connection Status */}
        <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
          <span className="text-white">Server Connection</span>
          <Badge className={getStatusColor(connectionStatus === 'online')}>
            {getStatusIcon(connectionStatus === 'online')}
            <span className="ml-2">{connectionStatus}</span>
          </Badge>
        </div>

        {/* Server Health */}
        <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
          <span className="text-white">Server Health</span>
          <Badge className={getStatusColor(serverHealth?.success)}>
            {getStatusIcon(serverHealth?.success)}
            <span className="ml-2">{serverHealth?.success ? 'Healthy' : 'Error'}</span>
          </Badge>
        </div>

        {/* Authentication Status */}
        <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
          <span className="text-white">Authentication</span>
          <Badge className={getStatusColor(isAuthenticated)}>
            {getStatusIcon(isAuthenticated)}
            <span className="ml-2">{isAuthenticated ? 'Authenticated' : 'Not Logged In'}</span>
          </Badge>
        </div>

        {/* Token Status */}
        <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
          <span className="text-white">Auth Token</span>
          <Badge className={getStatusColor(apiClient.hasToken())}>
            {getStatusIcon(apiClient.hasToken())}
            <span className="ml-2">{apiClient.hasToken() ? 'Present' : 'Missing'}</span>
          </Badge>
        </div>

        {/* User Info */}
        {user && (
          <div className="p-3 bg-white/5 rounded-lg space-y-2">
            <h4 className="text-white font-medium">Current User</h4>
            <div className="text-white/70 text-sm space-y-1">
              <div>Name: {user.name}</div>
              <div>Role: {user.role}</div>
              <div>ID: {user.id}</div>
            </div>
          </div>
        )}

        {/* Error Details */}
        {(serverHealth?.error || authTest?.error) && (
          <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
            <h4 className="text-red-300 font-medium mb-2">Error Details</h4>
            <div className="text-red-200 text-sm space-y-1">
              {serverHealth?.error && <div>Server: {serverHealth.error}</div>}
              {authTest?.error && <div>Auth: {authTest.error}</div>}
            </div>
          </div>
        )}

        {/* Success Details */}
        {serverHealth?.success && (
          <div className="p-3 bg-green-500/20 border border-green-500/30 rounded-lg">
            <h4 className="text-green-300 font-medium mb-2">System Information</h4>
            <div className="text-green-200 text-sm space-y-1">
              <div>Message: {serverHealth.message}</div>
              {serverHealth.timestamp && (
                <div>Last Check: {new Date(serverHealth.timestamp).toLocaleString()}</div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
