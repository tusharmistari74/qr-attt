import React, { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Badge } from './ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { useAuth } from '../contexts/AuthContext'
import { apiClient, Student, AttendanceRecord } from '../utils/api'
import { safeSlice } from '../utils/arrayUtils'
import { 
  GraduationCap, 
  QrCode, 
  Users, 
  Calendar, 
  Clock, 
  LogOut,
  BookOpen,
  BarChart3,
  RefreshCw,
  Download
} from 'lucide-react'
import QRCode from 'qrcode'

export function TeacherDashboard() {
  const { user, logout } = useAuth()
  const [activeTab, setActiveTab] = useState('overview')
  const [students, setStudents] = useState<Student[]>([])
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
  const [qrCodeData, setQrCodeData] = useState<string | null>(null)
  const [qrCodeImage, setQrCodeImage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [scanCount, setScanCount] = useState(0)
  const [scannedStudents, setScannedStudents] = useState<any[]>([])
  const [sessionActive, setSessionActive] = useState(false)
  
  // QR Generation form
  const [selectedSubject, setSelectedSubject] = useState('')
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedDivision, setSelectedDivision] = useState('')
  const [sessionDuration, setSessionDuration] = useState(300) // 5 minutes default

  useEffect(() => {
    loadData()
    apiClient.subscribeToUpdates((event) => {
      console.log('📡 Teacher received update:', event.type, event.payload)
      if (event.type === 'attendance:changed') {
        loadAttendanceRecords()
      } else if (event.type === 'students:changed') {
        loadStudents()
      }
    })
    return () => {
      apiClient.unsubscribeFromUpdates()
    }
  }, [])

  const loadStudents = async () => {
    try {
      const response = await apiClient.getStudents()
      if (response.success) {
        setStudents(response.students)
      }
    } catch (error) {
      console.error('Error loading students:', error)
    }
  }

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

  useEffect(() => {
    if (qrCodeData) {
      generateQRImage(qrCodeData)
      // Extract session ID from QR data to track scans
      try {
        const qrInfo = JSON.parse(qrCodeData)
        setCurrentSessionId(qrInfo.sessionId)
        setSessionActive(true)
        setScanCount(0)
        setScannedStudents([])
      } catch (error) {
        console.error('Error parsing QR data:', error)
      }
    }
  }, [qrCodeData])

  // Poll for QR session updates when session is active
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null

    if (currentSessionId && sessionActive) {
      const pollSessionStatus = async () => {
        try {
          const response = await apiClient.getQrSessionStatus(currentSessionId)
          if (response.success) {
            setScanCount(response.scanCount || 0)
            setScannedStudents(response.scannedStudents || [])
            setSessionActive(response.isActive)
            
            // Stop polling if session is no longer active
            if (!response.isActive) {
              setSessionActive(false)
              if (intervalId) {
                clearInterval(intervalId)
              }
            }
          }
        } catch (error) {
          console.error('Error fetching session status:', error)
        }
      }

      // Poll every 2 seconds
      intervalId = setInterval(pollSessionStatus, 2000)
      
      // Initial fetch
      pollSessionStatus()
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId)
      }
    }
  }, [currentSessionId, sessionActive])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [studentsRes, attendanceRes] = await Promise.all([
        apiClient.getStudents(),
        apiClient.getAttendanceRecords()
      ])

      if (studentsRes.success) {
        setStudents(studentsRes.students)
      }

      if (attendanceRes.success) {
        setAttendanceRecords(attendanceRes.records)
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const generateQRImage = async (data: string) => {
    try {
      const qrImageUrl = await QRCode.toDataURL(data, {
        width: 256,
        margin: 2,
        color: {
          dark: '#2B0230',
          light: '#FFFFFF'
        }
      })
      setQrCodeImage(qrImageUrl)
    } catch (error) {
      console.error('Error generating QR image:', error)
    }
  }

  const handleGenerateQR = async () => {
    if (!selectedSubject || !selectedClass || !selectedDivision) {
      alert('Please select subject, class, and division')
      return
    }

    try {
      setIsLoading(true)
      const response = await apiClient.generateQrCode({
        subject: selectedSubject,
        class: selectedClass,
        division: selectedDivision,
        duration: sessionDuration
      })

      if (response.success) {
        setQrCodeData(response.qrData)
        console.log('QR Code generated successfully')
      }
    } catch (error) {
      console.error('Error generating QR code:', error)
      alert('Failed to generate QR code')
    } finally {
      setIsLoading(false)
    }
  }

  const clearQRCode = () => {
    setQrCodeData(null)
    setQrCodeImage(null)
    setCurrentSessionId(null)
    setScanCount(0)
    setScannedStudents([])
    setSessionActive(false)
  }

  const exportAttendance = () => {
    const csvContent = [
      ['Student Name', 'PRN', 'Roll Number', 'Subject', 'Class', 'Division', 'Date', 'Time', 'Status'],
      ...attendanceRecords.map(record => [
        record.studentName,
        record.studentPrn,
        record.studentRollNumber,
        record.subject,
        record.class,
        record.division,
        new Date(record.timestamp).toLocaleDateString(),
        new Date(record.timestamp).toLocaleTimeString(),
        record.status
      ])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `attendance_report_${user?.name}_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Filter students and attendance for teacher's classes
  const teacherStudents = students.filter(student => 
    user?.assignedClasses?.some(cls => 
      cls.class === student.class && cls.division === student.division
    )
  )

  const teacherAttendance = attendanceRecords.filter(record => 
    record.teacherId === user?.id
  )

  const todayAttendance = teacherAttendance.filter(
    record => new Date(record.timestamp).toDateString() === new Date().toDateString()
  ).length

  const attendanceRate = teacherStudents.length > 0 ? 
    Math.round((todayAttendance / teacherStudents.length) * 100) : 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#3B0A45] to-[#2B0230] p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-[#D9D9D9] text-black rounded-lg px-6 py-3">
            <GraduationCap size={20} />
            <span className="font-bold uppercase">TEACHER PANEL</span>
          </div>
          <div className="text-white">
            <h2 className="text-xl font-bold">Welcome, {user?.name}</h2>
            <p className="text-white/70">Faculty Member</p>
          </div>
        </div>
        
        <Button
          onClick={logout}
          variant="outline"
          className="bg-transparent border-white/20 text-white hover:bg-white/10"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Card className="bg-white/10 backdrop-blur-md border-white/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-sm">My Students</p>
                  <p className="text-white text-3xl font-bold">{teacherStudents.length}</p>
                </div>
                <Users className="text-white/70 h-8 w-8" />
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
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-sm">Subjects</p>
                  <p className="text-white text-3xl font-bold">{user?.subjects?.length || 0}</p>
                </div>
                <BookOpen className="text-white/70 h-8 w-8" />
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
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-sm">Today's Attendance</p>
                  <p className="text-white text-3xl font-bold">{todayAttendance}</p>
                </div>
                <Calendar className="text-white/70 h-8 w-8" />
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
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-sm">Attendance Rate</p>
                  <p className="text-white text-3xl font-bold">{attendanceRate}%</p>
                </div>
                <BarChart3 className="text-white/70 h-8 w-8" />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Main Content */}
      <Card className="bg-white/10 backdrop-blur-md border-white/20">
        <CardContent className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4 bg-white/10 mb-6">
              <TabsTrigger value="overview" className="text-white data-[state=active]:bg-white data-[state=active]:text-[#3B0A45]">
                Overview
              </TabsTrigger>
              <TabsTrigger value="qr-generator" className="text-white data-[state=active]:bg-white data-[state=active]:text-[#3B0A45]">
                QR Generator
              </TabsTrigger>
              <TabsTrigger value="students" className="text-white data-[state=active]:bg-white data-[state=active]:text-[#3B0A45]">
                My Students
              </TabsTrigger>
              <TabsTrigger value="attendance" className="text-white data-[state=active]:bg-white data-[state=active]:text-[#3B0A45]">
                Attendance
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <div className="text-center text-white">
                <h3 className="text-2xl font-bold uppercase mb-4">Teaching Dashboard</h3>
                <p className="text-white/70 mb-6">
                  Manage attendance for your classes and subjects
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="bg-white/5 border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white">My Subjects</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {user?.subjects?.map(subject => (
                        <div key={subject} className="p-3 bg-white/5 rounded-lg">
                          <p className="text-white font-medium">{subject}</p>
                        </div>
                      )) || (
                        <p className="text-white/70">No subjects assigned</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white/5 border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white">My Classes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {user?.assignedClasses?.map((cls, index) => (
                        <div key={index} className="p-3 bg-white/5 rounded-lg">
                          <p className="text-white font-medium">{cls.class} {cls.division}</p>
                          <p className="text-white/70 text-sm">
                            Students: {teacherStudents.filter(s => s.class === cls.class && s.division === cls.division).length}
                          </p>
                        </div>
                      )) || (
                        <p className="text-white/70">No classes assigned</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Attendance */}
              <Card className="bg-white/5 border-white/10">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Clock size={20} />
                    Recent Attendance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {safeSlice(teacherAttendance, -5).map(record => (
                    <div key={record.id} className="flex justify-between items-center py-2 border-b border-white/10 last:border-b-0">
                      <div>
                        <p className="text-white font-medium">{record.studentName}</p>
                        <p className="text-white/70 text-sm">{record.subject} - {record.class} {record.division}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-white text-sm">{new Date(record.timestamp).toLocaleTimeString()}</p>
                        <Badge variant="outline" className="border-green-500/50 text-green-400">
                          Present
                        </Badge>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            {/* QR Generator Tab */}
            <TabsContent value="qr-generator" className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-white text-xl font-bold uppercase">Generate QR Code</h3>
                <Button 
                  onClick={loadData} 
                  className="bg-[#D9D9D9] text-black hover:bg-[#C0C0C0]"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh
                </Button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* QR Generation Form */}
                <Card className="bg-white/5 border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white">Create Attendance Session</CardTitle>
                    <CardDescription className="text-white/70">
                      Generate a QR code for students to mark their attendance
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-white text-sm font-medium block mb-2">Subject</label>
                      <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                        <SelectTrigger className="bg-white/10 border-white/20 text-white">
                          <SelectValue placeholder="Select subject" />
                        </SelectTrigger>
                        <SelectContent>
                          {user?.subjects?.map(subject => (
                            <SelectItem key={subject} value={subject}>
                              {subject}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-white text-sm font-medium block mb-2">Class</label>
                        <Select value={selectedClass} onValueChange={setSelectedClass}>
                          <SelectTrigger className="bg-white/10 border-white/20 text-white">
                            <SelectValue placeholder="Select class" />
                          </SelectTrigger>
                          <SelectContent>
                            {user?.assignedClasses?.map((cls, index) => (
                              <SelectItem key={index} value={cls.class}>
                                {cls.class}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="text-white text-sm font-medium block mb-2">Division</label>
                        <Select value={selectedDivision} onValueChange={setSelectedDivision}>
                          <SelectTrigger className="bg-white/10 border-white/20 text-white">
                            <SelectValue placeholder="Select division" />
                          </SelectTrigger>
                          <SelectContent>
                            {user?.assignedClasses
                              ?.filter(cls => cls.class === selectedClass)
                              ?.map((cls, index) => (
                                <SelectItem key={index} value={cls.division}>
                                  {cls.division}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <label className="text-white text-sm font-medium block mb-2">Session Duration (seconds)</label>
                      <Select value={sessionDuration.toString()} onValueChange={(value) => setSessionDuration(Number(value))}>
                        <SelectTrigger className="bg-white/10 border-white/20 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="300">5 minutes</SelectItem>
                          <SelectItem value="600">10 minutes</SelectItem>
                          <SelectItem value="900">15 minutes</SelectItem>
                          <SelectItem value="1800">30 minutes</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={handleGenerateQR}
                        disabled={isLoading || !selectedSubject || !selectedClass || !selectedDivision}
                        className="flex-1 bg-[#D9D9D9] text-black hover:bg-[#C0C0C0] font-bold uppercase"
                      >
                        <QrCode className="mr-2 h-4 w-4" />
                        Generate QR
                      </Button>
                      
                      {qrCodeData && (
                        <Button
                          onClick={clearQRCode}
                          variant="outline"
                          className="bg-transparent border-red-500/50 text-red-400 hover:bg-red-500/10"
                        >
                          Clear
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* QR Code Display */}
                <Card className="bg-white/5 border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center justify-between">
                      Generated QR Code
                      {sessionActive && (
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                          <span className="text-green-400 text-sm">ACTIVE</span>
                        </div>
                      )}
                    </CardTitle>
                    <CardDescription className="text-white/70">
                      Students scan this code to mark attendance
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col items-center justify-center min-h-96">
                    {qrCodeImage ? (
                      <div className="text-center w-full">
                        <div className="bg-white p-4 rounded-lg mb-4 mx-auto w-fit">
                          <img src={qrCodeImage} alt="QR Code" className="w-64 h-64" />
                        </div>
                        <p className="text-white font-medium mb-2">
                          {selectedSubject} - {selectedClass} {selectedDivision}
                        </p>
                        <p className="text-white/70 text-sm mb-4">
                          Session Duration: {Math.floor(sessionDuration / 60)} minutes
                        </p>
                        
                        {/* Scan Counter */}
                        <div className="bg-white/10 backdrop-blur-md border-white/20 rounded-lg p-6 mb-4">
                          <div className="flex items-center justify-center gap-4 mb-4">
                            <div className="text-center">
                              <p className="text-3xl font-bold text-green-400">{scanCount}</p>
                              <p className="text-white/70 text-sm">Students Scanned</p>
                            </div>
                            <div className="text-center">
                              <p className="text-3xl font-bold text-white">{teacherStudents.filter(s => s.class === selectedClass && s.division === selectedDivision).length}</p>
                              <p className="text-white/70 text-sm">Total Students</p>
                            </div>
                          </div>
                          
                          {scannedStudents.length > 0 && (
                            <div className="max-h-32 overflow-y-auto">
                              <p className="text-white text-sm font-medium mb-2">Recently Scanned:</p>
                              <div className="space-y-1">
                                {safeSlice(scannedStudents, -5).map((student, index) => (
                                  <div key={index} className="flex justify-between items-center text-xs bg-white/5 rounded px-2 py-1">
                                    <span className="text-white">{student.studentName}</span>
                                    <span className="text-white/70">{new Date(student.timestamp).toLocaleTimeString()}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        
                        {!sessionActive && scanCount > 0 && (
                          <p className="text-yellow-400 text-sm">⚠️ Session Expired - Final Count: {scanCount} students</p>
                        )}
                      </div>
                    ) : (
                      <div className="text-center text-white/50">
                        <QrCode size={64} className="mx-auto mb-4 opacity-50" />
                        <p>Generate a QR code to display here</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Students Tab */}
            <TabsContent value="students" className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-white text-xl font-bold uppercase">My Students ({teacherStudents.length})</h3>
              </div>

              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-6">
                  <div className="max-h-96 overflow-y-auto space-y-2">
                    {teacherStudents.map(student => (
                      <div key={student.id} className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                        <div>
                          <p className="text-white font-medium">{student.name}</p>
                          <p className="text-white/70 text-sm">PRN: {student.prn} | Roll: {student.rollNumber}</p>
                          <p className="text-white/70 text-sm">{student.department} - {student.class} {student.division}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={student.hasAccess ? "default" : "destructive"}>
                            {student.hasAccess ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Attendance Tab */}
            <TabsContent value="attendance" className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-white text-xl font-bold uppercase">Attendance Records</h3>
                <Button 
                  onClick={exportAttendance}
                  className="bg-[#D9D9D9] text-black hover:bg-[#C0C0C0] font-bold uppercase"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Export CSV
                </Button>
              </div>

              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-6">
                  <div className="max-h-96 overflow-y-auto">
                    {teacherAttendance.length > 0 ? (
                      <div className="space-y-2">
                        {teacherAttendance.map(record => (
                          <div key={record.id} className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                            <div>
                              <p className="text-white font-medium">{record.studentName}</p>
                              <p className="text-white/70 text-sm">PRN: {record.studentPrn} | Roll: {record.studentRollNumber}</p>
                              <p className="text-white/70 text-sm">{record.subject} - {record.class} {record.division}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-white text-sm">{new Date(record.timestamp).toLocaleString()}</p>
                              <Badge variant="outline" className="border-green-500/50 text-green-400">
                                {record.status}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center text-white/70 py-8">
                        <BarChart3 size={48} className="mx-auto mb-4 opacity-50" />
                        <p>No attendance records found</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}