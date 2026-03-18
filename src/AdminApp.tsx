import React, { useState, useEffect } from 'react';
import { AdminPanel } from './components/AdminPanel';
import { Monitor } from 'lucide-react';

interface Student {
  id: string;
  prn: string;
  rollNumber: string;
  mobileNumber: string;
  department: string;
  class: string;
  division: string;
  hasAccess: boolean;
  accessValidUntil: Date;
}

interface AttendanceRecord {
  studentId: string;
  subject: string;
  timestamp: Date;
  status: 'present' | 'absent';
}

export default function AdminApp() {
  const [students, setStudents] = useState<Student[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [studentLimit, setStudentLimit] = useState<number>(50);

  // Load data from localStorage on component mount
  useEffect(() => {
    const savedStudents = localStorage.getItem('attendance_students');
    const savedAttendance = localStorage.getItem('attendance_records');
    const savedLimit = localStorage.getItem('student_limit');
    
    if (savedStudents) {
      setStudents(JSON.parse(savedStudents));
    }
    if (savedAttendance) {
      setAttendanceRecords(JSON.parse(savedAttendance));
    }
    if (savedLimit) {
      setStudentLimit(parseInt(savedLimit));
    }
  }, []);

  // Save data to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('attendance_students', JSON.stringify(students));
  }, [students]);

  useEffect(() => {
    localStorage.setItem('attendance_records', JSON.stringify(attendanceRecords));
  }, [attendanceRecords]);

  useEffect(() => {
    localStorage.setItem('student_limit', studentLimit.toString());
  }, [studentLimit]);

  const addStudent = (student: Omit<Student, 'id' | 'hasAccess' | 'accessValidUntil'>) => {
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    
    const newStudent: Student = {
      ...student,
      id: Date.now().toString(),
      hasAccess: true,
      accessValidUntil: nextYear
    };
    setStudents(prev => [...prev, newStudent]);
  };

  const removeStudent = (id: string) => {
    setStudents(prev => prev.filter(student => student.id !== id));
  };

  const generateQRCode = () => {
    const qrData = {
      sessionId: Date.now().toString(),
      timestamp: new Date().toISOString(),
      limit: studentLimit
    };
    const qrCodeString = JSON.stringify(qrData);
    setQrCode(qrCodeString);
    
    // Sync QR code to mobile app (in real app, this would be via API)
    localStorage.setItem('admin_qr_code', qrCodeString);
  };

  const clearAttendance = () => {
    setAttendanceRecords([]);
    setQrCode(null);
    localStorage.removeItem('admin_qr_code');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#3B0A45] to-[#2B0230]">
      {/* Header */}
      <div className="flex justify-center items-center gap-4 p-6">
        <div className="flex items-center gap-2 bg-[#D9D9D9] text-black rounded-lg px-6 py-3">
          <Monitor size={20} />
          <span className="font-bold uppercase">ADMIN PANEL</span>
        </div>
      </div>

      {/* Main Content */}
      <AdminPanel
        students={students}
        attendanceRecords={attendanceRecords}
        qrCode={qrCode}
        studentLimit={studentLimit}
        onAddStudent={addStudent}
        onRemoveStudent={removeStudent}
        onGenerateQR={generateQRCode}
        onClearAttendance={clearAttendance}
        onSetStudentLimit={setStudentLimit}
      />
    </div>
  );
}