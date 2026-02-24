(function(){
  // DOM helpers
  function qs(sel, ctx){ return (ctx || document).querySelector(sel) }
  function qsa(sel, ctx){ return Array.from((ctx || document).querySelectorAll(sel)) }

  // Reveal on scroll with reduced-motion support
  function setupReveal(){
    var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var items = qsa('.reveal');
    items.forEach(function(s){
      if(prefersReduced){ s.classList.remove('reveal-hidden'); s.classList.add('reveal-visible'); return }
      s.classList.add('reveal-hidden');
    });
    if(prefersReduced) return;
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if(entry.isIntersecting){
          entry.target.classList.add('reveal-visible');
          io.unobserve(entry.target);
        }
      });
    },{threshold:0.12});
    items.forEach(function(s){ io.observe(s) });
  }

  // Modal and guided exercises
  var modal = qs('#exerciseModal');
  var exerciseArea = qs('#exerciseArea');
  var prevFocus = null;

  function openModal(){
    prevFocus = document.activeElement;
    modal.setAttribute('aria-hidden','false');
    trapFocus(modal);
    qs('#exerciseModal .modal-content').focus();
  }
  function closeModal(){
    modal.setAttribute('aria-hidden','true');
    releaseFocus();
    if(prevFocus) prevFocus.focus();
    stopBreathing();
  }

  // Focus trap (simple)
  var focusHandler = null;
  function trapFocus(container){
    var focusables = container.querySelectorAll('button,a,textarea,input,select,[tabindex]:not([tabindex="-1"])');
    focusables = Array.from(focusables).filter(function(n){ return !n.hasAttribute('disabled') });
    if(focusables.length) focusables[0].focus();
    focusHandler = function(e){
      if(e.key === 'Tab'){
        var f = focusables;
        var idx = f.indexOf(document.activeElement);
        if(e.shiftKey && idx === 0){ e.preventDefault(); f[f.length-1].focus() }
        else if(!e.shiftKey && idx === f.length-1){ e.preventDefault(); f[0].focus() }
      } else if(e.key === 'Escape'){
        closeModal();
      }
    };
    document.addEventListener('keydown', focusHandler);
  }
  function releaseFocus(){ if(focusHandler) document.removeEventListener('keydown', focusHandler) }

  // Breathing exercise
  var breathInterval = null;
  function startBreathing(){
    var cycles = 4; // approximate for a ~2 min session: shortened here
    var step = 0;
    exerciseArea.innerHTML = '';
    var wrap = document.createElement('div'); wrap.className='breathing-vis';
    var circle = document.createElement('div'); circle.className='breath-circle';
    var inner = document.createElement('div'); inner.className='inner';
    circle.appendChild(inner);
    var controls = document.createElement('div'); controls.className='breath-controls';
    var label = document.createElement('div'); label.textContent='Follow the paced breaths.';
    var counter = document.createElement('div'); counter.textContent='Cycle 0';
    controls.appendChild(label); controls.appendChild(counter);
    wrap.appendChild(circle); wrap.appendChild(controls);
    exerciseArea.appendChild(wrap);

    var times = {inhale:4000, hold:1200, exhale:5000};
    var count = 0;

    function doCycle(){
      count++; counter.textContent = 'Cycle ' + count;
      // inhale
      inner.style.transform = 'scale(1.15)';
      setTimeout(function(){
        // brief hold
        inner.style.transform = 'scale(1.12)';
        setTimeout(function(){
          // exhale
          inner.style.transform = 'scale(0.6)';
          if(count >= cycles){ clearInterval(breathInterval); breathInterval = null }
        }, times.hold);
      }, times.inhale);
    }
    // start immediately and then loop
    doCycle();
    breathInterval = setInterval(function(){ if(breathInterval) doCycle() }, times.inhale + times.hold + times.exhale);
  }
  function stopBreathing(){ if(breathInterval){ clearInterval(breathInterval); breathInterval = null } }

  // Journaling
  function startJournaling(){
    exerciseArea.innerHTML = '';
    var prompt = document.createElement('p'); prompt.textContent = 'Write for five minutes on: What matters most to you this week? Keep your pen moving without judgment.';
    var ta = document.createElement('textarea'); ta.style.width='100%'; ta.style.height='160px'; ta.placeholder='Begin writing...';
    var saveBtn = document.createElement('button'); saveBtn.className='btn'; saveBtn.textContent='Save entry';
    saveBtn.addEventListener('click', function(){
      try{ localStorage.setItem('journal_entry', ta.value); saveBtn.textContent='Saved'; setTimeout(function(){ saveBtn.textContent='Save entry' },1500) }catch(e){ }
    });
    exerciseArea.appendChild(prompt); exerciseArea.appendChild(ta); exerciseArea.appendChild(saveBtn);
  }

  // Intention
  function startIntention(){
    exerciseArea.innerHTML = '';
    var prompt = document.createElement('p'); prompt.textContent = 'Write a short, concrete intention you can try today. Be specific and kind to yourself.';
    var input = document.createElement('input'); input.type='text'; input.placeholder='My intention...'; input.style.width='100%';
    var saveBtn = document.createElement('button'); saveBtn.className='btn'; saveBtn.textContent='Set intention';
    var last = document.createElement('div'); last.style.marginTop='0.5rem';
    try{ var prev = localStorage.getItem('intention'); if(prev) last.textContent = 'Last intention: ' + prev }catch(e){}
    saveBtn.addEventListener('click', function(){ try{ localStorage.setItem('intention', input.value); last.textContent = 'Last intention: ' + input.value; saveBtn.textContent='Saved'; setTimeout(function(){ saveBtn.textContent='Set intention' },1200) }catch(e){} });
    exerciseArea.appendChild(prompt); exerciseArea.appendChild(input); exerciseArea.appendChild(saveBtn); exerciseArea.appendChild(last);
  }

  // Wire up option buttons
  function setupModalControls(){
    document.getElementById('tryNow').addEventListener('click', openModal);
    document.getElementById('tryNowInline').addEventListener('click', openModal);
    qs('#closeModal').addEventListener('click', closeModal);
    modal.addEventListener('click', function(e){ if(e.target === modal) closeModal(); });
    var opts = qsa('#exerciseModal .exercise-options button');
    opts.forEach(function(b){ b.addEventListener('click', function(){ var mode = b.getAttribute('data-mode'); if(mode==='breathing'){ startBreathing() } else if(mode==='journaling'){ startJournaling() } else if(mode==='intention'){ startIntention() } }); });
  }

  // Initialize
  document.addEventListener('DOMContentLoaded', function(){
    setupReveal();
    setupModalControls();
  });
})();