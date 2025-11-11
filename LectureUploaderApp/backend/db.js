const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '..', 'server');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
const dbPath = path.join(dataDir, 'db.json');

let data = {
  users: [],
  lectures: [],
  lecture_tags: [],
  likes: [],
  comments: [],
  views: [],
  teachers: [],
  student_files: [],
  lecture_summaries: [],
  notifications: []
};

function load() {
  if (fs.existsSync(dbPath)) {
    try { data = JSON.parse(fs.readFileSync(dbPath, 'utf8')); } catch (_) {}
  } else {
    persist();
  }
  if(!Array.isArray(data.notifications)) data.notifications=[];
  if(!Array.isArray(data.lecture_summaries)) data.lecture_summaries=[];
}

function persist() {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf8');
}

function now() { return new Date().toISOString(); }
function nextId(arr) { return arr.length ? Math.max(...arr.map(x => x.id || 0)) + 1 : 1; }
function getUser(username){ return data.users.find(x=>x.username===username); }

// Users and Teachers
function ensureOwner(username) {
  let u = data.users.find(x => x.username === username);
  if (!u) {
    u = { id: nextId(data.users), username, role: 'owner', created_at: now() };
    data.users.push(u);
  } else if (u.role !== 'owner') {
    u.role = 'owner';
  }
  if (!data.teachers.find(t => t.username === username)) {
    data.teachers.push({ id: nextId(data.teachers), username, added_by: username, created_at: now() });
  }
  persist();
}

function addOrGetUser(username, role) {
  let u = data.users.find(x => x.username === username);
  if (!u) {
    u = { id: nextId(data.users), username, role, created_at: now(), avatar: '' };
    data.users.push(u);
    persist();
  } else if (u.role !== role && role !== 'student') {
    u.role = role; persist();
  }
  return u;
}

function addTeacher(username, added_by, secret) {
  if (!data.users.find(u => u.username === username)) {
    data.users.push({ id: nextId(data.users), username, role: 'teacher', created_at: now() });
  } else {
    const u = data.users.find(u => u.username === username);
    u.role = u.role === 'owner' ? 'owner' : 'teacher';
  }
  const existing = data.teachers.find(t => t.username === username);
  if (!existing) {
    data.teachers.push({ id: nextId(data.teachers), username, secret: secret || '', added_by, created_at: now() });
  } else {
    if (secret) existing.secret = secret;
  }
  persist();
}

function listTeachers() { return data.teachers.slice().sort((a,b)=>b.id-a.id); }
function deleteTeacher(id) { data.teachers = data.teachers.filter(t => t.id !== Number(id)); persist(); }

function getTeacher(username) { return data.teachers.find(t => t.username === username); }

// Students profiles
function listStudents(){ return data.users.filter(u=>u.role==='student').slice().sort((a,b)=> b.id-a.id); }
function setStudentAvatar(username, avatar){ const u=data.users.find(x=>x.username===username); if(!u) return null; u.avatar=avatar; persist(); return u; }

function deleteStudent(username){
  const before = data.users.length;
  data.users = data.users.filter(u => !(u.role==='student' && u.username === username));
  if (data.users.length !== before) { persist(); return true; }
  return false;
}

// Lectures
function insertLecture(obj) {
  const l = { id: nextId(data.lectures), created_at: now(), downloads: 0, privacy_mode: obj.privacy_mode||'', allowed_students: Array.isArray(obj.allowed_students)?obj.allowed_students:[], ...obj };
  data.lectures.push(l); persist();
  return l;
}
function getLecture(id) { return data.lectures.find(l => l.id === Number(id)); }
function updateLecture(id, fields) {
  const l = getLecture(id); if (!l) return null;
  Object.assign(l, fields); persist(); return l;
}
function deleteLecture(id) {
  data.likes = data.likes.filter(x => x.lecture_id !== Number(id));
  data.comments = data.comments.filter(x => x.lecture_id !== Number(id));
  data.views = data.views.filter(x => x.lecture_id !== Number(id));
  data.lectures = data.lectures.filter(l => l.id !== Number(id));
  persist();
}

function searchLectures(opts) {
  const { q = '', subject = '', section = '', type = '', role = 'guest' } = opts || {};
  let arr = data.lectures.slice();
  if (q) {
    const s = q.toLowerCase();
    arr = arr.filter(l => (l.title||'').toLowerCase().includes(s) || (l.description||'').toLowerCase().includes(s));
  }
  if (subject) arr = arr.filter(l => (l.subject||'') === subject);
  if (section) arr = arr.filter(l => (l.section||'') === section);
  if (type) arr = arr.filter(l => (l.type||'') === type);
  if (role === 'student' || role === 'guest') arr = arr.filter(l => ['public','link'].includes(l.visibility||'public'));
  return arr;
}

// Interactions
function like(lecture_id, username) {
  if (!data.likes.find(x => x.lecture_id === Number(lecture_id) && x.username === username)) {
    data.likes.push({ id: nextId(data.likes), lecture_id: Number(lecture_id), username, created_at: now() });
    persist();
  }
}
function unlike(lecture_id, username) {
  data.likes = data.likes.filter(x => !(x.lecture_id === Number(lecture_id) && x.username === username));
  persist();
}
function likesCount(lecture_id) { return data.likes.filter(x => x.lecture_id === Number(lecture_id)).length; }

function addComment(lecture_id, username, text) {
  data.comments.push({ id: nextId(data.comments), lecture_id: Number(lecture_id), username, text, created_at: now() });
  persist();
}
function listComments(lecture_id) {
  return data.comments.filter(x => x.lecture_id === Number(lecture_id)).sort((a,b)=> new Date(b.created_at)-new Date(a.created_at));
}
function updateComment(id, text){
  const c = data.comments.find(x=> x.id===Number(id));
  if(!c) return null;
  c.text = String(text||'');
  c.edited_at = now();
  persist();
  return c;
}
function deleteComment(id){ data.comments = data.comments.filter(x=> x.id!==Number(id)); persist(); }

function addView(lecture_id, username) { data.views.push({ id: nextId(data.views), lecture_id: Number(lecture_id), username, created_at: now() }); persist(); }
function stats(lecture_id) {
  const id = Number(lecture_id);
  return {
    views: data.views.filter(x => x.lecture_id === id).length,
    likes: data.likes.filter(x => x.lecture_id === id).length,
    comments: data.comments.filter(x => x.lecture_id === id).length,
    downloads: (getLecture(id)?.downloads)||0,
  };
}

function setLecturePrivacy(id, privacy_mode, allowed_students){
  const l = getLecture(id); if(!l) return null;
  l.privacy_mode = String(privacy_mode||'');
  if(Array.isArray(allowed_students)) l.allowed_students = allowed_students.map(x=>String(x||'').trim()).filter(Boolean);
  persist();
  return l;
}

function viewersForLecture(lecture_id){
  const id=Number(lecture_id);
  const arr = data.views.filter(v=>v.lecture_id===id);
  const map={};
  for(const v of arr){
    const u=v.username||'guest';
    if(!map[u]) map[u]={ username:u, count:0, last:'' };
    map[u].count+=1; map[u].last=v.created_at;
  }
  return Object.values(map).sort((a,b)=> new Date(b.last)-new Date(a.last));
}

function listViewedByUser(username){
  const ids = data.views.filter(v=>v.username===username).map(v=>v.lecture_id);
  const uniq=[...new Set(ids)];
  return data.lectures.filter(l=>uniq.includes(l.id));
}

// Notifications
function addNotification({ type, message, level='info', payload={} }){
  const n={ id: nextId(data.notifications), type, message, level, payload, seen:false, created_at: now() };
  data.notifications.push(n); persist(); return n;
}
function listNotifications(){ return data.notifications.slice().sort((a,b)=> new Date(b.created_at)-new Date(a.created_at)); }
function markNotificationsSeen(){ data.notifications.forEach(n=> n.seen=true); persist(); }

// Sections management
function mergeSections(subject, from, to){
  const sub = String(subject||'').trim();
  const a = String(from||'').trim();
  const b = String(to||'').trim();
  let updated = 0;
  if(!a || !b || a===b) return { updated };
  for(const l of data.lectures){
    if(sub && (l.subject||'').trim()!==sub) continue;
    if((l.section||'').trim()===a){ l.section = b; updated++; }
  }
  persist();
  return { updated };
}
function deleteSection(subject, section){
  const sub = String(subject||'').trim();
  const sec = String(section||'').trim();
  let updated = 0;
  if(!sec) return { updated };
  for(const l of data.lectures){
    if(sub && (l.subject||'').trim()!==sub) continue;
    if((l.section||'').trim()===sec){ l.section = ''; updated++; }
  }
  persist();
  return { updated };
}

// Student personal files
function insertStudentFile({owner, original_name, filename, mime, size}){
  const f={ id: nextId(data.student_files), owner, original_name, filename, mime, size, created_at: now() };
  data.student_files.push(f); persist(); return f;
}
function listStudentFilesByUser(owner){ return data.student_files.filter(f=>f.owner===owner).sort((a,b)=> new Date(b.created_at)-new Date(a.created_at)); }
function listAllStudentFiles(){ return data.student_files.slice().sort((a,b)=> new Date(b.created_at)-new Date(a.created_at)); }
function getStudentFile(id){ return data.student_files.find(f=>f.id===Number(id)); }
function deleteStudentFile(id){
  const idx = data.student_files.findIndex(f=> String(f.id)===String(id));
  if(idx>=0){ data.student_files.splice(idx,1); persist(); return true; }
  return false;
}
function updateStudentFileName(id, newName){
  const f = data.student_files.find(x=> String(x.id)===String(id));
  if(!f) return null;
  f.original_name = newName || f.original_name;
  persist();
  return f;
}

// Lecture summaries (files attached to a lecture)
function insertLectureSummary({lecture_id, original_name, filename, mime, size}){
  const s = { id: nextId(data.lecture_summaries), lecture_id: Number(lecture_id), original_name, filename, mime, size, created_at: now() };
  data.lecture_summaries.push(s); persist(); return s;
}
function listLectureSummaries(lecture_id){ return data.lecture_summaries.filter(s=>s.lecture_id===Number(lecture_id)).sort((a,b)=> new Date(b.created_at)-new Date(a.created_at)); }
function deleteLectureSummary(id){ data.lecture_summaries = data.lecture_summaries.filter(s=>s.id!==Number(id)); persist(); }

load();

module.exports = {
  ensureOwner,
  addOrGetUser,
  getUser,
  addTeacher,
  listTeachers,
  deleteTeacher,
  getTeacher,
  listStudents,
  setStudentAvatar,
  deleteStudent,
  insertLecture,
  getLecture,
  updateLecture,
  deleteLecture,
  searchLectures,
  like,
  unlike,
  likesCount,
  addComment,
  listComments,
  updateComment,
  deleteComment,
  addView,
  stats,
  listViewedByUser,
  addNotification,
  listNotifications,
  markNotificationsSeen,
  mergeSections,
  deleteSection,
  listSubjectsWithCounts: function(){
    const map = {};
    for(const l of data.lectures){
      const s = (l.subject||'').trim(); if(!s) continue;
      if(!map[s]) map[s] = { subject: s, total: 0, byType: { 'محاضرة':0, 'سكشن':0, 'ملخص':0 } };
      map[s].total += 1;
      const t=(l.type||'').trim(); if(map[s].byType[t]!==undefined) map[s].byType[t] += 1;
    }
    return Object.values(map).sort((a,b)=> a.subject.localeCompare(b.subject,'ar'));
  },
  listSectionsWithCounts: function(subject){
    const map = {};
    for(const l of data.lectures){
      if(subject && (l.subject||'').trim() !== subject.trim()) continue;
      const s = (l.section||'').trim(); if(!s) continue;
      if(!map[s]) map[s] = { section: s, total: 0, byType: { 'محاضرة':0, 'سكشن':0, 'ملخص':0 } };
      map[s].total += 1;
      const t=(l.type||'').trim(); if(map[s].byType[t]!==undefined) map[s].byType[t] += 1;
    }
    return Object.values(map).sort((a,b)=> a.section.localeCompare(b.section,'ar'));
  },
  insertStudentFile,
  listStudentFilesByUser,
  listAllStudentFiles,
  getStudentFile,
  deleteStudentFile,
  updateStudentFileName,
  insertLectureSummary,
  listLectureSummaries,
  deleteLectureSummary,
};
