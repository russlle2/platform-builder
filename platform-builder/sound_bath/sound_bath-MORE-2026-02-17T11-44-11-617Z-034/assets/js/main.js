(function(){
  // Utilities
  function qs(sel, ctx){return (ctx||document).querySelector(sel)}
  function qsa(sel, ctx){return Array.from((ctx||document).querySelectorAll(sel))}

  // Year
  qs('#year').textContent = new Date().getFullYear();

  // Accessibility: prefers-reduced-motion
  var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(prefersReduced){ document.body.classList.add('reduced-motion'); }

  // Scroll-triggered reveal (IntersectionObserver, fallback)
  var revealEls = qsa('.reveal');
  if(prefersReduced){ revealEls.forEach(function(el){ el.classList.add('visible'); el.setAttribute('aria-hidden','false'); }); }
  else if('IntersectionObserver' in window){
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if(e.isIntersecting){
          e.target.classList.add('visible');
          e.target.setAttribute('aria-hidden','false');
          io.unobserve(e.target);
        }
      });
    },{threshold:0.12});
    revealEls.forEach(function(el){ io.observe(el); });
  } else { revealEls.forEach(function(el){ el.classList.add('visible'); el.setAttribute('aria-hidden','false'); }); }

  // Modal & guided exercise logic
  var tryNowBtn = qs('#tryNowBtn');
  var tryModal = qs('#tryModal');
  var closeModal = qs('#closeModal');
  var startExercise = qs('#startExercise');
  var skipToJournal = qs('#skipToJournal');
  var journalArea = qs('#journalArea');
  var saveJournal = qs('#saveJournal');
  var closeAndReturn = qs('#closeAndReturn');
  var exerciseVisual = qs('#exerciseVisual');
  var exercisePrompt = qs('#exercisePrompt');
  var journalInput = qs('#journalInput');

  function openModal(){ tryModal.setAttribute('aria-hidden','false'); tryModal.style.display='flex'; setTimeout(function(){ tryModal.style.opacity='1'; },10); document.body.style.overflow='hidden'; }
  function closeModalFn(){ tryModal.setAttribute('aria-hidden','true'); tryModal.style.opacity='0'; setTimeout(function(){ tryModal.style.display='none'; },220); document.body.style.overflow=''; stopExercise(); }

  tryNowBtn && tryNowBtn.addEventListener('click', openModal);
  closeModal && closeModal.addEventListener('click', closeModalFn);
  qs('#closeModal').addEventListener('keydown', function(e){ if(e.key==='Enter'){ closeModalFn(); }});

  // Guided exercise sequence
  var exerciseTimer = null;
  var phase = 0; // 0-waiting,1-breath,2-journal
  function stopExercise(){ if(exerciseTimer){ clearInterval(exerciseTimer); exerciseTimer=null; } phase=0; exerciseVisual.textContent=''; exercisePrompt.textContent='Get comfortable. We\'ll guide a 6-minute micro-practice: breath, short journaling, and intention setting.'; journalArea.classList.add('hidden'); }

  function runBreathCycle(durationSeconds){
    var total = durationSeconds; var start = Date.now();
    exercisePrompt.textContent = 'Follow the breathing cue. Inhale for 4, hold 2, exhale 6. Repeat.\n';
    var states = ['Inhale','Hold','Exhale'];
    var seq = [4,2,6];
    var idx = 0; var tick = 0;
    exerciseVisual.textContent = states[idx];
    exerciseTimer = setInterval(function(){
      tick++;
      if(tick>seq[idx]){ tick=1; idx=(idx+1)%seq.length; exerciseVisual.textContent = states[idx]; }
      var elapsed = Math.floor((Date.now()-start)/1000);
      if(elapsed >= total){ clearInterval(exerciseTimer); exerciseTimer=null; onBreathComplete(); }
    },1000);
  }

  function onBreathComplete(){
    phase = 2; exercisePrompt.textContent = 'Now a short space to write a single-line intention. When ready, save it.'; exerciseVisual.textContent = '🖊️'; journalArea.classList.remove('hidden'); journalInput.focus();
  }

  startExercise && startExercise.addEventListener('click', function(){
    if(prefersReduced){ exercisePrompt.textContent='Prefers reduced motion — we suggest a quiet minute of steady breath.\nInhale 3, Exhale 3 for one minute then open the journal.'; exerciseVisual.textContent='•'; journalArea.classList.remove('hidden'); journalInput.focus(); return; }
    phase = 1; // total 6 minutes => 360s; keep it shorter for web demo: 3 cycles of 90s = 270s; we'll use 6 minutes (360s) per spec
    // For the demo, run 3 minutes to keep it interactive
    var demoSeconds = 180; // 3 minutes demo
    runBreathCycle(demoSeconds);
  });

  skipToJournal && skipToJournal.addEventListener('click', function(){ journalArea.classList.remove('hidden'); journalInput.focus(); });
  saveJournal && saveJournal.addEventListener('click', function(){
    var note = journalInput.value.trim();
    if(note.length>0){
      // Store into localStorage as ephemeral memory
      try{ var list = JSON.parse(localStorage.getItem('sb_journal')||'[]'); list.unshift({note:note,time:new Date().toISOString()}); localStorage.setItem('sb_journal', JSON.stringify(list)); }
      catch(e){}
    }
    closeModalFn();
  });
  closeAndReturn && closeAndReturn.addEventListener('click', closeModalFn);

  // Keyboard: close modal on Escape
  document.addEventListener('keydown', function(e){ if(e.key==='Escape'){ if(tryModal.getAttribute('aria-hidden')==='false'){ closeModalFn(); } } });

  // Simple progressive enhancement for forms and contact links
  var ctaLinks = qsa('a[href^="mailto:"]');
  ctaLinks.forEach(function(a){ a.addEventListener('click', function(){ /* could instrument analytics here */ }); });

  // Small helper: reveal next event snippet if on index
  // (Events page will have full calendar)
  function loadNextEventSnippet(){
    // Placeholder behavior: show next date based on heuristics
    var snip = document.createElement('div'); snip.className='next-event';
    snip.innerHTML = '<strong>Next gathering:</strong> Sunday • 6–7pm — small circle in '+(('{{CITY}}') || 'your city')+' • <a href="/events.html">Reserve</a>';
    var hero = qs('#hero .container'); if(hero){ hero.appendChild(snip); }
  }
  loadNextEventSnippet();

})();