(function(){
  // Sound preference mixer: maps level -> recommended programs
  const programs = {
    gentle: [
      {title:'Drift Suite — Gentle Arrival',duration:'50 min',price:'$28'},
      {title:'Evening Ease — Soft Layers',duration:'60 min',price:'$36'}
    ],
    medium: [
      {title:'Foundry — Mid Resonance',duration:'75 min',price:'$54'},
      {title:'Threaded Field — Mixed Textures',duration:'80 min',price:'$60'}
    ],
    intense: [
      {title:'Deep Forge — Immersive Intensive',duration:'90 min',price:'$95'},
      {title:'Core Release — Extended Immersion',duration:'120 min',price:'$140'}
    ]
  };

  // Mixer UI
  const mixer = document.getElementById('sound-mixer');
  const programCards = document.getElementById('program-cards');
  function renderPrograms(level){
    programCards.innerHTML = '';
    (programs[level]||[]).forEach(p=>{
      const el = document.createElement('div');
      el.className = 'card';
      el.innerHTML = '<strong>'+p.title+'</strong><div class="muted small">'+p.duration+' • '+p.price+'</div><div style="margin-top:8px"><a class="btn ghost" href="/book.html">Book this style</a></div>';
      programCards.appendChild(el);
    });
  }
  // initialize
  renderPrograms('gentle');
  mixer.addEventListener('click',e=>{
    const btn = e.target.closest('.mixer-btn');
    if(!btn) return;
    mixer.querySelectorAll('.mixer-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    const level = btn.getAttribute('data-level');
    renderPrograms(level);
    // subtle analytics hook (no external calls)
    console.log('mixer:set',level);
  });

  // Proof Gallery rotation
  const testimonials = Array.from(document.querySelectorAll('#testimonials .testimonial'));
  let tIndex = 0;
  function rotateTestimonials(){
    testimonials.forEach((t,i)=>t.classList.toggle('active',i===tIndex));
    tIndex = (tIndex+1) % testimonials.length;
  }
  if(testimonials.length>1){
    setInterval(rotateTestimonials,5000);
  }

  // Badges tooltips
  const badges = Array.from(document.querySelectorAll('#badges .badge'));
  let tooltipEl=null;
  function createTooltip(){
    tooltipEl = document.createElement('div');
    tooltipEl.className='tooltip';
    document.body.appendChild(tooltipEl);
  }
  function showTooltip(text,x,y){
    if(!tooltipEl) createTooltip();
    tooltipEl.textContent = text;
    tooltipEl.style.left = x + 'px';
    tooltipEl.style.top = y + 'px';
    tooltipEl.classList.add('show');
  }
  function hideTooltip(){
    if(tooltipEl) tooltipEl.classList.remove('show');
  }
  badges.forEach(b=>{
    b.addEventListener('mouseenter',e=>{
      const t = b.getAttribute('data-tooltip');
      const rect = b.getBoundingClientRect();
      showTooltip(t,rect.right+12,rect.top);
    });
    b.addEventListener('mouseleave',hideTooltip);
    b.addEventListener('focus',e=>{
      const t = b.getAttribute('data-tooltip');
      const rect = b.getBoundingClientRect();
      showTooltip(t,rect.right+12,rect.top);
    });
    b.addEventListener('blur',hideTooltip);
    // touch alternative
    b.addEventListener('click',e=>{
      const t = b.getAttribute('data-tooltip');
      const rect = b.getBoundingClientRect();
      if(tooltipEl && tooltipEl.classList.contains('show') && tooltipEl.textContent===t){
        hideTooltip();
      } else {
        showTooltip(t,rect.right+12,rect.top);
      }
    });
  });

  // Accessibility: ensure testimonials rotator announces changes
  function announceTestimonials(){
    const live = document.getElementById('testimonials-live');
    if(!live){
      const v = document.createElement('div');
      v.id='testimonials-live';
      v.setAttribute('aria-live','polite');
      v.style.position='absolute';v.style.left='-9999px';v.style.height='1px';v.style.overflow='hidden';
      document.body.appendChild(v);
      v.textContent = testimonials[0] ? testimonials[0].textContent : '';
    }
  }
  announceTestimonials();

  // Lightweight safety notice in console for hosts
  console.log('Sound modules ready — remember to surface contraindications to attendees.');
})();