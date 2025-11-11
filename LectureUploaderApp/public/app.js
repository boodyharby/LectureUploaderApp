function toast(msg){const t=document.getElementById('toast');if(!t)return;t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2000)}
function setTheme(){document.documentElement.classList.add('dark');}
function initTheme(){setTheme();}

// Lightweight viewer modal
let _viewerCtx={ items:[], index:0 };
let _viewerKeyHandler=null;
function tpl(id){ const t=document.getElementById(id); return t? t.content.firstElementChild.cloneNode(true): null; }
function ensureViewer(){
  let m=document.getElementById('viewerModal');
  if(!m){
    // Fallback: create if missing (should not happen since we now ship static markup)
    m=document.createElement('div'); m.id='viewerModal';
    m.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.65);display:none;align-items:center;justify-content:center;z-index:9999;padding:20px';
    m.innerHTML=`<div style="background:#111;border:1px solid #333;max-width:90vw;width:900px;max-height:90vh;border-radius:10px;overflow:hidden;display:flex;flex-direction:column">
      <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-bottom:1px solid #333;gap:8px">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          <button id="viewerPrev" class="btn">السابق</button>
          <button id="viewerNext" class="btn">التالي</button>
          <button id="viewerFs" class="btn">ملء الشاشة</button>
        </div>
        <strong id="viewerTitle" style="font-size:16px;flex:1;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis"></strong>
        <button id="viewerClose" class="btn">إغلاق</button>
      </div>
      <div id="viewerBody" style="flex:1;overflow:auto;background:#000"></div>
    </div>`;
    document.body.appendChild(m);
  }
  // Bind handlers once
  if(!m._bound){
    const detachKeys=()=>{ if(_viewerKeyHandler){ window.removeEventListener('keydown', _viewerKeyHandler); _viewerKeyHandler=null; } };
    const closeBtn=m.querySelector('#viewerClose');
    if(closeBtn) closeBtn.onclick=()=>{ m.style.display='none'; m.querySelector('#viewerBody').innerHTML=''; detachKeys(); };
    m.addEventListener('click',(e)=>{ if(e.target===m){ const c=m.querySelector('#viewerClose'); c && c.click(); }});
    const prev=m.querySelector('#viewerPrev'); if(prev) prev.onclick=()=>{ if(_viewerCtx.items.length){ _viewerCtx.index=( (_viewerCtx.index-1+_viewerCtx.items.length)%_viewerCtx.items.length ); const it=_viewerCtx.items[_viewerCtx.index]; _loadIntoViewer(it.url,it.title); } };
    const next=m.querySelector('#viewerNext'); if(next) next.onclick=()=>{ if(_viewerCtx.items.length){ _viewerCtx.index=( (_viewerCtx.index+1)%_viewerCtx.items.length ); const it=_viewerCtx.items[_viewerCtx.index]; _loadIntoViewer(it.url,it.title); } };
    const fs=m.querySelector('#viewerFs'); if(fs) fs.onclick=()=>{
      const v=m.querySelector('#viewerBody video, #viewerBody iframe');
      if(v && v.requestFullscreen){ try{ v.requestFullscreen(); }catch(_){ m.requestFullscreen && m.requestFullscreen(); }
      } else { m.requestFullscreen && m.requestFullscreen(); }
    };
    // attach keyboard on demand
    m._attachKeys = () => {
      const handler=(e)=>{
        const tag=(e.target && e.target.tagName)||'';
        if(tag==='INPUT' || tag==='TEXTAREA') return; // don't interfere with typing
        if(m.style.display==='none') return;
        const vid=m.querySelector('#viewerBody video, #viewerBody audio');
        if(e.key===' '){
          if(vid){ e.preventDefault(); if(vid.paused) vid.play(); else vid.pause(); }
        } else if(e.key==='ArrowLeft'){
          e.preventDefault(); const b=m.querySelector('#viewerPrev'); b && b.click();
        } else if(e.key==='ArrowRight'){
          e.preventDefault(); const b=m.querySelector('#viewerNext'); b && b.click();
        } else if(e.key==='Escape'){
          e.preventDefault(); const b=m.querySelector('#viewerClose'); b && b.click();
        }
      };
      if(_viewerKeyHandler){ window.removeEventListener('keydown', _viewerKeyHandler); }
      _viewerKeyHandler=handler;
      window.addEventListener('keydown', handler);
    };
    m._bound=true;
  }
  return m;
}
function _loadIntoViewer(url, title){
  const m=ensureViewer();
  const body=m.querySelector('#viewerBody');
  const ttl=m.querySelector('#viewerTitle');
  ttl.textContent=title||'';
  const ext=(url.split('.').pop()||'').toLowerCase();
  let el;
  if(['mp4','webm','ogg'].includes(ext)){
    el=document.createElement('video'); el.controls=true; el.style.width='100%'; el.style.maxHeight='80vh'; el.src=url;
  }else if(['mp3','wav','aac','m4a','oga'].includes(ext)){
    el=document.createElement('audio'); el.controls=true; el.style.width='100%'; el.src=url;
  }else if(['pdf'].includes(ext)){
    el=document.createElement('iframe'); el.src=url; el.style.width='100%'; el.style.height='80vh'; el.style.border='0';
  }else{
    el=document.createElement('iframe'); el.src=url; el.style.width='100%'; el.style.height='80vh'; el.style.border='0';
  }
  body.innerHTML=''; body.appendChild(el); m.style.display='flex';
  if(typeof m._attachKeys==='function') m._attachKeys();
}
function openViewer(url, title, sequence=[], startIndex=0){
  _viewerCtx.items = Array.isArray(sequence)? sequence.slice(): [];
  _viewerCtx.index = Math.max(0, Math.min(startIndex||0, Math.max(0,_viewerCtx.items.length-1)));
  _loadIntoViewer(url,title);
}
window.openViewer = openViewer;

function attachIndexHandlers(){
  initTheme();
  // reveal teacher section when typing the shortcut 01270792033 anywhere
  const teacherSection=document.getElementById('teacherSection');
  let seq="";
  window.addEventListener('keydown',(e)=>{
    if(!teacherSection) return;
    if(e.key && /[0-9]/.test(e.key)) { seq = (seq+e.key).slice(-11); }
    else if(e.key==='Escape') { seq=''; }
    if(seq==='01270792033'){ teacherSection.style.display='block'; }
  });
  document.getElementById('studentLogin').onclick=async()=>{
    const username=document.getElementById('studentName').value.trim();
    if(!username) return toast('اكتب اسمك');
    await fetch('/api/auth/login-student',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'include',body:JSON.stringify({username})});
    try{localStorage.setItem('student_name',username);}catch(_){}
    location.href='/student.html';
  };
  document.getElementById('teacherLogin').onclick=async()=>{
    const username=document.getElementById('teacherName').value.trim();
    const secret=document.getElementById('teacherSecret').value.trim();
    if(!username||!secret) return toast('أكمل الحقول');
    const r=await fetch('/api/auth/login-teacher',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'include',body:JSON.stringify({username,secret})});
    if(!r.ok){toast('الرقم السري غير صحيح');return}
    location.href='/teacher.html';
  };
  // Reveal teacher login via URL params and prefill username
  try{
    const sp=new URLSearchParams(location.search);
    if(sp.get('teacher')==='1' && teacherSection){ teacherSection.style.display='block'; }
    const uname=sp.get('username');
    if(uname){ const tn=document.getElementById('teacherName'); if(tn) tn.value=uname; }
  }catch(_){/* ignore */}
}

async function renderLectures(container, query={}){
  const params=new URLSearchParams(query).toString();
  // skeletons
  try{
    container.innerHTML='';
    for(let i=0;i<4;i++){
      const sk=document.createElement('div'); sk.className='skeleton pulse';
      sk.innerHTML='<div class="skeleton-line" style="width:60%"></div><div class="skeleton-line" style="width:80%"></div><div class="skeleton-line" style="width:40%"></div>';
      container.appendChild(sk);
    }
  }catch(_){/* ignore */}
  const r=await fetch('/api/lectures'+(params?'?'+params:''),{credentials:'include'});
  const data=await r.json();
  container.innerHTML='';
  // prepare sequence for viewer
  const seq=(data.items||[]).map(x=>({ url:`/uploads/${x.filename}`, title:x.title||x.original_name||'' }));
  data.items.forEach((l,idx)=>{
    const el=tpl('tmpl-lecture-card-student');
    if(!el) return;
    el.querySelector('[data-title]').textContent = l.title||'';
    const created = el.querySelector('[data-created]'); if(created) created.textContent = new Date(l.created_at).toLocaleString();
    const subj = el.querySelector('[data-subject]'); if(subj) subj.textContent = l.subject||'';
    const type = el.querySelector('[data-type]'); if(type) type.textContent = l.type||'';
    const ext = el.querySelector('[data-ext]'); if(ext) ext.href = `/uploads/${l.filename}`;
    const dl = el.querySelector('[data-download]'); if(dl) dl.href = `/api/lectures/${l.id}/download`;
    const likeBtn = el.querySelector('[data-like]'); if(likeBtn) likeBtn.onclick=async()=>{
      await fetch(`/api/lectures/${l.id}/like`,{method:'POST',headers:{'Content-Type':'application/json'},credentials:'include'}); toast('تم تسجيل إعجاب'); };
    const cmBtn = el.querySelector('[data-comments]'); if(cmBtn) cmBtn.onclick=()=>openComments(l.id);
    const viewBtn = el.querySelector('[data-view]'); if(viewBtn) viewBtn.onclick=()=>openViewer(`/uploads/${l.filename}`, l.title||l.original_name||'', seq, idx);
    container.appendChild(el);
    fetch(`/api/lectures/${l.id}/view`,{method:'POST',credentials:'include'});
    // load stats (views)
    ;(async()=>{
      try{
        const s=await (await fetch(`/api/lectures/${l.id}/stats`)).json();
        const v=el.querySelector('[data-views]');
        const lk=el.querySelector('[data-likes]');
        const cm=el.querySelector('[data-comments-count]');
        const dlc=el.querySelector('[data-dl]');
        if(v) v.textContent=`${s.views||0} مشاهدة`;
        if(lk) lk.textContent=`${s.likes||0} إعجاب`;
        if(cm) cm.textContent=`${s.comments||0} تعليق`;
        if(dlc) dlc.textContent=`${s.downloads||0} تنزيل`;
      }catch(_){/* ignore */}
    })();
  });
}

async function openComments(id){
  const text=prompt('اكتب تعليقك:');
  if(text){
    await fetch(`/api/lectures/${id}/comments`,{method:'POST',headers:{'Content-Type':'application/json'},credentials:'include',body:JSON.stringify({text})});
    toast('تم إضافة تعليق');
  }
}

async function attachStudentHandlers(){
  initTheme();
  // auto-login if not authenticated but a name is remembered
  try{
    const me=await (await fetch('/api/auth/me',{credentials:'include'})).json();
    if(!me?.user){
      const saved=localStorage.getItem('student_name');
      if(saved){
        await fetch('/api/auth/login-student',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'include',body:JSON.stringify({username:saved})});
      }
    }
  }catch(_){/* ignore */}
  const c=document.getElementById('lectures');
  const q=document.getElementById('q');
  const subject=document.getElementById('subject');
  const typeInput=document.getElementById('type'); // fallback input if present
  const sort=document.getElementById('sort');
  let category = '';
  const tabs=document.querySelectorAll('[data-cat]');
  tabs.forEach(btn=>{
    btn.addEventListener('click',()=>{
      tabs.forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      category = btn.getAttribute('data-cat')||'';
      renderLectures(c,{q:q.value,subject:subject.value,type:category||typeInput?.value||'',sort:sort.value});
    });
  });
  document.getElementById('applyFilters').onclick=()=>
    renderLectures(c,{q:q.value,subject:subject.value,type:category||typeInput?.value||'',sort:sort.value});
  const share=new URLSearchParams(location.search).get('share');
  renderLectures(c, share?{}:{});

  // Subjects grid
  (async()=>{
    try{
      const r=await fetch('/api/subjects'); const data=await r.json();
      const grid=document.getElementById('subjectsGrid'); if(!grid) return;
      grid.innerHTML='';
      data.items.forEach(s=>{
        const el=document.createElement('div'); el.className='lecture';
        el.style.cursor='pointer';
        el.innerHTML=`<div>
          <h4>📁 ${s.subject}</h4>
          <div class="meta">إجمالي: ${s.total}</div>
          <div style="display:flex;gap:6px;margin-top:6px;flex-wrap:wrap">
            <span class="badge">محاضرات: ${s.byType['محاضرة']||0}</span>
            <span class="badge">سكاشن: ${s.byType['سكشن']||0}</span>
            <span class="badge">ملخصات: ${s.byType['ملخص']||0}</span>
          </div>
        </div>`;
        el.onclick=()=>{
          // Show subject detail section
          const gridCard=document.getElementById('subjectsGrid')?.parentElement;
          const detail=document.getElementById('subjectDetail');
          const subjTitle=document.getElementById('subjectTitle');
          const subjList=document.getElementById('subjectLectures');
          if(gridCard&&detail&&subjTitle&&subjList){
            gridCard.style.display='none';
            detail.style.display='block';
            subjTitle.textContent = s.subject;
            // sub-tabs handler
            let subcat='';
            let sectionFilter='';
            const subs=detail.querySelectorAll('[data-subcat]');
            const render=()=>renderLectures(subjList,{q:'',subject:s.subject,section:sectionFilter,type:subcat,sort:sort.value});
            subs.forEach(btn=>{
              btn.onclick=()=>{ subs.forEach(b=>b.classList.remove('active')); btn.classList.add('active'); subcat=btn.getAttribute('data-subcat')||''; render(); };
            });
            // load sections grid
            (async()=>{
              try{
                const rr=await fetch(`/api/subjects/${encodeURIComponent(s.subject)}/sections`);
                const sd=await rr.json();
                const sGrid=document.getElementById('sectionsGrid');
                if(sGrid){ sGrid.innerHTML='';
                  sd.items.forEach(sec=>{
                    const card=document.createElement('div'); card.className='lecture'; card.style.cursor='pointer';
                    card.innerHTML=`<div>
                      <h4>📂 ${sec.section}</h4>
                      <div class="meta">إجمالي: ${sec.total}</div>
                      <div style="display:flex;gap:6px;margin-top:6px;flex-wrap:wrap">
                        <span class="badge">محاضرات: ${sec.byType['محاضرة']||0}</span>
                        <span class="badge">سكاشن: ${sec.byType['سكشن']||0}</span>
                        <span class="badge">ملخصات: ${sec.byType['ملخص']||0}</span>
                      </div>
                    </div>`;
                    card.onclick=()=>{ sectionFilter = sec.section; render(); };
                    sGrid.appendChild(card);
                  });
                }
              }catch(_){/* ignore */}
            })();
            render();
            const back=document.getElementById('backToSubjects');
            if(back){ back.onclick=()=>{ detail.style.display='none'; if(gridCard) gridCard.style.display='block'; sectionFilter=''; }; }
          } else {
            // Fallback to normal filtering
            subject.value = s.subject;
            renderLectures(c,{q:q.value,subject:subject.value,type:category||typeInput?.value||'',sort:sort.value});
          }
        };
        grid.appendChild(el);
      });
    }catch(_){/* ignore */}
  })();


  // Viewed history
  (async()=>{
    try{
      const r=await fetch('/api/me/viewed',{credentials:'include'});
      if(!r.ok) return; const data=await r.json();
      const vList=document.getElementById('viewedList'); if(!vList) return;
      vList.innerHTML='';
      data.items.forEach(l=>{
        const el=document.createElement('div'); el.className='lecture';
        el.innerHTML=`<h4>${l.title}</h4><div class="meta">${l.subject||''} • ${l.type||''}</div>`;
        vList.appendChild(el);
      });
    }catch(_){/* ignore */}
  })();

  // Notifications panel (teacher/owner)
  (async()=>{
    try{
      const me=await (await fetch('/api/auth/me',{credentials:'include'})).json();
      if(me?.user && (me.user.role==='teacher' || me.user.role==='owner')){
        const panel=document.getElementById('notificationsPanel');
        const list=document.getElementById('notificationsList');
        const mark=document.getElementById('markSeenBtn');
        if(!panel||!list||!mark) return;
        panel.style.display='block';
        async function loadNotifs(){
          const r=await fetch('/api/notifications',{credentials:'include'});
          if(!r.ok) return; const data=await r.json();
          list.innerHTML='';
          (data.items||[]).forEach(n=>{
            const el=tpl('tmpl-notification'); if(!el) return;
            el.querySelector('[data-message]').textContent = n.message||n.type;
            el.querySelector('[data-meta]').textContent = `${new Date(n.created_at).toLocaleString()} • ${n.type}`;
            const lvl=el.querySelector('[data-level]');
            if(lvl){ lvl.textContent=n.level||'info'; lvl.style.background = (n.level==='warn'?'var(--danger)':'var(--accent)'); }
            list.appendChild(el);
          });
        }
        mark.onclick=async()=>{ await fetch('/api/notifications/seen',{method:'POST',credentials:'include'}); loadNotifs(); };
        loadNotifs();
        window.refreshNotifications = loadNotifs;
      }
    }catch(_){/* ignore */}
  })();
}

function attachTeacherHandlers(){
  initTheme();
  const drop=document.getElementById('dropArea');
  const fileInput=document.getElementById('fileInput');
  drop.onclick=()=>fileInput.click();
  ['dragenter','dragover'].forEach(ev=>drop.addEventListener(ev,e=>{e.preventDefault();drop.classList.add('active')}));
  ;['dragleave','drop'].forEach(ev=>drop.addEventListener(ev,e=>{e.preventDefault();drop.classList.remove('active')}));
  drop.addEventListener('drop',e=>{
    const dt = new DataTransfer();
    Array.from(e.dataTransfer.files||[]).forEach(f=>dt.items.add(f));
    fileInput.files = dt.files;
  });
  let uploadBusy=false;
  document.getElementById('uploadForm').onsubmit=async(e)=>{
    e.preventDefault();
    if(uploadBusy) return;
    const form=new FormData(e.target);
    if(!form.get('file')||!form.get('title')){toast('اختر ملفاً واكتب العنوان');return}
    const submitBtn=e.target.querySelector('button[type="submit"]');
    if(submitBtn) submitBtn.disabled=true;
    uploadBusy=true;
    const r=await fetch('/api/lectures',{method:'POST',body:form,credentials:'include'});
    if(!r.ok){toast('فشل الرفع - تأكد من صلاحيات المعلم');return}
    toast('تم رفع المحاضرة');
    loadTeacherLectures();
    if(window.refreshNotifications) try{ window.refreshNotifications(); }catch(_){/* ignore */}
    e.target.reset();
    uploadBusy=false;
    if(submitBtn) submitBtn.disabled=false;
  };
  loadTeacherLectures();

  // Type -> Section UX hint
  (function(){
    const form=document.getElementById('uploadForm'); if(!form) return;
    const typeSel=form.querySelector('select[name="type"]');
    const sectionInp=form.querySelector('input[name="section"]');
    const subjectInp=form.querySelector('input[name="subject"]');
    const sectionList=document.getElementById('sectionList');
    if(!typeSel||!sectionInp) return;
    const apply=()=>{
      const v=(typeSel.value||'').trim();
      if(v==='سكشن'){
        sectionInp.placeholder='اسم السكشن (مثال: A أو 1)';
      }else if(v==='محاضرة' || v==='ملخص'){
        sectionInp.placeholder='السكشن (اختياري)';
      }else{
        sectionInp.placeholder='السكشن';
      }
    };
    typeSel.addEventListener('change',apply);
    apply();
    async function loadSectionsDatalist(){
      if(!subjectInp || !sectionList) return;
      const subj=(subjectInp.value||'').trim();
      sectionList.innerHTML=''; if(!subj) return;
      try{
        const r=await fetch(`/api/subjects/${encodeURIComponent(subj)}/sections`);
        if(!r.ok) return; const d=await r.json();
        (d.items||[]).forEach(sec=>{
          const opt=document.createElement('option'); opt.value=sec.section; sectionList.appendChild(opt);
        });
      }catch(_){/* ignore */}
    }
    if(subjectInp){ subjectInp.addEventListener('change', loadSectionsDatalist); subjectInp.addEventListener('blur', loadSectionsDatalist); }
    loadSectionsDatalist();
  })();

  // Owner-only teacher management
  (async()=>{
    try{
      const me=await (await fetch('/api/auth/me',{credentials:'include'})).json();
      if(me?.user?.role==='owner'){
        const admin=document.getElementById('ownerAdmin');
        if(admin) admin.style.display='block';
        const addForm=document.getElementById('addTeacherForm');
        const listEl=document.getElementById('teachersList');
        const load=async()=>{
          const r=await fetch('/api/teachers',{credentials:'include'});
          const data=await r.json();
          listEl.innerHTML='';
          data.items.forEach(t=>{
            const li=document.createElement('div');
            li.className='lecture';
            li.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center"><div><strong>${t.username}</strong></div><button class="btn" data-del>حذف</button></div>`;
            li.querySelector('[data-del]').onclick=async()=>{await fetch(`/api/teachers/${t.id}`,{method:'DELETE',credentials:'include'});load();};
            listEl.appendChild(li);
          });
        };
        addForm.onsubmit=async(e)=>{
          e.preventDefault();
          const username=addForm.querySelector('[name="username"]').value.trim();
          const secret=addForm.querySelector('[name="secret"]').value.trim();
          if(!username){toast('اكتب اسم المعلم');return}
          const payload = { username };
          if(secret) payload.secret = secret;
          const r=await fetch('/api/teachers',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'include',body:JSON.stringify(payload)});
          if(!r.ok){toast('فشل إضافة المعلم');return}
          addForm.reset();
          load();
          try{ window.open(`/index.html?teacher=1&username=${encodeURIComponent(username)}`,'_blank'); }catch(_){/* ignore */}
        };
        load();

        // Owner: All student files section
        const allSec=document.getElementById('allStudentFiles');
        const allList=document.getElementById('allStudentFilesList');
        if(allSec && allList){
          allSec.style.display='block';
          const controls=document.createElement('div'); controls.className='row between v-center wrap gap-8'; controls.style.marginBottom='8px';
          controls.innerHTML=`<div class="row gap-6"><button class="btn" id="sfSelectAll">تحديد الكل</button><button class="btn btn-danger" id="sfDeleteSel">حذف المحدد</button></div><span class="meta" id="sfStatus"></span>`;
          allSec.insertBefore(controls, allList);
          let selected=new Set(); let busy=false;
          const statusEl=controls.querySelector('#sfStatus');
          const setStatus=(t)=>{ if(statusEl) statusEl.textContent=t||''; };
          const loadAll=async()=>{
            const r=await fetch('/api/admin/student-files',{credentials:'include'});
            if(!r.ok){ allList.innerHTML='<div class="meta">تعذّر التحميل</div>'; return; }
            const data=await r.json();
            selected=new Set(); allList.innerHTML='';
            data.items.forEach(f=>{
              const el=document.createElement('div'); el.className='lecture';
              el.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center">
                <div style="display:flex;align-items:center;gap:8px"><input type="checkbox" data-id="${f.id}" /><div><strong>${f.original_name||f.filename}</strong><div class="meta">${f.owner} • ${new Date(f.created_at).toLocaleString()}</div></div></div>
                <div style="display:flex;gap:6px;flex-wrap:wrap">
                  <a class="btn" href="/uploads/${f.filename}" download>تحميل</a>
                  <button class="btn btn-danger" data-del>حذف</button>
                </div>
              </div>`;
              const cb=el.querySelector('input[type=checkbox]');
              cb.onchange=()=>{ const id=Number(cb.getAttribute('data-id')); if(cb.checked) selected.add(id); else selected.delete(id); };
              el.querySelector('[data-del]').onclick=async()=>{
                if(!confirm('حذف هذا الملف؟')) return;
                await fetch(`/api/admin/student-files/${f.id}`,{method:'DELETE',credentials:'include'});
                loadAll();
              };
              allList.appendChild(el);
            });
          };
          controls.querySelector('#sfSelectAll').onclick=()=>{ allList.querySelectorAll('input[type=checkbox][data-id]').forEach(i=>{ i.checked=true; selected.add(Number(i.getAttribute('data-id'))); }); };
          controls.querySelector('#sfDeleteSel').onclick=async()=>{
            if(busy) return; if(selected.size===0) return alert('اختر عناصر للحذف');
            if(!confirm('حذف العناصر المحددة؟')) return; busy=true; setStatus('جارٍ الحذف...');
            const ids=[...selected];
            for(const id of ids){ await fetch(`/api/admin/student-files/${id}`,{method:'DELETE',credentials:'include'}); }
            busy=false; setStatus('تم'); loadAll();
          };
          loadAll();
        }
      }
    }catch(_){/* ignore */}
  })();

  // Students profiles (for teachers)
  (async()=>{
    try{
      const me=await (await fetch('/api/auth/me',{credentials:'include'})).json();
      if(me?.user && (me.user.role==='teacher' || me.user.role==='owner')){
        const container=document.getElementById('studentsAdmin');
        if(!container) return;
        const listEl=document.getElementById('studentsList');
        const load=async()=>{
          const r=await fetch('/api/students',{credentials:'include'});
          const data=await r.json();
          listEl.innerHTML='';
          data.items.forEach(s=>{
            const card=document.createElement('div');
            card.className='lecture';
            const avatarUrl=s.avatar?(`/uploads/${s.avatar}`):'';
            card.innerHTML=`
              <div style="display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap">
                <div style="display:flex;gap:10px;align-items:center">
                  <img src="${avatarUrl}" class="avatar" onerror="this.style.display='none'" alt="" />
                  <div><strong>${s.username}</strong></div>
                </div>
                <div class="student-actions">
                  <label class="btn" style="cursor:pointer">
                    اختر صورة
                    <input type="file" accept="image/*" hidden />
                  </label>
                  <button class="btn btn-danger" data-del>حذف</button>
                </div>
              </div>`;
            const input=card.querySelector('input[type=file]');
            input.onchange=async(evt)=>{
              const f=evt.target.files?.[0]; if(!f) return;
              const fd=new FormData(); fd.append('avatar',f);
              const up=await fetch(`/api/students/${encodeURIComponent(s.username)}/avatar`,{method:'POST',body:fd,credentials:'include'});
              if(up.ok){ toast('تم تحديث الصورة'); load(); } else { toast('فشل تحديث الصورة'); }
            };
            const delBtn=card.querySelector('[data-del]');
            delBtn.onclick=async()=>{
              if(!confirm('حذف هذا الطالب؟')) return;
              const r=await fetch(`/api/students/${encodeURIComponent(s.username)}`,{method:'DELETE',credentials:'include'});
              if(r.ok){ toast('تم حذف الطالب'); load(); } else { toast('تعذر حذف الطالب'); }
            };
            listEl.appendChild(card);
          });
        };
        container.style.display='block';
        load();
      }
    }catch(_){/* ignore */}
  })();
}

async function loadTeacherLectures(){
  const c=document.getElementById('teacherLectures');
  const r=await fetch('/api/lectures',{credentials:'include'}); const data=await r.json();
  c.innerHTML='';
  const seq=(data.items||[]).map(x=>({ url:`/uploads/${x.filename}`, title:x.title||x.original_name||'' }));
  data.items.forEach((l,idx)=>{
    const el=tpl('tmpl-lecture-card-teacher'); if(!el) return;
    el.querySelector('[data-title]').textContent = l.title||'';
    const subj=el.querySelector('[data-subject]'); if(subj) subj.textContent = l.subject||'';
    const type=el.querySelector('[data-type]'); if(type) type.textContent = l.type||'';
    const ext=el.querySelector('[data-ext]'); if(ext) ext.href = `/uploads/${l.filename}`;
    const dl=el.querySelector('[data-download]'); if(dl) dl.href = `/api/lectures/${l.id}/download`;
    const copy=el.querySelector('[data-copy]'); if(copy) copy.onclick=()=>{ navigator.clipboard.writeText(location.origin+'/s/'+l.id); toast('تم نسخ الرابط'); };
    const edit=el.querySelector('[data-edit]'); if(edit) edit.onclick=async()=>{
      const next=prompt('اكتب الاسم الجديد:', l.title||'');
      if(next===null) return;
      const title=(next||'').trim();
      if(!title) return toast('لم يتم التعديل');
      await fetch(`/api/lectures/${l.id}`,{method:'PUT',headers:{'Content-Type':'application/json'},credentials:'include',body:JSON.stringify({title})});
      toast('تم التحديث');
      loadTeacherLectures();
    };
    const del=el.querySelector('[data-delete]'); if(del) del.onclick=async()=>{
      if(!confirm('حذف المحاضرة؟')) return;
      await fetch(`/api/lectures/${l.id}`,{method:'DELETE',credentials:'include'});
      toast('تم الحذف');
      loadTeacherLectures();
    };
    const viewBtn=el.querySelector('[data-view]'); if(viewBtn) viewBtn.onclick=()=>openViewer(`/uploads/${l.filename}`, l.title||l.original_name||'', seq, idx);
    c.appendChild(el);
    // load stats (views)
    ;(async()=>{
      try{
        const s=await (await fetch(`/api/lectures/${l.id}/stats`)).json();
        const v=el.querySelector('[data-views]');
        if(v) v.textContent=`${s.views||0} مشاهدة`;
      }catch(_){/* ignore */}
    })();
  });
}
