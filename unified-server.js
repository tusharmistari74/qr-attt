const express = require('express');
// const fs = require('fs'); // Removed local filesystem dependency
const path = require('path');
const cors = require('cors');
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc, setDoc } = require('firebase/firestore/lite');

const firebaseConfig = {
  apiKey: "AIzaSyCWWohFOD9O_UbsgtLNZ-VzzMGm9F2b0yI",
  authDomain: "smartqrattendance-82210.firebaseapp.com",
  projectId: "smartqrattendance-82210",
  storageBucket: "smartqrattendance-82210.firebasestorage.app",
  messagingSenderId: "362391885515",
  appId: "1:362391885515:web:ab977a09adf2f65caded4e",
  measurementId: "G-CH5FYK5SQB"
};

// Initialize Firebase using the strictly REST-based Modular Lite SDK (Safe for Vercel Edge/Node)
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for all routes
app.use(cors());
app.use(express.json());
// Log all incoming requests
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}${req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : ''}`);
  next();
});

// Serve static files from the build directory
app.use(express.static(path.join(__dirname, 'build')));

// Helper functions for Firebase Firestore storage
const readData = async (name, defaultValue = []) => {
  try {
    const docRef = doc(db, 'data', name);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data().items || defaultValue;
    }
  } catch (error) {
    console.error(`Error reading ${name} from Firestore:`, error);
  }
  return defaultValue;
};

const writeData = async (name, data) => {
  try {
    const docRef = doc(db, 'data', name);
    await setDoc(docRef, { items: data });
    return true;
  } catch (error) {
    console.error(`Error writing ${name} to Firestore:`, error);
    return false;
  }
};

// Initialize with seeded data
const initializeData = async () => {
  // Seed admin if not exists
  let admins = await readData('admins', null);
  if (!admins || admins.length === 0) {
    admins = [
      { id: 'admin1', email: 'admin@college.edu', password: 'admin123', name: 'System Administrator', role: 'admin', createdAt: new Date().toISOString() }
    ];
    await writeData('admins', admins);
  }

  // Seed teachers if not exists
  let teachers = await readData('teachers', null);
  if (!teachers || teachers.length === 0) {
    teachers = [
      { id: 'teacher1', name: 'Demo Teacher', email: 'teacher@college.edu', password: 'teacher123', subjects: ['Math', 'Physics'], assignedClasses: [{ class: 'FY', division: 'A' }, { class: 'FY', division: 'B' }], role: 'teacher', createdAt: new Date().toISOString() }
    ];
    await writeData('teachers', teachers);
  }

  // Initialize other data structures if not exists
  if ((await readData('students', null)) === null) await writeData('students', []);
  if ((await readData('sessions', null)) === null) await writeData('sessions', []);
  if ((await readData('attendance', null)) === null) await writeData('attendance', []);
  if ((await readData('qr-sessions', null)) === null) await writeData('qr-sessions', []);
  if ((await readData('otp-records', null)) === null) await writeData('otp-records', []);
};

initializeData();

// --- Server-Sent Events (SSE) support for live updates ---
const sseClients = [];

function sendSseEvent(eventName, data) {
  const payload = `id: ${Date.now()}\nevent: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`
  // iterate copy to avoid mutation during send
  sseClients.slice().forEach((res) => {
    try {
      res.write(payload)
    } catch (err) {
      // ignore failed client writes
    }
  })
}

app.get('/api/updates', (req, res) => {
  // Headers for SSE
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders && res.flushHeaders()

  // Send a welcome event
  res.write(`event: welcome\ndata: {"message":"connected"}\n\n`)

  sseClients.push(res)

  // Remove client on close
  req.on('close', () => {
    const idx = sseClients.indexOf(res)
    if (idx !== -1) sseClients.splice(idx, 1)
  })
})

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Admin login
app.post('/api/admin/login', async (req, res) => {
  const { email, password } = req.body;
  const admins = await readData('admins', []);
  console.log(`[DEBUG] Login attempt: email=${email}, password=${password}`);
  console.log(`[DEBUG] Found ${admins.length} admins in DB`);
  const admin = admins.find(a => a.email === email && a.password === password);

  if (!admin) {
    console.log('[DEBUG] Admin not found or password mismatch');
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = 'local_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 8);

  const session = {
    token,
    userId: admin.id,
    role: 'admin',
    expiresAt: expiresAt.toISOString(),
    createdAt: new Date().toISOString()
  };

  const sessions = await readData('sessions', []);
  sessions.push(session);
  await writeData('sessions', sessions);

  res.json({
    success: true,
    token,
    user: { id: admin.id, name: admin.name, role: admin.role },
    expiresAt: expiresAt.toISOString()
  });
});

// Teacher login
app.post('/api/teacher/login', async (req, res) => {
  const { email, password } = req.body;
  const teachers = await readData('teachers', []);
  const teacher = teachers.find(t => t.email === email && t.password === password);

  if (!teacher) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = 'local_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 8);

  const session = {
    token,
    userId: teacher.id,
    role: 'teacher',
    expiresAt: expiresAt.toISOString(),
    createdAt: new Date().toISOString()
  };

  const sessions = await readData('sessions', []);
  sessions.push(session);
  await writeData('sessions', sessions);

  res.json({
    success: true,
    token,
    user: { id: teacher.id, name: teacher.name, role: teacher.role, subjects: teacher.subjects, assignedClasses: teacher.assignedClasses },
    expiresAt: expiresAt.toISOString()
  });
});

// Student login - Firebase Auth success exchange
app.post('/api/student/firebase-login', async (req, res) => {
  const { mobileNumber } = req.body;
  
  // Normalize mobile number (remove +91 if present for internal storage consistency)
  const normalizedNumber = mobileNumber.replace(/^\+91/, '');

  const token = 'local_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  const expiresAt = new Date();
  expiresAt.setFullYear(expiresAt.getFullYear() + 1);

  const session = {
    token,
    userId: 'student_' + normalizedNumber,
    role: 'student',
    expiresAt: expiresAt.toISOString(),
    createdAt: new Date().toISOString()
  };

  const sessions = await readData('sessions', []);
  sessions.push(session);
  await writeData('sessions', sessions);

  res.json({
    success: true,
    token,
    user: { id: 'student_' + normalizedNumber, role: 'student', mobileNumber: normalizedNumber },
    expiresAt: expiresAt.toISOString()
  });
});

// Student login - OTP request
app.post('/api/student/request-otp', async (req, res) => {
  const { mobileNumber } = req.body;
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  const otpRecords = await readData('otp-records', []);
  otpRecords.push({
    mobileNumber,
    otp,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString()
  });
  await writeData('otp-records', otpRecords);

  res.json({
    success: true,
    message: 'OTP sent',
    otp // Return OTP for dev/testing
  });
});

// Student login - OTP verify
app.post('/api/student/verify-otp', async (req, res) => {
  const { mobileNumber, otp } = req.body;
  const otpRecords = await readData('otp-records', []);
  const otpRecord = otpRecords.find(o => o.mobileNumber === mobileNumber && o.otp === otp && new Date() <= new Date(o.expiresAt));

  if (!otpRecord) {
    return res.status(401).json({ error: 'Invalid OTP' });
  }

  const token = 'local_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  const expiresAt = new Date();
  expiresAt.setFullYear(expiresAt.getFullYear() + 1);

  const session = {
    token,
    userId: 'student_' + mobileNumber,
    role: 'student',
    expiresAt: expiresAt.toISOString(),
    createdAt: new Date().toISOString()
  };

  const sessions = await readData('sessions', []);
  sessions.push(session);
  await writeData('sessions', sessions);

  res.json({
    success: true,
    token,
    user: { id: 'student_' + mobileNumber, role: 'student', mobileNumber },
    expiresAt: expiresAt.toISOString()
  });
});

// Get all teachers
app.get('/api/teachers', async (req, res) => {
  const teachers = await readData('teachers', []);
  res.json({ success: true, teachers });
});

// Get all students
app.get('/api/students', async (req, res) => {
  const students = await readData('students', []);
  res.json({ success: true, students });
});

// Add teacher
app.post('/api/admin/teachers', async (req, res) => {
  const teacherData = req.body;
  const teachers = await readData('teachers', []);
  const newTeacher = {
    id: 'teacher_' + Date.now(),
    ...teacherData,
    role: 'teacher',
    createdAt: new Date().toISOString()
  };
  teachers.push(newTeacher);
  await writeData('teachers', teachers);
  // Notify clients that teachers list changed
  sendSseEvent('teachers:changed', { teacher: newTeacher })
  res.json({ success: true, teacher: newTeacher });
});

// Add student
app.post('/api/admin/students', async (req, res) => {
  const studentData = req.body;
  const students = await readData('students', []);
  const newStudent = {
    id: 'student_' + Date.now(),
    ...studentData,
    role: 'student',
    hasAccess: true,
    accessValidUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString()
  };
  students.push(newStudent);
  await writeData('students', students);
  // Notify clients that students list changed
  sendSseEvent('students:changed', { student: newStudent })
  res.json({ success: true, student: newStudent });
});

// Update teacher
app.put('/api/admin/teachers/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const teachers = await readData('teachers', []);
  const index = teachers.findIndex(t => t.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'Teacher not found' });
  }

  // Preserve immutable fields
  const updatedTeacher = {
    ...teachers[index],
    ...updates,
    id: teachers[index].id,
    createdAt: teachers[index].createdAt
  };

  teachers[index] = updatedTeacher;
  await writeData('teachers', teachers);
  // Notify clients
  sendSseEvent('teachers:changed', { teacher: updatedTeacher });
  res.json({ success: true, teacher: updatedTeacher });
});

// Update student
app.put('/api/admin/students/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const students = await readData('students', []);
  const index = students.findIndex(s => s.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'Student not found' });
  }

  // Preserve immutable fields
  const updatedStudent = {
    ...students[index],
    ...updates,
    id: students[index].id,
    createdAt: students[index].createdAt
  };

  students[index] = updatedStudent;
  await writeData('students', students);
  // Notify clients
  sendSseEvent('students:changed', { student: updatedStudent });
  res.json({ success: true, student: updatedStudent });
});

// Delete teacher
app.delete('/api/admin/teachers/:id', async (req, res) => {
  const teachers = await readData('teachers', []);
  const filtered = teachers.filter(t => t.id !== req.params.id);
  await writeData('teachers', filtered);
  // Notify clients that teachers list changed
  sendSseEvent('teachers:changed', { deletedTeacherId: req.params.id })
  res.json({ success: true, message: 'Teacher deleted' });
});

// Delete student
app.delete('/api/admin/students/:id', async (req, res) => {
  const students = await readData('students', []);
  const filtered = students.filter(s => s.id !== req.params.id);
  await writeData('students', filtered);
  // Notify clients that students list changed
  sendSseEvent('students:changed', { deletedStudentId: req.params.id })
  res.json({ success: true, message: 'Student deleted' });
});

// Generate QR code
app.post('/api/generate-qr', async (req, res) => {
  const { subject, class: className, division, duration } = req.body;
  const sessionId = 'qr_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  const qrData = JSON.stringify({ sessionId, subject, class: className, division, duration, createdAt: new Date().toISOString() });

  const qrSessions = await readData('qr-sessions', []);
  qrSessions.push({
    sessionId,
    subject,
    class: className,
    division,
    duration,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + duration * 1000).toISOString(),
    scannedStudents: []
  });
  await writeData('qr-sessions', qrSessions);

  // Notify clients that a new QR session was created
  sendSseEvent('qr:created', { sessionId, subject, class: className, division })

  res.json({ success: true, qrData, sessionId });
});

// Get QR session status
app.get('/api/qr-session/:sessionId', async (req, res) => {
  const qrSessions = await readData('qr-sessions', []);
  const qrSession = qrSessions.find(s => s.sessionId === req.params.sessionId);

  if (!qrSession) {
    return res.status(404).json({ error: 'QR session not found' });
  }

  const isActive = new Date() <= new Date(qrSession.expiresAt);
  res.json({
    success: true,
    isActive,
    scanCount: qrSession.scannedStudents.length,
    scannedStudents: qrSession.scannedStudents
  });
});

// Mark attendance via QR
app.post('/api/mark-attendance', async (req, res) => {
  const { qrData, studentMobileNumber } = req.body;

  try {
    const qrInfo = JSON.parse(qrData);
    const qrSessions = await readData('qr-sessions', []);
    const qrSession = qrSessions.find(s => s.sessionId === qrInfo.sessionId);

    if (!qrSession) {
      return res.status(404).json({ error: 'QR session not found' });
    }

    if (new Date() > new Date(qrSession.expiresAt)) {
      return res.status(410).json({ error: 'QR session expired' });
    }

    // Get student details
    const students = await readData('students', []);
    const student = students.find(s => s.mobileNumber === studentMobileNumber);

    if (!student) {
      return res.status(400).json({ error: 'Student not found. Please register first.' });
    }

    // Check if student already scanned for this subject today
    const today = new Date().toDateString();
    const alreadyScanned = qrSession.scannedStudents.some(
      scan => scan.studentMobileNumber === studentMobileNumber &&
        new Date(scan.timestamp).toDateString() === today
    );

    if (alreadyScanned) {
      return res.status(409).json({
        error: 'You have already marked attendance for this subject today. One subject per day is allowed.'
      });
    }

    // Add student to scanned list with actual student name
    const newScan = {
      studentId: student.id,
      studentMobileNumber: studentMobileNumber,
      studentName: student.name,
      studentPrn: student.prn,
      timestamp: new Date().toISOString()
    };

    qrSession.scannedStudents.push(newScan);
    await writeData('qr-sessions', qrSessions);

    // Create attendance record with full student details
    const attendance = await readData('attendance', []);
    attendance.push({
      id: 'att_' + Date.now(),
      studentId: student.id,
      studentName: student.name,
      studentPrn: student.prn,
      studentRollNumber: student.rollNumber,
      subject: qrInfo.subject,
      class: qrInfo.class,
      division: qrInfo.division,
      teacherId: qrInfo.teacherId || 'unknown',
      timestamp: new Date().toISOString(),
      status: 'present'
    });
    await writeData('attendance', attendance);

    // Notify clients that attendance changed (student marked present)
    sendSseEvent('attendance:changed', { studentId: student.id, studentName: student.name, subject: qrInfo.subject })

    res.json({
      success: true,
      message: 'Attendance marked successfully',
      studentName: student.name
    });
  } catch (error) {
    console.error('Mark attendance error:', error);
    res.status(400).json({ error: 'Invalid QR data' });
  }
});

// Verify session
app.post('/api/verify-session', async (req, res) => {
  const { token } = req.body;
  const sessions = await readData('sessions', []);
  const session = sessions.find(s => s.token === token && new Date() <= new Date(s.expiresAt));

  if (!session) {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }

  res.json({ success: true, session });
});

// Get attendance records
app.get('/api/attendance', async (req, res) => {
  const records = await readData('attendance', []);
  res.json({ success: true, records });
});

// Serve the React app for all other routes (SPA fallback)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// Only start the server if not running on Vercel (Vercel uses module.exports)
if (process.env.NODE_ENV !== 'production') {
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n✅ Attendance Management System running on port ${PORT}`);
    console.log(`📍 Local: http://localhost:${PORT}`);
    console.log(`📍 Network: http://10.156.20.209:${PORT} (or your LAN IP)`);
    console.log(`\n🔧 Database: Firebase Firestore\n`);
  });

  server.on('error', (err) => {
    console.error('Server error:', err);
    process.exit(1);
  });
}

// Export the Express API for Vercel Node Runtime
module.exports = app;
