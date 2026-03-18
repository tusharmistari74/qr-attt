import React, { useState } from 'react';
import { QRScanner } from './QRScanner';
import { SubjectSelection } from './SubjectSelection';
import { StudentLogin } from './StudentLogin';
import { StudentDashboard } from './StudentDashboard';

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

interface LoginSession {
  studentId: string;
  loginTime: Date;
  expiresAt: Date;
  isActive: boolean;
}

interface MobileAppProps {
  students: Student[];
  qrCode: string | null;
  currentSession: LoginSession | null;
  onMarkAttendance: (studentId: string, subject: string) => void;
  onGenerateOTP: (mobileNumber: string) => string;
  onVerifyOTP: (mobileNumber: string, otp: string) => boolean;
  onCreateSession: (studentId: string) => LoginSession;
  onLogout: () => void;
}

export function MobileApp({ 
  students, 
  qrCode, 
  currentSession, 
  onMarkAttendance,
  onGenerateOTP,
  onVerifyOTP,
  onCreateSession,
  onLogout
}: MobileAppProps) {
  const [currentView, setCurrentView] = useState<'login' | 'dashboard' | 'scanner' | 'subjects'>('login');
  const [scannedData, setScannedData] = useState<any>(null);

  // Check if session is valid and not expired
  const isSessionValid = currentSession && 
    currentSession.isActive && 
    new Date() < new Date(currentSession.expiresAt);

  const handleLoginSuccess = (session: LoginSession) => {
    setCurrentView('dashboard');
  };

  const handleStartAttendance = () => {
    setCurrentView('scanner');
  };

  const handleQRScan = (data: string) => {
    try {
      const parsed = JSON.parse(data);
      setScannedData(parsed);
      setCurrentView('subjects');
    } catch (error) {
      console.error('Invalid QR code data');
    }
  };

  const handleSubjectSelect = (subject: string) => {
    if (currentSession) {
      onMarkAttendance(currentSession.studentId, subject);
      
      // Show success message and return to dashboard
      alert(`Attendance marked for ${subject}`);
      setCurrentView('dashboard');
      setScannedData(null);
    }
  };

  const handleBackToDashboard = () => {
    setCurrentView('dashboard');
    setScannedData(null);
  };

  const handleLogout = () => {
    onLogout();
    setCurrentView('login');
    setScannedData(null);
  };

  // If no valid session, show login
  if (!isSessionValid) {
    return (
      <div className="max-w-md mx-auto">
        <StudentLogin
          students={students}
          onGenerateOTP={onGenerateOTP}
          onVerifyOTP={onVerifyOTP}
          onCreateSession={onCreateSession}
          onLoginSuccess={handleLoginSuccess}
        />
      </div>
    );
  }

  // Get current student
  const currentStudent = students.find(s => s.id === currentSession.studentId);

  return (
    <div className="max-w-md mx-auto">
      {currentView === 'dashboard' && (
        <StudentDashboard
          student={currentStudent!}
          session={currentSession}
          onStartAttendance={handleStartAttendance}
          onLogout={handleLogout}
        />
      )}
      
      {currentView === 'scanner' && (
        <QRScanner 
          onScan={handleQRScan}
          availableQRCode={qrCode}
          onBack={handleBackToDashboard}
        />
      )}
      
      {currentView === 'subjects' && (
        <SubjectSelection
          onSelectSubject={handleSubjectSelect}
          onBack={handleBackToDashboard}
        />
      )}
    </div>
  );
}