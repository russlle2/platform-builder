(function(){
  'use strict';
  // Utilities
  var qs = function(s, el){ return (el||document).querySelector(s); };
  var qsa = function(s, el){ return Array.prototype.slice.call((el||document).querySelectorAll(s)); };

  // Dates for events (example schedule rule)
  var events = (function(){
    var out = [];
    var now = new Date();
    // schedule: weekly Wednesday 18:30, next 8 occurrences
    var day = 3; // Wednesday (0 Sun)
    var hour = 18, minute = 30;
    var d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute, 0, 0);
    // advance to next occurrence
    while(d.getDay() !== day || d < now){ d.setDate(d.getDate()+1); }
    for(var i=0;i<8;i++){
      out.push(new Date(d.getTime()));
      d.setDate(d.getDate()+7);
    }
    return out;
  })();

  // Populate next-event and calendar
  function renderEvents(){
    var nextCard = qs('#next-event-card');
    var inline = qs('#next-event-inline');
    var list = qs('#calendar-list');
    if(!nextCard || !list) return;
    var next = events[0];
    function fmt(dt){
      return dt.toLocaleString(undefined,{weekday:'short',month:'short',day:'numeric', hour:'numeric',minute:'2-digit'});
    }
    nextCard.innerHTML = '<strong>'+fmt(next)+'</strong><div class="muted">In studio • Gentle arrival 10 mins prior</div>';
    if(inline) inline.textContent = fmt(next);
    list.innerHTML = events.map(function(e,i){ return '<li><strong>'+fmt(e)+'</strong><div class="muted">Session '+(i+1)+'</div></li>'; }).join('');
  }

  // Guided modal: breathing / journaling / intention setting
  var modal = qs('#guided-modal');
  var guidedRoot = qs('#guided-root');
  var tryNow = qs('#try-now');
  var floatingTry = qs('#floating-try');
  var closeBtn = qs('#modal-close');

  function openModal(){
    modal.setAttribute('aria-hidden','false');
    document.body.style.overflow='hidden';
    buildGuided();
  }
  function closeModal(){
    modal.setAttribute('aria-hidden','true');
    document.body.style.overflow='';
    guidedRoot.innerHTML='';
  }
  if(tryNow) tryNow.addEventListener('click', openModal);
  if(floatingTry) floatingTry.addEventListener('click', openModal);
  if(closeBtn) closeBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', function(e){ if(e.target===modal) closeModal(); });

  // Build exercise UI
  function buildGuided(){
    guidedRoot.innerHTML = '';
    var tree = document.createElement('div');
    tree.className='guided';
    tree.innerHTML = '\n      <h3>Short Guided Practice — 6 minutes</h3>\n      <p class="muted">Three small steps: breathe, write, set an intention.</p>\n      <div class="step" data-step="1">\n        <h4>1 — Box breathing (2 min)</h4>\n        <div class="breath-display">\n          <div class="circle" id="breath-circle" aria-hidden="true"></div>\n          <p id="breath-text">Prepare…</p>\n        </div>\n      </div>\n      <div class="step" data-step="2">\n        <h4>2 — Two-minute reflection</h4>\n        <p class="muted">A short journal prompt to ground the breath.</p>\n        <textarea id="journal" rows="4" placeholder="What did you notice? (optional)"></textarea>\n      </div>\n      <div class="step" data-step="3">\n        <h4>3 — Set an intention</h4>\n        <p class="muted">A short phrase to carry forward.</p>\n        <input id="intention" type="text" placeholder="e.g., walk slowly, answer one email mindfully">\n      </div>\n      <div class="guided-actions">\n        <button id="start-guided" class="btn primary">Begin 6-minute practice</button>\n        <button id="save-guided" class="btn ghost">Save & close</button>\n      </div>\n    ';
    guidedRoot.appendChild(tree);

    var start = qs('#start-guided');
    var save = qs('#save-guided');
    var breathText = qs('#breath-text');
    var circle = qs('#breath-circle');
    var journal = qs('#journal');
    var intention = qs('#intention');

    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function animateBreath(steps, cycleTime, onEnd){
      var i = 0; var phase = 0; // 0-inhale,1-hold,2-exhale,3-hold
      var phases = ['Inhale','Hold','Exhale','Hold'];
      var dur = cycleTime/4; // ms per phase
      circle.style.transition = reduce? 'none' : 'transform '+(dur/1000)+'s ease';
      var cnt = 0; var interval = setInterval(function(){
        breathText.textContent = phases[phase] + ' (' + ((cnt%steps)+1) + '/' + steps + ')';
        if(!reduce){
          if(phase===0) circle.style.transform = 'scale(1.18)';
          if(phase===2) circle.style.transform = 'scale(0.75)';
        }
        phase = (phase+1)%4;
        if(phase===0) cnt++;
        if(cnt>=steps){ clearInterval(interval); breathText.textContent='Completed'; if(onEnd) onEnd(); }
      }, dur);
    }

    start.addEventListener('click', function(){
      // Run: box breathing 4 cycles ~ 2 minutes, then 2 minutes reflection timer
      start.disabled=true; start.textContent='Running…';
      animateBreath(4, 30000, function(){
        // After breath complete, start short timer for journaling (2 minutes)
        var secs = 120; breathText.textContent = 'Reflection — ' + Math.ceil(secs/60) + 'min';
        var t = setInterval(function(){ secs--; breathText.textContent = 'Reflection — ' + Math.ceil(secs/60) + 'min'; if(secs<=0){ clearInterval(t); breathText.textContent='Reflection complete'; start.disabled=false; start.textContent='Done'; } },1000);
      });
    });

    save.addEventListener('click', function(){
      var j = journal.value || '';
      var it = intention.value || '';
      // Save to localStorage as a tiny journal entry
      try{
        var entries = JSON.parse(localStorage.getItem('guided_entries')||'[]');
        entries.unshift({ts:new Date().toISOString(),journal:j,intention:it});
        localStorage.setItem('guided_entries', JSON.stringify(entries.slice(0,50)));
      }catch(e){/* ignore */}
      closeModal();
    });
  }

  // Scroll reveal implementation
  function revealOnScroll(){
    var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var items = qsa('[data-reveal]');
    if(prefersReduced){ items.forEach(function(it){ it.classList.add('is-visible'); }); return; }

    var observer = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){ if(entry.isIntersecting){ entry.target.classList.add('is-visible'); observer.unobserve(entry.target); } });
    },{threshold:0.12});
    items.forEach(function(i){ observer.observe(i); });
  }

  // Set year in footer
  function setYear(){ var y = new Date().getFullYear(); var el = qs('#year'); if(el) el.textContent = y; }

  // Wire up basic events
  document.addEventListener('DOMContentLoaded', function(){
    renderEvents();
    revealOnScroll();
    setYear();
  });

  // Accessibility: close modal with escape
  document.addEventListener('keydown', function(e){ if(e.key==='Escape' && modal.getAttribute('aria-hidden')==='false'){ closeModal(); } });

})();