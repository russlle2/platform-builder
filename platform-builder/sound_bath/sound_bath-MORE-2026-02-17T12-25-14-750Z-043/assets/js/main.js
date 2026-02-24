(function(){
  // helper
  var $ = function(sel, ctx){ return (ctx||document).querySelector(sel); };
  var $$ = function(sel, ctx){ return Array.from((ctx||document).querySelectorAll(sel)); };

  // Modal logic
  var modal = $('#exercise-modal');
  var openBtns = [$('#try-now'), $('#try-now-2')];
  var closeBtn = $('#modal-close');
  var tabs = $$('.tab', modal);
  var modes = $$('.mode', modal);

  function openModal(){ modal.setAttribute('aria-hidden','false'); document.body.style.overflow = 'hidden'; }
  function closeModal(){ modal.setAttribute('aria-hidden','true'); document.body.style.overflow = ''; stopBreath(); }

  openBtns.forEach(function(b){ if(b) b.addEventListener('click', openModal); });
  closeBtn && closeBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', function(e){ if(e.target === modal) closeModal(); });

  // tabs
  tabs.forEach(function(t){ t.addEventListener('click', function(){ tabs.forEach(function(x){x.classList.remove('active')}); t.classList.add('active'); var mode = t.getAttribute('data-mode'); modes.forEach(function(m){ if(m.getAttribute('data-mode')===mode){ m.classList.remove('hidden'); } else { m.classList.add('hidden'); }}); }); });

  // Breathing exercise
  var breathStart = $('#breath-start');
  var breathStop = $('#breath-stop');
  var breathCircle = $('#breath-circle');
  var breathDurationSel = $('#breath-duration');
  var breathTimer = null;
  var breathPhase = 0; // 0 inhale, 1 hold, 2 exhale
  var breathRunning = false;

  function startBreath(){
    if(breathRunning) return;
    var minutes = Number(breathDurationSel.value) || 2;
    var total = minutes * 60 * 1000; // ms
    var cycle = 4000; // 4s per cycle (inhale+hold+exhale mixture)
    var cycles = Math.max(1, Math.floor(total / cycle));
    var count = 0;
    breathRunning = true;
    breathCircle.classList.add('pulse');
    breathTimer = setInterval(function(){
      count++;
      if(count>=cycles) stopBreath();
    }, cycle);
  }
  function stopBreath(){ breathRunning=false; clearInterval(breathTimer); breathTimer=null; breathCircle.classList.remove('pulse'); }
  breathStart && breathStart.addEventListener('click', startBreath);
  breathStop && breathStop.addEventListener('click', stopBreath);

  // Journaling simple timer
  var journalStart = $('#journal-start');
  var journalText = $('#journal-text');
  var journalTimer=null;
  journalStart && journalStart.addEventListener('click', function(){
    var seconds = 300; // 5 min
    var orig = journalStart.textContent;
    journalStart.disabled = true;
    journalTimer = setInterval(function(){
      seconds--;
      journalStart.textContent = 'Time left: ' + seconds + 's';
      if(seconds<=0){ clearInterval(journalTimer); journalTimer=null; journalStart.disabled=false; journalStart.textContent = orig; alert('Time is up — take a breath.'); }
    },1000);
  });
  var journalClear = $('#journal-clear'); journalClear && journalClear.addEventListener('click', function(){ journalText.value=''; });

  // Intention save
  var intentionInput = $('#intention-input');
  var intentionSave = $('#intention-save');
  var intentionDismiss = $('#intention-dismiss');
  intentionSave && intentionSave.addEventListener('click', function(){ if(!intentionInput.value) return alert('Write a short intention.'); localStorage.setItem('sound_intention', intentionInput.value); alert('Saved to your browser.'); });
  intentionDismiss && intentionDismiss.addEventListener('click', closeModal);

  // Persist saved intention to show if present
  var saved = localStorage.getItem('sound_intention'); if(saved && intentionInput) intentionInput.placeholder = saved;

  // Scroll-triggered reveal with reduced motion support
  var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var revealEls = document.querySelectorAll('[data-reveal]');
  if(prefersReduced){ revealEls.forEach(function(el){ el.classList.add('revealed'); }); }
  else if('IntersectionObserver' in window){
    var obs = new IntersectionObserver(function(entries){ entries.forEach(function(e){ if(e.isIntersecting){ e.target.classList.add('revealed'); obs.unobserve(e.target); } }); },{threshold:0.12});
    revealEls.forEach(function(el){ obs.observe(el); });
  } else { revealEls.forEach(function(el){ el.classList.add('revealed'); }); }

  // Basic keyboard accessibility for modal (escape)
  document.addEventListener('keydown', function(e){ if(e.key==='Escape' && modal.getAttribute('aria-hidden')==='false'){ closeModal(); } });

  // Small enhancement: focus trap basic
  modal.addEventListener('keydown', function(e){ if(e.key==='Tab'){ var focusable = Array.from(modal.querySelectorAll('button,a,input,textarea,select')).filter(function(n){ return n.offsetParent !== null; }); if(focusable.length){ var idx = focusable.indexOf(document.activeElement); if(e.shiftKey && idx===0){ focusable[focusable.length-1].focus(); e.preventDefault(); } else if(!e.shiftKey && idx===focusable.length-1){ focusable[0].focus(); e.preventDefault(); } } } });

  // init: ensure modal hidden
  modal.setAttribute('aria-hidden','true');
})();