(function(){
  // Utilities
  function qs(sel, root) { return (root||document).querySelector(sel); }
  function qsa(sel, root) { return Array.from((root||document).querySelectorAll(sel)); }

  // Year in footer
  qs('#year').textContent = new Date().getFullYear();

  // Mobile nav toggle
  const navToggle = qs('.nav-toggle');
  navToggle && navToggle.addEventListener('click', function(){
    document.body.classList.toggle('nav-open');
    const nav = qs('.nav');
    if(nav) nav.style.display = nav.style.display === 'flex' ? 'none' : 'flex';
  });

  // Scroll-triggered reveals with prefers-reduced-motion support
  const prefsReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const reveals = qsa('[data-reveal]');

  if(prefsReduced){
    reveals.forEach(el => el.classList.add('visible'));
  } else if('IntersectionObserver' in window){
    const obs = new IntersectionObserver((entries)=>{
      entries.forEach(e => {
        if(e.isIntersecting){
          e.target.classList.add('visible');
          obs.unobserve(e.target);
        }
      });
    },{threshold:0.12});
    reveals.forEach(el => obs.observe(el));
  } else {
    // fallback
    const onScroll = function(){
      const top = window.scrollY + window.innerHeight*0.9;
      reveals.forEach(el=>{
        if(el.getBoundingClientRect().top + window.scrollY < top){ el.classList.add('visible'); }
      });
    };
    onScroll();window.addEventListener('scroll', onScroll);
  }

  // Modal and Guided Exercise
  const modal = qs('#exerciseModal');
  const tryItBtn = qs('#tryItBtn');
  const closeBtn = qs('#modalClose');
  const exArea = qs('#exerciseArea');
  let currentTimer = null;

  function openModal(){
    modal.setAttribute('aria-hidden','false');
    document.body.style.overflow = 'hidden';
    qs('.modal-panel').focus && qs('.modal-panel').focus();
  }
  function closeModal(){
    modal.setAttribute('aria-hidden','true');
    document.body.style.overflow = '';
    clearExercise();
  }
  function clearExercise(){
    exArea.innerHTML='';
    if(currentTimer) { clearInterval(currentTimer); currentTimer=null; }
  }

  tryItBtn && tryItBtn.addEventListener('click', ()=>{ openModal(); });
  closeBtn && closeBtn.addEventListener('click', ()=>{ closeModal(); });
  modal.addEventListener('click', (e)=>{ if(e.target === modal) closeModal(); });
  document.addEventListener('keydown', function(e){ if(e.key==='Escape') closeModal(); });

  // Exercise handlers
  qsa('.ex-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const type = btn.getAttribute('data-type');
      startExercise(type);
    });
  });

  function startExercise(type){
    clearExercise();
    if(type==='breathing') startBreathing();
    if(type==='journaling') startJournaling();
    if(type==='intention') startIntention();
  }

  // Breathing exercise (visual circle + guided counts)
  function startBreathing(){
    const duration = 120; // seconds
    const circle = document.createElement('div');
    circle.className = 'breath-circle';
    circle.innerHTML = '<div class="breathing" id="breathAnim">Breathe</div>';
    const timer = document.createElement('div'); timer.className='timer'; timer.textContent = formatTime(duration);
    exArea.appendChild(circle); exArea.appendChild(timer);

    let remaining = duration;
    const phases = [4,6,6]; // inhale, hold, exhale (seconds)
    let phaseIndex = 0; let phaseRemain = phases[0];
    const animEl = qs('#breathAnim');

    function stepPhase(){
      // simple visual: scale on inhale, hold, shrink on exhale
      if(phaseIndex===0){ animEl.style.transform='scale(1.18)'; animEl.textContent='Inhale'; }
      else if(phaseIndex===1){ animEl.style.transform='scale(1.18)'; animEl.textContent='Hold'; }
      else { animEl.style.transform='scale(0.86)'; animEl.textContent='Exhale'; }
    }
    stepPhase();

    currentTimer = setInterval(()=>{
      remaining--; phaseRemain--;
      timer.textContent = formatTime(remaining);
      if(phaseRemain<=0){
        phaseIndex = (phaseIndex+1)%phases.length; phaseRemain = phases[phaseIndex]; stepPhase();
      }
      if(remaining<=0){ clearInterval(currentTimer); currentTimer=null; timer.textContent='Done — nice work!'; animEl.textContent='Done'; animEl.style.transform='scale(1)'; }
    },1000);
  }

  function formatTime(sec){ const m = Math.floor(sec/60); const s = sec%60; return `${m}:${s.toString().padStart(2,'0')}`; }

  // Journaling exercise: prompt + timer + save to localStorage
  function startJournaling(){
    const seconds = 300; // 5 minutes
    const prompt = choosePrompt();
    const p = document.createElement('p'); p.className='muted'; p.textContent = 'Prompt: ' + prompt;
    const ta = document.createElement('textarea'); ta.style.width='100%'; ta.style.minHeight='120px'; ta.placeholder='Write freely for 5 minutes...';
    const timer = document.createElement('div'); timer.className='timer'; timer.textContent = formatTime(seconds);
    const saveBtn = document.createElement('button'); saveBtn.className='btn btn-ghost'; saveBtn.textContent='Save entry';
    saveBtn.addEventListener('click', ()=>{ saveEntry(ta.value, prompt); saveBtn.textContent='Saved'; setTimeout(()=>saveBtn.textContent='Save entry',2000); });
    exArea.appendChild(p); exArea.appendChild(ta); exArea.appendChild(timer); exArea.appendChild(saveBtn);

    let rem = seconds;
    currentTimer = setInterval(()=>{
      rem--; timer.textContent = formatTime(rem);
      if(rem<=0){ clearInterval(currentTimer); currentTimer=null; timer.textContent='Time up — well done!'; }
    },1000);
  }

  function choosePrompt(){
    const prompts = [
      'What small action would make today slightly better?',
      'Name one worry and one next step you can take about it.',
      'What did you notice about your energy today?'
    ];
    return prompts[Math.floor(Math.random()*prompts.length)];
  }
  function saveEntry(text, prompt){
    const entries = JSON.parse(localStorage.getItem('journalEntries')||'[]');
    entries.push({t:Date.now(), prompt:prompt, text:text});
    localStorage.setItem('journalEntries', JSON.stringify(entries));
  }

  // Intention setter: quick form + save
  function startIntention(){
    const p = document.createElement('p'); p.className='muted'; p.textContent = 'Set a short intention for the rest of your day.';
    const input = document.createElement('input'); input.type='text'; input.placeholder='I intend to...'; input.style.width='100%'; input.style.padding='8px'; input.style.borderRadius='8px'; input.style.border='1px solid rgba(255,255,255,0.04)';
    const saveBtn = document.createElement('button'); saveBtn.className='btn btn-primary'; saveBtn.textContent='Set intention';
    const saved = document.createElement('div'); saved.className='muted'; saved.style.marginTop='8px';
    saveBtn.addEventListener('click', ()=>{
      const val = input.value.trim(); if(!val) return; const key = 'intentions'; const list = JSON.parse(localStorage.getItem(key)||'[]'); list.push({t:Date.now(), text:val}); localStorage.setItem(key, JSON.stringify(list)); saved.textContent='Saved: "'+val+'"'; input.value='';
    });
    exArea.appendChild(p); exArea.appendChild(input); exArea.appendChild(saveBtn); exArea.appendChild(saved);
  }

})();
