(function(){
  // DOM helpers
  const $ = (s, el=document) => el.querySelector(s);
  const $$ = (s, el=document) => Array.from(el.querySelectorAll(s));

  // Fill year
  const yearEl = document.getElementById('year');
  if(yearEl) yearEl.textContent = new Date().getFullYear();

  // Modal logic
  const modal = document.getElementById('guided-modal');
  const openBtns = [document.getElementById('open-guided'), document.getElementById('open-guided-2')].filter(Boolean);
  const closeBtn = document.getElementById('close-guided');
  const steps = $$('#guided-steps .step');
  let currentStep = 0;

  function openModal(){
    modal.setAttribute('aria-hidden','false');
    // show step 1
    showStep(0);
    // focus first interactive
    const btn = document.getElementById('start-breath');
    if(btn) btn.focus();
  }
  function closeModal(){
    modal.setAttribute('aria-hidden','true');
    stopBreath();
    stopJournalTimer();
  }

  openBtns.forEach(b=>b.addEventListener('click', openModal));
  if(closeBtn) closeBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', (e)=>{ if(e.target===modal) closeModal(); });

  function showStep(i){
    currentStep = i;
    steps.forEach((s,idx)=>{
      if(idx===i){ s.removeAttribute('hidden'); } else { s.setAttribute('hidden',''); }
    });
  }

  // Breathing exercise (2 minutes with slow in/out)
  const breathCircle = document.getElementById('breath-circle');
  const breathTimerEl = document.getElementById('breath-timer');
  let breathInterval=null; let breathRemaining=120; // seconds

  function formatTime(s){ const m=Math.floor(s/60); const sec=s%60; return (m<10? '0'+m : m)+":"+(sec<10? '0'+sec : sec); }

  function startBreath(){
    if(breathInterval) return;
    breathRemaining = 120;
    breathTimerEl.textContent = formatTime(breathRemaining);
    // animate circle in and out every 3s approx
    let phase=0;
    breathCircle.classList.add('animate');
    breathInterval = setInterval(()=>{
      breathRemaining -= 1;
      breathTimerEl.textContent = formatTime(breathRemaining);
      phase = (phase+1)%3;
      // pulse: toggle class to retrigger
      if(phase===0){ breathCircle.classList.toggle('animate'); }
      if(breathRemaining<=0) { stopBreath(); showStep(1); }
    },1000);
  }
  function stopBreath(){ if(breathInterval){ clearInterval(breathInterval); breathInterval=null; breathCircle.classList.remove('animate'); } }
  const startBreathBtn = document.getElementById('start-breath');
  if(startBreathBtn) startBreathBtn.addEventListener('click', startBreath);

  // Journal timer (3 minutes)
  const journalTimerEl = document.getElementById('journal-timer');
  let journalInterval=null; let journalRemaining=180;
  function startJournalTimer(){
    if(journalInterval) return;
    journalRemaining = 180;
    journalTimerEl.textContent = formatTime(journalRemaining);
    journalInterval = setInterval(()=>{
      journalRemaining -=1; journalTimerEl.textContent = formatTime(journalRemaining);
      if(journalRemaining<=0){ stopJournalTimer(); showStep(2); }
    },1000);
  }
  function stopJournalTimer(){ if(journalInterval){ clearInterval(journalInterval); journalInterval=null; } }
  const startJournalBtn = document.getElementById('start-journal');
  if(startJournalBtn) startJournalBtn.addEventListener('click', startJournalTimer);

  // Finish button
  const finishBtn = document.getElementById('finish-guided');
  if(finishBtn) finishBtn.addEventListener('click', ()=>{ closeModal(); });

  // Intent buttons (choose an intention text to prefill journal)
  $$('.intent').forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      const t = e.target.textContent.trim();
      const j = document.getElementById('journal'); if(j) j.value = t + (j.value? '\n'+j.value : '');
    })
  });

  // Keyboard accessibility: Escape closes modal
  document.addEventListener('keydown', (e)=>{ if(e.key==='Escape' && modal.getAttribute('aria-hidden')==='false'){ closeModal(); } });

  // Simple scroll reveal with prefers-reduced-motion support
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const revealEls = document.querySelectorAll('[data-reveal]');

  if(prefersReduced){
    revealEls.forEach(el=>el.classList.add('revealed'));
  } else if('IntersectionObserver' in window){
    const io = new IntersectionObserver((entries)=>{
      entries.forEach(entry=>{
        if(entry.isIntersecting){ entry.target.classList.add('revealed'); io.unobserve(entry.target); }
      });
    },{threshold:0.08});
    revealEls.forEach(el=>io.observe(el));
  } else {
    // fallback: reveal all
    revealEls.forEach(el=>el.classList.add('revealed'));
  }

})();