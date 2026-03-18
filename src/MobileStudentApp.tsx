import React, { useState, useEffect } from 'react';
import { MobileApp } from './components/MobileApp';
import { Smartphone } from 'lucide-react';

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

interface LoginSession {
  studentId: string;
  loginTime: Date;
  expiresAt: Date;
  isActive: boolean;
}

interface OTPRecord {
  mobileNumber: string;
  otp: string;
  generatedAt: Date;
  expiresAt: Date;
  verified: boolean;
}

export default function MobileStudentApp() {
  const [students, setStudents] = useState<Student[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [loginSessions, setLoginSessions] = useState<LoginSession[]>([]);
  const [otpRecords, setOtpRecords] = useState<OTPRecord[]>([]);
  const [currentStudentSession, setCurrentStudentSession] = useState<LoginSession | null>(null);

  // Load data from localStorage on component mount
  useEffect(() => {
    const savedStudents = localStorage.getItem('attendance_students');
    const savedAttendance = localStorage.getItem('attendance_records');
    const savedSessions = localStorage.getItem('login_sessions');
    const savedOtps = localStorage.getItem('otp_records');
    
    if (savedStudents) {
      setStudents(JSON.parse(savedStudents));
    }
    if (savedAttendance) {
      setAttendanceRecords(JSON.parse(savedAttendance));
    }
    if (savedSessions) {
      setLoginSessions(JSON.parse(savedSessions));
    }
    if (savedOtps) {
      setOtpRecords(JSON.parse(savedOtps));
    }

    // Check for existing valid session
    const savedCurrentSession = localStorage.getItem('current_student_session');
    if (savedCurrentSession) {
      const session = JSON.parse(savedCurrentSession);
      if (new Date() < new Date(session.expiresAt) && session.isActive) {
        setCurrentStudentSession(session);
      }
    }
  }, []);

  // Save session data
  useEffect(() => {
    localStorage.setItem('login_sessions', JSON.stringify(loginSessions));
  }, [loginSessions]);

  useEffect(() => {
    localStorage.setItem('otp_records', JSON.stringify(otpRecords));
  }, [otpRecords]);

  useEffect(() => {
    if (currentStudentSession) {
      localStorage.setItem('current_student_session', JSON.stringify(currentStudentSession));
    } else {
      localStorage.removeItem('current_student_session');
    }
  }, [currentStudentSession]);

  // Sync QR code from admin (in real app, this would come from API)
  useEffect(() => {
    const interval = setInterval(() => {
      const adminQrCode = localStorage.getItem('admin_qr_code');
      if (adminQrCode) {
        setQrCode(adminQrCode);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const markAttendance = (studentId: string, subject: string) => {
    // Only allow attendance marking if there's a valid session for this student
    if (currentStudentSession && currentStudentSession.studentId === studentId && currentStudentSession.isActive) {
      const newRecord: AttendanceRecord = {
        studentId,
        subject,
        timestamp: new Date(),
        status: 'present'
      };
      
      // Save to localStorage (in real app, this would go to API)
      const existingRecords = JSON.parse(localStorage.getItem('attendance_records') || '[]');
      const updatedRecords = [...existingRecords, newRecord];
      localStorage.setItem('attendance_records', JSON.stringify(updatedRecords));
      setAttendanceRecords(updatedRecords);
    }
  };

  const generateOTP = (mobileNumber: string): string => {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 5); // OTP valid for 5 minutes
    
    const otpRecord: OTPRecord = {
      mobileNumber,
      otp,
      generatedAt: new Date(),
      expiresAt,
      verified: false
    };
    
    setOtpRecords(prev => [...prev.filter(record => record.mobileNumber !== mobileNumber), otpRecord]);
    return otp;
  };

  const verifyOTP = (mobileNumber: string, enteredOtp: string): boolean => {
    const otpRecord = otpRecords.find(
      record => record.mobileNumber === mobileNumber && 
                record.otp === enteredOtp && 
                !record.verified &&
                new Date() <= new Date(record.expiresAt)
    );
    
    if (otpRecord) {
      // Mark OTP as verified
      setOtpRecords(prev => 
        prev.map(record => 
          record.mobileNumber === mobileNumber && record.otp === enteredOtp
            ? { ...record, verified: true }
            : record
        )
      );
      return true;
    }
    return false;
  };

  const createLoginSession = (studentId: string): LoginSession => {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // Session valid for 24 hours
    
    const session: LoginSession = {
      studentId,
      loginTime: new Date(),
      expiresAt,
      isActive: true
    };
    
    // Deactivate any existing sessions for this student
    setLoginSessions(prev => 
      prev.map(s => s.studentId === studentId ? { ...s, isActive: false } : s)
    );
    
    // Add new session
    setLoginSessions(prev => [...prev, session]);
    setCurrentStudentSession(session);
    
    return session;
  };

  const logout = () => {
    if (currentStudentSession) {
      setLoginSessions(prev => 
        prev.map(s => s.studentId === currentStudentSession.studentId ? { ...s, isActive: false } : s)
      );
    }
    setCurrentStudentSession(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#3B0A45] to-[#2B0230]">
      {/* Header */}
      <div className="flex justify-center items-center gap-4 p-6">
        <div className="flex items-center gap-2 bg-[#D9D9D9] text-black rounded-lg px-6 py-3">
          <Smartphone size={20} />
          <span className="font-bold uppercase">STUDENT APP</span>
        </div>
      </div>

      {/* Main Content */}
      <MobileApp
        students={students}
        qrCode={qrCode}
        currentSession={currentStudentSession}
        onMarkAttendance={markAttendance}
        onGenerateOTP={generateOTP}
        onVerifyOTP={verifyOTP}
        onCreateSession={createLoginSession}
        onLogout={logout}
      />
    </div>
  );
}