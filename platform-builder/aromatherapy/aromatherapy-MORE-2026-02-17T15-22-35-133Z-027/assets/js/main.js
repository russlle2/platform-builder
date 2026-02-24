(function(){
  // Proof Gallery rotation
  const rotator = document.querySelector('.testimonials-rotator');
  if(rotator){
    const quotes = Array.from(rotator.querySelectorAll('.testimonial'));
    let idx = 0;
    function show(i){
      quotes.forEach((q,qi)=>q.classList.toggle('active', qi===i));
    }
    show(idx);
    setInterval(()=>{ idx = (idx+1)%quotes.length; show(idx); }, 5000);
  }

  // Credibility badge tooltips
  const badges = document.querySelectorAll('.badge');
  const tooltip = document.querySelector('.tooltip');
  badges.forEach(b=>{
    function showTip(){
      const tip = b.getAttribute('data-tooltip');
      if(!tip) return;
      tooltip.textContent = tip;
      tooltip.classList.add('visible');
      tooltip.setAttribute('aria-hidden','false');
    }
    function hideTip(){
      tooltip.classList.remove('visible');
      tooltip.setAttribute('aria-hidden','true');
    }
    b.addEventListener('mouseenter', showTip);
    b.addEventListener('focus', showTip);
    b.addEventListener('mouseleave', hideTip);
    b.addEventListener('blur', hideTip);
  });

  // Pricing comparator with animated numbers
  function animateValue(el, start, end, duration){
    const startTime = performance.now();
    function step(now){
      const progress = Math.min((now - startTime)/duration,1);
      const value = Math.round(start + (end - start) * progress);
      el.textContent = value;
      if(progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  const toggleBtns = document.querySelectorAll('.toggle-btn');
  const priceCards = document.querySelectorAll('.price-card');

  function setPricing(mode){
    priceCards.forEach(card=>{
      const monthly = parseInt(card.getAttribute('data-monthly'),10) || 0;
      const pack = parseInt(card.getAttribute('data-package'),10) || 0;
      const target = mode === 'monthly' ? monthly : pack;
      const el = card.querySelector('.amount');
      const suffix = card.querySelector('.suffix');
      const current = parseInt(el.textContent,10) || 0;
      animateValue(el, current, target, 600);
      suffix.textContent = mode === 'monthly' ? '/mo' : '/pkg';
    });
  }

  toggleBtns.forEach(btn=>{
    btn.addEventListener('click', ()=>{
      toggleBtns.forEach(b=>{b.classList.toggle('active', b===btn); b.setAttribute('aria-pressed', b===btn)});
      setPricing(btn.getAttribute('data-mode'));
    });
  });

  // Initialize pricing to monthly
  const active = document.querySelector('.toggle-btn.active') || document.querySelector('.toggle-btn[data-mode="monthly"]');
  if(active) setPricing(active.getAttribute('data-mode'));

  // Accessibility: enable keyboard toggle
  toggleBtns.forEach(btn=>btn.addEventListener('keydown',(e)=>{
    if(e.key === 'ArrowRight' || e.key === 'ArrowLeft'){
      const next = e.key === 'ArrowRight' ? btn.nextElementSibling : btn.previousElementSibling;
      if(next && next.classList.contains('toggle-btn')) next.focus();
    }
  }));

})();