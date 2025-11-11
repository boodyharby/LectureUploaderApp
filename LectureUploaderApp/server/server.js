const express = require('express');
const path = require('path');
const fs = require('fs');
const morgan = require('morgan');
const cors = require('cors');
const multer = require('multer');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'very-secret-key-change';
const TEACHER_SECRET = process.env.TEACHER_SECRET || '01270792033';
const OWNER_USERNAME = process.env.OWNER_USERNAME || 'عبدالرحمن حربي';

// ensure uploads dir
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = path.join(uploadsDir, 'lectures');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname || '');
    cb(null, unique + ext);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 1024 * 1024 * 1024 }, // 1GB
});

// Student files storage under uploads/students/{username}
const studentStorage = multer.diskStorage({
  destination: function(req,file,cb){
    const dir = path.join(uploadsDir,'students', req.user?.username||'unknown');
    fs.mkdirSync(dir,{recursive:true}); cb(null, dir);
  },
  filename: function(req,file,cb){
    const base = Date.now()+ '-' + (file.originalname||'file');
    cb(null, base);
  }
});
const uploadStudent = multer({ storage: studentStorage });

app.use(morgan('dev'));
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());
app.use('/uploads', express.static(uploadsDir));
app.use(express.static(path.join(__dirname, '..', 'public')));

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}
function verifyToken(req, res, next) {
  const token = req.cookies && req.cookies.token;
  if (!token) return next();
  try {
    req.user = jwt.verify(token, JWT_SECRET);
  } catch (_) {
    // ignore
  }
  next();
}
app.use(verifyToken);

function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'unauthenticated' });
    if (role === 'teacher' && (req.user.role === 'teacher' || req.user.role === 'owner')) return next();
    if (role === 'owner' && req.user.role === 'owner') return next();
    if (role === 'student' && ['student','teacher','owner'].includes(req.user.role)) return next();
    return res.status(403).json({ error: 'forbidden' });
  };
}

// Ensure owner exists in JSON store
db.ensureOwner(OWNER_USERNAME);

// Auth
app.post('/api/auth/login-student', (req, res) => {
  const { username } = req.body || {};
  if (!username) return res.status(400).json({ error: 'username required' });
  db.addOrGetUser(username, 'student');
  const token = signToken({ username, role: 'student' });
  res.cookie('token', token, { httpOnly: true, sameSite: 'lax' });
  res.json({ ok: true, user: { username, role: 'student' } });
});

app.post('/api/auth/login-teacher', (req, res) => {
  const { username, secret } = req.body || {};
  if (!username || !secret) return res.status(400).json({ error: 'username and secret required' });

  // Owner login via master secret
  if (username === OWNER_USERNAME && secret === TEACHER_SECRET) {
    db.addOrGetUser(username, 'owner');
    db.addTeacher(username, OWNER_USERNAME, secret);
    const token = signToken({ username, role: 'owner' });
    res.cookie('token', token, { httpOnly: true, sameSite: 'lax' });
    return res.json({ ok: true, user: { username, role: 'owner' } });
  }

  // Teacher login via personal secret
  const t = db.getTeacher(username);
  if (!t || !t.secret || t.secret !== secret) return res.status(401).json({ error: 'invalid credentials' });
  db.addOrGetUser(username, 'teacher');
  const token = signToken({ username, role: 'teacher' });
  res.cookie('token', token, { httpOnly: true, sameSite: 'lax' });
  res.json({ ok: true, user: { username, role: 'teacher' } });
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ ok: true });
});

app.get('/api/auth/me', (req, res) => {
  if (!req.user) return res.json({ user: null });
  res.json({ user: req.user });
});

// Lectures CRUD
app.post('/api/lectures', requireRole('teacher'), upload.single('file'), (req, res) => {
  const { title, description = '', subject = '', section = '', type = '', visibility = 'public' } = req.body;
  if (!req.file || !title) return res.status(400).json({ error: 'file and title required' });
  const rel = path.relative(uploadsDir, req.file.path).replace(/\\/g,'/');
  const lecture = db.insertLecture({
    title, description, subject, section, type, visibility,
    filename: rel,
    original_name: req.file.originalname,
    mime: req.file.mimetype,
    size: req.file.size,
    uploader_username: req.user.username,
  });
  try { db.addNotification({ type: 'lecture_uploaded', message: `تم رفع محاضرة: ${title}`, level: 'info', payload: { id: lecture.id, subject, section, size: req.file.size } }); } catch(_){}
  try { const TH=100*1024*1024; if(req.file.size>TH){ db.addNotification({ type:'size_alert', message:`ملف كبير (${(req.file.size/1024/1024).toFixed(1)}MB) للمادة ${subject||'-'}`, level:'warn', payload:{ id: lecture.id, subject, section, size:req.file.size } }); } } catch(_){}
  res.json({ ok: true, lecture });
});

app.put('/api/lectures/:id', requireRole('teacher'), (req, res) => {
  const { id } = req.params;
  const { title, description, subject, section, type, visibility } = req.body || {};
  const lecture = db.updateLecture(id, { title, description, subject, section, type, visibility });
  res.json({ ok: true, lecture });
});

app.delete('/api/lectures/:id', requireRole('teacher'), (req, res) => {
  const { id } = req.params;
  const l = db.getLecture(id);
  if (!l) return res.status(404).json({ error: 'not found' });
  try { fs.unlinkSync(path.join(uploadsDir, l.filename)); } catch (_) {}
  db.deleteLecture(id);
  res.json({ ok: true });
});

app.get('/api/lectures', (req, res) => {
  const { q = '', subject = '', type = '', sort = 'created_at_desc' } = req.query;
  let list = db.searchLectures({ q, subject, type, role: req.user?.role || 'guest' });
  if (sort === 'name_asc') list = list.sort((a,b)=> (a.title||'').localeCompare(b.title||''));
  else if (sort === 'name_desc') list = list.sort((a,b)=> (b.title||'').localeCompare(a.title||''));
  else if (sort === 'created_at_asc') list = list.sort((a,b)=> new Date(a.created_at)-new Date(b.created_at));
  else list = list.sort((a,b)=> new Date(b.created_at)-new Date(a.created_at));
  res.json({ items: list });
});

app.get('/api/lectures/:id', (req, res) => {
  const { id } = req.params;
  const l = db.getLecture(id);
  if (!l) return res.status(404).json({ error: 'not found' });
  // Enforce privacy_mode first, then fallback to legacy visibility
  const role = req.user?.role || 'guest';
  const username = req.user?.username || '';
  if (l.privacy_mode === 'teachers_only'){
    if (!(role==='teacher' || role==='owner')) return res.status(403).json({ error: 'forbidden' });
  } else if (l.privacy_mode === 'restricted'){
    if (!(role==='teacher' || role==='owner' || (role==='student' && Array.isArray(l.allowed_students) && l.allowed_students.includes(username)))){
      return res.status(403).json({ error: 'forbidden' });
    }
  } else {
    if ((!req.user || req.user.role === 'student') && l.visibility === 'private') return res.status(403).json({ error: 'forbidden' });
  }
  res.json(l);
});

app.get('/api/lectures/:id/download', (req, res) => {
  const { id } = req.params;
  const l = db.getLecture(id);
  if (!l) return res.status(404).json({ error: 'not found' });
  const role = req.user?.role || 'guest';
  const username = req.user?.username || '';
  if (l.privacy_mode === 'teachers_only'){
    if (!(role==='teacher' || role==='owner')) return res.status(403).json({ error: 'forbidden' });
  } else if (l.privacy_mode === 'restricted'){
    if (!(role==='teacher' || role==='owner' || (role==='student' && Array.isArray(l.allowed_students) && l.allowed_students.includes(username)))){
      return res.status(403).json({ error: 'forbidden' });
    }
  } else {
    if ((!req.user || req.user.role === 'student') && l.visibility === 'private') return res.status(403).json({ error: 'forbidden' });
  }
  // increment downloads
  l.downloads = (l.downloads||0) + 1; db.updateLecture(id, { downloads: l.downloads });
  const filePath = path.join(uploadsDir, l.filename);
  res.download(filePath, l.original_name || l.filename);
});

// Interactions
app.post('/api/lectures/:id/like', (req, res) => {
  const { id } = req.params;
  const username = (req.user && req.user.username) || (req.body && req.body.username) || 'guest';
  db.like(id, username);
  const count = db.likesCount(id);
  res.json({ ok: true, likes: count });
});

app.delete('/api/lectures/:id/like', (req, res) => {
  const { id } = req.params;
  const username = (req.user && req.user.username) || (req.body && req.body.username) || 'guest';
  db.unlike(id, username);
  const count = db.likesCount(id);
  res.json({ ok: true, likes: count });
});

app.post('/api/lectures/:id/comments', (req, res) => {
  const { id } = req.params;
  const { text } = req.body || {};
  const username = (req.user && req.user.username) || 'guest';
  if (!text) return res.status(400).json({ error: 'text required' });
  db.addComment(id, username, text);
  res.json({ ok: true });
});

app.get('/api/lectures/:id/comments', (req, res) => {
  const { id } = req.params;
  const list = db.listComments(id);
  res.json({ items: list });
});

// Comments moderation
app.put('/api/lectures/:id/comments/:cid', requireRole('teacher'), (req,res)=>{
  const { cid } = req.params;
  const { text } = req.body || {};
  if(!text) return res.status(400).json({ error:'text required' });
  const c = db.updateComment(cid, text);
  if(!c) return res.status(404).json({ error:'not found' });
  res.json({ ok:true, comment:c });
});
app.delete('/api/lectures/:id/comments/:cid', requireRole('teacher'), (req,res)=>{
  const { cid } = req.params;
  db.deleteComment(cid);
  res.json({ ok:true });
});

app.post('/api/lectures/:id/view', (req, res) => {
  const { id } = req.params;
  const username = (req.user && req.user.username) || 'guest';
  db.addView(id, username);
  res.json({ ok: true });
});

app.get('/api/lectures/:id/stats', (req, res) => {
  const { id } = req.params;
  res.json(db.stats(id));
});

// Notifications API
app.get('/api/notifications', requireRole('teacher'), (req,res)=>{
  res.json({ items: db.listNotifications() });
});
app.post('/api/notifications/seen', requireRole('teacher'), (req,res)=>{
  db.markNotificationsSeen(); res.json({ ok:true });
});

// Set lecture privacy
app.put('/api/lectures/:id/privacy', requireRole('teacher'), (req,res)=>{
  const { id } = req.params;
  const { privacy_mode = '', allowed_students = [] } = req.body || {};
  const l = db.setLecturePrivacy(id, privacy_mode, Array.isArray(allowed_students)?allowed_students:[]);
  if(!l) return res.status(404).json({ error:'not found' });
  res.json({ ok:true, lecture:l });
});

// Viewers list (teacher/owner only)
app.get('/api/lectures/:id/viewers', requireRole('teacher'), (req,res)=>{
  const { id } = req.params;
  res.json({ items: db.viewersForLecture(id) });
});

// Teacher admin
app.post('/api/teachers', requireRole('owner'), (req, res) => {
  const { username } = req.body || {};
  if (!username) return res.status(400).json({ error: 'username required' });
  const finalSecret = TEACHER_SECRET;
  db.addTeacher(username, req.user.username, finalSecret);
  res.json({ ok: true });
});

app.get('/api/teachers', requireRole('owner'), (req, res) => {
  const list = db.listTeachers();
  res.json({ items: list });
});

app.delete('/api/teachers/:id', requireRole('owner'), (req, res) => {
  const { id } = req.params;
  db.deleteTeacher(id);
  res.json({ ok: true });
});

// Students management (for teachers)
app.get('/api/students', requireRole('teacher'), (req, res) => {
  res.json({ items: db.listStudents() });
});

app.post('/api/students/:username/avatar', requireRole('teacher'), upload.single('avatar'), (req, res) => {
  const { username } = req.params;
  if (!req.file) return res.status(400).json({ error: 'avatar required' });
  const u = db.setStudentAvatar(username, req.file.filename);
  if (!u) return res.status(404).json({ error: 'not found' });
  res.json({ ok: true, user: u });
});

app.delete('/api/students/:username', requireRole('teacher'), (req, res) => {
  const { username } = req.params;
  const ok = db.deleteStudent(username);
  if (!ok) return res.status(404).json({ error: 'not found' });
  res.json({ ok: true });
});

// Viewed history for current user
app.get('/api/me/viewed', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'unauthenticated' });
  const list = db.listViewedByUser(req.user.username);
  res.json({ items: list });
});

// Student personal files (student endpoints)
app.get('/api/student-files', requireRole('student'), (req, res) => {
  res.json({ items: db.listStudentFilesByUser(req.user.username) });
});

app.post('/api/student-files', requireRole('student'), uploadStudent.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'file required' });
  const rel = path.relative(uploadsDir, req.file.path).replace(/\\/g,'/');
  const f = db.insertStudentFile({ owner: req.user.username, original_name: req.file.originalname, filename: rel, mime: req.file.mimetype, size: req.file.size });
  res.json({ ok: true, file: f });
});

app.delete('/api/student-files/:id', requireRole('student'), (req, res) => {
  const { id } = req.params;
  const f = db.getStudentFile(id);
  if (!f) return res.status(404).json({ error: 'not found' });
  if (f.owner !== req.user.username) return res.status(403).json({ error: 'forbidden' });
  try { fs.unlinkSync(path.join(uploadsDir, f.filename)); } catch (_) {}
  db.deleteStudentFile(id);
  res.json({ ok: true });
});

// Rename a student file (only the owner)
app.put('/api/student-files/:id', requireRole('student'), (req,res)=>{
  const { id } = req.params;
  const { name } = req.body || {};
  const f = db.getStudentFile(id);
  if(!f) return res.status(404).json({ error:'not found' });
  if (f.owner !== req.user.username) return res.status(403).json({ error: 'forbidden' });
  if(!name || !String(name).trim()) return res.status(400).json({ error:'name required' });
  const updated = db.updateStudentFileName(id, String(name).trim());
  res.json({ ok:true, file: updated });
});

// Admin (teacher/owner) endpoints for student files
app.get('/api/admin/student-files', requireRole('owner'), (req, res) => {
  res.json({ items: db.listAllStudentFiles() });
});

app.delete('/api/admin/student-files/:id', requireRole('owner'), (req, res) => {
  const { id } = req.params;
  const f = db.getStudentFile(id);
  if (!f) return res.status(404).json({ error: 'not found' });
  try { fs.unlinkSync(path.join(uploadsDir, f.filename)); } catch (_) {}
  db.deleteStudentFile(id);
  res.json({ ok: true });
});

// Subjects aggregation
app.get('/api/subjects', (req, res) => {
  const list = db.listSubjectsWithCounts();
  res.json({ items: list });
});

// Sections under a specific subject
app.get('/api/subjects/:subject/sections', (req,res)=>{
  const { subject } = req.params; res.json({ items: db.listSectionsWithCounts(subject) });
});

// Sections management
app.post('/api/sections/merge', requireRole('teacher'), (req,res)=>{
  const { subject='', from='', to='' } = req.body || {};
  const out = db.mergeSections(subject, from, to);
  res.json({ ok:true, ...out });
});
app.delete('/api/sections', requireRole('teacher'), (req,res)=>{
  const { subject='', section='' } = req.query || {};
  const out = db.deleteSection(subject, section);
  res.json({ ok:true, ...out });
});

// Lecture summaries API
app.get('/api/lectures/:id/summaries', async (req,res)=>{
  const { id } = req.params; res.json({ items: db.listLectureSummaries(id) });
});

const summaryStorage = multer.diskStorage({
  destination: function(req,file,cb){
    const dir = path.join(uploadsDir,'lectures', String(req.params.id), 'summary');
    fs.mkdirSync(dir,{recursive:true}); cb(null, dir);
  },
  filename: function(req,file,cb){
    const base = Date.now()+ '-' + (file.originalname||'file'); cb(null, base);
  }
});
const uploadSummary = multer({ storage: summaryStorage });

app.post('/api/lectures/:id/summaries', requireRole('teacher'), uploadSummary.array('files', 10), (req,res)=>{
  const { id } = req.params;
  const saved=[]; for(const f of (req.files||[])){
    const rel = path.relative(uploadsDir, f.path).replace(/\\/g,'/');
    saved.push(db.insertLectureSummary({ lecture_id: id, original_name: f.originalname, filename: rel, mime: f.mimetype, size: f.size }));
  }
  res.json({ ok:true, items: saved });
});

app.delete('/api/lectures/:lectureId/summaries/:sid', requireRole('teacher'), (req,res)=>{
  const { sid, lectureId } = req.params;
  const s = db.getStudentFile && null; // placeholder no-op to keep lints calm
  const list = db.listLectureSummaries(lectureId);
  const item = list.find(x=>x.id===Number(sid));
  if(!item) return res.status(404).json({ error:'not found' });
  try { fs.unlinkSync(path.join(uploadsDir, item.filename)); } catch(_){}
  db.deleteLectureSummary(sid);
  res.json({ ok:true });
});
// Share link page (basic redirect to student view with query)
app.get('/s/:id', (req, res) => {
  res.redirect(`/student.html?share=${req.params.id}`);
});

app.listen(PORT, () => {
  console.log(`LectureUploaderApp running on http://localhost:${PORT}`);
});
