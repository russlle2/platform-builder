(function(){
  // Testimonials and badges rotation + tooltip
  const testimonials = [
    {text: '"I finally had a plan that fit my week and my work demands.' , author: '— R. Chen'},
    {text: '"Concrete experiments helped me sleep better within a month.' , author: '— S. Patel'},
    {text: '"The team listens and then offers small, doable shifts.' , author: '— J. Morgan'}
  ];

  const rotorText = document.getElementById('testimonial-text');
  const rotorAuthor = document.getElementById('testimonial-author');
  const prevBtn = document.getElementById('rotor-prev');
  const nextBtn = document.getElementById('rotor-next');
  const dotsWrap = document.getElementById('rotor-dots');
  let idx = 0;
  let rotorTimer;

  function renderDots(){
    dotsWrap.innerHTML = '';
    testimonials.forEach((_,i)=>{
      const b = document.createElement('button');
      b.addEventListener('click', ()=>{ goTo(i); });
      if(i===0) b.style.background = '#7bd3b2';
      dotsWrap.appendChild(b);
    });
  }

  function updateRotor(){
    rotorText.textContent = testimonials[idx].text;
    rotorAuthor.textContent = testimonials[idx].author;
    Array.from(dotsWrap.children).forEach((d,i)=>{ d.style.background = i===idx? '#7bd3b2':'rgba(255,255,255,0.03)'; });
  }

  function next(){ idx = (idx+1) % testimonials.length; updateRotor(); }
  function prev(){ idx = (idx-1 + testimonials.length) % testimonials.length; updateRotor(); }
  function goTo(i){ idx = i; updateRotor(); }

  prevBtn.addEventListener('click', ()=>{ prev(); resetTimer(); });
  nextBtn.addEventListener('click', ()=>{ next(); resetTimer(); });

  function resetTimer(){ clearInterval(rotorTimer); rotorTimer = setInterval(next, 6000); }

  if(rotorText){ renderDots(); updateRotor(); rotorTimer = setInterval(next, 6000); }

  // Populate proof gallery rotor area
  const gallery = document.getElementById('gallery-rotor');
  if(gallery){
    const list = document.createElement('div');
    list.className = 'gallery-list';
    testimonials.forEach(t=>{
      const card = document.createElement('div');
      card.className = 'glass-card';
      const q = document.createElement('blockquote'); q.textContent = t.text; q.style.margin='0';
      const c = document.createElement('cite'); c.textContent = t.author; c.style.display='block'; c.style.marginTop='8px'; c.style.color='#bcdad1';
      card.appendChild(q); card.appendChild(c);
      list.appendChild(card);
    });
    gallery.appendChild(list);
  }

  // Tooltip for badges
  const tooltip = document.getElementById('tooltip');
  document.querySelectorAll('[data-tip]').forEach(el=>{
    el.addEventListener('mousemove', (e)=>{
      tooltip.style.left = (e.clientX + 12) + 'px';
      tooltip.style.top = (e.clientY + 12) + 'px';
      tooltip.textContent = el.getAttribute('data-tip');
      tooltip.style.opacity = '1';
      tooltip.style.transform = 'translateY(0)';
    });
    el.addEventListener('mouseleave', ()=>{ tooltip.style.opacity = '0'; });
  });

  // Timeline planner controls
  const ranges = document.querySelectorAll('.range-input');
  function syncRange(r){
    const target = r.dataset.target;
    const out = document.getElementById(target);
    if(out){ out.textContent = r.value; }
    // Update summary
    const weeks = document.getElementById('weeks-1').textContent;
    const sessions = document.getElementById('sessions-2').textContent;
    const checkins = document.getElementById('checkins-3').textContent;
    const sum = `Phase 1: ${weeks} weeks • Phase 2: ${sessions} sessions/month • Phase 3: ${checkins} months`;
    document.getElementById('planner-summary-text').textContent = sum;
  }
  ranges.forEach(r=>{ r.addEventListener('input', ()=>{ syncRange(r); }); syncRange(r); });

  // Simple mobile nav toggle
  const menuBtn = document.querySelector('.menu-toggle');
  const mainNav = document.querySelector('.main-nav');
  menuBtn && menuBtn.addEventListener('click', ()=>{ if(mainNav.style.display==='flex') mainNav.style.display='none'; else mainNav.style.display='flex'; });

  // Accessibility: reduce motion respect
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(prefersReduced){ clearInterval(rotorTimer); }
})();
