(function(){
  // Utility: prefers-reduced-motion
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Scroll reveal
  const reveals = document.querySelectorAll('.reveal');
  if(prefersReduced){
    reveals.forEach(r=>r.classList.add('visible'));
  } else if('IntersectionObserver' in window){
    const io = new IntersectionObserver((entries, obs)=>{
      entries.forEach(e=>{
        if(e.isIntersecting){
          const el = e.target;
          const delay = parseInt(el.getAttribute('data-delay')||0,10);
          setTimeout(()=>el.classList.add('visible'), delay);
          obs.unobserve(el);
        }
      });
    },{threshold:0.12});
    reveals.forEach(r=>io.observe(r));
  } else {
    // fallback
    reveals.forEach(r=>r.classList.add('visible'));
  }

  // Modal and guided exercises
  const modal = document.getElementById('exerciseModal');
  const tryBtns = [document.getElementById('tryBtn'), document.getElementById('tryBtn2')];
  const closeBtn = document.getElementById('closeModal');
  const options = document.querySelectorAll('.modal-options .exercise');
  const exerciseArea = document.getElementById('exerciseArea');
  const modalTitle = document.getElementById('modalTitle');

  function openModal(){
    modal.setAttribute('aria-hidden','false');
    modal.style.display='flex';
    // focus management
    modal.querySelector('.exercise').focus();
  }
  function closeModalFn(){
    modal.setAttribute('aria-hidden','true');
    modal.style.display='none';
    clearInterval(window.__wc_interval);
  }
  tryBtns.forEach(b=>{if(b)b.addEventListener('click',openModal)});
  if(closeBtn) closeBtn.addEventListener('click',closeModalFn);

  // Simple helpers for timers and animation
  function runBreathing(durationSec){
    // 3-phase cycle: inhale 4s, hold 2s, exhale 6s approximated, repeat
    const total = durationSec; // seconds
    let elapsed=0;
    exerciseArea.innerHTML = '';
    const circle = document.createElement('div');
    circle.style.width='120px';circle.style.height='120px';circle.style.borderRadius='60px';circle.style.margin='12px auto';circle.style.background='radial-gradient(circle at 30% 30%, rgba(196,138,90,0.35), rgba(196,138,90,0.12))';
    const text = document.createElement('div');
    text.style.textAlign='center';text.style.marginTop='8px';text.style.fontWeight='600';
    exerciseArea.appendChild(circle);exerciseArea.appendChild(text);

    const cycle = ['Inhale','Hold','Exhale'];
    const times = [4,2,6];
    let phaseIndex=0;let phaseRemaining=times[0];
    text.textContent = cycle[phaseIndex] + ' — ' + phaseRemaining + 's';
    window.__wc_interval = setInterval(()=>{
      elapsed++;
      phaseRemaining--;
      if(phaseRemaining<=0){
        phaseIndex = (phaseIndex+1) % times.length;
        phaseRemaining = times[phaseIndex];
      }
      // scale circle
      const scale = phaseIndex===0 ? 1 + (times[0]-phaseRemaining)/times[0]*0.25 : (phaseIndex===2? 1 - (times[2]-phaseRemaining)/times[2]*0.35 : 1.25);
      circle.style.transform = 'scale(' + scale + ')';
      text.textContent = cycle[phaseIndex] + ' — ' + phaseRemaining + 's';
      if(elapsed>=total){
        clearInterval(window.__wc_interval);
        text.textContent = 'Complete — well done.';
      }
    },1000);
  }

  function runJournaling(durationSec){
    exerciseArea.innerHTML='';
    const prompt = document.createElement('div');
    prompt.style.fontWeight='600';
    prompt.textContent = 'Prompt: What one small action would make today better? Write freely for a few minutes.';
    const textarea = document.createElement('textarea');
    textarea.style.width='100%';textarea.style.minHeight='120px';textarea.style.marginTop='8px';
    const timer = document.createElement('div');
    timer.style.marginTop='6px';
    exerciseArea.appendChild(prompt);exerciseArea.appendChild(textarea);exerciseArea.appendChild(timer);

    let remaining = durationSec;
    timer.textContent = 'Time left: ' + remaining + 's';
    window.__wc_interval = setInterval(()=>{
      remaining--;
      timer.textContent = 'Time left: ' + remaining + 's';
      if(remaining<=0){
        clearInterval(window.__wc_interval);
        const saved = {text:textarea.value,at:new Date().toISOString()};
        try{ localStorage.setItem('wc_journal',JSON.stringify(saved)); }catch(e){}
        timer.textContent = 'Session complete — saved to local device.';
      }
    },1000);
  }

  function runIntention(durationSec){
    exerciseArea.innerHTML='';
    const title = document.createElement('div');
    title.textContent='Set one intention and anchor to a cue.';title.style.fontWeight='700';
    const input = document.createElement('input');input.style.width='100%';input.style.marginTop='8px';input.placeholder='My intention...';
    const helper = document.createElement('div');helper.style.marginTop='6px';
    exerciseArea.appendChild(title);exerciseArea.appendChild(input);exerciseArea.appendChild(helper);

    let remaining = durationSec;
    helper.textContent = 'Time left: ' + remaining + 's';
    window.__wc_interval = setInterval(()=>{
      remaining--;
      helper.textContent = 'Time left: ' + remaining + 's';
      if(remaining<=0){
        clearInterval(window.__wc_interval);
        const intention = input.value || 'No text entered';
        try{ localStorage.setItem('wc_intention',JSON.stringify({text:intention,at:new Date().toISOString()})); }catch(e){}
        helper.textContent = 'Intention saved.';
      }
    },1000);
  }

  options.forEach(opt=>opt.addEventListener('click',function(){
    const type = this.getAttribute('data-type');
    modalTitle.textContent = this.textContent;
    if(window.__wc_interval) clearInterval(window.__wc_interval);
    if(type==='breath'){ runBreathing(180); }
    if(type==='journaling'){ runJournaling(180); }
    if(type==='intention'){ runIntention(120); }
  }));

  // Close on outside click
  modal.addEventListener('click', (e)=>{
    if(e.target===modal) closeModalFn();
  });

  // Keyboard: Esc to close
  document.addEventListener('keydown', (e)=>{
    if(e.key==='Escape') closeModalFn();
  });
})();