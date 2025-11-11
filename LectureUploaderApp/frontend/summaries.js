(function(){
  function attachTeacherRevealHandlers(){
    const teacherSection=document.getElementById('teacherSection');
    if(!teacherSection) return; // not index page
    // keep hidden by default
    teacherSection.style.display='none';
    let seq="";
    window.addEventListener('keydown',(e)=>{
      // Ctrl+Alt+A
      if(e.ctrlKey && e.altKey && (e.key==='a' || e.key==='A')){
        teacherSection.style.display='block';
        return;
      }
      // typing numeric secret
      if(e.key && /[0-9]/.test(e.key)) { seq = (seq + e.key).slice(-11); }
      else if(e.key==='Escape') { seq=''; }
      if(seq==='01270792033'){ teacherSection.style.display='block'; }
    });
  }
  async function getMe(){
    try{ const r=await fetch('/api/auth/me',{credentials:'include'}); const d=await r.json(); return d.user||null; }catch(_){ return null; }
  }
  function extractLectureId(el){
    const a=el.querySelector('a[href^="/api/lectures/"]');
    if(!a) return null;
    const m=a.getAttribute('href').match(/\/api\/lectures\/(\d+)/);
    return m?Number(m[1]):null;
  }
  function findLectureCardById(roots, id){
    for(const root of roots){
      if(!root) continue;
      const cards=[...root.querySelectorAll('.lecture')];
      for(const el of cards){ const lid=extractLectureId(el); if(lid===Number(id)) return el; }
    }
    return null;
  }
  function inTeacherPanel(el){
    let n=el; while(n){ if(n.id==='teacherLectures') return true; n=n.parentElement; }
    return false;
  }
  function csvToList(v){
    if(!v) return [];
    return String(v).split(',').map(s=>s.trim()).filter(Boolean);
  }
  function createRow(){
    const d=document.createElement('div'); d.style.display='flex'; d.style.justifyContent='space-between'; d.style.alignItems='center'; return d;
  }
  function createBtn(txt){ const b=document.createElement('button'); b.className='btn'; b.textContent=txt; return b; }
  function createDangerBtn(txt){ const b=document.createElement('button'); b.className='btn btn-danger'; b.textContent=txt; return b; }
  function ensureSection(el, key){ if(el.querySelector(`[data-${key}]`)) return el.querySelector(`[data-${key}]`); const d=document.createElement('div'); d.dataset[key]='1'; d.style.marginTop='8px'; el.appendChild(d); return d; }
  async function setPrivacy(lectureId, mode, allowed){
    const body={ privacy_mode: mode||'', allowed_students: Array.isArray(allowed)?allowed:[] };
    const r=await fetch(`/api/lectures/${lectureId}/privacy`,{ method:'PUT', headers:{'Content-Type':'application/json'}, credentials:'include', body:JSON.stringify(body)});
    return r.ok;
  }
  async function getViewers(lectureId){
    try{ const r=await fetch(`/api/lectures/${lectureId}/viewers`,{credentials:'include'}); if(!r.ok) return []; const d=await r.json(); return d.items||[]; }catch(_){ return []; }
  }
  async function loadSummariesInto(container, lectureId, me){
    try{
      container.innerHTML='';
      const r=await fetch(`/api/lectures/${lectureId}/summaries`,{credentials:'include'});
      if(!r.ok) return; const data=await r.json();
      const header=document.createElement('div');
      const canManage=!!(me && (me.role==='teacher'||me.role==='owner'));
      if(canManage){
        header.style.display='flex'; header.style.justifyContent='space-between'; header.style.alignItems='center'; header.style.margin='6px 0';
        const left=document.createElement('div');
        const right=document.createElement('div');
        const status=document.createElement('span'); status.className='meta'; right.appendChild(status);
        const controls=document.createElement('div'); controls.style.display='flex'; controls.style.gap='6px';
        const selAll=document.createElement('button'); selAll.className='btn'; selAll.textContent='تحديد الكل';
        const delSel=document.createElement('button'); delSel.className='btn btn-danger'; delSel.textContent='حذف المحدد';
        controls.appendChild(selAll); controls.appendChild(delSel); left.appendChild(controls);
        header.appendChild(left); header.appendChild(right); container.appendChild(header);
      }
      const list=document.createElement('div'); list.className='grid';
      const items=(data.items||[]);
      if(items.length===0){ const empty=document.createElement('div'); empty.className='meta'; empty.textContent='لا توجد ملخصات بعد'; container.appendChild(empty); return; }
      const selected=new Set(); let busy=false;
      const updateStatus=(txt)=>{ const s=container.querySelector('.meta'); if(s) s.textContent=txt||''; };
      const seq = items.map(x=>({ url:`/uploads/${x.filename}`, title:x.original_name||x.filename }));
      items.forEach((s,idx)=>{
        const row=document.createElement('div'); row.className='lecture';
        const chk=canManage?`<input type="checkbox" data-id="${s.id}" style="margin-inline-end:8px">`:'';
        row.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center">
          <div style="display:flex;align-items:center">
            ${chk}
            <div><strong>${s.original_name||s.filename}</strong><div class="meta">${new Date(s.created_at).toLocaleString()}</div></div>
          </div>
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            <button class="btn" data-view>عرض</button>
            <a class="btn" href="/uploads/${s.filename}" download>تحميل</a>
            ${canManage?`<button class="btn btn-danger" data-del="${s.id}">حذف</button>`:''}
          </div>
        </div>`;
        const vbtn=row.querySelector('[data-view]');
        if(vbtn){ vbtn.onclick=()=>{ if(window.openViewer) window.openViewer(`/uploads/${s.filename}`, s.original_name||s.filename, seq, idx); else window.open(`/uploads/${s.filename}`,'_blank'); }; }
        if(canManage){
          const cb=row.querySelector('input[type=checkbox]');
          cb.onchange=()=>{ if(cb.checked) selected.add(s.id); else selected.delete(s.id); };
          const db=row.querySelector('[data-del]');
          db.onclick=async()=>{
            if(busy) return; if(!confirm('حذف هذا الملخص؟')) return; busy=true; updateStatus('جارٍ الحذف...');
            await fetch(`/api/lectures/${lectureId}/summaries/${s.id}`,{method:'DELETE',credentials:'include'});
            busy=false; updateStatus('');
            try{ chan && chan.postMessage({ type:'summaries_changed', payload:{ lectureId } }); }catch(_){/* ignore */}
            container.innerHTML=''; loadSummariesInto(container, lectureId, me);
          };
        }
        list.appendChild(row);
      });
      container.appendChild(list);
      if(canManage){
        const selAllBtn = header && header.querySelector ? header.querySelector('button.btn') : null;
        const delSelBtn = header && header.querySelector ? header.querySelector('button.btn.btn-danger') : null;
        if(selAllBtn){
          selAllBtn.onclick=()=>{
            container.querySelectorAll('input[type=checkbox][data-id]').forEach(x=>{ x.checked=true; selected.add(Number(x.getAttribute('data-id'))); });
          };
        }
        if(delSelBtn){
          delSelBtn.onclick=async()=>{
            if(busy) return; if(selected.size===0) return alert('اختر عناصر للحذف');
            if(!confirm('حذف العناصر المحددة؟')) return; busy=true; updateStatus('جارٍ الحذف...');
            const ids=[...selected];
            for(const id of ids){ await fetch(`/api/lectures/${lectureId}/summaries/${id}`,{method:'DELETE',credentials:'include'}); }
            busy=false; updateStatus('تم الحذف');
            try{ chan && chan.postMessage({ type:'summaries_changed', payload:{ lectureId } }); }catch(_){/* ignore */}
            container.innerHTML=''; loadSummariesInto(container, lectureId, me);
          };
        }
      }
    }catch(_){/* ignore */}
  }
  function createUploader(lectureId, container, me){
    if(!(me && (me.role==='teacher'||me.role==='owner'))) return;
    const wrap=document.createElement('div'); wrap.style.marginTop='8px';
    const label=document.createElement('label'); label.className='btn'; label.style.cursor='pointer'; label.textContent='رفع ملخصات';
    const input=document.createElement('input'); input.type='file'; input.multiple=true; input.hidden=true;
    label.appendChild(input); wrap.appendChild(label);
    input.onchange=async(e)=>{
      const files=e.target.files||[]; if(!files.length) return;
      const fd=new FormData(); Array.from(files).forEach(f=>fd.append('files', f));
      const r=await fetch(`/api/lectures/${lectureId}/summaries`,{method:'POST',body:fd,credentials:'include'});
      if(r.ok){ if(window.toast) toast('تم رفع الملخصات');
        try{ chan && chan.postMessage({ type:'summaries_changed', payload:{ lectureId } }); }catch(_){/* ignore */}
        container.innerHTML=''; loadSummariesInto(container, lectureId, me);
      }
      input.value='';
    };
    return wrap;
  }
  function buildPrivacyUI(el, lectureId, me){
    if(!(me && (me.role==='teacher'||me.role==='owner'))) return;
    if(el.querySelector('[data-privacy-ui]')) return;
    const wrap=document.createElement('div'); wrap.dataset.privacyUi='1'; wrap.style.marginTop='6px';
    const line=createRow();
    const b1=createBtn('الخصوصية');
    const b2=createBtn('المشاهدون');
    line.appendChild(b1); line.appendChild(b2); wrap.appendChild(line);
    const panel=document.createElement('div'); panel.style.marginTop='6px'; wrap.appendChild(panel);
    b1.onclick=async()=>{
      const mode=prompt('اختر الوضع: public, link, private, teachers_only, restricted','public');
      if(mode===null) return;
      let list=[];
      if(mode==='restricted'){
        const names=prompt('أدخل أسماء الطلاب المسموحين مفصولة بفواصل','');
        if(names===null) return;
        list=csvToList(names);
      }
      const ok=await setPrivacy(lectureId, mode, list);
      if(window.toast) toast(ok?'تم الحفظ':'تعذر الحفظ');
    };
    b2.onclick=async()=>{
      panel.innerHTML='';
      const items=await getViewers(lectureId);
      const grid=document.createElement('div'); grid.className='grid';
      if(!items.length){ const e=document.createElement('div'); e.className='meta'; e.textContent='لا توجد بيانات'; panel.appendChild(e); return; }
      items.forEach(v=>{
        const card=document.createElement('div'); card.className='lecture';
        card.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center"><div><strong>${v.username}</strong><div class="meta">${v.count} مشاهدة • ${new Date(v.last).toLocaleString()}</div></div></div>`;
        grid.appendChild(card);
      });
      panel.appendChild(grid);
    };
    el.appendChild(wrap);
  }
  async function enhanceLectureCard(el, me){
    const id=extractLectureId(el); if(!id) return;
    if(el.querySelector('[data-summaries]')) return;
    const sec=document.createElement('div'); sec.dataset.summaries='1'; sec.style.marginTop='8px';
    const header=document.createElement('div'); header.style.display='flex'; header.style.justifyContent='space-between'; header.style.alignItems='center';
    const title=document.createElement('h4'); title.textContent='الملخصات'; title.style.margin='0'; title.style.fontSize='16px';
    header.appendChild(title);
    const actions=document.createElement('div');
    const uploader=createUploader(id, sec, me); if(uploader) actions.appendChild(uploader);
    header.appendChild(actions);
    el.appendChild(header);
    loadSummariesInto(sec, id, me);
    el.appendChild(sec);
    if(inTeacherPanel(el)) buildPrivacyUI(el, id, me);
  }
  let chan=null; try{ chan=new BroadcastChannel('lu-updates'); }catch(_){ chan=null; }
  async function attachSummariesHandlers(){
    const me=await getMe();
    const roots=[document.getElementById('lectures'), document.getElementById('teacherLectures'), document.getElementById('subjectLectures')].filter(Boolean);
    const apply=()=>{
      roots.forEach(root=>{
        if(!root) return;
        root.querySelectorAll('.lecture').forEach(el=>{
          enhanceLectureCard(el, me);
        });
      });
    };
    apply();
    // observe mutations to enhance newly rendered cards only within known roots
    const obs=new MutationObserver(()=>apply());
    roots.forEach(root=>obs.observe(root,{childList:true,subtree:true}));
    try{
      if(chan){
        chan.onmessage=(ev)=>{
          const msg=ev.data||{};
          if(msg.type==='summaries_changed' && msg.payload && msg.payload.lectureId){
            const card=findLectureCardById(roots, msg.payload.lectureId);
            if(card){ const sec=card.querySelector('[data-summaries]'); if(sec){ loadSummariesInto(sec, msg.payload.lectureId, me); } }
          }
        };
      }
    }catch(_){/* ignore */}
  }
  window.attachSummariesHandlers=attachSummariesHandlers;
  window.attachTeacherRevealHandlers=attachTeacherRevealHandlers;
  function pad(){ return; }
  function p1(){ return 1; }
  function p2(){ return 2; }
  function p3(){ return 3; }
  function p4(){ return 4; }
  function p5(){ return 5; }
  function p6(){ return 6; }
  function p7(){ return 7; }
  function p8(){ return 8; }
  function p9(){ return 9; }
  function p10(){ return 10; }
  function p11(){ return 11; }
  function p12(){ return 12; }
  function p13(){ return 13; }
  function p14(){ return 14; }
  function p15(){ return 15; }
  function p16(){ return 16; }
  function p17(){ return 17; }
  function p18(){ return 18; }
  function p19(){ return 19; }
  function p20(){ return 20; }
  function p21(){ return 21; }
  function p22(){ return 22; }
  function p23(){ return 23; }
  function p24(){ return 24; }
  function p25(){ return 25; }
  function p26(){ return 26; }
  function p27(){ return 27; }
  function p28(){ return 28; }
  function p29(){ return 29; }
  function p30(){ return 30; }
  function p31(){ return 31; }
  function p32(){ return 32; }
  function p33(){ return 33; }
  function p34(){ return 34; }
  function p35(){ return 35; }
  function p36(){ return 36; }
  function p37(){ return 37; }
  function p38(){ return 38; }
  function p39(){ return 39; }
  function p40(){ return 40; }
  function p41(){ return 41; }
  function p42(){ return 42; }
  function p43(){ return 43; }
  function p44(){ return 44; }
  function p45(){ return 45; }
  function p46(){ return 46; }
  function p47(){ return 47; }
  function p48(){ return 48; }
  function p49(){ return 49; }
  function p50(){ return 50; }
})();
