(function(){
  // Pricing comparator: monthly vs package with animated numbers
  const toggles = Array.from(document.querySelectorAll('.pricing-toggle .toggle'));
  const nums = Array.from(document.querySelectorAll('.price .num'));

  function animateNumber(el, start, end, duration){
    const startTime = performance.now();
    function frame(now){
      const t = Math.min(1, (now - startTime)/duration);
      const val = Math.round(start + (end - start) * easeOutCubic(t));
      el.textContent = '$' + val;
      if(t < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }
  function easeOutCubic(t){ return 1 - Math.pow(1 - t, 3); }

  toggles.forEach(t => t.addEventListener('click', function(){
    toggles.forEach(x => x.classList.remove('active'));
    this.classList.add('active');
    const type = this.getAttribute('data-type');
    nums.forEach(n => {
      const from = Number(n.textContent.replace(/[^0-9]/g,'')) || 0;
      const to = Number(n.getAttribute(type === 'monthly' ? 'data-month' : 'data-package'));
      animateNumber(n, from, to, 550);
      // adjust suffix text
      const suffix = n.parentElement.querySelector('.suffix');
      if(suffix){
        suffix.textContent = type === 'monthly' ? '/mo' : '/pkg';
      }
    });
  }));

  // Initialize numbers (ensure formatted)
  nums.forEach(n => n.textContent = '$' + n.getAttribute('data-month'));

  // Mood-to-Method selector
  const moodButtons = Array.from(document.querySelectorAll('.mood'));
  const methodTitle = document.querySelector('#methodCard .method-title');
  const methodDesc = document.querySelector('#methodCard .method-desc');
  const methodList = document.getElementById('methodList');
  const methodCta = document.getElementById('methodCta');

  const map = {
    foggy: {
      title: 'Clarify: short mapping session',
      desc: 'A focused session to outline routines, sleep, and energy patterns with a simple follow-up plan.',
      bullets: ['15–30 minute mapping conversation','Two micro-practices to try for a week','Suggested next session: Focus Track'],
      cta: 'Book a short map'
    },
    anxious: {
      title: 'Ground: regulate then practice',
      desc: 'Tools to interrupt the worry loop, a brief practice series, and check-ins for feedback.',
      bullets: ['Guided regulation practices','Practical steps for immediate relief','Suggested next session: Essentials'],
      cta: 'Try grounding tools'
    },
    flat: {
      title: 'Activate: gentle energy work',
      desc: 'Slow activation plan with movement prompts, energy-aware pacing, and weekly adjustments.',
      bullets: ['Paced activity suggestions','Evening reflection prompts','Suggested next session: Renew Package'],
      cta: 'Start activation'
    },
    wired: {
      title: 'Slow down: rhythm and rest',
      desc: 'Strategies to reshape the day around calmer moments and meaningful breaks.',
      bullets: ['Brief breath-based resets','Timing and environment tweaks','Suggested next session: Essentials'],
      cta: 'Calm the day'
    },
    curious: {
      title: 'Explore: targeted learning',
      desc: 'A short learning track with suggested experiments and a simple measurement plan.',
      bullets: ['Micro-curriculum for a 4-week experiment','Recording prompts','Suggested next session: Focus Track'],
      cta: 'Explore a track'
    }
  };

  function updateMethod(key){
    const data = map[key];
    if(!data) return;
    // animate crossfade
    methodTitle.classList.add('fade');
    methodDesc.classList.add('fade');
    methodList.classList.add('fade');
    setTimeout(()=>{
      methodTitle.textContent = data.title;
      methodDesc.textContent = data.desc;
      methodList.innerHTML = '';
      data.bullets.forEach(b => {
        const li = document.createElement('li'); li.textContent = b; methodList.appendChild(li);
      });
      methodCta.textContent = data.cta;
      methodCta.setAttribute('href', '{{PRIMARY_CTA_URL}}');
      methodTitle.classList.remove('fade');
      methodDesc.classList.remove('fade');
      methodList.classList.remove('fade');
    }, 180);
  }

  moodButtons.forEach(b => {
    b.addEventListener('click', function(){
      moodButtons.forEach(x => x.setAttribute('aria-checked', 'false'));
      this.setAttribute('aria-checked', 'true');
      updateMethod(this.getAttribute('data-key'));
    });
    b.addEventListener('keydown', function(e){
      if(e.key === 'Enter' || e.key === ' ') this.click();
    });
  });

  // Simple progressive enhancement: if prefers-reduced-motion, reduce animations
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  if(mq.matches){
    document.documentElement.classList.add('reduced-motion');
  }

})();