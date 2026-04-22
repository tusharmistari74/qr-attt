import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { useAuth } from '../contexts/AuthContext'
import { apiClient, AttendanceRecord } from '../utils/api'
import { safeSlice } from '../utils/arrayUtils'
import { 
  Smartphone, 
  QrCode, 
  Calendar, 
  Clock, 
  LogOut,
  Camera,
  CheckCircle,
  XCircle,
  User,
  BookOpen,
  TrendingUp,
  History
} from 'lucide-react'
import { Html5QrcodeScanner } from 'html5-qrcode'
import { StudentRecordsPanel } from './StudentRecordsPanel'

export function StudentDashboard() {
  const { user, logout } = useAuth()
  const [activeTab, setActiveTab] = useState('scanner')
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
  const [isScanning, setIsScanning] = useState(false)
  const [scanResult, setScanResult] = useState<string | null>(null)
  const [scanStatus, setScanStatus] = useState<'success' | 'error' | null>(null)
  const [scanMessage, setScanMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const scannerRef = useRef<HTMLDivElement>(null)
  const html5QrcodeScannerRef = useRef<Html5QrcodeScanner | null>(null)

  useEffect(() => {
    loadAttendanceRecords()
    apiClient.subscribeToUpdates((event) => {
      console.log('📡 Student received update:', event.type, event.payload)
      if (event.type === 'attendance:changed') {
        loadAttendanceRecords()
      } else if (event.type === 'qr:created') {
        console.log('New QR session created for:', event.payload.subject)
      }
    })
    return () => {
      apiClient.unsubscribeFromUpdates()
    }
  }, [])

  useEffect(() => {
    if (activeTab === 'scanner' && !isScanning) {
      initializeScanner()
    } else if (activeTab !== 'scanner' && html5QrcodeScannerRef.current) {
      stopScanner()
    }

    return () => {
      stopScanner()
    }
  }, [activeTab])

  const loadAttendanceRecords = async () => {
    try {
      const response = await apiClient.getAttendanceRecords()
      if (response.success) {
        setAttendanceRecords(response.records)
      }
    } catch (error) {
      console.error('Error loading attendance records:', error)
    }
  }

  const initializeScanner = () => {
    if (scannerRef.current && !html5QrcodeScannerRef.current) {
      const html5QrcodeScanner = new Html5QrcodeScanner(
        'qr-reader',
        {
          fps: 10,
          qrbox: {
            width: 250,
            height: 250,
          },
          aspectRatio: 1.0,
        },
        false
      )

      html5QrcodeScanner.render(onScanSuccess, onScanFailure)
      html5QrcodeScannerRef.current = html5QrcodeScanner
      setIsScanning(true)
      console.log('✅ QR Scanner initialized successfully')
    }
  }

  const stopScanner = () => {
    if (html5QrcodeScannerRef.current) {
      html5QrcodeScannerRef.current.clear()
      html5QrcodeScannerRef.current = null
      setIsScanning(false)
    }
  }

  const onScanSuccess = async (decodedText: string) => {
    setScanResult(decodedText)
    setIsLoading(true)
    
    try {
      // Send QR data along with student's mobile number
      const response = await apiClient.markAttendance(decodedText, user?.mobileNumber || '')
      
      if (response.success) {
        setScanStatus('success')
        setScanMessage(`✅ Attendance marked for ${response.studentName}!`)
        await loadAttendanceRecords() // Refresh attendance records
        
        // Auto-close scanner after successful scan
        setTimeout(() => {
          setScanResult(null)
          setScanStatus(null)
          setScanMessage('')
          // Stop scanner to prevent rapid re-scanning
          stopScanner()
        }, 3000)
      } else {
        setScanStatus('error')
        // Check for specific error types
        if (response.error?.includes('already marked') || response.error?.includes('one subject per day')) {
          setScanMessage('You already scanned for this subject today. One subject per day allowed.')
        } else if (response.error?.includes('not found')) {
          setScanMessage('Student not registered. Contact your administrator.')
        } else {
          setScanMessage(response.error || 'Failed to mark attendance')
        }
      }
    } catch (error) {
      setScanStatus('error')
      setScanMessage('Failed to mark attendance. Please try again.')
      console.error('Attendance marking error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const onScanFailure = (error: string) => {
    // Don't log every scan failure as it's normal during scanning
    if (!error.includes('No QR code found')) {
      console.log('QR scan error:', error)
    }
  }

  const retryScanning = () => {
    setScanResult(null)
    setScanStatus(null)
    setScanMessage('')
    initializeScanner()
  }

  const todayAttendance = attendanceRecords.filter(
    record => new Date(record.timestamp).toDateString() === new Date().toDateString()
  )

  const thisWeekAttendance = attendanceRecords.filter(record => {
    const recordDate = new Date(record.timestamp)
    const weekStart = new Date()
    weekStart.setDate(weekStart.getDate() - weekStart.getDay())
    weekStart.setHours(0, 0, 0, 0)
    return recordDate >= weekStart
  })

  const attendanceRate = attendanceRecords.length > 0 ? 
    Math.round((attendanceRecords.filter(r => r.status === 'present').length / attendanceRecords.length) * 100) : 0

  // Group attendance by subject
  const subjectWiseAttendance = attendanceRecords.reduce((acc, record) => {
    if (!acc[record.subject]) {
      acc[record.subject] = {
        total: 0,
        present: 0,
        records: []
      }
    }
    acc[record.subject].total++
    if (record.status === 'present') {
      acc[record.subject].present++
    }
    acc[record.subject].records.push(record)
    return acc
  }, {} as Record<string, { total: number; present: number; records: AttendanceRecord[] }>)

  // Calculate subject-wise rates
  const subjectStats = Object.entries(subjectWiseAttendance).map(([subject, data]) => ({
    subject,
    total: data.total,
    present: data.present,
    rate: Math.round((data.present / data.total) * 100),
    records: data.records.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  })).sort((a, b) => b.rate - a.rate)

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#3B0A45] to-[#2B0230] p-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-[#D9D9D9] text-black rounded-lg px-4 py-2">
            <Smartphone size={20} />
            <span className="font-bold uppercase text-sm">STUDENT APP</span>
          </div>
          <div className="text-white">
            <h2 className="text-lg font-bold">{user?.name}</h2>
            <p className="text-white/70 text-sm">PRN: {user?.prn}</p>
          </div>
        </div>
        
        <Button
          onClick={logout}
          variant="outline"
          size="sm"
          className="bg-transparent border-white/20 text-white hover:bg-white/10"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Card className="bg-white/10 backdrop-blur-md border-white/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-xs">Today</p>
                  <p className="text-white text-xl font-bold">{todayAttendance.length}</p>
                </div>
                <Calendar className="text-white/70 h-6 w-6" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <Card className="bg-white/10 backdrop-blur-md border-white/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-xs">This Week</p>
                  <p className="text-white text-xl font-bold">{thisWeekAttendance.length}</p>
                </div>
                <Clock className="text-white/70 h-6 w-6" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <Card className="bg-white/10 backdrop-blur-md border-white/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-xs">Subjects</p>
                  <p className="text-white text-xl font-bold">{Object.keys(subjectWiseAttendance).length}</p>
                </div>
                <BookOpen className="text-white/70 h-6 w-6" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
        >
          <Card className="bg-white/10 backdrop-blur-md border-white/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-xs">Rate</p>
                  <p className="text-white text-xl font-bold">{attendanceRate}%</p>
                </div>
                <TrendingUp className="text-white/70 h-6 w-6" />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Navigation Tabs */}
      <div className="grid grid-cols-2 md:grid-cols-4 bg-white/10 rounded-lg p-1 mb-6">
        <Button
          onClick={() => setActiveTab('scanner')}
          variant={activeTab === 'scanner' ? 'default' : 'ghost'}
          className={`${activeTab === 'scanner' 
            ? 'bg-white text-[#3B0A45]' 
            : 'bg-transparent text-white hover:bg-white/10'
          } font-bold uppercase text-xs`}
        >
          <QrCode className="mr-1 h-3 w-3" />
          Scanner
        </Button>
        <Button
          onClick={() => setActiveTab('subjects')}
          variant={activeTab === 'subjects' ? 'default' : 'ghost'}
          className={`${activeTab === 'subjects' 
            ? 'bg-white text-[#3B0A45]' 
            : 'bg-transparent text-white hover:bg-white/10'
          } font-bold uppercase text-xs`}
        >
          <BookOpen className="mr-1 h-3 w-3" />
          Subjects
        </Button>
        <Button
          onClick={() => setActiveTab('history')}
          variant={activeTab === 'history' ? 'default' : 'ghost'}
          className={`${activeTab === 'history' 
            ? 'bg-white text-[#3B0A45]' 
            : 'bg-transparent text-white hover:bg-white/10'
          } font-bold uppercase text-xs`}
        >
          <History className="mr-1 h-3 w-3" />
          History
        </Button>
        <Button
          onClick={() => setActiveTab('profile')}
          variant={activeTab === 'profile' ? 'default' : 'ghost'}
          className={`${activeTab === 'profile' 
            ? 'bg-white text-[#3B0A45]' 
            : 'bg-transparent text-white hover:bg-white/10'
          } font-bold uppercase text-xs`}
        >
          <User className="mr-1 h-3 w-3" />
          Profile
        </Button>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {/* QR Scanner Tab */}
        {activeTab === 'scanner' && (
          <motion.div
            key="scanner"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="bg-white/10 backdrop-blur-md border-white/20">
              <CardHeader className="text-center">
                <CardTitle className="text-white flex items-center justify-center gap-2">
                  <Camera size={20} />
                  Scan QR Code for Attendance
                </CardTitle>
                <CardDescription className="text-white/70">
                  Point your camera at the QR code displayed by your teacher
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Scanner Container */}
                <div className="relative mb-6">
                  <div 
                    id="qr-reader" 
                    ref={scannerRef}
                    className="w-full max-w-md mx-auto rounded-lg overflow-hidden"
                  />
                  
                  {/* Scanner Overlay */}
                  {isScanning && !scanResult && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-48 h-48 border-2 border-white/50 rounded-lg"></div>
                    </div>
                  )}
                </div>

                {/* Manual QR Code Entry (Fallback) */}
                {!isScanning && (
                  <div className="mb-6 p-4 bg-white/5 rounded-lg border border-white/20">
                    <p className="text-white/70 text-sm mb-3">📱 Camera not available? Enter QR code manually:</p>
                    <input
                      type="text"
                      placeholder="Paste QR code data here or type the QR code..."
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white placeholder:text-white/50 focus:outline-none focus:border-white/40"
                      onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => {
                        if (e.key === 'Enter' && e.currentTarget.value) {
                          onScanSuccess(e.currentTarget.value)
                          e.currentTarget.value = ''
                        }
                      }}
                    />
                    <p className="text-white/50 text-xs mt-2">Press Enter to submit</p>
                  </div>
                )}

                {/* Scan Result */}
                <AnimatePresence>
                  {scanResult && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="text-center"
                    >
                      {isLoading ? (
                        <div className="p-6 bg-white/10 rounded-lg">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
                          <p className="text-white">Processing attendance...</p>
                        </div>
                      ) : (
                        <div className={`p-6 rounded-lg ${
                          scanStatus === 'success' 
                            ? 'bg-green-500/20 border border-green-500/30' 
                            : 'bg-red-500/20 border border-red-500/30'
                        }`}>
                          {scanStatus === 'success' ? (
                            <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-4" />
                          ) : (
                            <XCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
                          )}
                          <p className={`text-lg font-bold mb-2 ${
                            scanStatus === 'success' ? 'text-green-300' : 'text-red-300'
                          }`}>
                            {scanMessage}
                          </p>
                          
                          {scanStatus === 'error' && (
                            <Button
                              onClick={retryScanning}
                              className="mt-4 bg-[#D9D9D9] text-black hover:bg-[#C0C0C0] font-bold uppercase"
                            >
                              Try Again
                            </Button>
                          )}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Instructions */}
                {!scanResult && isScanning && (
                  <div className="text-center text-white/70 text-sm">
                    <p className="mb-2">• Make sure the QR code is clearly visible</p>
                    <p className="mb-2">• Hold your device steady</p>
                    <p>• Ensure good lighting conditions</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Subjects Tab */}
        {activeTab === 'subjects' && (
          <motion.div
            key="subjects"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="bg-white/10 backdrop-blur-md border-white/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <BookOpen size={20} />
                  Subject-wise Attendance
                </CardTitle>
                <CardDescription className="text-white/70">
                  Your attendance rate for each subject
                </CardDescription>
              </CardHeader>
              <CardContent>
                {subjectStats.length > 0 ? (
                  <div className="space-y-4">
                    {subjectStats.map(stat => (
                      <motion.div
                        key={stat.subject}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="p-4 bg-white/5 rounded-lg"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="text-white font-bold text-lg">{stat.subject}</h3>
                            <p className="text-white/70 text-sm">
                              {stat.present} present out of {stat.total} classes
                            </p>
                          </div>
                          <div className="text-right">
                            <div className={`text-2xl font-bold ${
                              stat.rate >= 75 ? 'text-green-400' : 
                              stat.rate >= 50 ? 'text-yellow-400' : 'text-red-400'
                            }`}>
                              {stat.rate}%
                            </div>
                            <Badge 
                              variant="outline" 
                              className={`${
                                stat.rate >= 75 ? 'border-green-500/50 text-green-400' : 
                                stat.rate >= 50 ? 'border-yellow-500/50 text-yellow-400' : 
                                'border-red-500/50 text-red-400'
                              }`}
                            >
                              {stat.rate >= 75 ? 'Excellent' : stat.rate >= 50 ? 'Average' : 'Poor'}
                            </Badge>
                          </div>
                        </div>
                        
                        {/* Progress Bar */}
                        <div className="w-full bg-white/10 rounded-full h-2 mb-3">
                          <div 
                            className={`h-2 rounded-full transition-all duration-500 ${
                              stat.rate >= 75 ? 'bg-green-400' : 
                              stat.rate >= 50 ? 'bg-yellow-400' : 'bg-red-400'
                            }`}
                            style={{ width: `${stat.rate}%` }}
                          />
                        </div>

                        {/* Recent Classes for this subject */}
                        <div className="space-y-2">
                          <h4 className="text-white/90 text-sm font-medium">Recent Classes:</h4>
                          <div className="max-h-32 overflow-y-auto space-y-1">
                            {safeSlice(stat.records, 0, 3).map(record => (
                              <div key={record.id} className="flex justify-between items-center text-xs bg-white/5 rounded p-2">
                                <span className="text-white/70">
                                  {new Date(record.timestamp).toLocaleDateString()} at {new Date(record.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                <Badge variant="outline" className="border-green-500/50 text-green-400 text-xs">
                                  <CheckCircle className="w-2 h-2 mr-1" />
                                  Present
                                </Badge>
                              </div>
                            ))}
                          </div>
                          {stat.records.length > 3 && (
                            <p className="text-white/60 text-xs text-center">
                              +{stat.records.length - 3} more classes
                            </p>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-white/70 py-8">
                    <BookOpen size={48} className="mx-auto mb-4 opacity-50" />
                    <p>No subject attendance found</p>
                    <p className="text-sm mt-2">Start attending classes to see your subject-wise statistics</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <motion.div
            key="history"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="bg-white/10 backdrop-blur-md border-white/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <History size={20} />
                  Attendance History
                </CardTitle>
                <CardDescription className="text-white/70">
                  Your attendance records for all subjects
                </CardDescription>
              </CardHeader>
              <CardContent>
                {attendanceRecords.length > 0 ? (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {attendanceRecords
                      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                      .map(record => (
                      <div key={record.id} className="p-4 bg-white/5 rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-white font-medium text-lg">{record.subject}</p>
                            <p className="text-white/70 text-sm mb-1">
                              {record.class} {record.division}
                            </p>
                            <p className="text-white/70 text-sm">
                              {new Date(record.timestamp).toLocaleString()}
                            </p>
                          </div>
                          <Badge 
                            variant="outline" 
                            className="border-green-500/50 text-green-400"
                          >
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Present
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-white/70 py-8">
                    <History size={48} className="mx-auto mb-4 opacity-50" />
                    <p>No attendance records found</p>
                    <p className="text-sm mt-2">Start scanning QR codes to mark your attendance</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <motion.div
            key="profile"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="bg-white/10 backdrop-blur-md border-white/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <User size={20} />
                  Student Profile
                </CardTitle>
                <CardDescription className="text-white/70">
                  Your account information and statistics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Basic Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-white/5 rounded-lg">
                      <label className="text-white/70 text-sm">Full Name</label>
                      <p className="text-white font-medium">{user?.name}</p>
                    </div>
                    <div className="p-4 bg-white/5 rounded-lg">
                      <label className="text-white/70 text-sm">PRN</label>
                      <p className="text-white font-medium">{user?.prn}</p>
                    </div>
                    <div className="p-4 bg-white/5 rounded-lg">
                      <label className="text-white/70 text-sm">Roll Number</label>
                      <p className="text-white font-medium">{user?.rollNumber}</p>
                    </div>
                    <div className="p-4 bg-white/5 rounded-lg">
                      <label className="text-white/70 text-sm">Mobile Number</label>
                      <p className="text-white font-medium">{user?.mobileNumber}</p>
                    </div>
                    <div className="p-4 bg-white/5 rounded-lg">
                      <label className="text-white/70 text-sm">Department</label>
                      <p className="text-white font-medium">{user?.department}</p>
                    </div>
                    <div className="p-4 bg-white/5 rounded-lg">
                      <label className="text-white/70 text-sm">Class & Division</label>
                      <p className="text-white font-medium">{user?.class} {user?.division}</p>
                    </div>
                  </div>

                  {/* Attendance Summary */}
                  <div className="p-4 bg-white/5 rounded-lg">
                    <h3 className="text-white font-medium mb-4">Attendance Summary</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-white">{attendanceRecords.length}</p>
                        <p className="text-white/70 text-sm">Total Classes</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-green-400">{attendanceRecords.filter(r => r.status === 'present').length}</p>
                        <p className="text-white/70 text-sm">Present</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-white">{attendanceRate}%</p>
                        <p className="text-white/70 text-sm">Overall Rate</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-white">{Object.keys(subjectWiseAttendance).length}</p>
                        <p className="text-white/70 text-sm">Subjects</p>
                      </div>
                    </div>

                    {/* Subject Performance Quick View */}
                    {subjectStats.length > 0 && (
                      <div>
                        <h4 className="text-white font-medium mb-3">Subject Performance</h4>
                        <div className="space-y-2">
                          {safeSlice(subjectStats, 0, 5).map(stat => (
                            <div key={stat.subject} className="flex justify-between items-center p-2 bg-white/5 rounded">
                              <span className="text-white text-sm">{stat.subject}</span>
                              <div className="flex items-center gap-2">
                                <span className={`text-sm font-bold ${
                                  stat.rate >= 75 ? 'text-green-400' : 
                                  stat.rate >= 50 ? 'text-yellow-400' : 'text-red-400'
                                }`}>
                                  {stat.rate}%
                                </span>
                                <div className="w-16 bg-white/10 rounded-full h-1">
                                  <div 
                                    className={`h-1 rounded-full ${
                                      stat.rate >= 75 ? 'bg-green-400' : 
                                      stat.rate >= 50 ? 'bg-yellow-400' : 'bg-red-400'
                                    }`}
                                    style={{ width: `${stat.rate}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Student Records Panel */}
                  {user?.id && <StudentRecordsPanel studentId={user.id} viewerRole="student" />}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}