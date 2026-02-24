document.addEventListener('DOMContentLoaded',function(){
  // Sound preference mixer
  const programs = {
    gentle:["Loom Session — soft layers","Short Drift — 30m guided rest","Dawn Circle — gentle bell"],
    medium:["Tide Room — 60m mixed tones","Evening Weave — voice & bowls","Flow Cluster — mid-intensity"],
    intense:["Deep Loom — extended vibration","Resonant Intensive — focused work","Nightfall Wave — immersive sound"]
  };
  const controls = document.querySelectorAll('#mixer .controls button');
  const programList = document.getElementById('program-list');
  function setIntensity(key){
    controls.forEach(b=>b.classList.toggle('active',b.dataset.intensity===key));
    programList.innerHTML = '';
    programs[key].forEach(p=>{
      const li = document.createElement('li'); li.textContent = p; programList.appendChild(li);
    });
  }
  controls.forEach(btn=>btn.addEventListener('click',()=>setIntensity(btn.dataset.intensity)));
  // default
  setIntensity('gentle');

  // Proof gallery (testimonials rotating) + badges tooltips
  const testimonials = [
    {text:'"I left lighter and more steady than I arrived." — A.'},
    {text:'"Clear, quiet, and exact in its care." — M.'},
    {text:'"A place that makes soft things possible." — S.'}
  ];
  let tIndex = 0;
  const tText = document.getElementById('testimonial-text');
  const prev = document.getElementById('prev');
  const next = document.getElementById('next');
  function showTestimonial(i){
    tIndex = (i+testimonials.length)%testimonials.length;
    tText.textContent = testimonials[tIndex].text;
  }
  prev.addEventListener('click',()=>showTestimonial(tIndex-1));
  next.addEventListener('click',()=>showTestimonial(tIndex+1));
  showTestimonial(0);
  let rot = setInterval(()=>showTestimonial(tIndex+1),6000);
  [prev,next].forEach(b=>b.addEventListener('click',()=>{clearInterval(rot);rot=setInterval(()=>showTestimonial(tIndex+1),6000);}));

  // Badges tooltips
  const badges = document.querySelectorAll('#badges .badge');
  let tipEl = null;
  badges.forEach(b=>{
    b.addEventListener('mouseenter',e=>{
      const tip = b.dataset.tip || '';
      if(!tip) return;
      tipEl = document.createElement('div'); tipEl.className='tooltip'; tipEl.textContent = tip; document.body.appendChild(tipEl);
    });
    b.addEventListener('mousemove',e=>{
      if(!tipEl) return; tipEl.style.left = (e.pageX+12)+'px'; tipEl.style.top = (e.pageY+12)+'px';
    });
    b.addEventListener('mouseleave',()=>{ if(tipEl){ tipEl.remove(); tipEl=null; } });
  });

  // Events module: next-event + calendar list
  const rawEvents = [
    {title:'Loom Circle',date:'2026-03-01T18:30:00',location:'Main Space'},
    {title:'Tide Room — Long Drift',date:'2026-03-08T19:00:00',location:'Main Space'},
    {title:'Private Resonance (limited)',date:'2026-03-14T10:00:00',location:'Private Room'},
    {title:'Community Open Session',date:'2026-03-21T17:30:00',location:'Main Space'}
  ];
  const now = new Date();
  const upcoming = rawEvents.map(e=>Object.assign({},e,{dt:new Date(e.date)})).filter(e=>e.dt>now).sort((a,b)=>a.dt-b.dt);
  const nextEventEl = document.getElementById('next-event');
  const calList = document.getElementById('calendar-list');
  if(upcoming.length>0){
    const n = upcoming[0];
    nextEventEl.innerHTML = '<strong>'+n.title+'</strong><div style="color:var(--muted);">'+n.dt.toLocaleString()+' • '+n.location+'</div>';
    upcoming.forEach(ev=>{
      const li = document.createElement('li');
      li.textContent = ev.dt.toLocaleDateString() + ' — ' + ev.title + ' (' + ev.location + ')';
      calList.appendChild(li);
    });
  } else {
    nextEventEl.textContent = 'No events scheduled yet. Check back soon.';
  }

  // Accessibility small helpers
  // attach keyboard control to mixer
  document.querySelectorAll('#mixer .controls button').forEach((btn,i,arr)=>{
    btn.addEventListener('keydown',e=>{
      if(e.key==='ArrowRight'){ e.preventDefault(); arr[(i+1)%arr.length].focus(); }
      if(e.key==='ArrowLeft'){ e.preventDefault(); arr[(i-1+arr.length)%arr.length].focus(); }
    });
  });

});