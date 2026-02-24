(function(){
  // Small DOM helpers
  function qs(sel, ctx) { return (ctx || document).querySelector(sel); }
  function qsa(sel, ctx) { return Array.from((ctx || document).querySelectorAll(sel)); }

  // Modal logic
  var modal = qs('#guided-modal');
  var modalClose = qs('#modal-close');
  var tryNowBtn = qs('#try-now-btn');
  var tryNowCta = qs('#try-now-cta');
  var tabs = qsa('.ex-tab');
  var exercises = qsa('.exercise');
  var breathCircle = qs('#breath-circle');
  var breathStart = qs('#breath-start');
  var breathStop = qs('#breath-stop');
  var journalText = qs('#journal-text');
  var journalSave = qs('#journal-save');
  var journalClear = qs('#journal-clear');
  var intentButtons = qsa('.intent');
  var intentSet = qs('#intent-set');
  var activeIntent = null;

  function openModal(){
    modal.setAttribute('aria-hidden','false');
    document.body.style.overflow = 'hidden';
    // ensure first tab visible
    activateTab(tabs[0]);
    qs('#modal-title').focus();
  }
  function closeModal(){
    modal.setAttribute('aria-hidden','true');
    document.body.style.overflow = '';
    stopBreathing();
  }

  tryNowBtn && tryNowBtn.addEventListener('click', openModal);
  tryNowCta && tryNowCta.addEventListener('click', openModal);
  modalClose.addEventListener('click', closeModal);
  modal.addEventListener('click', function(e){ if(e.target === modal) closeModal(); });
  document.addEventListener('keydown', function(e){ if(e.key === 'Escape') closeModal(); });

  // Tabs
  tabs.forEach(function(t){ t.addEventListener('click', function(){ activateTab(t); }); });
  function activateTab(button){
    tabs.forEach(function(b){ b.classList.remove('active'); });
    exercises.forEach(function(ex){ ex.hidden = true; ex.classList.remove('ex-active'); });
    button.classList.add('active');
    var key = button.getAttribute('data-ex');
    var el = qs('#ex-' + key);
    if(el){ el.hidden = false; el.classList.add('ex-active'); }
  }

  // Breathing exercise
  var breathTimer = null; var breathRunning = false; var breathPhase = 0; // 0 inhale,1 hold,2 exhale
  function startBreathing(){
    if(breathRunning) return;
    // Respect prefers-reduced-motion
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(reduce){ qs('#breath-instruction').textContent = 'Follow slow breaths at a comfortable pace.'; breathCircle.classList.add('pulse'); breathRunning = true; return; }
    breathRunning = true;
    breathPhase = 0;
    breathCircle.classList.add('pulse');
    qs('#breath-instruction').textContent = 'Breathe: inhale for 4s, hold 2s, exhale 6s.';
    // simple cycle using intervals
    var cycle = function(){
      // loop indefinitely but update visual class (handled via CSS animation)
      breathPhase = (breathPhase + 1) % 3;
    };
    breathTimer = setInterval(cycle, 12000); // 12s per cycle
  }
  function stopBreathing(){
    if(breathTimer) { clearInterval(breathTimer); breathTimer = null; }
    breathCircle.classList.remove('pulse');
    breathRunning = false;
    qs('#breath-instruction').textContent = 'Sit comfortably. Follow the circle.';
  }
  breathStart.addEventListener('click', startBreathing);
  breathStop.addEventListener('click', stopBreathing);

  // Journaling storage
  var JOURNAL_KEY = 'aroma_journal_v1';
  journalSave.addEventListener('click', function(){
    var val = journalText.value || '';
    var entries = JSON.parse(localStorage.getItem(JOURNAL_KEY) || '[]');
    if(val.trim()){ entries.push({text:val, date: new Date().toISOString()}); localStorage.setItem(JOURNAL_KEY, JSON.stringify(entries)); journalText.value = ''; alert('Saved to your browser'); }
  });
  journalClear.addEventListener('click', function(){ if(confirm('Clear your current note?')) journalText.value = ''; });

  // Intent selection
  intentButtons.forEach(function(b){ b.addEventListener('click', function(){ intentButtons.forEach(function(x){ x.classList.remove('selected'); }); b.classList.add('selected'); activeIntent = b.textContent; }); });
  intentSet && intentSet.addEventListener('click', function(){ if(!activeIntent){ alert('Choose an intention'); return; } localStorage.setItem('aroma_intent', activeIntent); alert('Intent set: ' + activeIntent); });

  // Scroll reveal with IntersectionObserver and reduced-motion support
  var reveals = qsa('.reveal');
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(!reduceMotion && 'IntersectionObserver' in window){
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(e){ if(e.isIntersecting){ e.target.classList.add('in-view'); io.unobserve(e.target); } });
    },{root:null,rootMargin:'0px 0px -10% 0px',threshold:0.09});
    reveals.forEach(function(r){ io.observe(r); });
  } else {
    // Respect reduced motion: reveal all immediately
    reveals.forEach(function(r){ r.classList.add('in-view'); });
  }

  // Accessibility: focus trap not implemented fully, keep simple focus management
})();