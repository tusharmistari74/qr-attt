import React, { useState, useEffect } from 'react';
import { AddStudentForm } from './AddStudentForm';
import { StudentList } from './StudentList';
import { QRCodePanel } from './QRCodePanel';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Checkbox } from './ui/checkbox';
import { Download, Users, QrCode } from 'lucide-react';
import { apiClient } from '../utils/api';

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

interface AdminPanelProps {
  students: Student[];
  attendanceRecords: AttendanceRecord[];
  qrCode: string | null;
  studentLimit: number;
  onAddStudent: (student: Omit<Student, 'id' | 'hasAccess' | 'accessValidUntil'>) => void;
  onRemoveStudent: (id: string) => void;
  onGenerateQR: () => void;
  onClearAttendance: () => void;
  onSetStudentLimit: (limit: number) => void;
}

export function AdminPanel({
  students,
  attendanceRecords,
  qrCode,
  studentLimit,
  onAddStudent,
  onRemoveStudent,
  onGenerateQR,
  onClearAttendance,
  onSetStudentLimit
}: AdminPanelProps) {
  const [downloadExcel, setDownloadExcel] = useState(false);
  const [limitInput, setLimitInput] = useState(studentLimit.toString());

  // Subscribe to live updates
  useEffect(() => {
    const unsubscribe = apiClient.subscribeToUpdates((event) => {
      console.log('📡 Admin received update:', event.type, event.payload)
      if (event.type === 'students:changed' || event.type === 'attendance:changed' || event.type === 'teachers:changed') {
        window.dispatchEvent(new CustomEvent('dataChanged', { detail: event }))
      }
    })
    return () => {
      apiClient.unsubscribeFromUpdates()
    }
  }, [])

  const handleSetLimit = () => {
    const newLimit = parseInt(limitInput);
    if (!isNaN(newLimit) && newLimit > 0) {
      onSetStudentLimit(newLimit);
    }
  };

  const handleSaveAttendance = () => {
    if (downloadExcel) {
      // Create CSV data for Excel export
      const csvData = attendanceRecords.map(record => {
        const student = students.find(s => s.id === record.studentId);
        return {
          PRN: student?.prn || '',
          'Roll Number': student?.rollNumber || '',
          Name: `${student?.prn || 'Unknown'}`,
          Department: student?.department || '',
          Class: student?.class || '',
          Division: student?.division || '',
          Subject: record.subject,
          Timestamp: record.timestamp,
          Status: record.status
        };
      });

      // Convert to CSV format
      const headers = Object.keys(csvData[0] || {});
      const csvContent = [
        headers.join(','),
        ...csvData.map(row => headers.map(header => row[header as keyof typeof row]).join(','))
      ].join('\n');

      // Download file
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Left Column - Student Management */}
        <div className="space-y-6">
          {/* Add Student Section */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
            <h2 className="text-center uppercase text-white mb-6">ADD STUDENT</h2>
            <AddStudentForm onAddStudent={onAddStudent} />
          </div>

          {/* Student List */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
            <div className="flex items-center gap-2 justify-center mb-6">
              <Users size={24} className="text-white" />
              <h2 className="text-center uppercase text-white">STUDENT LIST</h2>
            </div>
            <StudentList students={students} onRemoveStudent={onRemoveStudent} />
          </div>
        </div>

        {/* Right Column - QR Code Management */}
        <div className="space-y-6">
          {/* QR Code Panel */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
            <div className="flex items-center gap-2 justify-center mb-6">
              <QrCode size={24} className="text-white" />
              <h2 className="text-center uppercase text-white">Generate QR Code for Software</h2>
            </div>
            
            <div className="space-y-4">
              <Button
                onClick={onGenerateQR}
                className="w-full bg-[#D9D9D9] text-black hover:bg-[#C0C0C0] rounded-lg py-3"
              >
                Generate QR Code
              </Button>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="downloadExcel"
                  checked={downloadExcel}
                  onCheckedChange={(checked) => setDownloadExcel(checked as boolean)}
                />
                <label htmlFor="downloadExcel" className="text-white text-sm">
                  Download Excel File
                </label>
              </div>

              <Button
                onClick={handleSaveAttendance}
                className="w-full bg-[#D9D9D9] text-black hover:bg-[#C0C0C0] rounded-lg py-3"
              >
                <Download size={16} className="mr-2" />
                Save Attendance
              </Button>

              <Button
                onClick={onClearAttendance}
                className="w-full bg-[#FF0000] text-white hover:bg-[#E60000] rounded-lg py-3"
              >
                Clear Attendance
              </Button>
            </div>

            {/* QR Code Display */}
            <QRCodePanel qrCode={qrCode} />
          </div>

          {/* Set Student Limit */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
            <h3 className="text-center uppercase text-white mb-4">Set Student Limit</h3>
            <div className="flex gap-2">
              <Input
                type="number"
                value={limitInput}
                onChange={(e) => setLimitInput(e.target.value)}
                className="bg-white border-gray-300 rounded-md"
                placeholder="Enter limit"
              />
              <Button
                onClick={handleSetLimit}
                className="bg-[#D9D9D9] text-black hover:bg-[#C0C0C0] rounded-lg px-6"
              >
                Set Limit
              </Button>
            </div>
            
            <div className="mt-4 text-center space-y-2">
              <p className="text-white">
                <strong>Total User IDs in Software: {students.length}</strong>
              </p>
              <p className="text-green-400 text-sm">
                Active Students: {students.filter(s => s.hasAccess && new Date() < new Date(s.accessValidUntil)).length}
              </p>
              <p className="text-yellow-400 text-sm">
                All students have 1-year login access with OTP authentication
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}