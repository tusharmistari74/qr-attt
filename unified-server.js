require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}${req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : ''}`);
  next();
});

app.use(express.static(path.join(__dirname, 'build')));

// Connect to MongoDB Atlas (Use Vercel Environment Variables in production, .env locally)
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("❌ ERROR: MONGODB_URI is not set!");
  process.exit(1);
}

mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB Atlas'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

// --- Mongoose Schemas & Models ---
const Admin = mongoose.model('Admin', new mongoose.Schema({
  id: String, email: String, password: String, name: String, role: String, createdAt: String
}, { collection: 'admins' }));

const Teacher = mongoose.model('Teacher', new mongoose.Schema({
  id: String, name: String, email: String, password: String, subjects: [String], assignedClasses: Array, role: String, createdAt: String, createdBy: String
}, { collection: 'teachers' }));

const Student = mongoose.model('Student', new mongoose.Schema({
  id: String, name: String, prn: String, rollNumber: String, mobileNumber: String, department: String, class: String, division: String, role: String, hasAccess: Boolean, accessValidUntil: String, createdAt: String, createdBy: String
}, { collection: 'students' }));

const Session = mongoose.model('Session', new mongoose.Schema({
  token: String, userId: String, role: String, expiresAt: String, createdAt: String, permanent: Boolean
}, { collection: 'sessions' }));

const QrSession = mongoose.model('QrSession', new mongoose.Schema({
  sessionId: String, teacherId: String, subject: String, class: String, division: String, duration: Number, createdAt: String, expiresAt: String,
  scannedStudents: [{ studentId: String, studentMobileNumber: String, studentName: String, studentPrn: String, timestamp: String }]
}, { collection: 'qr_sessions' }));

const Attendance = mongoose.model('Attendance', new mongoose.Schema({
  id: String, studentId: String, studentName: String, studentPrn: String, studentRollNumber: String, subject: String, class: String, division: String, teacherId: String, timestamp: String, status: String
}, { collection: 'attendance' }));

const OtpRecord = mongoose.model('OtpRecord', new mongoose.Schema({
  mobileNumber: String, otp: String, studentId: String, expiresAt: String, createdAt: String, verified: Boolean
}, { collection: 'otp_records' }));

// --- Seed Initial Data ---
const initializeData = async () => {
  try {
    const adminCount = await Admin.countDocuments();
    if (adminCount === 0) {
      await Admin.create({ id: 'admin1', email: 'admin@college.edu', password: 'admin123', name: 'System Administrator', role: 'admin', createdAt: new Date().toISOString() });
      console.log('🌱 Seeded default System Administrator');
    }
    const teacherCount = await Teacher.countDocuments();
    if (teacherCount === 0) {
      await Teacher.create({ id: 'teacher1', name: 'Demo Teacher', email: 'teacher@college.edu', password: 'teacher123', subjects: ['Math', 'Physics'], assignedClasses: [{ class: 'FY', division: 'A' }, { class: 'FY', division: 'B' }], role: 'teacher', createdAt: new Date().toISOString() });
      console.log('🌱 Seeded default Demo Teacher');
    }
  } catch (err) {
    console.error('Seed Error:', err);
  }
};
mongoose.connection.once('open', initializeData);

// --- Server-Sent Events (SSE) ---
const sseClients = [];
function sendSseEvent(eventName, data) {
  const payload = `id: ${Date.now()}\nevent: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
  sseClients.slice().forEach(res => { try { res.write(payload); } catch (e) {} });
}

app.get('/api/updates', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders && res.flushHeaders();
  res.write(`event: welcome\ndata: {"message":"connected"}\n\n`);
  sseClients.push(res);
  req.on('close', () => {
    const idx = sseClients.indexOf(res);
    if (idx !== -1) sseClients.splice(idx, 1);
  });
});

// --- Endpoints ---

app.get('/api/health', (req, res) => res.json({ status: 'ok', message: 'Server is running with MongoDB' }));

app.get('/api/test-auth', async (req, res) => {
  res.json({ success: true, message: 'Auth endpoint is MongoDB compatible' });
});

app.get('/api/init', async (req, res) => {
  await initializeData();
  res.json({ success: true, message: 'Database initialized' });
});

app.post('/api/admin/login', async (req, res) => {
  const { email, password } = req.body;
  const admin = await Admin.findOne({ email, password });
  if (!admin) return res.status(401).json({ error: 'Invalid credentials' });
  
  const token = 'local_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  const expiresAt = new Date(); expiresAt.setHours(expiresAt.getHours() + 8);
  await Session.create({ token, userId: admin.id, role: 'admin', expiresAt: expiresAt.toISOString(), createdAt: new Date().toISOString() });
  res.json({ success: true, token, user: { id: admin.id, name: admin.name, role: admin.role }, expiresAt: expiresAt.toISOString() });
});

app.post('/api/teacher/login', async (req, res) => {
  const { email, password } = req.body;
  const teacher = await Teacher.findOne({ email, password });
  if (!teacher) return res.status(401).json({ error: 'Invalid credentials' });

  const token = 'local_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  const expiresAt = new Date(); expiresAt.setHours(expiresAt.getHours() + 8);
  await Session.create({ token, userId: teacher.id, role: 'teacher', expiresAt: expiresAt.toISOString(), createdAt: new Date().toISOString() });
  
  res.json({ success: true, token, user: { id: teacher.id, name: teacher.name, role: teacher.role, subjects: teacher.subjects, assignedClasses: teacher.assignedClasses }, expiresAt: expiresAt.toISOString() });
});

app.post('/api/student/request-otp', async (req, res) => {
  const { mobileNumber } = req.body;
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  
  let student = await Student.findOne({ mobileNumber });
  if (!student) {
    student = await Student.create({ id: 's_' + Date.now(), name: `Student ${mobileNumber}`, prn: '', rollNumber: '', mobileNumber, department: '', class: '', division: '', role: 'student', hasAccess: true, accessValidUntil: new Date(Date.now() + 365*24*60*60*1000).toISOString(), createdAt: new Date().toISOString() });
  }

  const expiresAt = new Date(); expiresAt.setMinutes(expiresAt.getMinutes() + 5);
  await OtpRecord.deleteMany({ mobileNumber });
  await OtpRecord.create({ mobileNumber, otp, studentId: student.id, expiresAt: expiresAt.toISOString(), createdAt: new Date().toISOString(), verified: false });

  // For development return the OTP so user can enter it
  res.json({ success: true, message: 'OTP sent successfully', otp });
});

app.post('/api/student/verify-otp', async (req, res) => {
  const { mobileNumber, otp } = req.body;
  const record = await OtpRecord.findOne({ mobileNumber, otp, verified: false });
  
  if (!record || new Date() > new Date(record.expiresAt)) {
    return res.status(400).json({ error: 'Invalid or expired OTP' });
  }

  await OtpRecord.updateOne({ _id: record._id }, { verified: true });
  const student = await Student.findOne({ id: record.studentId }) || await Student.findOne({ mobileNumber });
  if (!student) return res.status(404).json({ error: 'Student not found' });
  
  if (student.hasAccess === false || (student.accessValidUntil && new Date() > new Date(student.accessValidUntil))) {
    // return res.status(403).json({ error: 'Your access has expired or was revoked' });
  }

  await Session.deleteMany({ userId: student.id });
  const token = 'local_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  const expiresAt = new Date(); expiresAt.setFullYear(expiresAt.getFullYear() + 1);
  await Session.create({ token, userId: student.id, role: 'student', expiresAt: expiresAt.toISOString(), createdAt: new Date().toISOString(), permanent: true });

  res.json({ success: true, token, user: { id: student.id, name: student.name, role: 'student', prn: student.prn, rollNumber: student.rollNumber, department: student.department, class: student.class, division: student.division }, expiresAt: expiresAt.toISOString(), permanent: true });
});

app.post('/api/verify-session', async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(401).json({ error: 'No token provided' });
  const session = await Session.findOne({ token });
  if (!session || new Date() > new Date(session.expiresAt)) return res.status(401).json({ error: 'Invalid or expired session' });

  let user;
  if (session.role === 'admin') user = await Admin.findOne({ id: session.userId });
  else if (session.role === 'teacher') user = await Teacher.findOne({ id: session.userId });
  else if (session.role === 'student') user = await Student.findOne({ id: session.userId });

  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ success: true, user, session });
});

app.post('/api/logout', async (req, res) => {
  const { token } = req.body || {};
  if (token) await Session.deleteMany({ token });
  res.json({ success: true, message: 'Logged out successfully' });
});

app.get('/api/teachers', async (req, res) => {
  const teachers = await Teacher.find({});
  res.json({ success: true, teachers });
});

app.post('/api/admin/teachers', async (req, res) => {
  const newTeacher = { id: 't_' + Date.now(), ...req.body, role: 'teacher', createdAt: new Date().toISOString() };
  await Teacher.create(newTeacher);
  sendSseEvent('teachers:changed', { action: 'added' });
  res.json({ success: true, teacher: newTeacher });
});

app.put('/api/admin/teachers/:id', async (req, res) => {
  const updated = await Teacher.findOneAndUpdate({ id: req.params.id }, { ...req.body }, { new: true });
  sendSseEvent('teachers:changed', { action: 'updated' });
  res.json({ success: true, teacher: updated });
});

app.delete('/api/admin/teachers/:id', async (req, res) => {
  await Teacher.deleteOne({ id: req.params.id });
  sendSseEvent('teachers:changed', { action: 'deleted' });
  res.json({ success: true });
});

app.get('/api/students', async (req, res) => {
  const students = await Student.find({});
  res.json({ success: true, students });
});

app.post('/api/admin/students', async (req, res) => {
  const newStudent = { id: 's_' + Date.now(), ...req.body, role: 'student', hasAccess: true, accessValidUntil: new Date(Date.now() + 365*24*60*60*1000).toISOString(), createdAt: new Date().toISOString() };
  await Student.create(newStudent);
  sendSseEvent('students:changed', { action: 'added' });
  res.json({ success: true, student: newStudent });
});

app.put('/api/admin/students/:id', async (req, res) => {
  const updated = await Student.findOneAndUpdate({ id: req.params.id }, { ...req.body }, { new: true });
  sendSseEvent('students:changed', { action: 'updated' });
  res.json({ success: true, student: updated });
});

app.delete('/api/admin/students/:id', async (req, res) => {
  await Student.deleteOne({ id: req.params.id });
  sendSseEvent('students:changed', { action: 'deleted' });
  res.json({ success: true });
});

app.post('/api/generate-qr', async (req, res) => {
  const { subject, class: className, division, duration, teacherId } = req.body;
  const sessionId = 'qr_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  const qrData = JSON.stringify({ sessionId, teacherId, subject, class: className, division, duration, createdAt: new Date().toISOString() });
  
  await QrSession.create({ sessionId, teacherId, subject, class: className, division, duration, createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + duration * 1000).toISOString(), scannedStudents: [] });
  sendSseEvent('qr:created', { sessionId, subject, class: className, division });
  res.json({ success: true, qrData, sessionId });
});

app.get('/api/qr-session/:id', async (req, res) => {
  const qrSession = await QrSession.findOne({ sessionId: req.params.id });
  if (!qrSession) return res.status(404).json({ error: 'QR session not found' });
  const isActive = new Date() <= new Date(qrSession.expiresAt);
  res.json({ success: true, isActive, scanCount: qrSession.scannedStudents.length, scannedStudents: qrSession.scannedStudents });
});

app.post('/api/mark-attendance', async (req, res) => {
  const { qrData, studentMobileNumber } = req.body;
  try {
    const qrInfo = JSON.parse(qrData);
    const qrSession = await QrSession.findOne({ sessionId: qrInfo.sessionId });
    if (!qrSession) return res.status(404).json({ error: 'QR session not found' });
    if (new Date() > new Date(qrSession.expiresAt)) return res.status(410).json({ error: 'QR session expired' });

    const student = await Student.findOne({ mobileNumber: studentMobileNumber });
    // if (!student) return res.status(400).json({ error: 'Student not found. Please register first.' });
    // In local json, it created if missing. But let's fail gracefully if unregistered to maintain security.
    if (!student) return res.status(400).json({ error: 'Could not find student account. Make sure you are registered.' });

    const today = new Date().toDateString();
    const alreadyScanned = qrSession.scannedStudents.some(
      scan => scan.studentMobileNumber === student.mobileNumber && new Date(scan.timestamp).toDateString() === today
    );
    if (alreadyScanned) return res.status(409).json({ error: 'You have already marked attendance for this subject today.' });

    qrSession.scannedStudents.push({ studentId: student.id, studentMobileNumber: student.mobileNumber, studentName: student.name, studentPrn: student.prn, timestamp: new Date().toISOString() });
    await qrSession.save();

    await Attendance.create({ id: 'att_' + Date.now(), studentId: student.id, studentName: student.name, studentPrn: student.prn, studentRollNumber: student.rollNumber, subject: qrInfo.subject, class: qrInfo.class, division: qrInfo.division, teacherId: qrInfo.teacherId || 'unknown', timestamp: new Date().toISOString(), status: 'present' });
    sendSseEvent('attendance:changed', { studentId: student.id, studentName: student.name, subject: qrInfo.subject });
    
    res.json({ success: true, message: 'Attendance marked successfully', studentName: student.name });
  } catch (error) {
    console.error('Mark attendance error:', error);
    res.status(400).json({ error: 'Invalid QR data' });
  }
});

app.get('/api/attendance', async (req, res) => {
  const records = await Attendance.find({});
  res.json({ success: true, records });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n✅ Attendance Server running on port ${PORT}`);
});
server.on('error', (err) => { console.error('Server error:', err); process.exit(1); });
