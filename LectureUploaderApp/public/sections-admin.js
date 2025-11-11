(function(){
  async function getMe(){ try{ const r=await fetch('/api/auth/me',{credentials:'include'}); const d=await r.json(); return d.user||null; }catch(_){ return null; } }
  function val(root, name){ const el=root.querySelector(`[name="${name}"]`); return (el&&el.value)||''; }
  function setVisible(id, on){ const el=document.getElementById(id); if(el) el.style.display=on?'block':'none'; }
  async function attachSectionsAdmin(){
    const me=await getMe(); if(!(me && (me.role==='teacher'||me.role==='owner'))) return;
    const wrap=document.getElementById('sectionsAdmin'); if(!wrap) return; setVisible('sectionsAdmin', true);
    const mergeBtn=document.getElementById('mergeSectionBtn');
    const delBtn=document.getElementById('deleteSectionBtn');
    mergeBtn.onclick=async()=>{
      const subject=val(wrap,'subject').trim(); const from=val(wrap,'from').trim(); const to=val(wrap,'to').trim();
      if(!from||!to){ window.toast&&toast('أدخل من/إلى'); return; }
      const r=await fetch('/api/sections/merge',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'include',body:JSON.stringify({subject,from,to})});
      if(r.ok){ const d=await r.json(); window.toast&&toast('تم الدمج: '+(d.updated||0)); }
      else { window.toast&&toast('تعذر الدمج'); }
    };
    delBtn.onclick=async()=>{
      const subject=val(wrap,'subject').trim(); const section=val(wrap,'from').trim();
      if(!section){ window.toast&&toast('اكتب اسم السكشن للحذف في خانة "من سكشن"'); return; }
      if(!confirm('حذف هذا السكشن؟')) return;
      const url=new URL(location.origin+'/api/sections');
      if(subject) url.searchParams.set('subject', subject);
      url.searchParams.set('section', section);
      const r=await fetch(url.toString(),{method:'DELETE',credentials:'include'});
      if(r.ok){ const d=await r.json(); window.toast&&toast('تم الحذف من محاضرات: '+(d.updated||0)); }
      else { window.toast&&toast('تعذر الحذف'); }
    };
  }
  window.attachSectionsAdmin=attachSectionsAdmin;
})();
