import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { apiClient, Student, InternshipRecord, SkillRecord, PracticalRecord, AssignmentRecord, InternalExamRecord } from '../utils/api';
import { Plus, Trash2, Pencil, Briefcase, Award, Beaker, FileText, FileSignature, X, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface StudentRecordsPanelProps {
  studentId: string;
  viewerRole: 'student' | 'teacher' | 'admin';
}

export function StudentRecordsPanel({ studentId, viewerRole }: StudentRecordsPanelProps) {
  const [student, setStudent] = useState<Student | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Form states for Add
  const [newInternship, setNewInternship] = useState<Partial<InternshipRecord>>({});
  const [newSkill, setNewSkill] = useState<Partial<SkillRecord>>({});
  const [newPractical, setNewPractical] = useState<Partial<PracticalRecord>>({});
  const [newAssignment, setNewAssignment] = useState<Partial<AssignmentRecord>>({});
  const [newExam, setNewExam] = useState<Partial<InternalExamRecord>>({});

  // Form states for Edit
  const [editingInternshipId, setEditingInternshipId] = useState<string | null>(null);
  const [editInternshipData, setEditInternshipData] = useState<Partial<InternshipRecord>>({});

  const [editingSkillId, setEditingSkillId] = useState<string | null>(null);
  const [editSkillData, setEditSkillData] = useState<Partial<SkillRecord>>({});

  const [editingPracticalId, setEditingPracticalId] = useState<string | null>(null);
  const [editPracticalData, setEditPracticalData] = useState<Partial<PracticalRecord>>({});

  const [editingAssignmentId, setEditingAssignmentId] = useState<string | null>(null);
  const [editAssignmentData, setEditAssignmentData] = useState<Partial<AssignmentRecord>>({});

  const [editingExamId, setEditingExamId] = useState<string | null>(null);
  const [editExamData, setEditExamData] = useState<Partial<InternalExamRecord>>({});

  const loadStudent = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.getStudents();
      if (res.success) {
        const found = res.students.find((s: Student) => s.id === studentId);
        setStudent(found || null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (studentId) loadStudent();
  }, [studentId]);

  const handleUpdateStudent = async (updates: Partial<Student>) => {
    if (!student) return;
    try {
      const res = await apiClient.updateStudent(student.id, updates);
      if (res.success) {
        setStudent(res.student);
      } else {
        alert('Failed to update: ' + res.error);
      }
    } catch (e: any) {
      alert('Error updating: ' + e.message);
    }
  };

  // Student actions
  const addInternship = () => {
    if (!newInternship.company || !newInternship.role) return alert('Company and Role required');
    const record: InternshipRecord = {
      id: 'int_' + Date.now(),
      company: newInternship.company,
      role: newInternship.role,
      duration: newInternship.duration || '',
      description: newInternship.description || ''
    };
    handleUpdateStudent({ internships: [...(student?.internships || []), record] });
    setNewInternship({});
  };

  const removeInternship = (id: string) => {
    handleUpdateStudent({ internships: (student?.internships || []).filter(i => i.id !== id) });
  };

  const addSkill = () => {
    if (!newSkill.skillName || !newSkill.proficiency) return alert('Skill Name and Proficiency required');
    const record: SkillRecord = {
      id: 'sk_' + Date.now(),
      skillName: newSkill.skillName,
      proficiency: newSkill.proficiency
    };
    handleUpdateStudent({ skills: [...(student?.skills || []), record] });
    setNewSkill({});
  };

  const removeSkill = (id: string) => {
    handleUpdateStudent({ skills: (student?.skills || []).filter(i => i.id !== id) });
  };

  // Teacher/Admin actions
  const addPractical = () => {
    if (!newPractical.subject || !newPractical.experimentName) return alert('Subject and Experiment Name required');
    const record: PracticalRecord = {
      id: 'prac_' + Date.now(),
      subject: newPractical.subject,
      experimentName: newPractical.experimentName,
      date: newPractical.date || new Date().toISOString().split('T')[0],
      marks: newPractical.marks || ''
    };
    handleUpdateStudent({ practicals: [...(student?.practicals || []), record] });
    setNewPractical({});
  };

  const removePractical = (id: string) => {
    handleUpdateStudent({ practicals: (student?.practicals || []).filter(i => i.id !== id) });
  };

  const addAssignment = () => {
    if (!newAssignment.subject || !newAssignment.assignmentName) return alert('Subject and Assignment Name required');
    const record: AssignmentRecord = {
      id: 'assig_' + Date.now(),
      subject: newAssignment.subject,
      assignmentName: newAssignment.assignmentName,
      date: newAssignment.date || new Date().toISOString().split('T')[0],
      marks: newAssignment.marks || ''
    };
    handleUpdateStudent({ assignments: [...(student?.assignments || []), record] });
    setNewAssignment({});
  };

  const removeAssignment = (id: string) => {
    handleUpdateStudent({ assignments: (student?.assignments || []).filter(i => i.id !== id) });
  };

  const addExam = () => {
    if (!newExam.subject || !newExam.semester) return alert('Subject and Semester required');
    const record: InternalExamRecord = {
      id: 'exam_' + Date.now(),
      subject: newExam.subject,
      semester: newExam.semester,
      exam1: newExam.exam1 || '',
      exam2: newExam.exam2 || '',
      exam3: newExam.exam3 || ''
    };
    handleUpdateStudent({ internalExams: [...(student?.internalExams || []), record] });
    setNewExam({});
  };

  const removeExam = (id: string) => {
    handleUpdateStudent({ internalExams: (student?.internalExams || []).filter(i => i.id !== id) });
  };

  const startEditInternship = (int: InternshipRecord) => { setEditingInternshipId(int.id); setEditInternshipData(int); };
  const saveInternship = (id: string) => {
    const updated = (student?.internships || []).map(i => i.id === id ? { ...i, ...editInternshipData } as InternshipRecord : i);
    handleUpdateStudent({ internships: updated });
    setEditingInternshipId(null);
  };

  const startEditSkill = (skill: SkillRecord) => { setEditingSkillId(skill.id); setEditSkillData(skill); };
  const saveSkill = (id: string) => {
    const updated = (student?.skills || []).map(s => s.id === id ? { ...s, ...editSkillData } as SkillRecord : s);
    handleUpdateStudent({ skills: updated });
    setEditingSkillId(null);
  };

  const startEditPractical = (prac: PracticalRecord) => { setEditingPracticalId(prac.id); setEditPracticalData(prac); };
  const savePractical = (id: string) => {
    const updated = (student?.practicals || []).map(p => p.id === id ? { ...p, ...editPracticalData } as PracticalRecord : p);
    handleUpdateStudent({ practicals: updated });
    setEditingPracticalId(null);
  };

  const startEditAssignment = (assig: AssignmentRecord) => { setEditingAssignmentId(assig.id); setEditAssignmentData(assig); };
  const saveAssignment = (id: string) => {
    const updated = (student?.assignments || []).map(a => a.id === id ? { ...a, ...editAssignmentData } as AssignmentRecord : a);
    handleUpdateStudent({ assignments: updated });
    setEditingAssignmentId(null);
  };

  const startEditExam = (exam: InternalExamRecord) => { setEditingExamId(exam.id); setEditExamData(exam); };
  const saveExam = (id: string) => {
    const updated = (student?.internalExams || []).map(e => e.id === id ? { ...e, ...editExamData } as InternalExamRecord : e);
    handleUpdateStudent({ internalExams: updated });
    setEditingExamId(null);
  };

  if (isLoading) return <div className="p-4 text-white">Loading records...</div>;
  if (!student) return <div className="p-4 text-white">Student not found</div>;

  const canStudentEdit = viewerRole === 'student';
  const canTeacherEdit = viewerRole === 'teacher' || viewerRole === 'admin';

  return (
    <div className="space-y-6">
      <Tabs defaultValue="profile">
        <TabsList className="bg-white/10 text-white w-full grid grid-cols-2 lg:grid-cols-5 h-auto">
          <TabsTrigger value="profile" className="data-[state=active]:bg-white data-[state=active]:text-[#3B0A45] py-2">Profile & Skills</TabsTrigger>
          <TabsTrigger value="practicals" className="data-[state=active]:bg-white data-[state=active]:text-[#3B0A45] py-2">Practicals</TabsTrigger>
          <TabsTrigger value="assignments" className="data-[state=active]:bg-white data-[state=active]:text-[#3B0A45] py-2">Assignments</TabsTrigger>
          <TabsTrigger value="exams" className="data-[state=active]:bg-white data-[state=active]:text-[#3B0A45] py-2">Internal Exams</TabsTrigger>
        </TabsList>

        {/* Profile & Skills (Student fillable) */}
        <TabsContent value="profile" className="space-y-6 mt-4">
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Briefcase size={20} /> Internships Track Record
              </CardTitle>
            </CardHeader>
            <CardContent>
              {canStudentEdit && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-4">
                  <Input placeholder="Company" value={newInternship.company || ''} onChange={e => setNewInternship({...newInternship, company: e.target.value})} className="bg-white/10 text-white border-white/20" />
                  <Input placeholder="Role" value={newInternship.role || ''} onChange={e => setNewInternship({...newInternship, role: e.target.value})} className="bg-white/10 text-white border-white/20" />
                  <Input placeholder="Duration (e.g. 3 months)" value={newInternship.duration || ''} onChange={e => setNewInternship({...newInternship, duration: e.target.value})} className="bg-white/10 text-white border-white/20" />
                  <Button onClick={addInternship} className="bg-[#D9D9D9] text-black hover:bg-[#C0C0C0]"><Plus size={16} className="mr-2"/> Add</Button>
                </div>
              )}
              <div className="space-y-3">
                <AnimatePresence>
                  {(student.internships || []).map(int => (
                    <motion.div 
                      key={int.id} 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      whileHover={{ scale: 1.01 }}
                      className="p-4 bg-white/10 hover:bg-white/15 transition-all border border-white/10 rounded-lg flex justify-between items-center text-white shadow-lg"
                    >
                      {editingInternshipId === int.id ? (
                        <div className="flex items-center gap-2 w-full">
                          <Input value={editInternshipData.company || ''} onChange={e => setEditInternshipData({...editInternshipData, company: e.target.value})} className="bg-white/10 text-white" placeholder="Company" />
                          <Input value={editInternshipData.role || ''} onChange={e => setEditInternshipData({...editInternshipData, role: e.target.value})} className="bg-white/10 text-white" placeholder="Role" />
                          <Input value={editInternshipData.duration || ''} onChange={e => setEditInternshipData({...editInternshipData, duration: e.target.value})} className="bg-white/10 text-white" placeholder="Duration" />
                          <Button variant="ghost" size="icon" onClick={() => saveInternship(int.id)} className="text-green-400"><Save size={16}/></Button>
                          <Button variant="ghost" size="icon" onClick={() => setEditingInternshipId(null)} className="text-red-400"><X size={16}/></Button>
                        </div>
                      ) : (
                        <>
                          <div>
                            <p className="font-bold text-lg text-purple-300">{int.role} <span className="text-white font-medium">at</span> {int.company}</p>
                            <p className="text-sm text-white/70 mt-1">Duration: {int.duration}</p>
                          </div>
                          {canStudentEdit && (
                            <div className="flex gap-2">
                              <Button variant="ghost" size="icon" onClick={() => startEditInternship(int)} className="text-blue-400 hover:text-blue-300 hover:bg-blue-400/20 rounded-full h-8 w-8">
                                <Pencil size={16} />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => removeInternship(int.id)} className="text-red-400 hover:text-red-300 hover:bg-red-400/20 rounded-full h-8 w-8">
                                <Trash2 size={16} />
                              </Button>
                            </div>
                          )}
                        </>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
                {(!student.internships || student.internships.length === 0) && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-white/50 text-sm text-center py-4 bg-white/5 rounded-lg">No internship records added yet.</motion.p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Award size={20} /> Skill Record
              </CardTitle>
            </CardHeader>
            <CardContent>
              {canStudentEdit && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-4">
                  <Input placeholder="Skill Name (e.g. ReactJS)" value={newSkill.skillName || ''} onChange={e => setNewSkill({...newSkill, skillName: e.target.value})} className="bg-white/10 text-white border-white/20" />
                  <Input placeholder="Proficiency (e.g. Intermediate)" value={newSkill.proficiency || ''} onChange={e => setNewSkill({...newSkill, proficiency: e.target.value})} className="bg-white/10 text-white border-white/20" />
                  <Button onClick={addSkill} className="bg-[#D9D9D9] text-black hover:bg-[#C0C0C0]"><Plus size={16} className="mr-2"/> Add</Button>
                </div>
              )}
              <div className="flex flex-wrap gap-3">
                <AnimatePresence>
                  {(student.skills || []).map(skill => (
                    <motion.div
                      key={skill.id}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      whileHover={{ y: -2 }}
                    >
                      {editingSkillId === skill.id ? (
                        <div className="flex items-center gap-2 p-1 bg-white/10 rounded px-2">
                          <Input value={editSkillData.skillName || ''} onChange={e => setEditSkillData({...editSkillData, skillName: e.target.value})} className="bg-white/10 text-white h-7 text-xs w-24" />
                          <Input value={editSkillData.proficiency || ''} onChange={e => setEditSkillData({...editSkillData, proficiency: e.target.value})} className="bg-white/10 text-white h-7 text-xs w-24" />
                          <Save size={14} className="cursor-pointer text-green-400" onClick={() => saveSkill(skill.id)}/>
                          <X size={14} className="cursor-pointer text-red-400" onClick={() => setEditingSkillId(null)}/>
                        </div>
                      ) : (
                        <Badge variant="outline" className="text-white bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-purple-500/30 py-1.5 px-4 text-sm flex items-center gap-2 shadow-lg backdrop-blur-sm">
                          <span className="font-bold text-purple-200">{skill.skillName}</span>
                          <span className="text-white/60">•</span>
                          <span className="text-pink-200">{skill.proficiency}</span>
                          {canStudentEdit && (
                            <div className="flex items-center ml-2 gap-1">
                              <Pencil size={14} className="cursor-pointer hover:text-blue-400 transition-colors" onClick={() => startEditSkill(skill)} />
                              <Trash2 size={14} className="cursor-pointer hover:text-red-400 transition-colors" onClick={() => removeSkill(skill.id)} />
                            </div>
                          )}
                        </Badge>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
                {(!student.skills || student.skills.length === 0) && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-white/50 text-sm w-full text-center py-4 bg-white/5 rounded-lg">No skills added yet.</motion.p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Practicals (Teacher fillable) */}
        <TabsContent value="practicals" className="mt-4">
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2"><Beaker size={20} /> Practical Records</CardTitle>
            </CardHeader>
            <CardContent>
              {canTeacherEdit && (
                <div className="grid grid-cols-1 md:grid-cols-5 gap-2 mb-4">
                  <Input placeholder="Subject" value={newPractical.subject || ''} onChange={e => setNewPractical({...newPractical, subject: e.target.value})} className="bg-white/10 text-white border-white/20" />
                  <Input placeholder="Experiment Name" value={newPractical.experimentName || ''} onChange={e => setNewPractical({...newPractical, experimentName: e.target.value})} className="bg-white/10 text-white border-white/20" />
                  <Input type="date" value={newPractical.date || ''} onChange={e => setNewPractical({...newPractical, date: e.target.value})} className="bg-white/10 text-white border-white/20" />
                  <Input placeholder="Marks (e.g. 9/10)" value={newPractical.marks || ''} onChange={e => setNewPractical({...newPractical, marks: e.target.value})} className="bg-white/10 text-white border-white/20" />
                  <Button onClick={addPractical} className="bg-[#D9D9D9] text-black hover:bg-[#C0C0C0]">Add</Button>
                </div>
              )}
              <div className="space-y-3">
                <AnimatePresence>
                  {(student.practicals || []).map(prac => (
                    <motion.div 
                      key={prac.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      whileHover={{ scale: 1.01 }}
                      className="p-4 bg-gradient-to-r from-blue-500/10 to-transparent border border-blue-500/20 rounded-lg flex justify-between items-center text-white shadow-lg"
                    >
                      {editingPracticalId === prac.id ? (
                        <div className="flex items-center gap-2 w-full">
                          <Input value={editPracticalData.subject || ''} onChange={e => setEditPracticalData({...editPracticalData, subject: e.target.value})} className="bg-white/10 text-white" placeholder="Subject" />
                          <Input value={editPracticalData.experimentName || ''} onChange={e => setEditPracticalData({...editPracticalData, experimentName: e.target.value})} className="bg-white/10 text-white" placeholder="Experiment" />
                          <Input value={editPracticalData.date || ''} onChange={e => setEditPracticalData({...editPracticalData, date: e.target.value})} className="bg-white/10 text-white w-32" type="date" />
                          <Input value={editPracticalData.marks || ''} onChange={e => setEditPracticalData({...editPracticalData, marks: e.target.value})} className="bg-white/10 text-white w-24" placeholder="Marks" />
                          <Button variant="ghost" size="icon" onClick={() => savePractical(prac.id)} className="text-green-400"><Save size={16}/></Button>
                          <Button variant="ghost" size="icon" onClick={() => setEditingPracticalId(null)} className="text-red-400"><X size={16}/></Button>
                        </div>
                      ) : (
                        <>
                          <div>
                            <p className="font-bold text-lg text-blue-300">{prac.subject}</p>
                            <p className="text-white/90">{prac.experimentName}</p>
                            <p className="text-sm text-white/60 mt-1 flex items-center gap-1"><Beaker size={12}/> {prac.date}</p>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="bg-blue-500/20 px-4 py-2 rounded-lg border border-blue-500/30">
                              <span className="font-bold text-blue-300 text-xl">{prac.marks}</span>
                            </div>
                            {canTeacherEdit && (
                              <div className="flex gap-2">
                                <Button variant="ghost" size="icon" onClick={() => startEditPractical(prac)} className="text-blue-400 hover:text-blue-300 hover:bg-blue-400/20 rounded-full h-8 w-8">
                                  <Pencil size={16} />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => removePractical(prac.id)} className="text-red-400 hover:text-red-300 hover:bg-red-400/20 rounded-full h-8 w-8">
                                  <Trash2 size={16} />
                                </Button>
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
                {(!student.practicals || student.practicals.length === 0) && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-white/50 text-sm text-center py-4 bg-white/5 rounded-lg">No practical records added yet.</motion.p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Assignments (Teacher fillable) */}
        <TabsContent value="assignments" className="mt-4">
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2"><FileText size={20} /> Assignment Track Record</CardTitle>
            </CardHeader>
            <CardContent>
              {canTeacherEdit && (
                <div className="grid grid-cols-1 md:grid-cols-5 gap-2 mb-4">
                  <Input placeholder="Subject" value={newAssignment.subject || ''} onChange={e => setNewAssignment({...newAssignment, subject: e.target.value})} className="bg-white/10 text-white border-white/20" />
                  <Input placeholder="Assignment Name" value={newAssignment.assignmentName || ''} onChange={e => setNewAssignment({...newAssignment, assignmentName: e.target.value})} className="bg-white/10 text-white border-white/20" />
                  <Input type="date" value={newAssignment.date || ''} onChange={e => setNewAssignment({...newAssignment, date: e.target.value})} className="bg-white/10 text-white border-white/20" />
                  <Input placeholder="Marks (e.g. A+)" value={newAssignment.marks || ''} onChange={e => setNewAssignment({...newAssignment, marks: e.target.value})} className="bg-white/10 text-white border-white/20" />
                  <Button onClick={addAssignment} className="bg-[#D9D9D9] text-black hover:bg-[#C0C0C0]">Add</Button>
                </div>
              )}
              <div className="space-y-3">
                <AnimatePresence>
                  {(student.assignments || []).map(assig => (
                    <motion.div 
                      key={assig.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      whileHover={{ scale: 1.01 }}
                      className="p-4 bg-gradient-to-r from-yellow-500/10 to-transparent border border-yellow-500/20 rounded-lg flex justify-between items-center text-white shadow-lg"
                    >
                      {editingAssignmentId === assig.id ? (
                        <div className="flex items-center gap-2 w-full">
                          <Input value={editAssignmentData.subject || ''} onChange={e => setEditAssignmentData({...editAssignmentData, subject: e.target.value})} className="bg-white/10 text-white" placeholder="Subject" />
                          <Input value={editAssignmentData.assignmentName || ''} onChange={e => setEditAssignmentData({...editAssignmentData, assignmentName: e.target.value})} className="bg-white/10 text-white" placeholder="Assignment Name" />
                          <Input value={editAssignmentData.date || ''} onChange={e => setEditAssignmentData({...editAssignmentData, date: e.target.value})} className="bg-white/10 text-white w-32" type="date" />
                          <Input value={editAssignmentData.marks || ''} onChange={e => setEditAssignmentData({...editAssignmentData, marks: e.target.value})} className="bg-white/10 text-white w-24" placeholder="Marks" />
                          <Button variant="ghost" size="icon" onClick={() => saveAssignment(assig.id)} className="text-green-400"><Save size={16}/></Button>
                          <Button variant="ghost" size="icon" onClick={() => setEditingAssignmentId(null)} className="text-red-400"><X size={16}/></Button>
                        </div>
                      ) : (
                        <>
                          <div>
                            <p className="font-bold text-lg text-yellow-300">{assig.subject}</p>
                            <p className="text-white/90">{assig.assignmentName}</p>
                            <p className="text-sm text-white/60 mt-1 flex items-center gap-1"><FileText size={12}/> {assig.date}</p>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="bg-yellow-500/20 px-4 py-2 rounded-lg border border-yellow-500/30">
                              <span className="font-bold text-yellow-300 text-xl">{assig.marks}</span>
                            </div>
                            {canTeacherEdit && (
                              <div className="flex gap-2">
                                <Button variant="ghost" size="icon" onClick={() => startEditAssignment(assig)} className="text-blue-400 hover:text-blue-300 hover:bg-blue-400/20 rounded-full h-8 w-8">
                                  <Pencil size={16} />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => removeAssignment(assig.id)} className="text-red-400 hover:text-red-300 hover:bg-red-400/20 rounded-full h-8 w-8">
                                  <Trash2 size={16} />
                                </Button>
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
                {(!student.assignments || student.assignments.length === 0) && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-white/50 text-sm text-center py-4 bg-white/5 rounded-lg">No assignment records added yet.</motion.p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Internal Exams (Teacher fillable) */}
        <TabsContent value="exams" className="mt-4">
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2"><FileSignature size={20} /> Internal Exam Marks</CardTitle>
              <CardDescription className="text-white/70">3 Exams per semester (marks out of 20)</CardDescription>
            </CardHeader>
            <CardContent>
              {canTeacherEdit && (
                <div className="grid grid-cols-1 md:grid-cols-6 gap-2 mb-4">
                  <Input placeholder="Subject" value={newExam.subject || ''} onChange={e => setNewExam({...newExam, subject: e.target.value})} className="bg-white/10 text-white border-white/20" />
                  <Input placeholder="Semester" value={newExam.semester || ''} onChange={e => setNewExam({...newExam, semester: e.target.value})} className="bg-white/10 text-white border-white/20" />
                  <Input placeholder="Exam 1" value={newExam.exam1 || ''} onChange={e => setNewExam({...newExam, exam1: e.target.value})} className="bg-white/10 text-white border-white/20" />
                  <Input placeholder="Exam 2" value={newExam.exam2 || ''} onChange={e => setNewExam({...newExam, exam2: e.target.value})} className="bg-white/10 text-white border-white/20" />
                  <Input placeholder="Exam 3" value={newExam.exam3 || ''} onChange={e => setNewExam({...newExam, exam3: e.target.value})} className="bg-white/10 text-white border-white/20" />
                  <Button onClick={addExam} className="bg-[#D9D9D9] text-black hover:bg-[#C0C0C0]">Add</Button>
                </div>
              )}
              <div className="space-y-4">
                <AnimatePresence>
                  {(student.internalExams || []).map(exam => (
                    <motion.div 
                      key={exam.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      whileHover={{ scale: 1.01 }}
                      className="p-5 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-xl text-white flex flex-col md:flex-row justify-between items-start md:items-center shadow-lg gap-4"
                    >
                      {editingExamId === exam.id ? (
                        <div className="flex flex-col md:flex-row items-center gap-2 w-full">
                          <Input value={editExamData.subject || ''} onChange={e => setEditExamData({...editExamData, subject: e.target.value})} className="bg-white/10 text-white" placeholder="Subject" />
                          <Input value={editExamData.semester || ''} onChange={e => setEditExamData({...editExamData, semester: e.target.value})} className="bg-white/10 text-white w-24" placeholder="Sem" />
                          <Input value={editExamData.exam1 || ''} onChange={e => setEditExamData({...editExamData, exam1: e.target.value})} className="bg-white/10 text-white w-20" placeholder="Ex1" />
                          <Input value={editExamData.exam2 || ''} onChange={e => setEditExamData({...editExamData, exam2: e.target.value})} className="bg-white/10 text-white w-20" placeholder="Ex2" />
                          <Input value={editExamData.exam3 || ''} onChange={e => setEditExamData({...editExamData, exam3: e.target.value})} className="bg-white/10 text-white w-20" placeholder="Ex3" />
                          <div className="flex gap-2">
                            <Button variant="ghost" size="icon" onClick={() => saveExam(exam.id)} className="text-green-400"><Save size={16}/></Button>
                            <Button variant="ghost" size="icon" onClick={() => setEditingExamId(null)} className="text-red-400"><X size={16}/></Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div>
                            <p className="font-bold text-2xl text-emerald-300">{exam.subject}</p>
                            <p className="text-sm text-white/80 bg-white/10 w-fit px-3 py-1 rounded-full mt-2">Semester: {exam.semester}</p>
                          </div>
                          <div className="flex gap-3 items-center w-full md:w-auto">
                            <div className="flex-1 md:flex-none text-center bg-white/5 p-3 rounded-lg border border-white/10 hover:bg-white/10 transition-colors">
                              <p className="text-xs text-white/60 uppercase mb-1 font-medium tracking-wider">Exam 1</p>
                              <p className="font-bold text-xl text-white">{exam.exam1 || '-'}<span className="text-white/40 text-sm">/20</span></p>
                            </div>
                            <div className="flex-1 md:flex-none text-center bg-white/5 p-3 rounded-lg border border-white/10 hover:bg-white/10 transition-colors">
                              <p className="text-xs text-white/60 uppercase mb-1 font-medium tracking-wider">Exam 2</p>
                              <p className="font-bold text-xl text-white">{exam.exam2 || '-'}<span className="text-white/40 text-sm">/20</span></p>
                            </div>
                            <div className="flex-1 md:flex-none text-center bg-white/5 p-3 rounded-lg border border-white/10 hover:bg-white/10 transition-colors">
                              <p className="text-xs text-white/60 uppercase mb-1 font-medium tracking-wider">Exam 3</p>
                              <p className="font-bold text-xl text-white">{exam.exam3 || '-'}<span className="text-white/40 text-sm">/20</span></p>
                            </div>
                            {canTeacherEdit && (
                              <div className="flex gap-2 items-center ml-2">
                                <Button variant="ghost" size="icon" onClick={() => startEditExam(exam)} className="text-blue-400 hover:text-blue-300 hover:bg-blue-400/20 rounded-full h-8 w-8">
                                  <Pencil size={16} />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => removeExam(exam.id)} className="text-red-400 hover:text-red-300 hover:bg-red-400/20 rounded-full h-8 w-8">
                                  <Trash2 size={18} />
                                </Button>
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
                {(!student.internalExams || student.internalExams.length === 0) && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-white/50 text-sm text-center py-6 bg-white/5 rounded-xl border border-white/10">No internal exam records added yet.</motion.p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
