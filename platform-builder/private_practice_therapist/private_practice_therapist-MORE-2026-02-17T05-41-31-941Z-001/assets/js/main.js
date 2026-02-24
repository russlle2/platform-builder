document.addEventListener('DOMContentLoaded', function(){
  // Mood-to-Method selector
  const moodButtons = document.querySelectorAll('.mood-btn');
  const approachTitle = document.querySelector('.approach-title');
  const approachDesc = document.querySelector('.approach-desc');
  const primaryCta = document.getElementById('primaryCta');

  const moodMap = {
    overwhelmed: {
      title: 'Breathe, map, and prioritize',
      desc: 'Short, practical steps to reduce immediate pressure and build a simple pace that fits your schedule.',
      cta: 'Request a short consult'
    },
    stuck: {
      title: 'Explore blocks, set small experiments',
      desc: 'We use focused experiments to test new ways of moving forward—one step at a time.',
      cta: 'Start exploration session'
    },
    caregiver: {
      title: 'Support for caregivers',
      desc: 'Work on boundaries, resilience, and sustainable routines that protect your wellbeing while you care for others.',
      cta: 'Book a caregiver consult'
    },
    transition: {
      title: 'Structure through change',
      desc: 'Practical planning and emotional support to move through transitions with clarity and fewer surprises.',
      cta: 'Schedule a planning visit'
    }
  };

  function setActiveMood(key, btn){
    moodButtons.forEach(b => b.classList.remove('active'));
    if(btn) btn.classList.add('active');
    const m = moodMap[key];
    if(!m) return;
    // subtle morph: fade text then update
    approachTitle.style.opacity = '0';
    approachDesc.style.opacity = '0';
    primaryCta.style.opacity = '0';
    setTimeout(()=>{
      approachTitle.textContent = m.title;
      approachDesc.textContent = m.desc;
      primaryCta.textContent = m.cta;
      primaryCta.setAttribute('aria-label', m.cta);
      approachTitle.style.opacity = '1';
      approachDesc.style.opacity = '1';
      primaryCta.style.opacity = '1';
    },220);
  }

  moodButtons.forEach(btn => {
    btn.addEventListener('click', function(){
      const mood = this.dataset.mood;
      setActiveMood(mood, this);
    });
  });

  // Initialize default mood lightly
  setActiveMood('overwhelmed', document.querySelector('.mood-btn[data-mood="overwhelmed"]'));

  // Pricing comparator with animated numbers
  const toggle = document.getElementById('priceToggle');
  const priceCards = document.querySelectorAll('.card .price');

  function animateValue(el, start, end){
    const amountEl = el.querySelector('.amount');
    let startTime = null;
    const duration = 420;
    function step(timestamp){
      if(!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime)/duration, 1);
      const value = Math.round(start + (end - start) * progress);
      amountEl.textContent = value;
      amountEl.classList.add('animate');
      if(progress < 1){
        requestAnimationFrame(step);
      } else {
        setTimeout(()=> amountEl.classList.remove('animate'),120);
      }
    }
    requestAnimationFrame(step);
  }

  function updatePrices(showPackage){
    priceCards.forEach(pc => {
      const monthly = Number(pc.dataset.monthly);
      const pack = Number(pc.dataset.package);
      const target = showPackage ? pack : monthly;
      // animate from current DOM value to target
      const current = Number(pc.querySelector('.amount').textContent) || monthly;
      animateValue(pc, current, target);
      // update freq label
      const freq = pc.querySelector('.freq');
      if(showPackage){
        freq.textContent = '/session (package)';
      } else {
        freq.textContent = '/session';
      }
    });
  }

  // set initial display values from data-monthly
  priceCards.forEach(pc => {
    const amountEl = pc.querySelector('.amount');
    amountEl.textContent = pc.dataset.monthly;
  });

  toggle.addEventListener('change', function(){
    updatePrices(this.checked);
  });

  // Accessibility: allow keyboard toggling mood via arrow keys
  const moodGroup = document.querySelector('.mood-options');
  moodGroup.addEventListener('keydown', function(e){
    const active = document.activeElement;
    if(active.classList.contains('mood-btn')){
      let idx = Array.from(moodButtons).indexOf(active);
      if(e.key === 'ArrowRight' || e.key === 'ArrowDown'){
        idx = (idx + 1) % moodButtons.length; moodButtons[idx].focus();
      } else if(e.key === 'ArrowLeft' || e.key === 'ArrowUp'){
        idx = (idx - 1 + moodButtons.length) % moodButtons.length; moodButtons[idx].focus();
      }
    }
  });

});