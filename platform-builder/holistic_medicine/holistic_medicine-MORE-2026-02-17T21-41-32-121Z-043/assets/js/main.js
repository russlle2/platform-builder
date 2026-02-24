// Main interactive behaviors: reveal-on-scroll + guided exercise modal
(function(){
  'use strict';

  // Utilities
  function qs(sel, root){return (root||document).querySelector(sel)}
  function qsa(sel, root){return Array.from((root||document).querySelectorAll(sel))}

  // Navigation toggle for small screens
  var navToggle = qs('.nav-toggle');
  var navList = qs('#nav-list');
  if(navToggle){
    navToggle.addEventListener('click', function(){
      var expanded = this.getAttribute('aria-expanded') === 'true';
      this.setAttribute('aria-expanded', String(!expanded));
      if(navList){ navList.style.display = expanded ? 'none' : 'flex'; }
    });
  }

  // Reveal on scroll with prefers-reduced-motion support
  var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var revealEls = qsa('.reveal');

  function revealEl(el){ el.classList.add('revealed'); }

  if(prefersReduced){
    revealEls.forEach(function(el){ revealEl(el); });
  } else if('IntersectionObserver' in window){
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(en){
        if(en.isIntersecting){ revealEl(en.target); io.unobserve(en.target); }
      });
    }, {root:null,rootMargin:'0px 0px -8% 0px',threshold:0.08});
    revealEls.forEach(function(el){ io.observe(el); });
  } else {
    // fallback: reveal all on load
    window.addEventListener('load', function(){ revealEls.forEach(function(el){ revealEl(el); }); });
  }

  // Modal + Guided exercise logic
  var modal = qs('#exerciseModal');
  var tryButtons = [qs('#tryNowBtn'), qs('#tryNowBtn2')].filter(Boolean);
  var closeBtn = qs('.modal-close');
  var backdrop = qs('.modal-backdrop');
  var exerciseArea = qs('#exerciseArea');

  function openModal(){
    modal.setAttribute('aria-hidden','false');
    document.body.style.overflow = 'hidden';
    // focus the first radio
    var firstRadio = qs('input[name="exercise"]', modal);
    if(firstRadio) firstRadio.focus();
    renderExercise();
  }
  function closeModal(){
    modal.setAttribute('aria-hidden','true');
    document.body.style.overflow = '';
  }

  tryButtons.forEach(function(btn){ btn.addEventListener('click', openModal); });
  closeBtn && closeBtn.addEventListener('click', closeModal);
  backdrop && backdrop.addEventListener('click', closeModal);

  // Reusable small timer UI
  function tidyClear(el){ if(el._timer) { clearInterval(el._timer); el._timer = null; } }

  function renderExercise(){
    tidyClear(exerciseArea);
    var selected = (qs('input[name="exercise"]:checked', modal) || {}).value || 'breath';
    if(selected === 'breath') renderBreathing(exerciseArea);
    if(selected === 'journal') renderJournaling(exerciseArea);
    if(selected === 'intention') renderIntention(exerciseArea);
  }

  qsa('input[name="exercise"]', modal).forEach(function(r){ r.addEventListener('change', renderExercise); });

  // Breathing: 4-4-4 guided cycle with subtle animation
  function renderBreathing(el){
    el.innerHTML = '';
    var title = document.createElement('h4'); title.textContent = '4-4-4 breathing';
    var hint = document.createElement('p'); hint.textContent = 'Follow the ring: inhale 4s, hold 4s, exhale 4s. Repeat a few cycles.';
    var ring = document.createElement('div'); ring.className = 'breath-ring';
    var controls = document.createElement('div'); controls.className='exercise-controls';
    var startBtn = document.createElement('button'); startBtn.className='btn btn-primary'; startBtn.textContent='Start';
    var stopBtn = document.createElement('button'); stopBtn.className='btn btn-ghost'; stopBtn.textContent='Stop';
    controls.appendChild(startBtn); controls.appendChild(stopBtn);
    el.appendChild(title); el.appendChild(hint); el.appendChild(ring); el.appendChild(controls);

    var running=false, phase=0, count=0, phases=['Inhale','Hold','Exhale'];
    var label = document.createElement('div'); label.className='breath-label'; label.textContent = '';
    ring.appendChild(label);

    function tick(){
      if(!running) return;
      phase = (phase+1)%3; count++;
      label.textContent = phases[phase] + ' • 4s';
      // animate ring via css class toggle
      ring.classList.remove('inhale','hold','exhale');
      ring.classList.add(phase===0? 'inhale': phase===1? 'hold':'exhale');
    }

    startBtn.addEventListener('click', function(){
      if(running) return; running=true; phase=-1; tick();
      el._timer = setInterval(tick, 4000);
    });
    stopBtn.addEventListener('click', function(){ running=false; tidyClear(el); ring.classList.remove('inhale','hold','exhale'); label.textContent='Stopped'; });
  }

  // Journaling: prompts with optional 3-minute timer
  function renderJournaling(el){
    el.innerHTML = '';
    var title = document.createElement('h4'); title.textContent = 'Quick journaling';
    var prompt = document.createElement('p');
    var prompts = [
      'Write one thing you are grateful for today.',
      'Note a small win from this week.',
      'Describe one simple intention for tomorrow.'
    ];
    var idx = Math.floor(Math.random()*prompts.length);
    prompt.textContent = prompts[idx];
    var ta = document.createElement('textarea'); ta.rows=6; ta.placeholder='Write here...' ; ta.style.width='100%';
    var hint = document.createElement('div'); hint.style.marginTop='8px';
    var start = document.createElement('button'); start.className='btn btn-primary'; start.textContent='Start 3-minute timed write';
    var save = document.createElement('button'); save.className='btn btn-outline'; save.textContent='Save to device'; save.style.marginLeft='8px';
    hint.appendChild(start); hint.appendChild(save);
    el.appendChild(title); el.appendChild(prompt); el.appendChild(ta); el.appendChild(hint);

    var timerId=null, remaining=180;
    function updateTimer(){ start.textContent = 'Time left: '+Math.max(0,remaining)+'s'; }
    start.addEventListener('click', function(){ if(timerId) return; updateTimer(); timerId=setInterval(function(){ remaining--; updateTimer(); if(remaining<=0){ clearInterval(timerId); timerId=null; start.textContent='Done'; } },1000); });
    save.addEventListener('click', function(){ try{ var data = ta.value; localStorage.setItem('mini-journal:'+Date.now(), data); alert('Saved locally.'); }catch(e){ alert('Unable to save.'); } });
  }

  // Intention: short affirmations and store
  function renderIntention(el){
    el.innerHTML = '';
    var title = document.createElement('h4'); title.textContent = 'Set a quick intention';
    var input = document.createElement('input'); input.type='text'; input.placeholder='A short intention (eg. "Be steady today")'; input.style.width='100%'; input.style.padding='8px'; input.style.marginTop='8px';
    var save = document.createElement('button'); save.className='btn btn-primary'; save.textContent='Set intention';
    var list = document.createElement('div'); list.className='saved-intentions'; list.style.marginTop='12px';
    el.appendChild(title); el.appendChild(input); el.appendChild(save); el.appendChild(list);

    function refresh(){ list.innerHTML=''; var all = JSON.parse(localStorage.getItem('intentions')||'[]'); all.slice(-5).reverse().forEach(function(it){ var p=document.createElement('div'); p.textContent = '— ' + it; p.style.padding='6px 0'; list.appendChild(p); }); }
    save.addEventListener('click', function(){ var v = input.value && input.value.trim(); if(!v) return alert('Write a short intention.'); var arr = JSON.parse(localStorage.getItem('intentions')||'[]'); arr.push(v); localStorage.setItem('intentions', JSON.stringify(arr)); input.value=''; refresh(); });
    refresh();
  }

  // Some basic styles for the breathing ring inserted dynamically
  var ringStyles = document.createElement('style'); ringStyles.textContent = '\n.breath-ring{height:120px;border-radius:999px;border:6px solid #e6fbf9;display:flex;align-items:center;justify-content:center;margin:12px 0;transition:box-shadow 300ms}\n.breath-ring.inhale{box-shadow:0 0 0 8px rgba(86,198,184,0.12)}\n.breath-ring.hold{box-shadow:0 0 0 12px rgba(14,143,130,0.08)}\n.breath-ring.exhale{box-shadow:none;opacity:0.9}\n.breath-label{font-weight:600;color:#0c6d66}\n';
  document.head.appendChild(ringStyles);

})();
