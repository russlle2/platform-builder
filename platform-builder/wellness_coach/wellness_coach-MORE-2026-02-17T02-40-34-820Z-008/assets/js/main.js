// Main JS: guided exercise modal + scroll reveal with prefers-reduced-motion
(function(){
  // Utilities
  function qs(sel, ctx){return (ctx||document).querySelector(sel)}
  function qsa(sel, ctx){return Array.from((ctx||document).querySelectorAll(sel))}

  // Year injection
  qs('#year').textContent = new Date().getFullYear();

  // Modal handling
  var modal = qs('#exerciseModal');
  var modalTitle = qs('#modalTitle');
  var exerciseArea = qs('#exerciseArea');
  var tryBtn = qs('#tryExercise');
  var closeBtn = qs('#closeModal');

  function openModal(){
    modal.setAttribute('aria-hidden','false');
    // focus first actionable element
    var btn = modal.querySelector('.ex-btn');
    if(btn) btn.focus();
  }
  function closeModal(){
    modal.setAttribute('aria-hidden','true');
    tryBtn.focus();
    exerciseArea.innerHTML = '';
    // stop any running animations/timeouts
    clearState();
  }

  tryBtn.addEventListener('click', openModal);
  closeBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', function(e){ if(e.target===modal) closeModal(); });
  document.addEventListener('keydown', function(e){ if(e.key==='Escape' && modal.getAttribute('aria-hidden')==='false'){ closeModal(); } });

  // Guided exercises
  var state = { timers:[] };
  function clearState(){ state.timers.forEach(clearTimeout); state.timers=[]; }

  modal.addEventListener('click', function(e){
    var btn = e.target.closest('.ex-btn');
    if(!btn) return;
    var type = btn.getAttribute('data-type');
    startExercise(type);
  });

  function startExercise(type){
    clearState();
    exerciseArea.innerHTML = '';
    if(type==='breathing') startBreathing();
    else if(type==='journaling') startJournaling();
    else if(type==='intention') startIntention();
  }

  // 1) Guided Breathing
  function startBreathing(){
    modalTitle.textContent = 'Guided Breathing — 2 minutes';
    var wrap = document.createElement('div');
    wrap.innerHTML = '<div class="breath-circle" aria-hidden="true">Breathe</div><p class="center">Follow the circle: inhale for 4s, hold 2s, exhale 6s. Repeat until the cue ends.</p><div class="timer" aria-live="polite">120</div>';
    exerciseArea.appendChild(wrap);
    var timerEl = wrap.querySelector('.timer');
    var circle = wrap.querySelector('.breath-circle');
    var seconds = 120;
    timerEl.textContent = seconds;

    // subtle pulsing animation via JS for reduced-motion compatibility
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(!reduce){
      var phase = 0; // 0 inhale,1 hold,2 exhale
      var cycle = function(){
        phase = (phase+1)%3;
        if(phase===0){ circle.style.transform='scale(1.15)'; circle.style.opacity='1'; }
        if(phase===1){ circle.style.transform='scale(1.05)'; }
        if(phase===2){ circle.style.transform='scale(.85)'; circle.style.opacity='.9'; }
        state.timers.push(setTimeout(cycle, 1200));
      };
      cycle();
    }

    var countdown = function(){
      seconds -= 1;
      timerEl.textContent = seconds;
      if(seconds<=0){ timerEl.textContent='Done'; state.timers.forEach(clearTimeout); return; }
      state.timers.push(setTimeout(countdown,1000));
    };
    state.timers.push(setTimeout(countdown,1000));
  }

  // 2) Journaling prompt with short timer
  function startJournaling(){
    modalTitle.textContent = 'Micro‑Journaling — 3 minutes';
    var wrap = document.createElement('div');
    var prompt = 'Name one win today and one small next step you can take tomorrow.';
    wrap.innerHTML = '<p><em>Prompt:</em> '+prompt+'</p><textarea rows="6" style="width:100%;padding:.6rem;border-radius:6px;border:1px solid #eaeaea" aria-label="Journaling area"></textarea><div style="display:flex;gap:.6rem;margin-top:.6rem;align-items:center"><button class="btn primary start-journal">Start 3‑minute timer</button><div class="journal-timer"></div></div>';
    exerciseArea.appendChild(wrap);
    var start = wrap.querySelector('.start-journal');
    var timerEl = wrap.querySelector('.journal-timer');
    var text = wrap.querySelector('textarea');
    start.addEventListener('click', function(){
      var seconds = 180;
      text.focus();
      timerEl.textContent = formatTime(seconds);
      var tick = function(){
        seconds--; timerEl.textContent = formatTime(seconds);
        if(seconds<=0){ timerEl.textContent = 'Time'; return; }
        state.timers.push(setTimeout(tick,1000));
      };
      state.timers.push(setTimeout(tick,1000));
    });
  }

  function formatTime(s){ var m = Math.floor(s/60); var r = s%60; return m+':'+(r<10?('0'+r):r); }

  // 3) Intention setting
  function startIntention(){
    modalTitle.textContent = 'Set an Intention — 1 minute';
    var wrap = document.createElement('div');
    wrap.innerHTML = '<p>Choose a short intention to carry through your next hour.</p><div style="display:flex;gap:.6rem;flex-wrap:wrap"><button class="int-choice">Finish one small task</button><button class="int-choice">Protect my focus</button><button class="int-choice">Prioritize rest</button><button class="int-choice">Be present in conversations</button></div><div style="margin-top:1rem"><em id="savedInt" style="color:var(--muted)"></em></div>';
    exerciseArea.appendChild(wrap);
    wrap.addEventListener('click', function(e){
      var btn = e.target.closest('.int-choice'); if(!btn) return;
      var text = btn.textContent;
      qs('#savedInt').textContent = 'Saved intention: '+text;
      // small visual confirmation
      btn.style.background='#e8fff5'; btn.style.border='1px solid #c6f1e3';
      // hide modal after a short pause
      state.timers.push(setTimeout(closeModal,1000));
    });
  }

  // Scroll reveal logic (supports prefers-reduced-motion)
  function setupReveal(){
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var elems = qsa('.reveal');
    if(reduce){ elems.forEach(function(el){ el.classList.add('visible'); }); return; }

    if('IntersectionObserver' in window){
      var io = new IntersectionObserver(function(entries){
        entries.forEach(function(e){ if(e.isIntersecting){ e.target.classList.add('visible'); io.unobserve(e.target); } });
      },{threshold:0.12});
      elems.forEach(function(el){ io.observe(el); });
    } else {
      // fallback: reveal all
      elems.forEach(function(el){ el.classList.add('visible'); });
    }
  }

  // Initialize
  setupReveal();
})();