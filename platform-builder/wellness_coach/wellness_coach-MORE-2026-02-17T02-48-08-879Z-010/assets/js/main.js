(function(){
  // Utilities
  function qs(sel, ctx){return (ctx||document).querySelector(sel)}
  function qsa(sel, ctx){return Array.from((ctx||document).querySelectorAll(sel))}

  // Scroll reveal with prefers-reduced-motion support
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const revealEls = qsa('[data-reveal]');
  if(prefersReduced){
    revealEls.forEach(el=>el.classList.add('revealed'));
  } else if('IntersectionObserver' in window){
    const io = new IntersectionObserver((entries,obs)=>{
      entries.forEach(e=>{
        if(e.isIntersecting){
          e.target.classList.add('revealed');
          obs.unobserve(e.target);
        }
      })
    },{threshold:0.12});
    revealEls.forEach(el=>io.observe(el));
  } else {
    // fallback - reveal on load
    revealEls.forEach(el=>el.classList.add('revealed'));
  }

  // Modal logic
  const modal = qs('#exercise-modal');
  const tryBtn = qs('#try-btn');
  const closeBtn = qs('#modal-close');
  const startBtn = qs('#start-exercise');
  const select = qs('#exercise-select');
  const stage = qs('#exercise-stage');
  const textEl = qs('#exercise-text');
  const visual = qs('#exercise-visual');
  const pulse = qs('#pulse');
  const skipBtn = qs('#exercise-skip');

  function openModal(){
    modal.setAttribute('aria-hidden','false');
    document.body.style.overflow='hidden';
    qs('#exercise-select').focus();
  }
  function closeModal(){
    modal.setAttribute('aria-hidden','true');
    document.body.style.overflow='';
    stopExercise();
  }
  tryBtn && tryBtn.addEventListener('click',openModal);
  closeBtn && closeBtn.addEventListener('click',closeModal);
  modal && modal.addEventListener('click',function(e){if(e.target===modal)closeModal()});

  // Guided exercises
  let timerHandles = [];
  let running = false;

  function clearTimers(){timerHandles.forEach(t=>clearTimeout(t));timerHandles=[]}
  function stopExercise(){running=false;clearTimers();pulse.style.transform='scale(0.5)';pulse.style.opacity='0.9';textEl.textContent='Select an exercise and press Start.'}

  function startBreathing(){
    running=true;
    const rounds = 4; // short 4-cycle
    let i=0;
    textEl.textContent='Follow the breath: inhale — hold — exhale — rest.';
    visual.setAttribute('aria-hidden','false');
    function cycle(){
      if(!running) return;
      // animate pulse: inhale (expand), exhale (contract)
      pulse.style.transition = 'transform 2400ms cubic-bezier(.2,.8,.2,1),opacity 400ms';
      pulse.style.transform = 'scale(1.4)';
      pulse.style.opacity = '1';
      timerHandles.push(setTimeout(()=>{
        if(!running) return;
        pulse.style.transform='scale(0.6)';
        pulse.style.opacity='0.85';
      },2600));
      i++;
      if(i<rounds){
        timerHandles.push(setTimeout(cycle,5200));
      } else {
        timerHandles.push(setTimeout(()=>{
          textEl.textContent='Breathing reset complete. How did that feel?';
          running=false;
        },5200));
      }
    }
    cycle();
  }

  function startJournaling(){
    running=true;
    visual.setAttribute('aria-hidden','true');
    const prompts = [
      'Name one thing that helped you today.',
      'What drained your energy? One small tweak? ',
      'A single priority for tomorrow.',
      'One check to protect your focus.' ,
      'One small kindness for yourself.' ,
      'A short practice you can try for two days.'
    ];
    let idx=0;
    textEl.textContent=prompts[idx];
    function next(){
      idx++;
      if(idx<prompts.length){
        textEl.textContent = prompts[idx];
        timerHandles.push(setTimeout(next,7000));
      } else {
        textEl.textContent='Journaling prompts complete. Take a quick note if helpful.';
        running=false;
      }
    }
    timerHandles.push(setTimeout(next,7000));
  }

  function startIntention(){
    running=true;
    visual.setAttribute('aria-hidden','true');
    const steps = [
      'Set one clear intention for the day (one sentence).',
      'Choose a simple cue to trigger it (time/place).',
      'Pick a tiny starting action to make it real.'
    ];
    let s=0;
    textEl.textContent = steps[s];
    function nxt(){
      s++;
      if(s<steps.length){
        textEl.textContent = steps[s];
        timerHandles.push(setTimeout(nxt,6000));
      } else {
        textEl.textContent='Intention set. Keep it visible and small.';
        running=false;
      }
    }
    timerHandles.push(setTimeout(nxt,6000));
  }

  startBtn && startBtn.addEventListener('click',function(){
    clearTimers();
    running=false;
    const choice = select.value;
    textEl.textContent='Preparing...';
    if(choice==='breathing'){
      // small delay for dramatic timing
      timerHandles.push(setTimeout(startBreathing,700));
    } else if(choice==='journaling'){
      timerHandles.push(setTimeout(startJournaling,400));
    } else if(choice==='intention'){
      timerHandles.push(setTimeout(startIntention,400));
    }
  });

  skipBtn && skipBtn.addEventListener('click',function(){closeModal()});

  // Ensure modal close on Escape
  window.addEventListener('keydown',function(e){
    if(e.key==='Escape' && modal.getAttribute('aria-hidden')==='false') closeModal();
  });

  // Minimal focus trap
  modal.addEventListener('keydown',function(e){
    if(e.key==='Tab'){
      const focusables = Array.from(modal.querySelectorAll('button,select,a,textarea,input')).filter(n=>!n.disabled);
      if(focusables.length===0) return;
      const first = focusables[0];
      const last = focusables[focusables.length-1];
      if(e.shiftKey && document.activeElement===first){ e.preventDefault(); last.focus(); }
      else if(!e.shiftKey && document.activeElement===last){ e.preventDefault(); first.focus(); }
    }
  });

})();