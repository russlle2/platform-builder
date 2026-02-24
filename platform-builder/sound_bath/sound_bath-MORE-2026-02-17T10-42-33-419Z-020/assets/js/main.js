(function(){
  // Sample events (local only)
  const events = [
    {id:1,title:'Deep Immersion — Night Session',date:addDaysISO(1,'19:00'),capacity:24,remaining:12,format:'intensive'},
    {id:2,title:'Standard Restore — Saturday Morning',date:addDaysISO(3,'10:30'),capacity:18,remaining:6,format:'standard'},
    {id:3,title:'Micro Pause — Midweek',date:addDaysISO(5,'12:15'),capacity:12,remaining:8,format:'micro'},
    {id:4,title:'Extended Immersion — Weekend',date:addDaysISO(10,'14:00'),capacity:30,remaining:22,format:'intensive'}
  ];

  function addDaysISO(days,time){
    const d=new Date();d.setDate(d.getDate()+days);
    const [h,m]=time.split(':').map(Number);
    d.setHours(h);d.setMinutes(m);d.setSeconds(0);d.setMilliseconds(0);
    return d.toISOString();
  }

  // Utility to format date
  function friendlyDate(iso){
    const d=new Date(iso);
    return d.toLocaleString(undefined,{weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'numeric'});
  }

  // Populate next-event-card
  function renderNextEvent(){
    const now=new Date();
    const upcoming=events.filter(e=>new Date(e.date)>now).sort((a,b)=>new Date(a.date)-new Date(b.date));
    const next=upcoming[0];
    const el=document.getElementById('next-event-card');
    if(!next){el.innerHTML='<div class="muted">No upcoming events listed.</div>';return}
    el.innerHTML=`<div class=next-title>${escapeHtml(next.title)}</div><div class=next-time>${friendlyDate(next.date)}</div><div class=next-remaining>Seats: ${next.remaining}</div><a class="btn outline" href="/events.html">Reserve</a>`;
  }

  // Calendar list
  function renderCalendar(){
    const wrap=document.getElementById('calendar-list');
    wrap.innerHTML='';
    events.forEach(e=>{
      const item=document.createElement('div');
      item.className='calendar-item';
      item.innerHTML=`<strong>${escapeHtml(e.title)}</strong><div class=muted>${friendlyDate(e.date)}</div><div class=small>Seats left: ${e.remaining}</div>`;
      wrap.appendChild(item);
    });
  }

  // Seat selector
  function initSeatSelector(){
    const select=document.getElementById('event-select');
    events.forEach(e=>{
      const opt=document.createElement('option');opt.value=e.id;opt.textContent=`${e.title} — ${friendlyDate(e.date)}`;select.appendChild(opt);
    });
    const seatCount=document.getElementById('seat-count');
    const info=document.getElementById('seat-info');
    function updateInfo(){
      const selected=events.find(ev=>ev.id==select.value);
      info.textContent=`Seats available: ${selected.remaining}`;
      seatCount.max=Math.min(10,selected.remaining);
      if(Number(seatCount.value)>seatCount.max)seatCount.value=seatCount.max;
    }
    select.addEventListener('change',updateInfo);
    document.getElementById('increase').addEventListener('click',()=>{seatCount.value=Math.min(Number(seatCount.max),Number(seatCount.value)+1);});
    document.getElementById('decrease').addEventListener('click',()=>{seatCount.value=Math.max(1,Number(seatCount.value)-1);});
    document.getElementById('reserve').addEventListener('click',()=>{
      const sel=events.find(ev=>ev.id==select.value);
      const count=Number(seatCount.value);
      const confirm=document.getElementById('reserve-confirm');
      if(count>sel.remaining){confirm.textContent='Not enough seats available.';return}
      // local fake reservation
      sel.remaining=Math.max(0,sel.remaining-count);
      confirm.textContent=`Reserved ${count} seat(s) for "${sel.title}" (demo).`;
      updateInfo();renderCalendar();renderNextEvent();
    });
    updateInfo();
  }

  // Packing list generator
  function initPacking(){
    const btn=document.getElementById('generate-packing');
    btn.addEventListener('click',()=>{
      const fmt=document.getElementById('packing-format').value;
      const mat=document.getElementById('bring-mat').checked;
      const water=document.getElementById('bring-water').checked;
      const notes=document.getElementById('bring-notes').checked;
      const out=document.getElementById('packing-output');
      const base=['Comfortable clothing','Open intention and arrival time (10 min early)'];
      if(fmt==='micro')base.push('Light layers');
      if(fmt==='standard')base.push('Blanket for warmth');
      if(fmt==='intensive')base.push('Extra layers and aftercare snack');
      if(mat)base.push('Your mat/pillow');
      if(water)base.push('Water bottle');
      if(notes)base.push('Pen and paper for journaling');
      out.innerHTML='<strong>Suggested pack</strong><ul>'+base.map(i=>'<li>'+escapeHtml(i)+'</li>').join('')+'</ul>';
    });
  }

  // Modal guided exercise
  const steps = [
    {title:'Set an intention',type:'text',content:'Take a moment to name one simple intention for this practice. Keep it short.'},
    {title:'Breathing: 4-4-8',type:'breath',content:'Follow the cycle: inhale 4s — hold 4s — exhale 8s. We will run three rounds.'},
    {title:'Journaling prompt',type:'text',content:'Write 3 lines: what you notice now, what you release, one small next step.'},
    {title:'Close & ground',type:'text',content:'Fold the practice into one sentence and breathe on it. When ready, open your eyes.'}
  ];

  function initModal(){
    const modal=document.getElementById('exercise-modal');
    const content=document.getElementById('modal-step');
    const prev=document.getElementById('prev-step');
    const next=document.getElementById('next-step');
    const title=document.getElementById('modal-title');
    let idx=0;
    function show(i){
      idx=i;const s=steps[idx];
      title.textContent=s.title;
      if(s.type==='breath'){
        content.innerHTML=`<div class="breath-visual" id="breath-visual"><div class="pulse"></div></div><p class=muted>${escapeHtml(s.content)}</p><div class=small id="breath-status"></div>`;
        startBreathSequence();
      } else {
        stopBreathSequence();
        content.innerHTML=`<p>${escapeHtml(s.content)}</p>`;
      }
      prev.disabled = idx===0;
      next.textContent = idx===steps.length-1 ? 'Finish' : 'Next';
      modal.setAttribute('aria-hidden','false');
    }

    document.getElementById('try-now').addEventListener('click',()=>show(0));
    document.getElementById('close-modal').addEventListener('click',closeModal);
    prev.addEventListener('click',()=>{ if(idx>0) show(idx-1); });
    next.addEventListener('click',()=>{ if(idx<steps.length-1) show(idx+1); else closeModal(); });
    function closeModal(){ stopBreathSequence(); modal.setAttribute('aria-hidden','true'); }

    // Breath sequence control
    let breathTimer=null; let round=0;
    function startBreathSequence(){ round=0; updateBreath(); }
    function stopBreathSequence(){ if(breathTimer)clearTimeout(breathTimer); breathTimer=null; const st=document.getElementById('breath-status'); if(st)st.textContent=''; }
    function updateBreath(){
      const visual=document.getElementById('breath-visual'); const status=document.getElementById('breath-status');
      if(!visual||!status) return;
      function step(label,secs,cb){
        status.textContent=label+ ' — ' + secs + 's';
        visual.style.transform=label==='Exhale' ? 'scale(0.6)' : 'scale(1.1)';
        breathTimer=setTimeout(cb,secs*1000);
      }
      // one cycle
      step('Inhale',4,()=>{ step('Hold',4,()=>{ step('Exhale',8,()=>{ round++; if(round<3) updateBreath(); else {status.textContent='Completed rounds';}})})});
    }
  }

  // small helpers
  function escapeHtml(s){ return String(s).replace(/[&<>\"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]}); }

  // Init
  document.addEventListener('DOMContentLoaded',()=>{ renderNextEvent(); renderCalendar(); initSeatSelector(); initPacking(); initModal(); });
})();