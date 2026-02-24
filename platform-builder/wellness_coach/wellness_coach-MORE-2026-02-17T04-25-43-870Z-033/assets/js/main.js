(function(){
  'use strict';
  // Utilities
  function qs(sel, ctx){ return (ctx||document).querySelector(sel); }
  function qsa(sel, ctx){ return Array.from((ctx||document).querySelectorAll(sel)); }

  // Mobile nav toggle
  var navToggle = qs('.nav-toggle');
  var siteNav = qs('#site-nav');
  if(navToggle){
    navToggle.addEventListener('click', function(){
      var expanded = this.getAttribute('aria-expanded') === 'true';
      this.setAttribute('aria-expanded', String(!expanded));
      siteNav.style.display = expanded ? '' : 'block';
    });
  }

  // Scroll reveal with prefers-reduced-motion support
  var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var reveals = qsa('.reveal');
  if(prefersReduced){
    reveals.forEach(function(el){ el.classList.add('visible'); });
  } else if('IntersectionObserver' in window){
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(e){ if(e.isIntersecting){ e.target.classList.add('visible'); io.unobserve(e.target); }});
    },{threshold:0.12});
    reveals.forEach(function(el){ io.observe(el); });
  } else {
    // fallback
    reveals.forEach(function(el){ el.classList.add('visible'); });
  }

  // Modal and guided exercise
  var modal = qs('#guideModal');
  var tryBtn = qs('#try-now');
  var closeBtn = qs('.modal-close');
  var tabs = qsa('.guide-tabs .tab');
  var modeSections = qsa('.mode');

  function openModal(){ modal.setAttribute('aria-hidden','false'); document.body.style.overflow='hidden'; }
  function closeModal(){ modal.setAttribute('aria-hidden','true'); document.body.style.overflow=''; stopBreath(); stopJournalTimer(); }
  if(tryBtn) tryBtn.addEventListener('click', openModal);
  if(closeBtn) closeBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', function(e){ if(e.target === modal) closeModal(); });
  document.addEventListener('keydown', function(e){ if(e.key === 'Escape' && modal.getAttribute('aria-hidden')==='false'){ closeModal(); }});

  // Tabs
  tabs.forEach(function(t){ t.addEventListener('click', function(){ tabs.forEach(function(x){x.classList.remove('active');}); t.classList.add('active'); var m = t.getAttribute('data-mode'); modeSections.forEach(function(s){ s.classList.toggle('hidden', s.getAttribute('data-mode') !== m); }); }); });

  // BREATHING
  var breathStart = qs('#breath-start');
  var breathStop = qs('#breath-stop');
  var breathLen = qs('#breath-length');
  var breathCircle = qs('.breath-circle');
  var breathStatus = qs('.breath-status');
  var breathTimer = null;
  var breathPhase = 0; // 0 inhale,1 hold,2 exhale,3 hold
  var breathRunning=false;

  function setBreathVisual(ratio){ // ratio 0..1
    var scale = 0.5 + ratio*1.1; // modest scale
    breathCircle.style.transform = 'scale(' + scale + ')';
  }

  function breathStep(){
    var seg = Number(breathLen.value) || 4;
    // simple 2-phase inhale/exhale equal length
    var period = seg*1000; // ms for inhale, ms for exhale
    var half = period/1000; // using length as inhale time
    // we'll animate using intervals for clarity
  }

  function startBreath(){
    if(breathRunning) return;
    breathRunning=true;
    var cycle = Number(breathLen.value) || 4; // seconds inhale / exhale
    var step = 50; // ms
    var t=0; var phase=0; // 0 inhale,1 exhale
    setBreathVisual(0);
    breathStatus.textContent = 'Starting...';
    breathTimer = setInterval(function(){
      t+=step;
      var ratio = (t % (cycle*1000)) / (cycle*1000); // 0..1 within phase
      if(Math.floor(t/(cycle*1000)) % 2 === 0){ // inhale phase
        setBreathVisual(ratio);
        breathStatus.textContent = 'Inhale';
      } else {
        setBreathVisual(1 - ratio);
        breathStatus.textContent = 'Exhale';
      }
    }, step);
  }
  function stopBreath(){ if(breathTimer){ clearInterval(breathTimer); breathTimer=null; breathRunning=false; setBreathVisual(0); breathStatus.textContent='Stopped'; }}
  if(breathStart) breathStart.addEventListener('click', startBreath);
  if(breathStop) breathStop.addEventListener('click', stopBreath);

  // JOURNALING
  var journalStart = qs('#journal-start');
  var journalSave = qs('#journal-save');
  var journalText = qs('#journal-text');
  var journalTimerLabel = qs('.journal-timer');
  var journalLen = qs('#journal-length');
  var journalInterval = null;
  var journalRemaining = 0;

  function startJournalTimer(){ if(journalInterval) return; journalRemaining = (Number(journalLen.value)||5)*60; journalTimerLabel.textContent = formatTime(journalRemaining);
    journalInterval = setInterval(function(){ journalRemaining--; journalTimerLabel.textContent = formatTime(journalRemaining); if(journalRemaining<=0){ clearInterval(journalInterval); journalInterval=null; journalTimerLabel.textContent='Done'; }} ,1000);
  }
  function stopJournalTimer(){ if(journalInterval){ clearInterval(journalInterval); journalInterval=null; journalTimerLabel.textContent=''; }}
  function formatTime(sec){ var m=Math.floor(sec/60), s=sec%60; return String(m)+':' + (s<10?'0':'')+String(s); }
  if(journalStart) journalStart.addEventListener('click', startJournalTimer);
  if(journalSave) journalSave.addEventListener('click', function(){ var text = journalText.value.trim(); if(text.length){ try{ localStorage.setItem('quick_journal_'+Date.now(), text); journalText.value=''; journalTimerLabel.textContent='Saved'; setTimeout(function(){ journalTimerLabel.textContent=''; },1400); }catch(e){ alert('Unable to save locally'); } } else { journalTimerLabel.textContent='No text to save'; setTimeout(function(){ journalTimerLabel.textContent=''; },1200);} });

  // INTENTION
  var intentButtons = qsa('.intent');
  var intentSummary = qs('.intent-summary');
  var intentSet = qs('#intent-set');
  var chosenIntent = '';
  intentButtons.forEach(function(b){ b.addEventListener('click', function(){ intentButtons.forEach(function(x){x.classList.remove('active');}); b.classList.add('active'); chosenIntent = b.textContent; intentSummary.textContent = 'Selected: ' + chosenIntent; }); });
  if(intentSet) intentSet.addEventListener('click', function(){ if(!chosenIntent){ intentSummary.textContent = 'Pick an intention first.'; return; } try{ navigator.clipboard && navigator.clipboard.writeText(chosenIntent); intentSummary.textContent = 'Pinned: ' + chosenIntent + ' (copied)'; }catch(e){ intentSummary.textContent = 'Pinned: ' + chosenIntent; } });

  // Accessibility: focus trap simple
  modal.addEventListener('keydown', function(e){ if(e.key === 'Tab'){ var focusable = modal.querySelectorAll('button, [href], input, textarea, select'); if(focusable.length){ var first = focusable[0], last = focusable[focusable.length-1]; if(e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); } else if(!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); } } } });

  // Expose stop functions to window for safety
  window._wellnessGuide = { stopBreath: stopBreath, stopJournalTimer: stopJournalTimer };

})();