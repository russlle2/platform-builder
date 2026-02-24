(function(){
  // Utilities
  function qs(sel, ctx){ return (ctx||document).querySelector(sel); }
  function qsa(sel, ctx){ return Array.from((ctx||document).querySelectorAll(sel)); }

  // Set current year
  qs('#year').textContent = new Date().getFullYear();

  // Nav toggle for small screens
  var navToggle = qs('.nav-toggle');
  if(navToggle){
    navToggle.addEventListener('click', function(){
      var list = qs('#nav-list');
      var expanded = this.getAttribute('aria-expanded') === 'true';
      this.setAttribute('aria-expanded', !expanded);
      list.style.display = expanded ? '' : 'flex';
    });
  }

  // Scroll-triggered reveal
  var revealEls = qsa('[data-reveal]');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function onIntersect(entries, obs){
    entries.forEach(function(e){
      if(e.isIntersecting){
        e.target.classList.add('revealed');
        obs.unobserve(e.target);
      }
    });
  }

  if('IntersectionObserver' in window && !reduce){
    var io = new IntersectionObserver(onIntersect,{threshold:0.12});
    revealEls.forEach(function(el){ io.observe(el); });
  } else {
    // reveal immediately if reduced motion or no IO
    revealEls.forEach(function(el){ el.classList.add('revealed'); });
  }

  // Guided exercise modal
  var modal = qs('#exercise-modal');
  var tryBtn = qs('#try-now');
  var closeBtn = qs('.modal-close');
  var exerciseArea = qs('#exercise-area');
  var exerciseBtns = qsa('.exercise-btn');
  var activeTimer = null;

  function openModal(){
    modal.setAttribute('aria-hidden','false');
  }
  function closeModal(){
    modal.setAttribute('aria-hidden','true');
    stopActive();
    exerciseArea.innerHTML = '';
  }
  function stopActive(){
    if(activeTimer){ clearInterval(activeTimer); activeTimer = null; }
  }

  tryBtn && tryBtn.addEventListener('click', openModal);
  closeBtn && closeBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', function(e){ if(e.target===modal) closeModal(); });

  exerciseBtns.forEach(function(btn){
    btn.addEventListener('click', function(){
      var key = this.getAttribute('data-exercise');
      startExercise(key);
    });
  });

  // Exercises
  function startExercise(key){
    stopActive();
    exerciseArea.innerHTML = ''; 
    if(key==='breathing') startBreathing();
    else if(key==='journaling') startJournaling();
    else if(key==='intention') startIntention();
  }

  // Guided Breathing: 4-4-6 pattern with simple circle animation
  function startBreathing(){
    var container = document.createElement('div');
    container.className = 'breathing';
    container.innerHTML = '<div class="circle" aria-hidden="true"></div><p id="breath-text">Get comfortable. Close your eyes if you like.</p>';
    exerciseArea.appendChild(container);

    var text = qs('#breath-text', container);
    var circle = qs('.circle', container);

    var steps = [ {label:'Breathe in',sec:4},{label:'Hold',sec:4},{label:'Exhale',sec:6} ];
    var idx = 0;
    var secLeft = steps[0].sec;
    text.textContent = steps[0].label + ' — ' + secLeft;

    // Simple accessible animations: transform scale on circle, but respect reduced-motion
    var isReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    activeTimer = setInterval(function(){
      secLeft -= 1;
      if(secLeft<=0){
        idx = (idx+1) % steps.length;
        secLeft = steps[idx].sec;
      }
      text.textContent = steps[idx].label + ' — ' + secLeft;
      if(!isReduced){
        var scale = 1 + (Math.sin((Date.now()/600) + idx) * 0.08);
        circle.style.transform = 'scale(' + (1 + ((steps[idx].label==='Breathe in')?0.25:(steps[idx].label==='Exhale')?0.75:0.55)) + ')';
      }
    },1000);
  }

  // Micro-journaling: prompt + countdown (90s)
  function startJournaling(){
    var prompts = [
      'What small wins did I notice this week?',
      'One thing I can simplify tomorrow is…',
      'Where did I spend energy that didn’t match my priorities?'
    ];
    var p = prompts[Math.floor(Math.random()*prompts.length)];
    var container = document.createElement('div');
    container.innerHTML = '<p><strong>Prompt:</strong> ' + p + '</p><p id="journal-timer">90</p><textarea placeholder="Write for 90 seconds..." rows="6" style="width:100%;margin-top:.5rem;border-radius:8px;padding:.5rem;background:#06121a;border:1px solid rgba(255,255,255,0.03);color:var(--text)"></textarea>';
    exerciseArea.appendChild(container);
    var timer = qs('#journal-timer', container);
    var t = 90;
    activeTimer = setInterval(function(){ t--; timer.textContent = t; if(t<=0){ clearInterval(activeTimer); activeTimer=null; timer.textContent='Done — take a breath.' } },1000);
  }

  // Intention setting: three affirmations with soft timer
  function startIntention(){
    var container = document.createElement('div');
    container.innerHTML = '<ol id="int-list"></ol><p id="int-timer" class="muted">20</p>';
    exerciseArea.appendChild(container);
    var list = qs('#int-list', container);
    var timer = qs('#int-timer', container);
    var intentions = ['I will choose one clear priority today.','I will protect one hour of focused effort.','I will rest with purpose tonight.'];
    var idx = 0; var t = 20;
    list.innerHTML = '<li>' + intentions[0] + '</li>';
    activeTimer = setInterval(function(){ t--; timer.textContent = t; if(t<=0){ idx++; t=20; if(idx>=intentions.length){ clearInterval(activeTimer); activeTimer=null; timer.textContent='Done — keep one intention visible.'; } else { list.innerHTML += '<li>' + intentions[idx] + '</li>'; timer.textContent = t; } } },1000);
  }

})();