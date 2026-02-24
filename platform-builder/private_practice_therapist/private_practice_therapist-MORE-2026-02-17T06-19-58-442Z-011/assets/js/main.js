(function(){
  // Testimonials carousel
  const testimonials = Array.from(document.querySelectorAll('.testimonial'));
  const prevBtn = document.querySelector('.testimonial-prev');
  const nextBtn = document.querySelector('.testimonial-next');
  let active = 0;
  let timer = null;

  function show(index){
    testimonials.forEach((t,i)=>{
      t.hidden = i!==index;
    });
    active = index;
  }

  function next(){
    show((active+1) % testimonials.length);
  }
  function prev(){
    show((active-1+testimonials.length) % testimonials.length);
  }

  function startAuto(){
    stopAuto();
    timer = setInterval(next,5000);
  }
  function stopAuto(){
    if(timer) clearInterval(timer); timer = null;
  }

  if(prevBtn && nextBtn){
    prevBtn.addEventListener('click',()=>{ prev(); stopAuto(); startAuto(); });
    nextBtn.addEventListener('click',()=>{ next(); stopAuto(); startAuto(); });
    const display = document.querySelector('.testimonial-display');
    display.addEventListener('mouseenter',stopAuto);
    display.addEventListener('mouseleave',startAuto);
    startAuto();
  }

  // Accordion (session boundaries)
  const accToggles = Array.from(document.querySelectorAll('.acc-toggle'));
  accToggles.forEach(toggle=>{
    toggle.addEventListener('click',()=>{
      const isExpanded = toggle.getAttribute('aria-expanded') === 'true';
      const panel = document.getElementById(toggle.getAttribute('aria-controls'));
      toggle.setAttribute('aria-expanded', String(!isExpanded));
      if(isExpanded){ panel.hidden = true; }
      else { panel.hidden = false; panel.scrollIntoView({behavior:'smooth',block:'center'}); }
    });

    // keyboard support
    toggle.addEventListener('keydown', (e)=>{
      if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); toggle.click(); }
    });
  });

  // Badges tooltips
  const badges = Array.from(document.querySelectorAll('.badge'));
  let tipEl = null;

  function showTip(text,el){
    hideTip();
    tipEl = document.createElement('div');
    tipEl.className = 'tooltip';
    tipEl.textContent = text;
    document.body.appendChild(tipEl);
    const rect = el.getBoundingClientRect();
    tipEl.style.left = (rect.right + 8) + 'px';
    tipEl.style.top = (rect.top) + 'px';
  }
  function hideTip(){ if(tipEl){ tipEl.remove(); tipEl = null; } }

  badges.forEach(b=>{
    const text = b.getAttribute('data-tooltip');
    b.tabIndex = 0;
    b.addEventListener('mouseenter', ()=> showTip(text,b));
    b.addEventListener('focus', ()=> showTip(text,b));
    b.addEventListener('mouseleave', hideTip);
    b.addEventListener('blur', hideTip);
  });

  // Accessibility: pause carousel on focus within
  const carousel = document.querySelector('.testimonials');
  if(carousel){
    carousel.addEventListener('focusin', stopAuto);
    carousel.addEventListener('focusout', startAuto);
  }

  // Respectful crisis footer interaction (no clickable resource here to encourage direct action)
  // Provide gentle reminder to call emergency services if at immediate risk.
  // Nothing to wire here intentionally to avoid implying direct triage online.

})();