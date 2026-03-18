import React from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import { Trash2, User, Phone, GraduationCap, Shield, ShieldCheck } from 'lucide-react';

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

interface StudentListProps {
  students: Student[];
  onRemoveStudent: (id: string) => void;
}

export function StudentList({ students, onRemoveStudent }: StudentListProps) {
  if (students.length === 0) {
    return (
      <div className="text-center text-white/70 py-8">
        <User size={48} className="mx-auto mb-4 opacity-50" />
        <p>No students added yet</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-96">
      <div className="space-y-3">
        {students.map((student) => (
          <Card key={student.id} className="bg-white/20 border-white/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <User size={16} className="text-white" />
                    <span className="text-white">{student.prn}</span>
                    <span className="text-white/70">({student.rollNumber})</span>
                  </div>
                  
                  <div className="flex items-center gap-2 mb-1">
                    <Phone size={14} className="text-white/70" />
                    <span className="text-white/90 text-sm">{student.mobileNumber}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 mb-1">
                    <GraduationCap size={14} className="text-white/70" />
                    <span className="text-white/90 text-sm">
                      {student.department} - {student.class}/{student.division}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {student.hasAccess && new Date() < new Date(student.accessValidUntil) ? (
                      <>
                        <ShieldCheck size={14} className="text-green-400" />
                        <span className="text-green-400 text-xs">
                          Access until {new Date(student.accessValidUntil).toLocaleDateString()}
                        </span>
                      </>
                    ) : (
                      <>
                        <Shield size={14} className="text-red-400" />
                        <span className="text-red-400 text-xs">Access expired</span>
                      </>
                    )}
                  </div>
                </div>
                
                <Button
                  onClick={() => onRemoveStudent(student.id)}
                  size="sm"
                  className="bg-[#FF0000] text-white hover:bg-[#E60000] rounded-md ml-4"
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </ScrollArea>
  );
}