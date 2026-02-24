(function(){
  // Utility for prefers-reduced-motion
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Scroll-triggered reveal
  const revealEls = Array.from(document.querySelectorAll('[data-reveal]'));
  function revealOnScroll(entries, obs){
    entries.forEach(entry=>{
      if(entry.isIntersecting){
        entry.target.classList.add('visible');
        obs.unobserve(entry.target);
      }
    });
  }
  if(reduceMotion){
    // If reduced motion, reveal everything immediately
    revealEls.forEach(el=>el.classList.add('visible'));
  } else if('IntersectionObserver' in window){
    const io = new IntersectionObserver(revealOnScroll,{threshold:0.12});
    revealEls.forEach(el=>io.observe(el));
  } else {
    // Fallback
    revealEls.forEach(el=>el.classList.add('visible'));
  }

  // Modal guided exercise
  const modal = document.getElementById('guided-modal');
  const overlay = document.getElementById('overlay');
  const startBtns = [document.getElementById('try-now'), document.getElementById('try-now-hero'), document.getElementById('try-now-cta')].filter(Boolean);
  const guidedStart = document.getElementById('guided-start');
  const guidedClose = document.getElementById('guided-close');
  const guidedCancel = document.getElementById('guided-cancel');
  const stepEl = document.getElementById('guided-step');
  const progressBar = document.getElementById('progress-bar');
  const progressText = document.getElementById('progress-text');
  const guidedProgress = document.getElementById('guided-progress');
  const guidedJournal = document.getElementById('guided-journal');
  const journalSave = document.getElementById('journal-save');
  const journalSkip = document.getElementById('journal-skip');
  const journalEntry = document.getElementById('journal-entry');

  let state = {phase:0, timer:null, elapsed:0, durations:[24,20,10]};
  // phases: 0 intro, 1 breathing, 2 journaling, 3 intention

  function openModal(){
    modal.setAttribute('aria-hidden','false');
    overlay.hidden = false;
    document.body.style.overflow = 'hidden';
    stepEl.textContent = 'Ready to begin?';
    guidedProgress.setAttribute('aria-hidden','true');
    guidedJournal.setAttribute('aria-hidden','true');
    state.phase = 0; state.elapsed = 0;
  }
  function closeModal(){
    modal.setAttribute('aria-hidden','true');
    overlay.hidden = true;
    document.body.style.overflow = '';
    clearInterval(state.timer);
    state.timer = null; state.phase = 0; state.elapsed = 0;
    progressBar.style.width = '0%';
    progressText.textContent = '';
    journalEntry.value = '';
  }

  startBtns.forEach(b=>b.addEventListener('click',openModal));
  guidedClose.addEventListener('click',closeModal);
  guidedCancel.addEventListener('click',closeModal);
  overlay.addEventListener('click',closeModal);

  function startBreathing(){
    // Simple timed breathing: inhale 4s, hold 4s, exhale 6s -> cycles until duration
    const duration = state.durations[0]; // seconds
    let sec = 0;
    guidedProgress.setAttribute('aria-hidden','false');
    progressText.textContent = 'Breathing — follow the cues';
    progressBar.style.width = '0%';
    state.timer = setInterval(()=>{
      sec++;
      const pct = Math.min(100, Math.round((sec/duration)*100));
      progressBar.style.width = pct + '%';
      if(sec <= duration){
        // simple cue mapping
        const cycle = sec % 14;
        if(cycle >=1 && cycle <=4) stepEl.textContent = 'Inhale gently (4s)';
        else if(cycle >=5 && cycle <=8) stepEl.textContent = 'Hold (4s)';
        else stepEl.textContent = 'Exhale slowly (6s)';
      }
      if(sec >= duration){
        clearInterval(state.timer);
        state.timer = null;
        nextPhase();
      }
    },1000);
  }

  function startJournaling(){
    state.elapsed = 0;
    const duration = state.durations[1];
    guidedJournal.setAttribute('aria-hidden','false');
    guidedProgress.setAttribute('aria-hidden','false');
    progressText.textContent = 'Journaling — a short prompt';
    stepEl.textContent = 'Write a quick note about how you want to feel';
    progressBar.style.width = '0%';
    state.timer = setInterval(()=>{
      state.elapsed++;
      const pct = Math.min(100, Math.round((state.elapsed/duration)*100));
      progressBar.style.width = pct + '%';
      if(state.elapsed >= duration){
        clearInterval(state.timer);
        state.timer = null;
        nextPhase();
      }
    },1000);
  }

  function startIntention(){
    const duration = state.durations[2];
    guidedJournal.setAttribute('aria-hidden','true');
    guidedProgress.setAttribute('aria-hidden','false');
    stepEl.textContent = 'Set a short intention — repeat it aloud twice';
    progressText.textContent = 'Intention — finish in a few moments';
    progressBar.style.width = '0%';
    let sec=0;
    state.timer = setInterval(()=>{
      sec++;
      const pct = Math.min(100, Math.round((sec/duration)*100));
      progressBar.style.width = pct + '%';
      if(sec >= duration){
        clearInterval(state.timer);
        state.timer = null;
        stepEl.textContent = 'Done — you can close this window or save your note.';
        progressText.textContent = 'Thank you.';
      }
    },1000);
  }

  function nextPhase(){
    state.phase++;
    if(state.phase === 1) startBreathing();
    else if(state.phase === 2) startJournaling();
    else if(state.phase === 3) startIntention();
  }

  guidedStart.addEventListener('click',()=>{
    if(reduceMotion){
      // If reduced motion prefer shorter runs
      state.durations = [12,8,6];
    }
    // begin with breathing phase
    state.phase = 1;
    startBreathing();
  });

  journalSave.addEventListener('click',()=>{
    const txt = journalEntry.value.trim();
    if(txt) {
      // store locally for a few minutes (no backend)
      try{ localStorage.setItem('aroma_journal_last',JSON.stringify({text:txt,at:Date.now()})); } catch(e){}
    }
    // proceed to intention
    if(state.timer){ clearInterval(state.timer); state.timer = null; }
    nextPhase();
  });
  journalSkip.addEventListener('click',()=>{
    if(state.timer){ clearInterval(state.timer); state.timer = null; }
    nextPhase();
  });

  // Keyboard escape to close
  document.addEventListener('keydown', (e)=>{
    if(e.key === 'Escape' && modal.getAttribute('aria-hidden') === 'false') closeModal();
  });

  // Accessibility: focus trap basics
  modal.addEventListener('keydown', function(e){
    if(e.key!=='Tab') return;
    const focusable = modal.querySelectorAll('button, [href], input, textarea, [tabindex]:not([tabindex="-1"])');
    if(focusable.length===0) return;
    const first = focusable[0]; const last = focusable[focusable.length-1];
    if(e.shiftKey && document.activeElement === first){ last.focus(); e.preventDefault(); }
    else if(!e.shiftKey && document.activeElement === last){ first.focus(); e.preventDefault(); }
  });

})();