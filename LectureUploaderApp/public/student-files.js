function attachStudentFilesHandlers(){
  const sfDrop=document.getElementById('studentFilesDrop');
  const sfInput=document.getElementById('studentFilesInput');
  const myFiles=document.getElementById('myFiles');
  if(!sfDrop||!sfInput||!myFiles) return;

  function makePreview(fileList){
    const files=Array.from(fileList);
    let prev=document.getElementById('studentPreview');
    if(!prev){
      prev=document.createElement('div');
      prev.id='studentPreview';
      prev.className='card';
      myFiles.parentElement.insertBefore(prev, myFiles);
    }
    prev.innerHTML='';
    const list=document.createElement('div'); list.className='grid';
    files.forEach(f=>{
      const item=document.createElement('div'); item.className='lecture';
      const isImg=f.type?.startsWith('image/');
      item.innerHTML=`<div style="display:flex;gap:10px;align-items:center">
        ${isImg?'<div style=\'width:48px;height:48px;overflow:hidden;border-radius:8px;background:#0002\'></div>':''}
        <div><strong>${f.name}</strong><div class="meta">${(f.size/1024/1024).toFixed(2)} MB</div></div>
      </div>`;
      list.appendChild(item);
    });
    const actions=document.createElement('div'); actions.style.marginTop='8px';
    const uploadBtn=document.createElement('button'); uploadBtn.className='btn'; uploadBtn.textContent='رفع الملفات';
    uploadBtn.onclick=async()=>{
      for(const f of files){
        const fd=new FormData(); fd.append('file', f);
        const r=await fetch('/api/student-files',{method:'POST',body:fd,credentials:'include'});
        if(!r.ok){ toast && toast('فشل رفع ملف'); }
      }
      prev.remove(); loadMyFiles(); toast && toast('تم رفع الملفات');
    };
    actions.appendChild(uploadBtn);
    prev.appendChild(list); prev.appendChild(actions);
  }

  sfDrop.onclick=()=>sfInput.click();
  ['dragenter','dragover'].forEach(ev=>sfDrop.addEventListener(ev,e=>{e.preventDefault();sfDrop.classList.add('active')}));
  ;['dragleave','drop'].forEach(ev=>sfDrop.addEventListener(ev,e=>{e.preventDefault();sfDrop.classList.remove('active')}));
  sfDrop.addEventListener('drop',e=>{ const files=e.dataTransfer?.files||[]; if(files.length) { makePreview(files); } });
  sfInput.onchange=(e)=>{ const files=e.target.files||[]; if(files.length){ makePreview(files); } };

  async function loadMyFiles(){
    const r=await fetch('/api/student-files',{credentials:'include'}); if(!r.ok){ return; }
    const data=await r.json();
    myFiles.innerHTML='';
    data.items.forEach(f=>{
      const el=document.createElement('div'); el.className='lecture';
      el.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center">
        <div><strong>${f.original_name||f.filename}</strong><div class="meta">${new Date(f.created_at).toLocaleString()}</div></div>
        <div class="student-actions">
          <a class="btn" href="/uploads/${f.filename}" download>تحميل</a>
          <button class="btn btn-danger" data-del>حذف</button>
        </div>
      </div>`;
      el.querySelector('[data-del]').onclick=async()=>{
        if(!confirm('حذف هذا الملف؟')) return;
        await fetch(`/api/student-files/${f.id}`,{method:'DELETE',credentials:'include'});
        loadMyFiles();
      };
      myFiles.appendChild(el);
    });
  }

  loadMyFiles();
}
