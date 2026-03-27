import React, { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Badge } from './ui/badge'
import { useAuth } from '../contexts/AuthContext'
import { apiClient, Student, Teacher, AttendanceRecord } from '../utils/api'
import { safeSlice } from '../utils/arrayUtils'
import {
  Users,
  GraduationCap,
  UserPlus,
  BarChart3,
  Download,
  Trash2,
  LogOut,
  Shield,
  Calendar,
  Clock,
  TrendingUp
} from 'lucide-react'

export function AdminDashboard() {
  const { user, logout } = useAuth()
  const [activeTab, setActiveTab] = useState('overview')
  const [students, setStudents] = useState<Student[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // New student form
  const [newStudent, setNewStudent] = useState({
    name: '',
    prn: '',
    rollNumber: '',
    mobileNumber: '',
    department: '',
    class: '',
    division: ''
  })

  // New teacher form
  const [newTeacher, setNewTeacher] = useState({
    name: '',
    email: '',
    password: '',
    subjects: [] as string[],
    assignedClasses: [] as { class: string; division: string }[]
  })

  const [newSubject, setNewSubject] = useState('')
  const [newClass, setNewClass] = useState('')
  const [newDivision, setNewDivision] = useState('')

  // Edit states
  const [editingStudent, setEditingStudent] = useState<Student | null>(null)
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null)
  const [isEditStudentOpen, setIsEditStudentOpen] = useState(false)
  const [isEditTeacherOpen, setIsEditTeacherOpen] = useState(false)

  useEffect(() => {
    loadData()
    
    // Listen for real-time updates from the AdminPanel subscription
    const handleDataChanged = () => {
      console.log('Real-time update received, reloading admin data...')
      loadData()
    }
    
    window.addEventListener('dataChanged', handleDataChanged)
    return () => window.removeEventListener('dataChanged', handleDataChanged)
  }, [])

  const loadData = async () => {
    setIsLoading(true)
    try {
      console.log('Loading admin data...')
      console.log('Current user:', user)
      console.log('API client has token:', apiClient.hasToken())
      console.log('Current auth token:', apiClient.getToken()?.substring(0, 10) + '...')

      // Load data sequentially to better identify issues
      console.log('Loading students...')
      const studentsRes = await apiClient.getStudents()
      console.log('Students response:', studentsRes)

      console.log('Loading teachers...')
      const teachersRes = await apiClient.getTeachers()
      console.log('Teachers response:', teachersRes)

      console.log('Loading attendance...')
      const attendanceRes = await apiClient.getAttendanceRecords()
      console.log('Attendance response:', attendanceRes)

      if (studentsRes.success) {
        setStudents(studentsRes.students || [])
        console.log(`Loaded ${studentsRes.students?.length || 0} students`)
      } else {
        console.error('Failed to load students:', studentsRes.error)
        if (studentsRes.error?.includes('401') || studentsRes.error?.includes('Unauthorized')) {
          alert('Session expired. Please log in again.')
          logout()
          return
        }
      }

      if (teachersRes.success) {
        setTeachers(teachersRes.teachers || [])
        console.log(`Loaded ${teachersRes.teachers?.length || 0} teachers`)
      } else {
        console.error('Failed to load teachers:', teachersRes.error)
        if (teachersRes.error?.includes('401') || teachersRes.error?.includes('Unauthorized')) {
          alert('Session expired. Please log in again.')
          logout()
          return
        }
      }

      if (attendanceRes.success) {
        setAttendanceRecords(attendanceRes.records || [])
        console.log(`Loaded ${attendanceRes.records?.length || 0} attendance records`)
      } else {
        console.error('Failed to load attendance:', attendanceRes.error)
        if (attendanceRes.error?.includes('401') || attendanceRes.error?.includes('Unauthorized')) {
          alert('Session expired. Please log in again.')
          logout()
          return
        }
      }
    } catch (error) {
      console.error('Error loading data:', error)
      if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
        alert('Authentication error. Please log in again.')
        logout()
      } else {
        alert(`Error loading data: ${error.message}`)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddStudent = async () => {
    if (!newStudent.name || !newStudent.prn || !newStudent.mobileNumber) {
      alert('Please fill in all required fields')
      return
    }

    try {
      console.log('Adding student:', newStudent)
      const response = await apiClient.addStudent(newStudent)
      console.log('Add student response:', response)

      if (response.success) {
        setStudents([...students, response.student])
        setNewStudent({
          name: '',
          prn: '',
          rollNumber: '',
          mobileNumber: '',
          department: '',
          class: '',
          division: ''
        })
        alert('Student added successfully!')
      } else {
        alert(`Failed to add student: ${response.error}`)
      }
    } catch (error) {
      console.error('Error adding student:', error)
      alert(`Failed to add student: ${error.message}`)
    }
  }

  const handleAddTeacher = async () => {
    if (!newTeacher.name || !newTeacher.email || !newTeacher.password) {
      alert('Please fill in all required fields')
      return
    }

    try {
      console.log('Adding teacher:', newTeacher)
      console.log('Current user:', user)
      console.log('Auth token in localStorage:', localStorage.getItem('auth_token')?.substring(0, 10) + '...')

      const response = await apiClient.addTeacher(newTeacher)
      console.log('Add teacher response:', response)

      if (response.success) {
        setTeachers([...teachers, response.teacher])
        setNewTeacher({
          name: '',
          email: '',
          password: '',
          subjects: [],
          assignedClasses: []
        })
        alert('Teacher added successfully!')
      } else {
        console.error('Server returned error:', response.error)
        alert(`Failed to add teacher: ${response.error}`)
      }
    } catch (error) {
      console.error('Error adding teacher:', error)
      console.error('Error details:', {
        message: (error as any).message,
        stack: (error as any).stack
      })
      alert(`Failed to add teacher: ${(error as any).message}`)
    }
  }

  const handleDeleteStudent = async (studentId: string) => {
    try {
      console.log('Deleting student:', studentId)
      const response = await apiClient.deleteStudent(studentId)
      console.log('Delete student response:', response)

      if (response.success) {
        setStudents(students.filter(s => s.id !== studentId))
        alert('Student deleted successfully!')
      } else {
        alert(`Failed to delete student: ${(response as any).error}`)
      }
    } catch (error) {
      console.error('Error deleting student:', error)
      alert(`Failed to delete student: ${(error as any).message}`)
    }
  }

  const handleDeleteTeacher = async (teacherId: string) => {
    try {
      console.log('Deleting teacher:', teacherId)
      const response = await apiClient.deleteTeacher(teacherId)
      console.log('Delete teacher response:', response)

      if (response.success) {
        setTeachers(teachers.filter(t => t.id !== teacherId))
        alert('Teacher deleted successfully!')
      } else {
        alert(`Failed to delete teacher: ${(response as any).error}`)
      }
    } catch (error) {
      console.error('Error deleting teacher:', error)
      alert(`Failed to delete teacher: ${(error as any).message}`)
    }
  }

  const handleUpdateStudent = async () => {
    if (!editingStudent) return

    try {
      console.log('Updating student:', editingStudent)
      const response = await apiClient.updateStudent(editingStudent.id, editingStudent)

      if (response.success) {
        setStudents(students.map(s => s.id === editingStudent.id ? response.student : s))
        setIsEditStudentOpen(false)
        setEditingStudent(null)
        alert('Student updated successfully!')
      } else {
        alert(`Failed to update student: ${response.error}`)
      }
    } catch (error) {
      console.error('Error updating student:', error)
      alert(`Failed to update student: ${(error as any).message}`)
    }
  }

  const handleUpdateTeacher = async () => {
    if (!editingTeacher) return

    try {
      console.log('Updating teacher:', editingTeacher)
      const response = await apiClient.updateTeacher(editingTeacher.id, editingTeacher)

      if (response.success) {
        setTeachers(teachers.map(t => t.id === editingTeacher.id ? response.teacher : t))
        setIsEditTeacherOpen(false)
        setEditingTeacher(null)
        alert('Teacher updated successfully!')
      } else {
        alert(`Failed to update teacher: ${response.error}`)
      }
    } catch (error) {
      console.error('Error updating teacher:', error)
      alert(`Failed to update teacher: ${(error as any).message}`)
    }
  }

  const startEditStudent = (student: Student) => {
    setEditingStudent({ ...student })
    setIsEditStudentOpen(true)
  }

  const startEditTeacher = (teacher: Teacher) => {
    setEditingTeacher({ ...teacher })
    setIsEditTeacherOpen(true)
  }

  const addSubjectToTeacher = () => {
    if (newSubject && !newTeacher.subjects.includes(newSubject)) {
      setNewTeacher({
        ...newTeacher,
        subjects: [...newTeacher.subjects, newSubject]
      })
      setNewSubject('')
    }
  }

  const removeSubjectFromTeacher = (subject: string) => {
    setNewTeacher({
      ...newTeacher,
      subjects: newTeacher.subjects.filter(s => s !== subject)
    })
  }

  const addClassToTeacher = () => {
    if (newClass && newDivision) {
      const classExists = newTeacher.assignedClasses.some(
        c => c.class === newClass && c.division === newDivision
      )

      if (!classExists) {
        setNewTeacher({
          ...newTeacher,
          assignedClasses: [...newTeacher.assignedClasses, { class: newClass, division: newDivision }]
        })
        setNewClass('')
        setNewDivision('')
      }
    }
  }

  const removeClassFromTeacher = (classToRemove: { class: string; division: string }) => {
    setNewTeacher({
      ...newTeacher,
      assignedClasses: newTeacher.assignedClasses.filter(
        c => !(c.class === classToRemove.class && c.division === classToRemove.division)
      )
    })
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
    a.download = `attendance_report_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const totalStudents = students.length
  const totalTeachers = teachers.length
  const todayAttendance = attendanceRecords.filter(
    record => new Date(record.timestamp).toDateString() === new Date().toDateString()
  ).length
  const attendanceRate = totalStudents > 0 ? Math.round((todayAttendance / totalStudents) * 100) : 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#3B0A45] to-[#2B0230] p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-[#D9D9D9] text-black rounded-lg px-6 py-3">
            <Shield size={20} />
            <span className="font-bold uppercase">ADMIN PANEL</span>
          </div>
          <div className="text-white">
            <h2 className="text-xl font-bold">Welcome, {user?.name}</h2>
            <p className="text-white/70">System Administrator</p>
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
                  <p className="text-white/70 text-sm">Total Students</p>
                  <p className="text-white text-3xl font-bold">{totalStudents}</p>
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
                  <p className="text-white/70 text-sm">Total Teachers</p>
                  <p className="text-white text-3xl font-bold">{totalTeachers}</p>
                </div>
                <GraduationCap className="text-white/70 h-8 w-8" />
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
                <TrendingUp className="text-white/70 h-8 w-8" />
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
              <TabsTrigger value="students" className="text-white data-[state=active]:bg-white data-[state=active]:text-[#3B0A45]">
                Students
              </TabsTrigger>
              <TabsTrigger value="teachers" className="text-white data-[state=active]:bg-white data-[state=active]:text-[#3B0A45]">
                Teachers
              </TabsTrigger>
              <TabsTrigger value="attendance" className="text-white data-[state=active]:bg-white data-[state=active]:text-[#3B0A45]">
                Attendance
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <div className="text-center text-white">
                <h3 className="text-2xl font-bold uppercase mb-4">System Overview</h3>
                <p className="text-white/70 mb-6">
                  Manage your entire attendance system from this central dashboard
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="bg-white/5 border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Users size={20} />
                      Recent Students
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {safeSlice(students, -5).map(student => (
                      <div key={student.id} className="flex justify-between items-center py-2 border-b border-white/10 last:border-b-0">
                        <div>
                          <p className="text-white font-medium">{student.name}</p>
                          <p className="text-white/70 text-sm">{student.prn}</p>
                        </div>
                        <Badge variant="outline" className="border-white/20 text-white">
                          {student.class} {student.division}
                        </Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card className="bg-white/5 border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Clock size={20} />
                      Recent Attendance
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {safeSlice(attendanceRecords, -5).map(record => (
                      <div key={record.id} className="flex justify-between items-center py-2 border-b border-white/10 last:border-b-0">
                        <div>
                          <p className="text-white font-medium">{record.studentName}</p>
                          <p className="text-white/70 text-sm">{record.subject}</p>
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
              </div>
            </TabsContent>

            {/* Students Tab */}
            <TabsContent value="students" className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-white text-xl font-bold uppercase">Student Management</h3>
                <Button onClick={loadData} className="bg-[#D9D9D9] text-black hover:bg-[#C0C0C0]">
                  Refresh
                </Button>
              </div>

              {/* Add Student Form */}
              <Card className="bg-white/5 border-white/10">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <UserPlus size={20} />
                    Add New Student
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      placeholder="Full Name *"
                      value={newStudent.name}
                      onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/60"
                    />
                    <Input
                      placeholder="PRN *"
                      value={newStudent.prn}
                      onChange={(e) => setNewStudent({ ...newStudent, prn: e.target.value })}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/60"
                    />
                    <Input
                      placeholder="Roll Number"
                      value={newStudent.rollNumber}
                      onChange={(e) => setNewStudent({ ...newStudent, rollNumber: e.target.value })}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/60"
                    />
                    <Input
                      placeholder="Mobile Number *"
                      value={newStudent.mobileNumber}
                      onChange={(e) => setNewStudent({ ...newStudent, mobileNumber: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/60"
                    />
                    <Input
                      placeholder="Department"
                      value={newStudent.department}
                      onChange={(e) => setNewStudent({ ...newStudent, department: e.target.value })}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/60"
                    />
                    <Input
                      placeholder="Class"
                      value={newStudent.class}
                      onChange={(e) => setNewStudent({ ...newStudent, class: e.target.value })}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/60"
                    />
                    <Input
                      placeholder="Division"
                      value={newStudent.division}
                      onChange={(e) => setNewStudent({ ...newStudent, division: e.target.value })}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/60"
                    />
                    <Button onClick={handleAddStudent} className="bg-[#D9D9D9] text-black hover:bg-[#C0C0C0] font-bold uppercase">
                      Add Student
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Edit Student Modal/Form */}
              {isEditStudentOpen && editingStudent && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                  <Card className="bg-[#2B0230] border-white/20 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                    <CardHeader>
                      <CardTitle className="text-white flex justify-between items-center">
                        <span>Edit Student</span>
                        <Button
                          onClick={() => setIsEditStudentOpen(false)}
                          variant="ghost"
                          className="text-white/50 hover:text-white"
                        >
                          ✕
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                          placeholder="Full Name *"
                          value={editingStudent.name}
                          onChange={(e) => setEditingStudent({ ...editingStudent, name: e.target.value })}
                          className="bg-white/10 border-white/20 text-white"
                        />
                        <Input
                          placeholder="PRN *"
                          value={editingStudent.prn}
                          onChange={(e) => setEditingStudent({ ...editingStudent, prn: e.target.value })}
                          className="bg-white/10 border-white/20 text-white"
                        />
                        <Input
                          placeholder="Roll Number"
                          value={editingStudent.rollNumber}
                          onChange={(e) => setEditingStudent({ ...editingStudent, rollNumber: e.target.value })}
                          className="bg-white/10 border-white/20 text-white"
                        />
                        <Input
                          placeholder="Mobile Number *"
                          value={editingStudent.mobileNumber}
                          onChange={(e) => setEditingStudent({ ...editingStudent, mobileNumber: e.target.value })}
                          className="bg-white/10 border-white/20 text-white"
                        />
                        <Input
                          placeholder="Department"
                          value={editingStudent.department}
                          onChange={(e) => setEditingStudent({ ...editingStudent, department: e.target.value })}
                          className="bg-white/10 border-white/20 text-white"
                        />
                        <Input
                          placeholder="Class"
                          value={editingStudent.class}
                          onChange={(e) => setEditingStudent({ ...editingStudent, class: e.target.value })}
                          className="bg-white/10 border-white/20 text-white"
                        />
                        <Input
                          placeholder="Division"
                          value={editingStudent.division}
                          onChange={(e) => setEditingStudent({ ...editingStudent, division: e.target.value })}
                          className="bg-white/10 border-white/20 text-white"
                        />
                        <div className="md:col-span-2 flex justify-end gap-2 mt-4">
                          <Button
                            onClick={() => setIsEditStudentOpen(false)}
                            variant="outline"
                            className="border-white/20 text-white hover:bg-white/10"
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={handleUpdateStudent}
                            className="bg-[#D9D9D9] text-black hover:bg-[#C0C0C0]"
                          >
                            Update Student
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Students List */}
              <Card className="bg-white/5 border-white/10">
                <CardHeader>
                  <CardTitle className="text-white">All Students ({students.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="max-h-96 overflow-y-auto space-y-2">
                    {students.map(student => (
                      <div key={student.id} className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                        <div className="flex-1">
                          <p className="text-white font-medium">{student.name}</p>
                          <p className="text-white/70 text-sm">PRN: {student.prn} | Roll: {student.rollNumber}</p>
                          <p className="text-white/70 text-sm">Mobile: {student.mobileNumber}</p>
                          <p className="text-white/70 text-sm">{student.department} - {student.class} {student.division}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={student.hasAccess ? "default" : "destructive"}>
                            {student.hasAccess ? "Active" : "Inactive"}
                          </Badge>
                          <Button
                            onClick={() => {
                              if (confirm(`Are you sure you want to delete ${student.name}?`)) {
                                handleDeleteStudent(student.id)
                              }
                            }}
                            variant="outline"
                            size="sm"
                            className="border-red-500/50 text-red-400 hover:bg-red-500/20"
                          >
                            <Trash2 size={16} />
                          </Button>
                          <Button
                            onClick={() => startEditStudent(student)}
                            variant="outline"
                            size="sm"
                            className="border-blue-500/50 text-blue-400 hover:bg-blue-500/20"
                          >
                            Edit
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Teachers Tab */}
            <TabsContent value="teachers" className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-white text-xl font-bold uppercase">Teacher Management</h3>
              </div>

              {/* Add Teacher Form */}
              <Card className="bg-white/5 border-white/10">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <UserPlus size={20} />
                    Add New Teacher
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Input
                      placeholder="Full Name *"
                      value={newTeacher.name}
                      onChange={(e) => setNewTeacher({ ...newTeacher, name: e.target.value })}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/60"
                    />
                    <Input
                      placeholder="Email *"
                      type="email"
                      value={newTeacher.email}
                      onChange={(e) => setNewTeacher({ ...newTeacher, email: e.target.value })}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/60"
                    />
                    <Input
                      placeholder="Password *"
                      type="password"
                      value={newTeacher.password}
                      onChange={(e) => setNewTeacher({ ...newTeacher, password: e.target.value })}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/60"
                    />
                  </div>

                  {/* Subjects */}
                  <div>
                    <label className="text-white text-sm font-medium block mb-2">Subjects</label>
                    <div className="flex gap-2 mb-2">
                      <Input
                        placeholder="Add subject"
                        value={newSubject}
                        onChange={(e) => setNewSubject(e.target.value)}
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/60"
                      />
                      <Button onClick={addSubjectToTeacher} className="bg-[#D9D9D9] text-black hover:bg-[#C0C0C0]">
                        Add
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {newTeacher.subjects.map(subject => (
                        <Badge key={subject} variant="outline" className="border-white/20 text-white">
                          {subject}
                          <button
                            onClick={() => removeSubjectFromTeacher(subject)}
                            className="ml-2 text-red-400 hover:text-red-300"
                          >
                            ×
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Assigned Classes */}
                  <div>
                    <label className="text-white text-sm font-medium block mb-2">Assigned Classes</label>
                    <div className="flex gap-2 mb-2">
                      <Input
                        placeholder="Class"
                        value={newClass}
                        onChange={(e) => setNewClass(e.target.value)}
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/60"
                      />
                      <Input
                        placeholder="Division"
                        value={newDivision}
                        onChange={(e) => setNewDivision(e.target.value)}
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/60"
                      />
                      <Button onClick={addClassToTeacher} className="bg-[#D9D9D9] text-black hover:bg-[#C0C0C0]">
                        Add
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {newTeacher.assignedClasses.map((cls, index) => (
                        <Badge key={index} variant="outline" className="border-white/20 text-white">
                          {cls.class} {cls.division}
                          <button
                            onClick={() => removeClassFromTeacher(cls)}
                            className="ml-2 text-red-400 hover:text-red-300"
                          >
                            ×
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <Button onClick={handleAddTeacher} className="bg-[#D9D9D9] text-black hover:bg-[#C0C0C0] font-bold uppercase">
                    Add Teacher
                  </Button>
                </CardContent>
              </Card>

              {/* Edit Teacher Modal/Form */}
              {isEditTeacherOpen && editingTeacher && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                  <Card className="bg-[#2B0230] border-white/20 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                    <CardHeader>
                      <CardTitle className="text-white flex justify-between items-center">
                        <span>Edit Teacher</span>
                        <Button
                          onClick={() => setIsEditTeacherOpen(false)}
                          variant="ghost"
                          className="text-white/50 hover:text-white"
                        >
                          ✕
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                          placeholder="Full Name *"
                          value={editingTeacher.name}
                          onChange={(e) => setEditingTeacher({ ...editingTeacher, name: e.target.value })}
                          className="bg-white/10 border-white/20 text-white"
                        />
                        <Input
                          placeholder="Email *"
                          value={editingTeacher.email}
                          onChange={(e) => setEditingTeacher({ ...editingTeacher, email: e.target.value })}
                          className="bg-white/10 border-white/20 text-white"
                        />
                        <Input
                          placeholder="Password"
                          type="password"
                          value={editingTeacher.password}
                          onChange={(e) => setEditingTeacher({ ...editingTeacher, password: e.target.value })}
                          className="bg-white/10 border-white/20 text-white"
                        />
                      </div>

                      {/* Edit Subjects */}
                      <div>
                        <label className="text-white text-sm font-medium block mb-2">Subjects</label>
                        <div className="flex gap-2 mb-2">
                          <Input
                            placeholder="Add subject"
                            id="edit-subject-input"
                            className="bg-white/10 border-white/20 text-white"
                          />
                          <Button
                            onClick={() => {
                              const input = document.getElementById('edit-subject-input') as HTMLInputElement
                              if (input.value && !editingTeacher.subjects.includes(input.value)) {
                                setEditingTeacher({
                                  ...editingTeacher,
                                  subjects: [...editingTeacher.subjects, input.value]
                                })
                                input.value = ''
                              }
                            }}
                            className="bg-[#D9D9D9] text-black hover:bg-[#C0C0C0]"
                          >
                            Add
                          </Button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {editingTeacher.subjects.map(subject => (
                            <Badge key={subject} variant="outline" className="border-white/20 text-white">
                              {subject}
                              <button
                                onClick={() => setEditingTeacher({
                                  ...editingTeacher,
                                  subjects: editingTeacher.subjects.filter(s => s !== subject)
                                })}
                                className="ml-2 text-red-400 hover:text-red-300"
                              >
                                ×
                              </button>
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {/* Edit Classes */}
                      <div>
                        <label className="text-white text-sm font-medium block mb-2">Assigned Classes</label>
                        <div className="flex gap-2 mb-2">
                          <Input placeholder="Class" id="edit-class-input" className="bg-white/10 border-white/20 text-white" />
                          <Input placeholder="Division" id="edit-div-input" className="bg-white/10 border-white/20 text-white" />
                          <Button
                            onClick={() => {
                              const clsInput = document.getElementById('edit-class-input') as HTMLInputElement
                              const divInput = document.getElementById('edit-div-input') as HTMLInputElement
                              if (clsInput.value && divInput.value) {
                                setEditingTeacher({
                                  ...editingTeacher,
                                  assignedClasses: [...editingTeacher.assignedClasses, { class: clsInput.value, division: divInput.value }]
                                })
                                clsInput.value = ''
                                divInput.value = ''
                              }
                            }}
                            className="bg-[#D9D9D9] text-black hover:bg-[#C0C0C0]"
                          >
                            Add
                          </Button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {editingTeacher.assignedClasses.map((cls, idx) => (
                            <Badge key={idx} variant="outline" className="border-white/20 text-white">
                              {cls.class} {cls.division}
                              <button
                                onClick={() => setEditingTeacher({
                                  ...editingTeacher,
                                  assignedClasses: editingTeacher.assignedClasses.filter((_, i) => i !== idx)
                                })}
                                className="ml-2 text-red-400 hover:text-red-300"
                              >
                                ×
                              </button>
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 mt-4">
                        <Button
                          onClick={() => setIsEditTeacherOpen(false)}
                          variant="outline"
                          className="border-white/20 text-white hover:bg-white/10"
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleUpdateTeacher}
                          className="bg-[#D9D9D9] text-black hover:bg-[#C0C0C0]"
                        >
                          Update Teacher
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Teachers List */}
              <Card className="bg-white/5 border-white/10">
                <CardHeader>
                  <CardTitle className="text-white">All Teachers ({teachers.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="max-h-96 overflow-y-auto space-y-2">
                    {teachers.length > 0 ? (
                      teachers.map(teacher => (
                        <div key={teacher.id} className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                          <div className="flex-1">
                            <p className="text-white font-medium">{teacher.name}</p>
                            <p className="text-white/70 text-sm">Email: {teacher.email}</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {teacher.subjects.map(subject => (
                                <Badge key={subject} variant="outline" className="border-blue-500/50 text-blue-400 text-xs">
                                  {subject}
                                </Badge>
                              ))}
                            </div>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {teacher.assignedClasses.map((cls, index) => (
                                <Badge key={index} variant="outline" className="border-green-500/50 text-green-400 text-xs">
                                  {cls.class} {cls.division}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="default">
                              Active
                            </Badge>
                            <Button
                              onClick={() => {
                                if (confirm(`Are you sure you want to delete ${teacher.name}?`)) {
                                  handleDeleteTeacher(teacher.id)
                                }
                              }}
                              variant="outline"
                              size="sm"
                              className="border-red-500/50 text-red-400 hover:bg-red-500/20"
                            >
                              <Trash2 size={16} />
                            </Button>
                            <Button
                              onClick={() => startEditTeacher(teacher)}
                              variant="outline"
                              size="sm"
                              className="border-blue-500/50 text-blue-400 hover:bg-blue-500/20"
                            >
                              Edit
                            </Button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center text-white/70 py-8">
                        <GraduationCap size={48} className="mx-auto mb-4 opacity-50" />
                        <p>No teachers found</p>
                        <p className="text-sm mt-2">Add teachers to see them listed here</p>
                      </div>
                    )}
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
                    {attendanceRecords.length > 0 ? (
                      <div className="space-y-2">
                        {attendanceRecords.map(record => (
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