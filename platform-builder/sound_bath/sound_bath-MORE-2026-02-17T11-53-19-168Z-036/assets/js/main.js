// Main JS: guided exercise modal & reveal-on-scroll & simple events module
(function(){
  // Utility: prefers reduced motion
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Scroll-triggered reveal
  function setupReveal(){
    var els = document.querySelectorAll('[data-reveal]');
    if(reduced){
      els.forEach(function(el){el.classList.add('visible');});
      return;
    }
    var obs = new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if(e.isIntersecting){
          e.target.classList.add('visible');
          obs.unobserve(e.target);
        }
      });
    },{threshold:0.12});
    els.forEach(function(el){obs.observe(el);});
  }
  // Guided exercise modal
  var tryBtn = document.getElementById('tryNowBtn');
  var modal = document.getElementById('exerciseModal');
  var closeBtn = document.getElementById('exerciseClose');
  var cancelBtn = document.getElementById('exerciseCancel');
  var startBtn = document.getElementById('exerciseStart');
  var options = document.querySelectorAll('.exercise-option');
  var selectedMode = 'breath';
  var exerciseArea = document.getElementById('exerciseArea');

  function openModal(){
    modal.setAttribute('aria-hidden','false');
    // Focus management
    modal.querySelector('.modal-shell').focus();
  }
  function closeModal(){
    modal.setAttribute('aria-hidden','true');
    tryBtn.focus();
    exerciseArea.innerHTML = '';
  }
  if(tryBtn){tryBtn.addEventListener('click',openModal)}
  if(closeBtn){closeBtn.addEventListener('click',closeModal)}
  if(cancelBtn){cancelBtn.addEventListener('click',closeModal)}

  options.forEach(function(opt){
    opt.addEventListener('click',function(){
      options.forEach(function(o){o.classList.remove('active')});
      opt.classList.add('active');
      selectedMode = opt.getAttribute('data-mode');
    });
  });

  function breathingSequence(){
    var steps = [];
    // 2 minute gentle cycle: 4s inhale, 6s exhale, 3 rounds
    for(var i=0;i<3;i++){
      steps.push({text:'Breathe in — slow (4s)',dur:4000});
      steps.push({text:'Breathe out — slow (6s)',dur:6000});
    }
    return runSteps(steps,3000);
  }

  function journalingSequence(){
    var prompts = [
      'What is one small need I have right now?',
      'What felt heavy today that I can set down?',
      'Name one thing I can do to be kinder to myself tomorrow.'
    ];
    var i=0;
    exerciseArea.innerHTML = '<ol>' + prompts.map(function(p){return '<li>'+escapeHtml(p)+'</li>';}).join('') + '</ol>';
    // no timers; let user reflect; return resolved promise
    return Promise.resolve();
  }

  function intentionSequence(){
    var steps = [
      {text:'Settle into a comfortable seat. Close your eyes if safe.',dur:3000},
      {text:'Bring to mind one intention that feels honest and simple.',dur:5000},
      {text:'Repeat it silently three times. Hold the tone.',dur:4000},
      {text:'Open your eyes and keep the intention with you.',dur:2000}
    ];
    return runSteps(steps,5000);
  }

  function escapeHtml(str){return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}

  function runSteps(steps,finalPause){
    exerciseArea.innerHTML = '<div class="running"></div>';
    var container = exerciseArea.querySelector('.running');
    var idx = 0;
    return new Promise(function(resolve){
      function next(){
        if(idx>=steps.length){
          container.textContent = 'Complete.';
          setTimeout(resolve, finalPause||1200);
          return;
        }
        var s = steps[idx++];
        container.textContent = s.text;
        setTimeout(next, s.dur);
      }
      next();
    });
  }

  startBtn.addEventListener('click',function(){
    startBtn.disabled = true;
    exerciseArea.innerHTML = '';
    var promise;
    if(selectedMode==='breath'){exerciseArea.innerHTML = ''; promise = breathingSequence();}
    else if(selectedMode==='journal'){promise = journalingSequence();}
    else {promise = intentionSequence();}
    promise.then(function(){startBtn.disabled=false});
  });

  // Simple diagnostic choices
  var choices = document.querySelectorAll('.choice');
  var diag = document.getElementById('diagnosticResult');
  choices.forEach(function(b){b.addEventListener('click',function(){
    var c = b.getAttribute('data-choice');
    if(c==='reset'){
      diag.textContent = 'Recommended: Community Series for a full transition and a short one-on-one if you need a focused check-in.';
    } else if(c==='focus'){
      diag.textContent = 'Recommended: Focused Session to anchor attention and create a practical practice plan.';
    } else if(c==='sleep'){
      diag.textContent = 'Recommended: A late-evening short gathering or private session with emphasis on soft return and breathwork.';
    }
  })});

  // Next-event module & simple calendar list (mock data)
  var events = [
    {id:1,title:'Evening Short-Form',date:'2026-03-01T19:00:00',location:'Studio A',excerpt:'A 50-minute group shape—arrive 10 minutes early.'},
    {id:2,title:'Midday Pause',date:'2026-03-05T12:30:00',location:'Studio B',excerpt:'A quick restorative practice for the workday.'},
    {id:3,title:'Private Focus',date:'2026-03-06T09:00:00',location:'Private Room',excerpt:'One-on-one session focusing on intention-setting.'}
  ];
  function renderNextEvent(){
    var el = document.getElementById('nextEventContent');
    if(!el) return;
    var now = new Date();
    var next = events.find(function(e){return new Date(e.date) > now;}) || events[0];
    var d = new Date(next.date);
    el.innerHTML = '<strong>'+escapeHtml(next.title)+'</strong><div class="meta">'+d.toLocaleString()+' • '+escapeHtml(next.location)+'</div><p>'+escapeHtml(next.excerpt)+'</p><details id="calList"><summary>Full calendar</summary><ul>'+events.map(function(ev){var dd=new Date(ev.date);return '<li>'+dd.toLocaleDateString()+': '+escapeHtml(ev.title)+'</li>';}).join('')+'</ul></details>';
  }

  // keyboard: close modal on Esc
  document.addEventListener('keydown',function(e){if(e.key==='Escape'){if(modal.getAttribute('aria-hidden')==='false'){closeModal()}}});

  // init
  document.addEventListener('DOMContentLoaded',function(){setupReveal();renderNextEvent();});
})();