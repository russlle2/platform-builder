(function(){
  // Pricing comparator
  const toggle = document.getElementById('price-toggle');
  const priceEls = Array.from(document.querySelectorAll('.price'));
  function animatePrice(el, start, end){
    const startTime = performance.now();
    const duration = 420;
    const from = +start;
    const to = +end;
    function tick(now){
      const t = Math.min(1,(now - startTime)/duration);
      const val = Math.round(from + (to - from) * (0.5 - 0.5*Math.cos(Math.PI * t))); // ease
      el.textContent = '$' + val;
      if(t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }
  // initialize
  priceEls.forEach(el => {
    const m = el.getAttribute('data-month');
    el.textContent = '$' + m;
    el._current = +m;
  });
  toggle.addEventListener('change', () => {
    const toPackage = toggle.checked;
    priceEls.forEach(el => {
      const month = +el.getAttribute('data-month');
      const pack = +el.getAttribute('data-package');
      const target = toPackage ? pack : month;
      animatePrice(el, el._current, target);
      el._current = target;
    });
  });

  // Mood-to-Method selector logic
  const MOODS = {
    overwhelmed: {
      title: 'Short stabilization plan',
      desc: 'Begin with grounding practices and one focused session to reduce immediate pressure. A clear, limited agenda helps restore decision space.',
      cta: 'Book a stabilization session',
      href: '/book.html'
    },
    stuck: {
      title: 'Targeted orientation series',
      desc: 'A short 3–4 session arc to map patterns and try small experiments. Useful when you want directional clarity without long-term commitment.',
      cta: 'Start a focused series',
      href: '/fees.html'
    },
    anxious: {
      title: 'Skill-focused check-ins',
      desc: 'Brief sessions that teach a few practical skills to lower activation and increase choice in anxious moments.',
      cta: 'Schedule a skill session',
      href: '/book.html'
    },
    flat: {
      title: 'Routine-building circle',
      desc: 'Gentle, regular touchpoints and micro-habits to help reconnect with values and everyday pleasure.',
      cta: 'Join the support circle',
      href: '/fees.html'
    }
  };

  function setupMoodSelector(rootId, outputId, ctaId){
    const root = document.getElementById(rootId);
    if(!root) return;
    const output = document.getElementById(outputId);
    const cta = document.getElementById(ctaId);
    root.addEventListener('click', (e)=>{
      const btn = e.target.closest('button');
      if(!btn) return;
      const key = btn.getAttribute('data-key');
      const data = MOODS[key];
      if(!data) return;
      // visual active
      Array.from(root.querySelectorAll('button')).forEach(b=>b.classList.toggle('active', b===btn));
      // simple morph animation for output
      output.style.opacity = 0.15;
      setTimeout(()=>{
        output.querySelector('.approach-title')?.remove();
        const title = document.createElement('h4');
        title.className = 'approach-title';
        title.textContent = data.title;
        const desc = output.querySelector('.approach-desc') || document.createElement('p');
        desc.className = 'approach-desc';
        desc.textContent = data.desc;
        output.insertBefore(title, output.firstChild);
        if(!output.contains(desc)) output.appendChild(desc);
        cta.textContent = data.cta;
        cta.href = data.href;
        output.style.opacity = 1;
      },200);
    });
  }
  setupMoodSelector('mood-main','mood-output','mood-cta');
  setupMoodSelector('mood-mini','mood-output-mini','mood-cta-mini');

  // Mobile menu
  const mobileToggle = document.querySelector('.mobile-toggle');
  mobileToggle && mobileToggle.addEventListener('click', ()=>{
    const nav = document.querySelector('.nav');
    nav.style.display = nav.style.display === 'flex' ? 'none' : 'flex';
    nav.style.flexDirection = 'column';
  });

})();