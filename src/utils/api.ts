const projectId = '';
const publicAnonKey = '';

const API_BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-42dc3039`

interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

class ApiClient {
  private token: string | null = null

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        this.token = localStorage.getItem('auth_token')
      } catch (error) {
        console.warn('Failed to retrieve token from localStorage:', error)
        this.token = null
      }
    }
  }

  setToken(token: string) {
    this.token = token
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('auth_token', token)
      } catch (error) {
        console.warn('Failed to store token in localStorage:', error)
      }
    }
    console.log('Token set successfully:', token.substring(0, 10) + '...')
  }

  clearToken() {
    this.token = null
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('auth_token')
      } catch (error) {
        console.warn('Failed to clear token from localStorage:', error)
      }
    }
  }

  hasToken(): boolean {
    if (typeof window === 'undefined') return !!this.token
    try {
      const storedToken = localStorage.getItem('auth_token')
      return !!(this.token || storedToken)
    } catch (error) {
      console.warn('Failed to check token in localStorage:', error)
      return !!this.token
    }
  }

  getToken(): string | null {
    if (typeof window === 'undefined') return this.token
    try {
      return this.token || localStorage.getItem('auth_token')
    } catch (error) {
      console.warn('Failed to get token from localStorage:', error)
      return this.token
    }
  }

  private async request(endpoint: string, options: RequestInit = {}): Promise<any> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    }

    // Always check for token from localStorage in case it was updated
    if (typeof window !== 'undefined') {
      try {
        const currentToken = localStorage.getItem('auth_token')
        if (currentToken && currentToken !== this.token) {
          this.token = currentToken
          console.log('Token updated from localStorage:', currentToken.substring(0, 10) + '...')
        }
      } catch (error) {
        console.warn('Failed to sync token from localStorage:', error)
      }
    }

    // If we have a stored token, always use it and send the custom-auth flag.
    // This is more reliable than trying to guess which endpoints need auth.
    if (this.token) {
      ; (headers as Record<string, string>)['Authorization'] = `Bearer ${this.token}`
        ; (headers as Record<string, string>)['X-Custom-Auth'] = 'true' // Flag to indicate custom auth for server
      console.log(`Making authenticated request to: ${endpoint} with token: ${this.token?.substring(0, 10)}...`)
    } else {
      // For public endpoints, fall back to the Supabase anon key
      ; (headers as Record<string, string>)['Authorization'] = `Bearer ${publicAnonKey}`
      console.log(`Making public request to: ${endpoint}`)
    }

    const fullUrl = `${API_BASE_URL}${endpoint}`
    console.log(`Request URL: ${fullUrl}`)
    console.log(`Request method: ${options.method || 'GET'}`)
    console.log(`Request headers:`, headers)

    if (options.body) {
      console.log(`Request body:`, options.body)
    }

    try {
      const response = await fetch(fullUrl, {
        ...options,
        headers,
        // Add timeout to prevent hanging
        signal: AbortSignal.timeout(30000) // 30 second timeout
      })

      console.log(`Response status: ${response.status} ${response.statusText}`)

      if (!response.ok) {
        let errorText = ''
        try {
          errorText = await response.text()
          console.error(`Error response body:`, errorText)
        } catch (readError) {
          console.error('Failed to read error response:', readError)
          errorText = `HTTP ${response.status}: ${response.statusText}`
        }

        let errorMessage = `Request failed with status ${response.status}`
        try {
          const errorData = JSON.parse(errorText)
          // Handle both our custom error format and Supabase's format
          errorMessage = errorData.error || errorData.message || errorMessage
        } catch {
          errorMessage = errorText || errorMessage
        }

        // If it's an authentication / session error, clear the token and surface a clearer message.
        const authErrorIndicators = [
          'Unauthorized',
          'Invalid or expired session',
          'This endpoint requires custom authentication',
          'Invalid session'
        ]

        const isAuthError = response.status === 401 || authErrorIndicators.some(ind => errorMessage.includes(ind))
        if (isAuthError) {
          console.log('Authentication/session error detected, clearing token')
          this.clearToken()
          // Provide a specific message so UI can prompt re-login
          const friendly = errorMessage.includes('This endpoint requires custom authentication')
            ? 'Session invalid or missing custom authentication. Please log in again.'
            : errorMessage
          throw new Error(friendly)
        }

        throw new Error(errorMessage)
      }

      const data = await response.json()
      console.log(`Response data:`, data)
      return data
    } catch (error: any) {
      console.error(`Request error for ${endpoint}:`, error)

      // Better error messages for common issues
      if (error.name === 'AbortError' || error.name === 'TimeoutError') {
        throw new Error('Request timeout - please check your internet connection')
      }
      if (error.message === 'Failed to fetch') {
        throw new Error('Network error - please check your internet connection')
      }

      throw error
    }
  }

  // Health check
  async healthCheck() {
    return this.request('/health')
  }

  // Test authentication
  async testAuth() {
    return this.request('/test-auth')
  }

  // Initialize database
  async initDatabase() {
    return this.request('/init')
  }

  // Authentication
  async adminLogin(email: string, password: string) {
    const data = await this.request('/admin/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })

    if (data.success && data.token) {
      this.setToken(data.token)
    }

    return data
  }

  async teacherLogin(email: string, password: string) {
    const data = await this.request('/teacher/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })

    if (data.success && data.token) {
      this.setToken(data.token)
    }

    return data
  }

  async studentRequestOtp(mobileNumber: string) {
    return this.request('/student/request-otp', {
      method: 'POST',
      body: JSON.stringify({ mobileNumber }),
    })
  }

  async studentVerifyOtp(mobileNumber: string, otp: string) {
    const data = await this.request('/student/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ mobileNumber, otp }),
    })

    if (data.success && data.token) {
      this.setToken(data.token)
    }

    return data
  }

  async verifySession() {
    const currentToken = this.getToken()
    if (!currentToken) {
      console.log('No token available for session verification')
      return { success: false, error: 'No token found' }
    }

    console.log('Verifying session with token:', currentToken.substring(0, 10) + '...')

    return this.request('/verify-session', {
      method: 'POST',
      body: JSON.stringify({ token: currentToken }),
    })
  }

  async logout() {
    const result = await this.request('/logout', {
      method: 'POST',
    })

    this.clearToken()
    return result
  }

  // Admin endpoints
  async addTeacher(teacherData: any) {
    return this.request('/admin/teachers', {
      method: 'POST',
      body: JSON.stringify(teacherData),
    })
  }

  async addStudent(studentData: any) {
    return this.request('/admin/students', {
      method: 'POST',
      body: JSON.stringify(studentData),
    })
  }

  // Data endpoints
  async getStudents() {
    return this.request('/students')
  }

  async getTeachers() {
    return this.request('/teachers')
  }

  async generateQrCode(qrData: any) {
    return this.request('/generate-qr', {
      method: 'POST',
      body: JSON.stringify(qrData),
    })
  }

  async markAttendance(qrData: string) {
    return this.request('/mark-attendance', {
      method: 'POST',
      body: JSON.stringify({ qrData }),
    })
  }

  async getAttendanceRecords() {
    return this.request('/attendance')
  }

  async getQrSessionStatus(sessionId: string) {
    return this.request(`/qr-session/${sessionId}`)
  }

  async deleteStudent(studentId: string) {
    return this.request(`/admin/students/${studentId}`, { method: 'DELETE' })
  }

  async deleteTeacher(teacherId: string) {
    return this.request(`/admin/teachers/${teacherId}`, { method: 'DELETE' })
  }

  async updateStudent(studentId: string, data: any) {
    return this.request(`/admin/students/${studentId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async updateTeacher(teacherId: string, data: any) {
    return this.request(`/admin/teachers/${teacherId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }
}

const realApiClient = new ApiClient()

// If running locally (development on localhost), use a lightweight localStorage-backed
// mock API client so the app doesn't depend on Supabase or remote functions.
const isLocal = (() => {
  if (typeof window === 'undefined') return false
  const host = window.location.hostname
  const search = window.location.search || ''

  // Explicit override via query param: ?useMock=1
  if (search.includes('useMock=1')) return true

  // Localhost and loopback
  if (host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0') return true

  // Private LAN ranges (so other devices on your Wi‑Fi/LAN will also use the mock)
  // 10.x.x.x, 192.168.x.x, 172.16.x.x - 172.31.x.x
  if (/^10\./.test(host)) return true
  if (/^192\.168\./.test(host)) return true
  if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host)) return true

  return false
})()

class MockApiClient {
  private token: string | null = null

  constructor() {
    if (typeof window !== 'undefined') {
      try { this.token = localStorage.getItem('auth_token') } catch { this.token = null }
    }
    // Ensure basic DB seeded
    this.ensureSeed()
  }

  private safeGet(key: string) {
    try {
      const raw = localStorage.getItem(key)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  }

  private safeSet(key: string, val: any) {
    try { localStorage.setItem(key, JSON.stringify(val)) } catch { }
  }

  private ensureSeed() {
    const admins = this.safeGet('ldb_admins')
    if (!admins) {
      this.safeSet('ldb_admins', [
        { id: 'admin1', email: 'admin@college.edu', password: 'admin123', name: 'System Administrator', role: 'admin', createdAt: new Date().toISOString() }
      ])
    }
    // Seed a demo teacher for testing login
    const teachersSeed = this.safeGet('ldb_teachers')
    if (!teachersSeed) {
      this.safeSet('ldb_teachers', [
        { id: 'teacher1', name: 'Demo Teacher', email: 'teacher@college.edu', password: 'teacher123', subjects: ['Math'], assignedClasses: [], role: 'teacher', createdAt: new Date().toISOString() }
      ])
    }
    if (!this.safeGet('ldb_teachers')) this.safeSet('ldb_teachers', [])
    if (!this.safeGet('ldb_students')) this.safeSet('ldb_students', [])
    if (!this.safeGet('ldb_active_sessions')) this.safeSet('ldb_active_sessions', [])
    if (!this.safeGet('ldb_attendance_records')) this.safeSet('ldb_attendance_records', [])
    if (!this.safeGet('ldb_qr_sessions')) this.safeSet('ldb_qr_sessions', [])
    if (!this.safeGet('ldb_otp_records')) this.safeSet('ldb_otp_records', [])
  }

  setToken(token: string) {
    this.token = token
    try { localStorage.setItem('auth_token', token) } catch { }
  }

  clearToken() {
    this.token = null
    try { localStorage.removeItem('auth_token') } catch { }
  }

  hasToken() {
    try { return !!(this.token || localStorage.getItem('auth_token')) } catch { return !!this.token }
  }

  getToken() {
    try { return this.token || localStorage.getItem('auth_token') } catch { return this.token }
  }

  async request(p: string, opts: any = {}) {
    // Very small emulation: route by endpoint
    const endpoint = p
    // small delay to emulate network
    await new Promise(r => setTimeout(r, 120))

    try {
      // health
      if (endpoint === '/health') return { success: true, message: 'local mock healthy' }

      // init - seed DB (idempotent)
      if (endpoint === '/init') {
        // ensureSeed already called in constructor, return success
        return { success: true, message: 'Local mock database initialized' }
      }

      // test-auth - return info about the current token/session
      if (endpoint === '/test-auth') {
        const auth = this.getToken()
        const sessions = this.safeGet('ldb_active_sessions') || []
        const session = auth ? sessions.find((s: any) => s.token === auth && new Date() <= new Date(s.expiresAt)) : null
        return { success: !!session, hasCustomAuth: !!auth, session: session || null }
      }

      // admin login
      if (endpoint === '/admin/login' && opts.method === 'POST') {
        const { email, password } = JSON.parse(opts.body)
        const admins = this.safeGet('ldb_admins') || []
        const admin = admins.find((a: any) => a.email === email && a.password === password)
        if (!admin) return { error: 'Invalid credentials' }
        const token = 'local_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8)
        const expiresAt = new Date(); expiresAt.setHours(expiresAt.getHours() + 8)
        const session = { token, userId: admin.id, role: 'admin', expiresAt: expiresAt.toISOString(), createdAt: new Date().toISOString() }
        const sessions = this.safeGet('ldb_active_sessions') || []
        sessions.push(session); this.safeSet('ldb_active_sessions', sessions)
        this.setToken(token)
        return { success: true, token, user: { id: admin.id, name: admin.name, role: admin.role }, expiresAt: expiresAt.toISOString() }
      }

      // teacher login
      if (endpoint === '/teacher/login' && opts.method === 'POST') {
        const { email, password } = JSON.parse(opts.body)
        const teachers = this.safeGet('ldb_teachers') || []
        const teacher = teachers.find((t: any) => t.email === email && t.password === password)
        if (!teacher) return { error: 'Invalid credentials' }

        const token = 'local_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8)
        const expiresAt = new Date(); expiresAt.setHours(expiresAt.getHours() + 8)
        const session = { token, userId: teacher.id, role: 'teacher', expiresAt: expiresAt.toISOString(), createdAt: new Date().toISOString() }
        const sessions = this.safeGet('ldb_active_sessions') || []
        sessions.push(session); this.safeSet('ldb_active_sessions', sessions)
        this.setToken(token)
        return { success: true, token, user: { id: teacher.id, name: teacher.name, role: teacher.role, subjects: teacher.subjects, assignedClasses: teacher.assignedClasses }, expiresAt: expiresAt.toISOString() }
      }

      // delete student
      if (endpoint.match(/^\/admin\/students\/([^/]+)$/) && opts.method === 'DELETE') {
        const id = endpoint.split('/').pop()
        const students = this.safeGet('ldb_students') || []
        const updated = students.filter((s: any) => s.id !== id)
        this.safeSet('ldb_students', updated)
        return { success: true, message: 'Student deleted successfully' }
      }

      // delete teacher
      if (endpoint.match(/^\/admin\/teachers\/([^/]+)$/) && opts.method === 'DELETE') {
        const id = endpoint.split('/').pop()
        const teachers = this.safeGet('ldb_teachers') || []
        const updated = teachers.filter((t: any) => t.id !== id)
        this.safeSet('ldb_teachers', updated)
        return { success: true, message: 'Teacher deleted successfully' }
      }

      // update student
      if (endpoint.match(/^\/admin\/students\/([^/]+)$/) && opts.method === 'PUT') {
        const id = endpoint.split('/').pop()
        const updates = JSON.parse(opts.body)
        const students = this.safeGet('ldb_students') || []
        const index = students.findIndex((s: any) => s.id === id)
        if (index === -1) return { error: 'Student not found' }

        students[index] = { ...students[index], ...updates, id }
        this.safeSet('ldb_students', students)
        return { success: true, student: students[index] }
      }

      // update teacher
      if (endpoint.match(/^\/admin\/teachers\/([^/]+)$/) && opts.method === 'PUT') {
        const id = endpoint.split('/').pop()
        const updates = JSON.parse(opts.body)
        const teachers = this.safeGet('ldb_teachers') || []
        const index = teachers.findIndex((t: any) => t.id === id)
        if (index === -1) return { error: 'Teacher not found' }

        teachers[index] = { ...teachers[index], ...updates, id }
        this.safeSet('ldb_teachers', teachers)
        return { success: true, teacher: teachers[index] }
      }

      // Student OTP request
      if (endpoint === '/student/request-otp' && opts.method === 'POST') {
        const { mobileNumber } = JSON.parse(opts.body)
        if (!mobileNumber) return { error: 'Missing mobile number' }

        // Ensure student exists (create if not)
        const students = this.safeGet('ldb_students') || []
        let student = students.find((s: any) => s.mobileNumber === mobileNumber)
        if (!student) {
          student = { id: 's_' + Date.now(), name: `Student ${mobileNumber}`, prn: '', rollNumber: '', mobileNumber, department: '', class: '', division: '', role: 'student' }
          students.push(student)
          this.safeSet('ldb_students', students)
        }

        // Generate OTP and store
        const otp = Math.floor(100000 + Math.random() * 900000).toString()
        const expiresAt = new Date(); expiresAt.setMinutes(expiresAt.getMinutes() + 5)
        const otpRecord = { mobileNumber, otp, studentId: student.id, expiresAt: expiresAt.toISOString(), createdAt: new Date().toISOString(), verified: false }
        const otpRecords = this.safeGet('ldb_otp_records') || []
        // remove existing OTPs for this number
        const filtered = otpRecords.filter((o: any) => o.mobileNumber !== mobileNumber)
        filtered.push(otpRecord)
        this.safeSet('ldb_otp_records', filtered)

        // For development return the OTP so user can enter it
        return { success: true, otp }
      }

      // Student OTP verify
      if (endpoint === '/student/verify-otp' && opts.method === 'POST') {
        const { mobileNumber, otp } = JSON.parse(opts.body)
        if (!mobileNumber || !otp) return { error: 'Missing fields' }

        const otpRecords = this.safeGet('ldb_otp_records') || []
        const record = otpRecords.find((o: any) => o.mobileNumber === mobileNumber && o.otp === otp && !o.verified && new Date() <= new Date(o.expiresAt))
        if (!record) return { error: 'Invalid or expired OTP' }

        // Mark OTP verified
        const updated = otpRecords.map((o: any) => (o.mobileNumber === mobileNumber && o.otp === otp) ? { ...o, verified: true } : o)
        this.safeSet('ldb_otp_records', updated)

        // Ensure student exists
        const students = this.safeGet('ldb_students') || []
        const student = students.find((s: any) => s.id === record.studentId) || students.find((s: any) => s.mobileNumber === mobileNumber)
        if (!student) return { error: 'Student not found' }

        // Create 1-year session
        const token = 'local_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8)
        const expiresAt = new Date(); expiresAt.setFullYear(expiresAt.getFullYear() + 1)
        const session = { token, userId: student.id, role: 'student', expiresAt: expiresAt.toISOString(), createdAt: new Date().toISOString(), permanent: true }
        const sessions = this.safeGet('ldb_active_sessions') || []
        // remove existing sessions for this student
        const filteredSessions = sessions.filter((s: any) => s.userId !== student.id)
        filteredSessions.push(session)
        this.safeSet('ldb_active_sessions', filteredSessions)
        this.setToken(token)

        return { success: true, token, user: { id: student.id, name: student.name, role: 'student', prn: student.prn, rollNumber: student.rollNumber, department: student.department, class: student.class, division: student.division }, expiresAt: expiresAt.toISOString(), permanent: true }
      }

      // verify session
      if (endpoint === '/verify-session' && opts.method === 'POST') {
        const { token } = JSON.parse(opts.body)
        const sessions = this.safeGet('ldb_active_sessions') || []
        const session = sessions.find((s: any) => s.token === token && new Date() <= new Date(s.expiresAt))
        if (!session) return { error: 'Invalid or expired session' }
        // return user data
        if (session.role === 'admin') {
          const admins = this.safeGet('ldb_admins') || []
          const user = admins.find((a: any) => a.id === session.userId)
          return { success: true, user, session }
        }
        if (session.role === 'teacher') {
          const teachers = this.safeGet('ldb_teachers') || []
          const user = teachers.find((t: any) => t.id === session.userId)
          return { success: true, user, session }
        }
        if (session.role === 'student') {
          const students = this.safeGet('ldb_students') || []
          const user = students.find((s: any) => s.id === session.userId)
          return { success: true, user, session }
        }
      }

      // add teacher (admin only)
      if (endpoint === '/admin/teachers' && opts.method === 'POST') {
        // require token
        const auth = this.getToken()
        if (!auth) return { error: 'This endpoint requires custom authentication' }
        const sessions = this.safeGet('ldb_active_sessions') || []
        const session = sessions.find((s: any) => s.token === auth && s.role === 'admin' && new Date() <= new Date(s.expiresAt))
        if (!session) return { error: 'Unauthorized - Invalid or expired session' }
        const teacherData = JSON.parse(opts.body)
        if (!teacherData.name || !teacherData.email || !teacherData.password) return { error: 'Missing required fields', success: false }
        const teachers = this.safeGet('ldb_teachers') || []
        if (teachers.find((t: any) => t.email === teacherData.email)) return { error: 'Teacher with this email already exists' }
        const newTeacher = { id: 't_' + Date.now(), ...teacherData, role: 'teacher', createdAt: new Date().toISOString(), createdBy: session.userId }
        teachers.push(newTeacher); this.safeSet('ldb_teachers', teachers)
        return { success: true, teacher: newTeacher }
      }

      // get teachers
      if (endpoint === '/teachers' && opts.method === 'GET') {
        const auth = this.getToken()
        if (!auth) return { error: 'No authorization token provided' }
        const sessions = this.safeGet('ldb_active_sessions') || []
        const session = sessions.find((s: any) => s.token === auth && new Date() <= new Date(s.expiresAt))
        if (!session || session.role !== 'admin') return { error: 'Unauthorized - Admin access required' }
        const teachers = this.safeGet('ldb_teachers') || []
        return { success: true, teachers }
      }

      // get students
      if (endpoint === '/students' && opts.method === 'GET') {
        const auth = this.getToken()
        if (!auth) return { error: 'No authorization token provided' }
        const sessions = this.safeGet('ldb_active_sessions') || []
        const session = sessions.find((s: any) => s.token === auth && new Date() <= new Date(s.expiresAt))
        if (!session) return { error: 'Unauthorized - Invalid or expired session' }
        const students = this.safeGet('ldb_students') || []
        if (session.role === 'teacher') {
          const teachers = this.safeGet('ldb_teachers') || []
          const teacher = teachers.find((t: any) => t.id === session.userId)
          if (teacher && teacher.assignedClasses) {
            const filtered = students.filter((st: any) => teacher.assignedClasses.some((cls: any) => cls.class === st.class && cls.division === st.division))
            return { success: true, students: filtered }
          }
        }
        return { success: true, students }
      }

      // add student (admin)
      if (endpoint === '/admin/students' && opts.method === 'POST') {
        const auth = this.getToken()
        if (!auth) return { error: 'This endpoint requires custom authentication' }
        const sessions = this.safeGet('ldb_active_sessions') || []
        const session = sessions.find((s: any) => s.token === auth && s.role === 'admin' && new Date() <= new Date(s.expiresAt))
        if (!session) return { error: 'Unauthorized - Invalid or expired session' }
        const studentData = JSON.parse(opts.body)
        const students = this.safeGet('ldb_students') || []
        const newStudent = { id: 's_' + Date.now(), ...studentData, role: 'student', hasAccess: true, accessValidUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), createdAt: new Date().toISOString(), createdBy: session.userId }
        students.push(newStudent); this.safeSet('ldb_students', students)
        return { success: true, student: newStudent }
      }

      // attendance and other endpoints - minimal implementations
      if (endpoint === '/attendance' && opts.method === 'GET') {
        const auth = this.getToken(); if (!auth) return { error: 'No authorization token provided' }
        const sessions = this.safeGet('ldb_active_sessions') || []
        const session = sessions.find((s: any) => s.token === auth && new Date() <= new Date(s.expiresAt))
        if (!session) return { error: 'Unauthorized - Invalid or expired session' }
        const records = this.safeGet('ldb_attendance_records') || []
        let filtered = records
        if (session.role === 'teacher') filtered = records.filter((r: any) => r.teacherId === session.userId)
        else if (session.role === 'student') filtered = records.filter((r: any) => r.studentId === session.userId)
        return { success: true, records: filtered }
      }

      // generate QR code for attendance session
      if (endpoint === '/generate-qr' && opts.method === 'POST') {
        const auth = this.getToken(); if (!auth) return { error: 'No authorization token provided' }
        const sessions = this.safeGet('ldb_active_sessions') || []
        const session = sessions.find((s: any) => s.token === auth && s.role === 'teacher' && new Date() <= new Date(s.expiresAt))
        if (!session) return { error: 'Unauthorized - Only teachers can generate QR codes' }
        const { subject, class: className, division, duration } = JSON.parse(opts.body)
        const sessionId = 'qr_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8)
        const qrData = JSON.stringify({ sessionId, teacherId: session.userId, subject, class: className, division, duration, createdAt: new Date().toISOString() })
        // Store QR session info
        const qrSessions = this.safeGet('ldb_qr_sessions') || []
        qrSessions.push({ sessionId, teacherId: session.userId, subject, class: className, division, duration, createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + duration * 1000).toISOString(), scannedStudents: [] })
        this.safeSet('ldb_qr_sessions', qrSessions)
        return { success: true, qrData, sessionId }
      }

      // get QR session status (for polling scans)
      if (endpoint.match(/^\/qr-session\//) && opts.method === 'GET') {
        const sessionId = endpoint.split('/').pop()
        const qrSessions = this.safeGet('ldb_qr_sessions') || []
        const qrSession = qrSessions.find((s: any) => s.sessionId === sessionId)
        if (!qrSession) return { error: 'QR session not found' }
        const isActive = new Date() <= new Date(qrSession.expiresAt)
        return { success: true, isActive, scanCount: qrSession.scannedStudents.length, scannedStudents: qrSession.scannedStudents }
      }

      // mark attendance via QR scan
      if (endpoint === '/mark-attendance' && opts.method === 'POST') {
        const auth = this.getToken(); if (!auth) return { error: 'No authorization token provided' }
        const sessions = this.safeGet('ldb_active_sessions') || []
        const session = sessions.find((s: any) => s.token === auth && s.role === 'student' && new Date() <= new Date(s.expiresAt))
        if (!session) return { error: 'Unauthorized - Only students can mark attendance' }
        const { qrData } = JSON.parse(opts.body)
        try {
          const qrInfo = JSON.parse(qrData)
          const qrSessions = this.safeGet('ldb_qr_sessions') || []
          const qrSession = qrSessions.find((s: any) => s.sessionId === qrInfo.sessionId)
          if (!qrSession) return { error: 'QR session expired or not found' }
          if (new Date() > new Date(qrSession.expiresAt)) return { error: 'QR session has expired' }
          // Check if already scanned
          if (qrSession.scannedStudents.some((s: any) => s.studentId === session.userId)) return { error: 'Already marked attendance in this session' }
          // Add student to scanned list
          qrSession.scannedStudents.push({ studentId: session.userId, studentName: 'Student ' + session.userId, timestamp: new Date().toISOString() })
          this.safeSet('ldb_qr_sessions', qrSessions)
          // Create attendance record
          const records = this.safeGet('ldb_attendance_records') || []
          records.push({ id: 'att_' + Date.now(), studentId: session.userId, studentName: 'Student ' + session.userId, studentPrn: 'PRN_' + session.userId, studentRollNumber: 'Roll_' + session.userId, teacherId: qrInfo.teacherId, subject: qrInfo.subject, class: qrInfo.class, division: qrInfo.division, timestamp: new Date().toISOString(), status: 'Present' })
          this.safeSet('ldb_attendance_records', records)
          return { success: true, message: 'Attendance marked successfully' }
        } catch (error) {
          return { error: 'Invalid QR data' }
        }
      }

      // fallback
      return { error: `Unhandled mock endpoint: ${endpoint}` }
    } catch (err: any) {
      return { error: `Mock server error: ${err?.message || String(err)}` }
    }
  }

  // Public API surface used by the app
  async healthCheck() { return this.request('/health') }
  async testAuth() { return this.request('/test-auth') }
  async initDatabase() { return this.request('/init') }
  async adminLogin(email: string, password: string) { return this.request('/admin/login', { method: 'POST', body: JSON.stringify({ email, password }) }) }
  async teacherLogin(email: string, password: string) { return this.request('/teacher/login', { method: 'POST', body: JSON.stringify({ email, password }) }) }
  async studentRequestOtp(mobileNumber: string) { return this.request('/student/request-otp', { method: 'POST', body: JSON.stringify({ mobileNumber }) }) }
  async studentVerifyOtp(mobileNumber: string, otp: string) { return this.request('/student/verify-otp', { method: 'POST', body: JSON.stringify({ mobileNumber, otp }) }) }
  async verifySession() { const t = this.getToken(); return this.request('/verify-session', { method: 'POST', body: JSON.stringify({ token: t }) }) }
  async logout() { const t = this.getToken(); this.clearToken(); return this.request('/logout', { method: 'POST', body: JSON.stringify({ token: t }) }) }
  async addTeacher(teacherData: any) { return this.request('/admin/teachers', { method: 'POST', body: JSON.stringify(teacherData) }) }
  async addStudent(studentData: any) { return this.request('/admin/students', { method: 'POST', body: JSON.stringify(studentData) }) }
  async getStudents() { return this.request('/students', { method: 'GET' }) }
  async getTeachers() { return this.request('/teachers', { method: 'GET' }) }
  async generateQrCode(qrData: any) { return this.request('/generate-qr', { method: 'POST', body: JSON.stringify(qrData) }) }
  async markAttendance(qrData: string) { return this.request('/mark-attendance', { method: 'POST', body: JSON.stringify({ qrData }) }) }
  async getAttendanceRecords() { return this.request('/attendance', { method: 'GET' }) }
  async getQrSessionStatus(sessionId: string) { return this.request(`/qr-session/${sessionId}`, { method: 'GET' }) }
  async deleteStudent(studentId: string) { return this.request(`/admin/students/${studentId}`, { method: 'DELETE' }) }
  async deleteTeacher(teacherId: string) { return this.request(`/admin/teachers/${teacherId}`, { method: 'DELETE' }) }
  async updateStudent(studentId: string, data: any) { return this.request(`/admin/students/${studentId}`, { method: 'PUT', body: JSON.stringify(data) }) }
  async updateTeacher(teacherId: string, data: any) { return this.request(`/admin/teachers/${teacherId}`, { method: 'PUT', body: JSON.stringify(data) }) }
}

// Shared Server API Client - uses centralized backend server for multi-device data sharing
class SharedServerApiClient {
  private token: string | null = null
  private serverUrl: string

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        this.token = localStorage.getItem('auth_token')
      } catch (error) {
        console.warn('Failed to retrieve token:', error)
      }
    }
    // Prefer same-origin API in production, but when developing locally prefer
    // the local express server directly to avoid proxy/hosts resolution issues.
    if (typeof window !== 'undefined') {
      const protocol = window.location.protocol
      const hostname = window.location.hostname
      const port = window.location.port

      // Check if running on Android/Capacitor app
      // Android apps in Capacitor are served from file:// or capacitor://
      const isAndroidApp = window.location.protocol === 'file:' ||
        window.location.protocol === 'capacitor:' ||
        window.location.origin.includes('capacitor')

      if (isAndroidApp) {
        // On Android, use the LAN IP to reach the server
        // Replace this IP with your server's actual LAN IP if different
        this.serverUrl = `http://10.121.225.133:3000/api`
        console.log('📱 Android app detected, using LAN IP:', this.serverUrl)
      } else {
        this.serverUrl = `${protocol}//${hostname}${port ? ':' + port : ''}/api`
      }
    } else {
      // Server-side / CLI fallback
      this.serverUrl = `http://127.0.0.1:3003/api`
    }
    console.log('🔌 API Client initialized, using server:', this.serverUrl)
  }

  // Server-Sent Events support: subscribe to live updates from the unified server
  private _es: EventSource | null = null

  subscribeToUpdates(onMessage: (event: { type: string; payload: any }) => void) {
    if (typeof window === 'undefined') return null
    try {
      // Close previous connection if present
      if (this._es) this._es.close()

      // Build EventSource URL from serverUrl (ensure it points to same origin /api/updates)
      const base = this.serverUrl.replace(/\/api$/, '')
      const url = `${base}/api/updates`
      this._es = new EventSource(url)

      this._es.onmessage = (e: MessageEvent) => {
        try {
          const payload = JSON.parse(e.data)
          onMessage({ type: 'message', payload })
        } catch {
          onMessage({ type: 'message', payload: e.data })
        }
      }

      const listen = (name: string) => {
        this._es!.addEventListener(name, (e: MessageEvent) => {
          try { onMessage({ type: name, payload: JSON.parse((e as any).data) }) } catch { onMessage({ type: name, payload: (e as any).data }) }
        })
      }

      listen('teachers:changed')
      listen('students:changed')
      listen('attendance:changed')
      listen('qr:created')

      this._es.onerror = (err) => { console.warn('EventSource error', err) }
      return this._es
    } catch (err) {
      console.warn('Failed to subscribe to updates', err)
      return null
    }
  }

  unsubscribeFromUpdates() {
    try {
      if (this._es) {
        this._es.close()
        this._es = null
      }
    } catch { }
  }

  setToken(token: string) {
    this.token = token
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('auth_token', token)
      } catch (error) {
        console.warn('Failed to store token:', error)
      }
    }
  }

  clearToken() {
    this.token = null
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('auth_token')
      } catch (error) {
        console.warn('Failed to clear token:', error)
      }
    }
  }

  hasToken(): boolean {
    if (typeof window === 'undefined') return !!this.token
    try {
      const storedToken = localStorage.getItem('auth_token')
      return !!(this.token || storedToken)
    } catch {
      return !!this.token
    }
  }

  getToken(): string | null {
    if (typeof window === 'undefined') return this.token
    try {
      return this.token || localStorage.getItem('auth_token')
    } catch {
      return this.token
    }
  }

  private async request(endpoint: string, options: RequestInit = {}): Promise<any> {
    try {
      const url = `${this.serverUrl}${endpoint}`
      const headers: HeadersInit = { 'Content-Type': 'application/json', ...options.headers }
      const response = await fetch(url, { ...options, headers })

      const text = await response.text()
      try {
        const data = JSON.parse(text)
        return data
      } catch (e) {
        console.error('Failed to parse JSON response:', text)
        throw new Error(`Invalid JSON response from server: ${text.substring(0, 100)}...`)
      }
    } catch (error) {
      console.error('Server request error:', error)
      return { error: String(error) }
    }
  }

  // API methods
  async healthCheck() { return this.request('/health') }
  async testAuth() { return this.request('/test-auth') }
  async initDatabase() { return this.request('/init') }
  async adminLogin(email: string, password: string) { return this.request('/admin/login', { method: 'POST', body: JSON.stringify({ email, password }) }) }
  async teacherLogin(email: string, password: string) { return this.request('/teacher/login', { method: 'POST', body: JSON.stringify({ email, password }) }) }
  async studentRequestOtp(mobileNumber: string) { return this.request('/student/request-otp', { method: 'POST', body: JSON.stringify({ mobileNumber }) }) }
  async studentVerifyOtp(mobileNumber: string, otp: string) { return this.request('/student/verify-otp', { method: 'POST', body: JSON.stringify({ mobileNumber, otp }) }) }
  async verifySession() { const t = this.getToken(); return this.request('/verify-session', { method: 'POST', body: JSON.stringify({ token: t }) }) }
  async logout() { this.clearToken(); return { success: true } }
  async addTeacher(teacherData: any) { return this.request('/admin/teachers', { method: 'POST', body: JSON.stringify(teacherData) }) }
  async addStudent(studentData: any) { return this.request('/admin/students', { method: 'POST', body: JSON.stringify(studentData) }) }
  async getStudents() { return this.request('/students', { method: 'GET' }) }
  async getTeachers() { return this.request('/teachers', { method: 'GET' }) }
  async generateQrCode(qrData: any) { return this.request('/generate-qr', { method: 'POST', body: JSON.stringify(qrData) }) }
  async markAttendance(qrData: string, studentMobileNumber?: string) { return this.request('/mark-attendance', { method: 'POST', body: JSON.stringify({ qrData, studentMobileNumber }) }) }
  async getAttendanceRecords() { return this.request('/attendance', { method: 'GET' }) }
  async getQrSessionStatus(sessionId: string) { return this.request(`/qr-session/${sessionId}`, { method: 'GET' }) }
  async deleteStudent(studentId: string) { return this.request(`/admin/students/${studentId}`, { method: 'DELETE' }) }
  async deleteTeacher(teacherId: string) { return this.request(`/admin/teachers/${teacherId}`, { method: 'DELETE' }) }
  async updateStudent(studentId: string, data: any) { return this.request(`/admin/students/${studentId}`, { method: 'PUT', body: JSON.stringify(data) }) }
  async updateTeacher(teacherId: string, data: any) { return this.request(`/admin/teachers/${teacherId}`, { method: 'PUT', body: JSON.stringify(data) }) }
}

// Export a client that uses the shared server (works across all devices)
export const apiClientInstance: any = new SharedServerApiClient()

// For backwards-compatibility, replace the exported name used across the app
export { apiClientInstance as apiClient }

// User types
export interface User {
  id: string
  name: string
  role: 'admin' | 'teacher' | 'student'
  email?: string
  mobileNumber?: string
  prn?: string
  rollNumber?: string
  department?: string
  class?: string
  division?: string
  subjects?: string[]
  assignedClasses?: { class: string; division: string }[]
}

export interface Student {
  id: string
  name: string
  prn: string
  rollNumber: string
  mobileNumber: string
  studentEmail?: string
  department: string
  class: string
  division: string
  hasAccess: boolean
  accessValidUntil: string
  role: 'student'
  internships?: InternshipRecord[]
  skills?: SkillRecord[]
  practicals?: PracticalRecord[]
  assignments?: AssignmentRecord[]
  internalExams?: InternalExamRecord[]
}

export interface InternshipRecord {
  id: string;
  company: string;
  role: string;
  duration: string;
  description: string;
}

export interface SkillRecord {
  id: string;
  skillName: string;
  proficiency: string;
}

export interface PracticalRecord {
  id: string;
  subject: string;
  experimentName: string;
  date: string;
  marks: string;
}

export interface AssignmentRecord {
  id: string;
  subject: string;
  assignmentName: string;
  date: string;
  marks: string;
}

export interface InternalExamRecord {
  id: string;
  subject: string;
  semester: string;
  exam1: string;
  exam2: string;
  exam3: string;
}

export interface Teacher {
  id: string
  name: string
  email: string
  password: string
  subjects: string[]
  assignedClasses: { class: string; division: string }[]
  role: 'teacher'
}

export interface AttendanceRecord {
  id: string
  studentId: string
  studentName: string
  studentPrn: string
  studentRollNumber: string
  sessionId: string
  subject: string
  class: string
  division: string
  teacherId: string
  timestamp: string
  status: 'present' | 'absent'
}