(function(){
  // Utilities
  function qs(sel, ctx){return (ctx||document).querySelector(sel)}
  function qsa(sel, ctx){return Array.from((ctx||document).querySelectorAll(sel))}

  // Year in footer
  document.getElementById('year').textContent = new Date().getFullYear();

  // Modal logic
  var modal = qs('#exercise-modal');
  var modalClose = qs('#modal-close');
  var tryButtons = qsa('#try-now, #try-now-2, #try-now-3');
  var tabs = qsa('.modal-tabs button');
  var modes = qsa('.mode');

  function openModal(){
    modal.setAttribute('aria-hidden','false');
    // focus first tabbable
    setTimeout(function(){
      var btn = qs('.modal-tabs button'); if(btn) btn.focus();
    },100);
  }
  function closeModal(){
    modal.setAttribute('aria-hidden','true');
  }
  tryButtons.forEach(function(b){b.addEventListener('click', openModal)});
  modalClose.addEventListener('click', closeModal);
  modal.addEventListener('click', function(e){ if(e.target===modal) closeModal(); });

  // Tabs switching
  tabs.forEach(function(t){
    t.addEventListener('click', function(){
      tabs.forEach(function(x){x.setAttribute('aria-selected','false')});
      t.setAttribute('aria-selected','true');
      var mode = t.getAttribute('data-mode');
      modes.forEach(function(m){
        if(m.getAttribute('data-mode')===mode){ m.hidden=false } else { m.hidden=true }
      });
    });
  });

  // Breathing exercise: 3 rounds, 90s total pacing
  var breathStart = qs('#breath-start');
  var breathTimer = qs('#breath-timer');
  var breathSvgCircle = qs('.breath-svg circle');
  var breathInterval;
  function animateBreath(duration){
    // simple 3-phase inhale-hold-exhale loop; duration in seconds
    var total = duration; var t=0; var phases = [4,2,4]; // seconds
    var currentRound=0; var phaseIndex=0; var phaseTime=0; var rounds=3;
    clearInterval(breathInterval);
    breathTimer.textContent = total + 's';
    breathInterval = setInterval(function(){
      if(t>=total){ clearInterval(breathInterval); breathTimer.textContent='Done'; breathSvgCircle.style.transform='scale(1)'; return }
      // compute simple scale animation for inhale/exhale
      var cycle = (t % 10); // approximate
      var scale = 1 + 0.5*Math.sin((t/total)*Math.PI*2);
      breathSvgCircle.style.transform = 'scale(' + (0.9 + scale*0.2) + ')';
      t++;
      breathTimer.textContent = (total - t) + 's';
    },1000);
  }
  breathStart.addEventListener('click', function(){
    // respect reduced motion: shorter visual moves
    var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var dur = prefersReduced ? 30 : 90;
    animateBreath(dur);
  });

  // Journaling: save to localStorage
  var journalText = qs('#journal-text');
  var journalSave = qs('#journal-save');
  var journalClear = qs('#journal-clear');
  var JOURNAL_KEY = 'wc_journal_entries_v1';
  journalSave.addEventListener('click', function(){
    var val = journalText.value.trim(); if(!val) return alert('Write a line or two to save.');
    var arr = JSON.parse(localStorage.getItem(JOURNAL_KEY) || '[]');
    arr.push({text:val,ts:Date.now()});
    localStorage.setItem(JOURNAL_KEY, JSON.stringify(arr));
    journalText.value='';
    alert('Saved locally — private to your browser.');
  });
  journalClear.addEventListener('click', function(){ if(confirm('Clear your draft?')) journalText.value=''; });

  // Intention setting
  var intentButtons = qsa('.intent');
  var intentConfirm = qs('#intent-confirm');
  var intentChosen = qs('#intent-chosen');
  var picked = null;
  intentButtons.forEach(function(b){ b.addEventListener('click', function(){ intentButtons.forEach(x=>x.classList.remove('picked')); b.classList.add('picked'); picked = b.textContent; })});
  intentConfirm.addEventListener('click', function(){ if(!picked){ alert('Choose an intention first.'); return };
    intentChosen.textContent = 'Chosen: ' + picked;
    // persist a simple flag
    localStorage.setItem('wc_intent_v1', JSON.stringify({text:picked,ts:Date.now()}));
  });

  // Diagnostic form logic
  var diagForm = qs('#diag-form');
  var diagResult = qs('#diag-result');
  var diagReset = qs('#diag-reset');
  diagForm.addEventListener('submit', function(e){
    e.preventDefault();
    var fd = new FormData(diagForm);
    var score = 0; for(var v of fd.values()){ score += Number(v) }
    var tip = '';
    if(score <= 2) tip = 'Start with one tiny habit: pick the Pulse check (90 seconds midday). Try it for three days.';
    else if(score <=4) tip = 'You have anchors — add a short intention each morning and pair it with the habit you already do.';
    else tip = 'You have reliable practice. Consider a cohort to scale edits into weekly structure.';
    diagResult.textContent = tip;
  });
  diagReset.addEventListener('click', function(){ diagForm.reset(); diagResult.textContent=''; });

  // Scroll reveal with intersection observer and reduced-motion support
  var revealEls = qsa('.reveal');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(reduce){ revealEls.forEach(function(el){ el.classList.add('visible') }); }
  else if('IntersectionObserver' in window){
    var io = new IntersectionObserver(function(entries){ entries.forEach(function(ent){ if(ent.isIntersecting){ ent.target.classList.add('visible'); io.unobserve(ent.target) } }) },{threshold:0.12});
    revealEls.forEach(function(el){ io.observe(el) });
  } else {
    // fallback: on scroll check
    function check(){ revealEls.forEach(function(el){ var r = el.getBoundingClientRect(); if(r.top < window.innerHeight - 80){ el.classList.add('visible') } }); }
    window.addEventListener('scroll', check); check();
  }

  // Accessibility: trap focus inside modal when open
  document.addEventListener('focus', function(e){ if(modal.getAttribute('aria-hidden')==='false'){ if(!modal.contains(e.target)){ e.stopPropagation(); modal.querySelector('.modal-tabs button').focus(); } } }, true);

})();
