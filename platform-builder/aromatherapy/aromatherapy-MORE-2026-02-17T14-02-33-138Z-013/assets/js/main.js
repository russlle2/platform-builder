(function(){
  // Utility: prefers-reduced-motion
  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Scroll reveal
  const reveals = Array.from(document.querySelectorAll('.reveal'));
  function onScroll(){
    const h = window.innerHeight;
    reveals.forEach(el=>{
      if(el.classList.contains('visible')) return;
      const r = el.getBoundingClientRect();
      if(r.top < h - (h * 0.15)){
        el.classList.add('visible');
      }
    });
  }
  if(!reduced){
    onScroll();
    window.addEventListener('scroll', throttle(onScroll,120));
  } else {
    // Respect reduced motion: make all visible immediately
    reveals.forEach(el=>el.classList.add('visible'));
  }

  function throttle(fn, wait){
    let t=0; return function(){
      const now = Date.now(); if(now - t > wait){ t = now; fn(); }
    }
  }

  // Guided exercise modal
  const tryNowBtn = document.getElementById('tryNowBtn');
  const modal = document.getElementById('exerciseModal');
  const modalClose = document.getElementById('modalClose');
  const steps = Array.from(document.querySelectorAll('#exerciseContent .step'));
  let current = 0;

  function openModal(){
    modal.setAttribute('aria-hidden','false');
    document.body.style.overflow = 'hidden';
    showStep(0);
  }
  function closeModal(){
    modal.setAttribute('aria-hidden','true');
    document.body.style.overflow = '';
  }

  tryNowBtn.addEventListener('click', openModal);
  modalClose.addEventListener('click', closeModal);
  modal.addEventListener('click', e=>{ if(e.target===modal) closeModal(); });

  function showStep(i){
    current = i;
    steps.forEach((s,idx)=>{
      if(idx===i) s.hidden = false; else s.hidden = true;
    });
  }

  // Breathing exercise
  const startBreath = document.getElementById('startBreath');
  const breathVisual = document.getElementById('breathVisual');
  startBreath.addEventListener('click', ()=>{
    if(reduced){
      // Quick fallback
      alert('Take three slow breaths: inhale for 4, hold 2, exhale 6.');
      showStep(1);
      return;
    }
    startBreath.disabled = true;
    const dot = document.createElement('div'); dot.className = 'breath-dot';
    breathVisual.innerHTML = ''; breathVisual.appendChild(dot);

    // 3 cycles using timed scaling
    let cycles = 0;
    function breatheCycle(){
      if(cycles>=3){ startBreath.disabled=false; showStep(1); return; }
      // inhale (expand)
      dot.style.transform = 'scale(1.5)';
      setTimeout(()=>{
        // hold
        dot.style.transform = 'scale(1.5)';
        setTimeout(()=>{
          // exhale (shrink)
          dot.style.transform = 'scale(0.6)';
          setTimeout(()=>{ cycles++; breatheCycle(); }, 800); // exhale length
        }, 800); // hold
      }, 1200); // inhale length
    }
    breatheCycle();
  });

  // Skip to journaling
  document.getElementById('skipToJournal').addEventListener('click', ()=> showStep(1));
  document.getElementById('saveJournal').addEventListener('click', ()=>{
    const txt = document.getElementById('journal').value.trim();
    if(txt) sessionStorage.setItem('aroma.intention', txt);
    showStep(2);
  });
  document.getElementById('toIntent').addEventListener('click', ()=> showStep(2));

  // Intent selection
  Array.from(document.querySelectorAll('.intentBtn')).forEach(btn=>{
    btn.addEventListener('click', ()=>{
      sessionStorage.setItem('aroma.cue', btn.textContent);
      // gentle visual feedback
      btn.style.background = 'linear-gradient(90deg, rgba(110,76,255,0.12), rgba(110,76,255,0.04))';
    });
  });

  document.getElementById('finishExercise').addEventListener('click', ()=>{
    closeModal();
    // Show a brief confirmation in page
    flashMessage('A small intention saved. It may support attention across the day.');
  });

  function flashMessage(text){
    const el = document.createElement('div');
    el.className = 'flash'; el.textContent = text;
    Object.assign(el.style,{position:'fixed',right:'1rem',bottom:'1rem',background:'#241b3a',color:'#fff',padding:'0.6rem 0.9rem',borderRadius:'8px',boxShadow:'0 6px 18px rgba(36,27,58,0.18)'});
    document.body.appendChild(el);
    setTimeout(()=>{ el.style.opacity = '0'; el.style.transform='translateY(8px)'; },2500);
    setTimeout(()=>el.remove(),3400);
  }

  // Accessibility: close modal with Escape
  window.addEventListener('keydown', e=>{ if(e.key==='Escape' && modal.getAttribute('aria-hidden')==='false') closeModal(); });

  // Init: reveal on load for those partly visible
  document.addEventListener('DOMContentLoaded', ()=>{ if(!reduced) onScroll(); });
})();