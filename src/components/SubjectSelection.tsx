import React from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { ArrowLeft, BookOpen } from 'lucide-react';

interface SubjectSelectionProps {
  onSelectSubject: (subject: string) => void;
  onBack: () => void;
}

export function SubjectSelection({ onSelectSubject, onBack }: SubjectSelectionProps) {
  const subjects = [
    'Software Engineering',
    'Database Management System (DBMS)',
    'Artificial Intelligence',
    'Cyber Law and Security',
    'Computer Networks',
    'Operating Systems',
    'Data Structures and Algorithms',
    'Web Technology',
    'Mobile Application Development',
    'Machine Learning',
    'Cloud Computing',
    'Internet of Things (IoT)'
  ];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <Button
          onClick={onBack}
          className="bg-white/20 text-white hover:bg-white/30 rounded-lg p-2"
        >
          <ArrowLeft size={20} />
        </Button>
        <h1 className="text-center uppercase text-white">SUBJECT B</h1>
        <div className="w-10"></div> {/* Spacer for centering */}
      </div>
      
      <Card className="bg-white/10 backdrop-blur-sm border-white/20">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 justify-center mb-6">
            <BookOpen size={24} className="text-white" />
            <h2 className="text-center text-white">Select Subject</h2>
          </div>
          
          {/* Subject List */}
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {subjects.map((subject) => (
              <Button
                key={subject}
                onClick={() => onSelectSubject(subject)}
                className="w-full bg-white text-black hover:bg-gray-100 rounded-lg py-4 text-left justify-start transition-all duration-200 hover:scale-102"
              >
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                  <span className="text-sm">{subject}</span>
                </div>
              </Button>
            ))}
          </div>
          
          {/* Info */}
          <div className="mt-6 text-center text-white/80 text-sm">
            <p>Select a subject to mark your attendance</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}