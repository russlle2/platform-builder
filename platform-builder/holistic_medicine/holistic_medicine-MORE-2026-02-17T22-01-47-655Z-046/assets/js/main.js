(function(){
  // Proof Gallery rotation
  const tests = Array.from(document.querySelectorAll('.testimonial'));
  const prevBtn = document.getElementById('prevTest');
  const nextBtn = document.getElementById('nextTest');
  const pauseBtn = document.getElementById('pausePlay');
  let idx = 0; let interval = null; let playing = true;

  function show(i){
    tests.forEach(t=>t.classList.remove('active'));
    const safe = (i + tests.length) % tests.length;
    tests[safe].classList.add('active');
    idx = safe;
  }
  function startRot(){ interval = setInterval(()=>show(idx+1),5000); playing = true; pauseBtn.textContent = 'Pause'; }
  function stopRot(){ clearInterval(interval); interval = null; playing = false; pauseBtn.textContent = 'Play'; }
  prevBtn.addEventListener('click', ()=>{ show(idx-1); stopRot(); });
  nextBtn.addEventListener('click', ()=>{ show(idx+1); stopRot(); });
  pauseBtn.addEventListener('click', ()=>{ playing?stopRot():startRot(); });
  // keyboard for badges tooltips: toggle aria on focus handled by CSS :focus
  // Start rotation
  show(0); startRot();

  // Pricing comparator
  const toggleBtns = Array.from(document.querySelectorAll('.toggle .opt'));
  const planEls = Array.from(document.querySelectorAll('.plan-price'));
  let mode = 'monthly';

  function animateValue(elSpan, start, end, duration){
    const startTime = performance.now();
    function frame(now){
      const t = Math.min(1,(now-startTime)/duration);
      const val = Math.round(start + (end-start)*t);
      elSpan.textContent = val;
      if(t<1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  function setMode(m){
    mode = m;
    toggleBtns.forEach(b=>b.classList.toggle('active', b.dataset.mode===m));
    planEls.forEach(el=>{
      const span = el.querySelector('.number');
      const target = Number(el.dataset[m]) || 0;
      const current = Number(span.textContent.replace(/[^0-9]/g,'')) || 0;
      animateValue(span, current, target, 420);
      // update wrapper text if needed
      el.setAttribute('data-current', target);
    });
  }
  toggleBtns.forEach(b=>b.addEventListener('click', ()=>setMode(b.dataset.mode)));
  // Initialize by reading saved preference or default
  try{ const saved = localStorage.getItem('pricingMode'); if(saved) setMode(saved); else setMode('monthly'); }
  catch(e){ setMode('monthly'); }
  // Save when toggled
  toggleBtns.forEach(b=>b.addEventListener('click', ()=>{ try{ localStorage.setItem('pricingMode', b.dataset.mode); }catch(e){} }));

  // small accessibility: pause rotation on focus within gallery
  const gallery = document.getElementById('gallery');
  gallery.addEventListener('focusin', ()=>{ if(playing) stopRot(); });
  gallery.addEventListener('focusout', ()=>{ if(!playing) startRot(); });
})();