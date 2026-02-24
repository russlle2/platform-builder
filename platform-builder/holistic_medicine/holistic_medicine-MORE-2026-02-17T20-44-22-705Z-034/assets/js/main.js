// Main JS: mobile menu, scroll reveal, guided exercise modal
(function(){
  'use strict';

  // Mobile menu toggle
  var toggle = document.querySelector('.mobile-toggle');
  var nav = document.querySelector('.main-nav');
  if(toggle){
    toggle.addEventListener('click', function(){
      var expanded = this.getAttribute('aria-expanded') === 'true';
      this.setAttribute('aria-expanded', String(!expanded));
      if(nav) nav.style.display = expanded ? '' : 'flex';
    });
  }

  // Scroll-triggered reveal with prefers-reduced-motion support
  var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var reveals = Array.prototype.slice.call(document.querySelectorAll('.reveal'));

  function revealAll(){
    reveals.forEach(function(el){ el.classList.add('revealed'); });
  }

  if(prefersReduced){
    // If reduced motion, reveal immediately
    revealAll();
  } else if('IntersectionObserver' in window){
    var observer = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if(entry.isIntersecting){
          entry.target.classList.add('revealed');
          observer.unobserve(entry.target);
        }
      });
    },{threshold:0.12});
    reveals.forEach(function(el){ observer.observe(el); });
  } else {
    // fallback
    revealAll();
  }

  // Guided exercise modal
  var modal = document.getElementById('exercise-modal');
  var overlay = document.getElementById('overlay');
  var tryBtn = document.getElementById('try-now');
  var closeBtn = modal && modal.querySelector('.modal-close');
  var area = document.getElementById('exercise-area');
  var titleEl = document.getElementById('exercise-title');
  var lastFocused = null;

  function openModal(){
    if(!modal) return;
    lastFocused = document.activeElement;
    modal.setAttribute('aria-hidden','false');
    overlay.setAttribute('aria-hidden','false');
    // focus first button
    var btn = modal.querySelector('.ex-btn');
    if(btn) btn.focus();
    document.body.style.overflow = 'hidden';
  }
  function closeModal(){
    if(!modal) return;
    modal.setAttribute('aria-hidden','true');
    overlay.setAttribute('aria-hidden','true');
    document.body.style.overflow = '';
    if(lastFocused) lastFocused.focus();
    stopCurrentExercise();
  }

  if(tryBtn) tryBtn.addEventListener('click', openModal);
  if(closeBtn) closeBtn.addEventListener('click', closeModal);
  if(overlay) overlay.addEventListener('click', closeModal);
  document.addEventListener('keydown', function(e){ if(e.key==='Escape') closeModal(); });

  // Exercise buttons
  var exButtons = modal ? modal.querySelectorAll('.ex-btn') : [];
  var currentTimer = null;
  var currentInterval = null;

  function stopCurrentExercise(){
    if(currentInterval) { clearInterval(currentInterval); currentInterval = null; }
    if(currentTimer) { clearTimeout(currentTimer); currentTimer = null; }
    if(area) area.innerHTML = '';
  }

  function startBreathing(){
    stopCurrentExercise();
    titleEl.textContent = 'Breathing — 2 minutes';
    var steps = [ {label:'Breathe in',secs:4},{label:'Hold',secs:4},{label:'Breathe out',secs:6} ];
    var cycles = Math.floor(120 / (4+4+6));
    var cycle = 0;
    var stepIndex = 0;
    var remaining = cycles * (4+4+6);
    area.innerHTML = '<div class="breath-box" aria-live="polite">Starting...</div>';
    var box = area.querySelector('.breath-box');
    function nextStep(){
      var s = steps[stepIndex];
      var start = Date.now();
      box.textContent = s.label + ' — ' + s.secs + 's';
      var elapsed = 0;
      currentInterval = setInterval(function(){
        elapsed = Math.floor((Date.now() - start) / 1000);
        var left = s.secs - elapsed;
        if(left <= 0){ clearInterval(currentInterval); currentInterval = null; stepIndex = (stepIndex+1) % steps.length; if(stepIndex===0) cycle++; if(cycle>=cycles){ area.innerHTML = '<div class="breath-box">Done. Notice how you feel.<\/div>'; return; } nextStep(); }
        else { box.textContent = s.label + ' — ' + left + 's'; }
      }, 250);
    }
    nextStep();
  }

  function startJournaling(){
    stopCurrentExercise();
    titleEl.textContent = 'Journaling — 5 minutes';
    area.innerHTML = '<label for="journal">Write freely for 5 minutes. This is private; saved locally.</label><textarea id="journal" rows="8" style="width:100%"></textarea><div class="journal-meta"><button id="save-journal">Save</button> <span id="timer">5:00</span></div>';
    var ta = document.getElementById('journal');
    var timerEl = document.getElementById('timer');
    var saveBtn = document.getElementById('save-journal');
    var start = Date.now();
    var total = 300; // seconds
    ta.value = localStorage.getItem('exercise_journal') || '';
    currentInterval = setInterval(function(){
      var elapsed = Math.floor((Date.now() - start)/1000);
      var left = Math.max(0, total - elapsed);
      var m = Math.floor(left/60); var s = left%60; timerEl.textContent = m+':'+(s<10?('0'+s):s);
      if(left<=0){ clearInterval(currentInterval); currentInterval=null; timerEl.textContent='Done'; }
    }, 250);
    saveBtn.addEventListener('click', function(){ localStorage.setItem('exercise_journal', ta.value); saveBtn.textContent='Saved'; setTimeout(function(){ saveBtn.textContent='Save'; },1200); });
  }

  function startIntention(){
    stopCurrentExercise();
    titleEl.textContent = 'Set a short intention';
    area.innerHTML = '<label for="intent">What would you like to carry into the next hour?<\/label><input id="intent" type="text" style="width:100%" placeholder="A small, achievable aim"><div style="margin-top:8px"><button id="save-intent">Keep this intention</button> <button id="clear-intent">Clear</button></div><div id="intent-saved" style="margin-top:8px;color:var(--muted)"></div>';
    var input = document.getElementById('intent');
    var save = document.getElementById('save-intent');
    var clear = document.getElementById('clear-intent');
    var info = document.getElementById('intent-saved');
    input.value = localStorage.getItem('exercise_intent') || '';
    save.addEventListener('click', function(){ localStorage.setItem('exercise_intent', input.value); info.textContent='Saved: "'+input.value+'"'; });
    clear.addEventListener('click', function(){ localStorage.removeItem('exercise_intent'); input.value=''; info.textContent='Cleared.'; });
  }

  function handleExerciseClick(e){
    var key = e.target && e.target.getAttribute && e.target.getAttribute('data-ex');
    if(!key) return;
    if(key==='breathing') startBreathing();
    if(key==='journaling') startJournaling();
    if(key==='intention') startIntention();
  }

  exButtons.forEach(function(b){ b.addEventListener('click', handleExerciseClick); });

  // Accessibility: trap focus within modal when open
  document.addEventListener('focus', function(e){
    if(modal && modal.getAttribute('aria-hidden')==='false'){
      if(!modal.contains(e.target)){
        e.stopPropagation();
        modal.querySelector('.ex-btn') && modal.querySelector('.ex-btn').focus();
      }
    }
  }, true);

})();
