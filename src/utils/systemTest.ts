import { apiClient } from './api'

export interface SystemTestResult {
  test: string
  status: 'pass' | 'fail' | 'warning'
  message: string
  details?: any
}

export class SystemTester {
  private results: SystemTestResult[] = []

  async runAllTests(): Promise<SystemTestResult[]> {
    this.results = []
    
    console.log('🧪 Starting System Tests...')
    
    await this.testServerHealth()
    await this.testDatabaseInit()
    await this.testBrowserCompatibility()
    await this.testLocalStorage()
    await this.testNetworkConnection()
    await this.testCameraAvailability()
    
    console.log('✅ System Tests Complete')
    console.table(this.results)
    
    return this.results
  }

  private addResult(test: string, status: 'pass' | 'fail' | 'warning', message: string, details?: any) {
    this.results.push({ test, status, message, details })
    const icon = status === 'pass' ? '✅' : status === 'fail' ? '❌' : '⚠️'
    console.log(`${icon} ${test}: ${message}`)
  }

  private async testServerHealth() {
    try {
      const response = await apiClient.healthCheck()
      if (response.success) {
        this.addResult('Server Health', 'pass', 'Server is running', response)
      } else {
        this.addResult('Server Health', 'fail', 'Server returned unsuccessful response', response)
      }
    } catch (error: any) {
      this.addResult('Server Health', 'fail', `Server not reachable: ${error.message}`, error)
    }
  }

  private async testDatabaseInit() {
    try {
      const response = await apiClient.initDatabase()
      if (response.success || response.message?.includes('already initialized')) {
        this.addResult('Database Init', 'pass', 'Database is initialized', response)
      } else {
        this.addResult('Database Init', 'warning', 'Database init returned unexpected response', response)
      }
    } catch (error: any) {
      this.addResult('Database Init', 'fail', `Database init failed: ${error.message}`, error)
    }
  }

  private testBrowserCompatibility() {
    const checks = {
      localStorage: typeof localStorage !== 'undefined',
      fetch: typeof fetch !== 'undefined',
      promises: typeof Promise !== 'undefined',
      crypto: typeof crypto !== 'undefined',
      mediaDevices: typeof navigator.mediaDevices !== 'undefined'
    }

    const failed = Object.entries(checks).filter(([_, supported]) => !supported)
    
    if (failed.length === 0) {
      this.addResult('Browser Compatibility', 'pass', 'All required features supported', checks)
    } else {
      this.addResult(
        'Browser Compatibility', 
        'fail', 
        `Missing features: ${failed.map(([name]) => name).join(', ')}`,
        checks
      )
    }
  }

  private testLocalStorage() {
    try {
      const testKey = '__system_test__'
      localStorage.setItem(testKey, 'test')
      const value = localStorage.getItem(testKey)
      localStorage.removeItem(testKey)
      
      if (value === 'test') {
        this.addResult('LocalStorage', 'pass', 'LocalStorage working correctly')
      } else {
        this.addResult('LocalStorage', 'fail', 'LocalStorage read/write failed')
      }
    } catch (error: any) {
      this.addResult('LocalStorage', 'fail', `LocalStorage error: ${error.message}`, error)
    }
  }

  private async testNetworkConnection() {
    if (typeof navigator.onLine !== 'undefined') {
      if (navigator.onLine) {
        this.addResult('Network Connection', 'pass', 'Browser reports online')
      } else {
        this.addResult('Network Connection', 'fail', 'Browser reports offline')
      }
    } else {
      this.addResult('Network Connection', 'warning', 'Cannot determine network status')
    }
  }

  private async testCameraAvailability() {
    if (typeof navigator.mediaDevices === 'undefined') {
      this.addResult('Camera', 'fail', 'MediaDevices API not available')
      return
    }

    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      const cameras = devices.filter(device => device.kind === 'videoinput')
      
      if (cameras.length > 0) {
        this.addResult('Camera', 'pass', `${cameras.length} camera(s) detected`, cameras)
      } else {
        this.addResult('Camera', 'warning', 'No cameras detected')
      }
    } catch (error: any) {
      this.addResult('Camera', 'warning', `Camera check failed: ${error.message}`, error)
    }
  }

  async testAuthentication() {
    const token = apiClient.getToken()
    
    if (!token) {
      this.addResult('Authentication', 'warning', 'No auth token found (not logged in)')
      return
    }

    try {
      const response = await apiClient.verifySession()
      if (response.success) {
        this.addResult('Authentication', 'pass', 'Session is valid', response.user)
      } else {
        this.addResult('Authentication', 'fail', 'Session invalid or expired', response)
      }
    } catch (error: any) {
      this.addResult('Authentication', 'fail', `Session verification failed: ${error.message}`, error)
    }
    
    return this.results
  }

  async quickHealthCheck(): Promise<boolean> {
    try {
      const health = await apiClient.healthCheck()
      return health.success === true
    } catch {
      return false
    }
  }

  getTestSummary(): { passed: number; failed: number; warnings: number; total: number } {
    return {
      passed: this.results.filter(r => r.status === 'pass').length,
      failed: this.results.filter(r => r.status === 'fail').length,
      warnings: this.results.filter(r => r.status === 'warning').length,
      total: this.results.length
    }
  }
}

// Export singleton instance
export const systemTester = new SystemTester()

// Add to window for console access
if (typeof window !== 'undefined') {
  (window as any).systemTester = systemTester
  console.log('💡 System Tester available! Run: systemTester.runAllTests()')
}
