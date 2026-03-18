import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Plus } from 'lucide-react';

interface Student {
  prn: string;
  rollNumber: string;
  mobileNumber: string;
  department: string;
  class: string;
  division: string;
}

interface AddStudentFormProps {
  onAddStudent: (student: Student) => void;
}

export function AddStudentForm({ onAddStudent }: AddStudentFormProps) {
  const [formData, setFormData] = useState<Student>({
    prn: '',
    rollNumber: '',
    mobileNumber: '',
    department: '',
    class: '',
    division: ''
  });

  const departments = [
    'Computer Engineering',
    'Information Technology',
    'Electronics & Telecommunications',
    'Mechanical Engineering',
    'Civil Engineering',
    'Electrical Engineering'
  ];

  const classes = ['FE', 'SE', 'TE', 'BE'];
  const divisions = ['A', 'B', 'C', 'D'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (Object.values(formData).every(value => value.trim() !== '')) {
      onAddStudent(formData);
      setFormData({
        prn: '',
        rollNumber: '',
        mobileNumber: '',
        department: '',
        class: '',
        division: ''
      });
    }
  };

  const handleInputChange = (field: keyof Student, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        <Input
          type="text"
          placeholder="Student PRN"
          value={formData.prn}
          onChange={(e) => handleInputChange('prn', e.target.value)}
          className="bg-white border-gray-300 rounded-md"
          required
        />
        
        <Input
          type="text"
          placeholder="Roll Number"
          value={formData.rollNumber}
          onChange={(e) => handleInputChange('rollNumber', e.target.value)}
          className="bg-white border-gray-300 rounded-md"
          required
        />
        
        <Input
          type="tel"
          placeholder="Mobile Number"
          value={formData.mobileNumber}
          onChange={(e) => handleInputChange('mobileNumber', e.target.value)}
          className="bg-white border-gray-300 rounded-md"
          required
        />
        
        <Select value={formData.department} onValueChange={(value) => handleInputChange('department', value)}>
          <SelectTrigger className="bg-white border-gray-300 rounded-md">
            <SelectValue placeholder="Department" />
          </SelectTrigger>
          <SelectContent>
            {departments.map((dept) => (
              <SelectItem key={dept} value={dept}>
                {dept}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Select value={formData.class} onValueChange={(value) => handleInputChange('class', value)}>
          <SelectTrigger className="bg-white border-gray-300 rounded-md">
            <SelectValue placeholder="Class" />
          </SelectTrigger>
          <SelectContent>
            {classes.map((cls) => (
              <SelectItem key={cls} value={cls}>
                {cls}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Select value={formData.division} onValueChange={(value) => handleInputChange('division', value)}>
          <SelectTrigger className="bg-white border-gray-300 rounded-md">
            <SelectValue placeholder="Division" />
          </SelectTrigger>
          <SelectContent>
            {divisions.map((div) => (
              <SelectItem key={div} value={div}>
                {div}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <Button
        type="submit"
        className="w-full bg-purple-600 text-white hover:bg-purple-700 rounded-lg py-3 flex items-center justify-center gap-2"
      >
        <Plus size={20} />
        Add Student
      </Button>
    </form>
  );
}