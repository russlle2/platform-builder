(function(){
  // Utilities
  function qs(id){return document.getElementById(id)}
  function on(el,ev,fn){el.addEventListener(ev,fn)}

  // Modal controls
  var modal = qs('exerciseModal');
  var tryBtn = qs('tryButton');
  var tryBtn2 = qs('tryButton2');
  var closeModal = qs('closeModal');
  var cancelExercise = qs('cancelExercise');
  var startExercise = qs('startExercise');
  var stepSelector = qs('stepSelector');
  var exerciseArea = qs('exerciseArea');
  var exerciseTitle = qs('exerciseTitle');
  var selected = 'breath';

  function openModal(){
    modal.setAttribute('aria-hidden','false');
    document.body.style.overflow = 'hidden';
    // reset area
    exerciseArea.innerHTML = '<p style="color:var(--muted)">Select an option and press Start.</p>';
  }
  function close(){
    modal.setAttribute('aria-hidden','true');
    document.body.style.overflow = '';
    stopAll();
  }

  if(tryBtn) on(tryBtn,'click',openModal);
  if(tryBtn2) on(tryBtn2,'click',openModal);
  if(closeModal) on(closeModal,'click',close);
  if(cancelExercise) on(cancelExercise,'click',close);

  // step selection
  Array.from(document.querySelectorAll('#stepSelector .step')).forEach(function(btn){
    btn.addEventListener('click',function(){
      Array.from(document.querySelectorAll('#stepSelector .step')).forEach(function(b){b.classList.remove('active')});
      btn.classList.add('active');
      selected = btn.getAttribute('data-step');
    })
  });

  var runningTimer = null;
  function stopAll(){
    if(runningTimer) { clearInterval(runningTimer); runningTimer = null; }
    // clear animations
    exerciseArea.innerHTML = '';
  }

  startExercise.addEventListener('click',function(){
    stopAll();
    if(selected === 'breath') startBreathing();
    if(selected === 'journal') startJournaling();
    if(selected === 'intention') startIntention();
  });

  function startBreathing(){
    exerciseTitle.textContent = 'Guided breathing — 2 minutes';
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var container = document.createElement('div');
    container.className = 'breathing-container';
    var circle = document.createElement('div');
    circle.className = 'breathing-circle';
    circle.textContent = 'Breathe';
    container.appendChild(circle);
    exerciseArea.innerHTML = '';
    exerciseArea.appendChild(container);

    var total = 120; // seconds
    var step = 0;
    var phases = [4,6,4]; // inhale, hold, exhale secs
    var phaseNames = ['Inhale','Hold','Exhale'];
    var phaseIndex = 0;
    if(reduced){
      circle.style.transition = 'none';
    } else {
      circle.style.transition = 'transform 4s ease-in-out';
    }

    runningTimer = setInterval(function(){
      if(total<=0){ clearInterval(runningTimer); runningTimer=null; circle.textContent='Done'; return; }
      var phaseLen = phases[phaseIndex];
      var t = step % phaseLen;
      // change every phaseLen
      if(t===0){
        circle.textContent = phaseNames[phaseIndex];
        if(!reduced){
          // animate scale differently by phase
          if(phaseIndex===0) circle.style.transform = 'scale(1.15)';
          if(phaseIndex===1) circle.style.transform = 'scale(1)';
          if(phaseIndex===2) circle.style.transform = 'scale(0.85)';
        }
      }
      step++; total--;
      if(step>=phaseLen){ step=0; phaseIndex = (phaseIndex+1)%phases.length; }
    },1000);
  }

  function startJournaling(){
    exerciseTitle.textContent = 'Guided journaling — 5 minutes';
    exerciseArea.innerHTML = '';
    var prompt = document.createElement('div');
    prompt.innerHTML = '<p style="color:var(--muted)">Write for 5 minutes on: "A small moment today that I noticed and what it taught me."</p>';
    var ta = document.createElement('textarea');
    ta.rows = 8; ta.style.width = '100%'; ta.placeholder = 'Begin writing...';
    exerciseArea.appendChild(prompt);
    exerciseArea.appendChild(ta);

    var total = 300;
    var timerBar = document.createElement('div');
    timerBar.style.height='6px'; timerBar.style.background='rgba(0,0,0,0.06)'; timerBar.style.marginTop='10px';
    var inner = document.createElement('div'); inner.style.height='100%'; inner.style.width='100%'; inner.style.background='linear-gradient(90deg,var(--accent),var(--accent-2))'; inner.style.transition='width 1s linear';
    timerBar.appendChild(inner);
    exerciseArea.appendChild(timerBar);

    runningTimer = setInterval(function(){
      total--; if(total<=0){ clearInterval(runningTimer); runningTimer=null; inner.style.width='0%'; return; }
      inner.style.width = ((total/300)*100)+'%';
    },1000);
  }

  function startIntention(){
    exerciseTitle.textContent = 'Intention setting — 3 prompts';
    exerciseArea.innerHTML = '';
    var prompts = [
      'Name one small kindness you can offer yourself today.',
      'What do you most want to invite into your next hour?',
      'Choose a simple action that aligns with that intention.'
    ];
    var idx = 0;
    var pEl = document.createElement('div'); pEl.style.fontSize='1.05rem'; pEl.style.textAlign='center'; pEl.style.color='var(--muted)'; pEl.textContent = prompts[idx];
    exerciseArea.appendChild(pEl);

    runningTimer = setInterval(function(){
      idx++; if(idx>=prompts.length){ clearInterval(runningTimer); runningTimer=null; pEl.textContent='All set. Hold this intention briefly.'; return; }
      pEl.textContent = prompts[idx];
    },3000);
  }

  // keyboard escape
  window.addEventListener('keydown',function(e){ if(e.key==='Escape'){ close(); } });

  // reveal on scroll implementation with prefers-reduced-motion support
  function initReveal(){
    var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var items = document.querySelectorAll('.reveal-on-scroll');
    if(prefersReduced){
      items.forEach(function(i){ i.classList.add('revealed'); });
      return;
    }

    function inView(el, offset){
      var rect = el.getBoundingClientRect();
      var h = window.innerHeight || document.documentElement.clientHeight;
      return rect.top <= h - (offset || 100);
    }

    function check(){
      items.forEach(function(i){ if(!i.classList.contains('revealed') && inView(i,120)){ i.classList.add('revealed'); } });
    }

    window.addEventListener('scroll',throttle(check,200));
    window.addEventListener('resize',throttle(check,300));
    // initial
    check();
  }

  function throttle(fn,wait){
    var time = Date.now();
    return function(){ if((time+wait-Date.now())<0){ fn(); time = Date.now(); } }
  }

  document.addEventListener('DOMContentLoaded',function(){
    initReveal();
    var y = new Date().getFullYear(); document.getElementById('year').textContent = y;
  });

})();
