// Main interactivity: modal guided practices and scroll reveal with reduced-motion support
document.addEventListener('DOMContentLoaded',function(){
  const tryBtns = document.querySelectorAll('#try-btn, #hero-try, .try-now');
  const modal = document.getElementById('practice-modal');
  const closeBtn = document.getElementById('modal-close');
  const practiceArea = document.getElementById('practice-area');
  const choices = document.querySelectorAll('.practice-choice');

  function openModal(){
    modal.removeAttribute('hidden');
    modal.focus && modal.focus();
    document.body.style.overflow = 'hidden';
    practiceArea.innerHTML = '<p class="hint">Choose a short practice to begin.</p>';
  }
  function closeModal(){
    modal.setAttribute('hidden','');
    document.body.style.overflow = '';
    clearPractice();
  }
  tryBtns.forEach(b => b && b.addEventListener('click', openModal));
  closeBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', function(e){ if(e.target === modal) closeModal(); });

  // Clear any running intervals
  let _interval = null;
  function clearPractice(){ if(_interval){ clearInterval(_interval); _interval=null;} }

  // Breathing practice: 4-6-8 style with animated circle
  function startBreathing(){
    clearPractice();
    let phase = 0; // 0 inhale,1 hold,2 exhale
    const steps = [4,2,6];
    let counter = 0;
    practiceArea.innerHTML = '';
    const circle = document.createElement('div');
    circle.className = 'practice-circle';
    circle.textContent = 'Ready';
    practiceArea.appendChild(circle);
    const msg = document.createElement('p'); practiceArea.appendChild(msg);

    function tick(){
      const total = steps[phase];
      counter++;
      circle.style.transform = phase===0 ? `scale(${1+counter/total*0.45})` : phase===2 ? `scale(${1-(counter/total*0.45)})` : `scale(1.45)`;
      const label = phase===0 ? 'Inhale' : phase===1 ? 'Hold' : 'Exhale';
      circle.textContent = (total-counter+1);
      msg.textContent = label + ' — ' + (total-counter+1);
      if(counter>=total){ counter=0; phase=(phase+1)%3; }
    }

    // Respect reduced motion
    const rm = window.matchMedia('(prefers-reduced-motion:reduce)').matches;
    if(rm){
      circle.style.transform='none';
      circle.textContent='Follow the count';
    }
    _interval = setInterval(tick, 1000);
  }

  // Quick journaling: prompt + small textarea
  function startJournaling(){
    clearPractice();
    practiceArea.innerHTML = '';
    const prompt = document.createElement('p'); prompt.textContent = 'Prompt: What do I want to notice today? Write for 3 minutes.';
    const ta = document.createElement('textarea'); ta.rows = 6; ta.placeholder = 'A few lines...'; ta.style.width='100%'; ta.style.marginTop='8px';
    const counter = document.createElement('div'); counter.className='small hint'; counter.textContent = 'Time left: 03:00';
    practiceArea.appendChild(prompt); practiceArea.appendChild(ta); practiceArea.appendChild(counter);

    let seconds = 180;
    _interval = setInterval(()=>{
      seconds--; const mm = String(Math.floor(seconds/60)).padStart(2,'0'); const ss = String(seconds%60).padStart(2,'0');
      counter.textContent = `Time left: ${mm}:${ss}`;
      if(seconds<=0){ clearPractice(); counter.textContent='Done — you can keep writing or close the modal.'; }
    },1000);
  }

  // Intention: quick chooser with copyable short intention
  function startIntention(){
    clearPractice();
    practiceArea.innerHTML = '';
    const instructions = document.createElement('p'); instructions.textContent = 'Pick a focus and refine into a short intention.';
    const select = document.createElement('select'); select.style.width='100%';
    ['Gentle focus','Evening ease','Midday reset','Creative opening'].forEach(opt=>{
      const o = document.createElement('option'); o.value=o.textContent=opt; select.appendChild(o);
    });
    const out = document.createElement('input'); out.type='text'; out.style.width='100%'; out.style.marginTop='8px'; out.placeholder='I intend to...';
    const btn = document.createElement('button'); btn.className='btn primary'; btn.textContent='Set intention'; btn.style.marginTop='8px';
    practiceArea.appendChild(instructions); practiceArea.appendChild(select); practiceArea.appendChild(out); practiceArea.appendChild(btn);
    select.addEventListener('change', ()=>{ out.value = `I intend to ${select.value.toLowerCase()}.`; });
    btn.addEventListener('click', ()=>{
      out.select(); document.execCommand('copy');
      btn.textContent='Copied'; setTimeout(()=>btn.textContent='Set intention',1200);
    });
  }

  choices.forEach(ch=>ch.addEventListener('click',function(){
    const p = this.dataset.practice;
    if(p==='breath') startBreathing();
    if(p==='journal') startJournaling();
    if(p==='intent') startIntention();
  }));

  // Keyboard: Escape to close
  document.addEventListener('keydown',function(e){ if(e.key==='Escape' && !modal.hasAttribute('hidden')) closeModal(); });

  // Scroll reveal
  const prefersReduced = window.matchMedia('(prefers-reduced-motion:reduce)').matches;
  const reveals = document.querySelectorAll('[data-reveal]');
  if(prefersReduced){ reveals.forEach(r=>r.classList.add('is-revealed')); }
  else if('IntersectionObserver' in window){
    const io = new IntersectionObserver((entries,observer)=>{
      entries.forEach(entry=>{
        if(entry.isIntersecting){ entry.target.classList.add('is-revealed'); observer.unobserve(entry.target); }
      });
    },{threshold:0.12});
    reveals.forEach(r=>io.observe(r));
  } else { reveals.forEach(r=>r.classList.add('is-revealed')); }

});