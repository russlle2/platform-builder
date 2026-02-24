(function(){
  // Utilities
  function qs(sel, ctx){return (ctx||document).querySelector(sel)}
  function qsa(sel, ctx){return Array.from((ctx||document).querySelectorAll(sel))}

  // Year
  var year = qs('#year'); if(year) year.textContent = new Date().getFullYear();

  // Modal logic for guided exercise
  var modal = qs('#guide-modal');
  var openBtns = [qs('#open-try'), qs('#hero-try')].filter(Boolean);
  var closeBtn = qs('#close-guide');
  var startBtn = qs('#start-guide');
  var pauseBtn = qs('#pause-guide');
  var skipBtn = qs('#skip-step');
  var guideStep = qs('#guide-step');
  var guideTimer = qs('#guide-timer');
  var journal = qs('#journal-prompt');
  var journalEntry = qs('#journal-entry');
  var saveJournal = qs('#save-journal');

  var totalSeconds = 240; // 4 minutes
  var remaining = totalSeconds;
  var timerId = null;
  var steps = [
    {label:'Settle your posture. Take three slow inhales and exhales.', duration:30},
    {label:'Soften focus. Notice any tension and let it soften.', duration:60},
    {label:'Listen to the space between tones. Breathe without forcing.', duration:90},
    {label:'Bring an intention to mind. Hold it softly.', duration:60}
  ];
  var currentStep = 0;

  function formatTime(sec){
    var m = Math.floor(sec/60).toString().padStart(2,'0');
    var s = (sec%60).toString().padStart(2,'0');
    return m+':'+s;
  }

  function openModal(){
    modal.setAttribute('aria-hidden','false');
    modal.style.display='flex';
    remaining = totalSeconds;
    currentStep = 0;
    updateUI();
    // focus start button
    startBtn && startBtn.focus();
  }
  function closeModal(){
    modal.setAttribute('aria-hidden','true');
    modal.style.display='none';
    stopTimer();
  }

  function updateUI(){
    guideTimer.textContent = formatTime(remaining);
    guideStep.textContent = steps[currentStep] ? steps[currentStep].label : 'Closing the exercise.';
    pauseBtn.disabled = !timerId;
    if(!steps[currentStep]){
      journal.hidden = false;
    }
  }

  function tick(){
    if(remaining<=0){
      advanceStep();
      return;
    }
    remaining--;
    updateUI();
  }

  function startTimer(){
    if(timerId) return;
    // respect reduced motion: if user prefers reduced motion, run minimal timing but avoid transitions
    timerId = setInterval(tick, 1000);
    updateUI();
  }
  function stopTimer(){
    clearInterval(timerId); timerId = null; updateUI();
  }

  function advanceStep(){
    // subtract current step duration from remaining and advance
    var step = steps[currentStep];
    if(step){ remaining = Math.max(0, remaining - step.duration); }
    currentStep++;
    if(currentStep < steps.length){
      // set remaining to remaining of next segments
      // compute remaining equal to sum of remain durations
      var sum = 0; for(var i=currentStep;i<steps.length;i++) sum += steps[i].duration;
      remaining = Math.max(0, Math.min(remaining, sum));
    } else {
      // finished
      remaining = 0;
      stopTimer();
      guideStep.textContent = 'Practice complete — take a moment. Would you like to note anything?';
      journal.hidden = false;
    }
    updateUI();
  }

  openBtns.forEach(function(b){ b.addEventListener('click', openModal) });
  closeBtn && closeBtn.addEventListener('click', closeModal);

  startBtn && startBtn.addEventListener('click', function(){
    // initialize remaining to full run if at start
    if(remaining<=0) remaining = totalSeconds;
    startTimer();
  });
  pauseBtn && pauseBtn.addEventListener('click', function(){ if(timerId) stopTimer(); else startTimer(); });
  skipBtn && skipBtn.addEventListener('click', function(){ advanceStep(); });
  saveJournal && saveJournal.addEventListener('click', function(){
    var text = journalEntry.value || '';
    // for now, store in localStorage as ephemeral note
    try{ localStorage.setItem('sb_journal_' + Date.now(), text); }catch(e){}
    saveJournal.textContent = 'Saved';
    setTimeout(function(){ saveJournal.textContent = 'Save'; journalEntry.value=''; },1200);
  });

  // Close modal on escape
  document.addEventListener('keydown', function(e){ if(e.key==='Escape' && modal.getAttribute('aria-hidden')==='false') closeModal(); });

  // Scroll reveal with prefers-reduced-motion support
  var prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var revealItems = qsa('.reveal');
  if(prefersReduced){
    revealItems.forEach(function(el){ el.classList.add('visible'); });
  } else if('IntersectionObserver' in window){
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){ if(entry.isIntersecting){ entry.target.classList.add('visible'); io.unobserve(entry.target); } });
    },{threshold:0.12});
    revealItems.forEach(function(el){ io.observe(el); });
  } else {
    // fallback: simple scroll listener
    function onScroll(){
      var h = window.innerHeight;
      revealItems.forEach(function(el){
        var r = el.getBoundingClientRect();
        if(r.top < h - 60){ el.classList.add('visible'); }
      });
    }
    onScroll();
    window.addEventListener('scroll', onScroll);
  }

  // Lightweight accessibility: ensure links open properly
  // No external analytics or libraries
})();