document.addEventListener('DOMContentLoaded',function(){
  // Price toggle
  const monthlyBtn = document.getElementById('monthly-btn');
  const packageBtn = document.getElementById('package-btn');
  const plans = Array.from(document.querySelectorAll('.plan'));

  function animateNumber(el, start, end, duration){
    const startTime = performance.now();
    function step(now){
      const elapsed = Math.min((now - startTime)/duration,1);
      const value = Math.round(start + (end - start) * easeOutCubic(elapsed));
      el.textContent = value;
      if(elapsed < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  function easeOutCubic(t){return 1 - Math.pow(1 - t, 3)}

  function setPricing(mode){
    plans.forEach(plan=>{
      const numEl = plan.querySelector('.num[data-current]');
      const from = Number(numEl.textContent.replace(/[^0-9]/g,'')) || 0;
      const to = Number(plan.getAttribute(mode === 'monthly' ? 'data-monthly' : 'data-package')) || 0;
      // update term label
      const term = plan.querySelector('.term');
      if(mode === 'monthly') term.textContent = (plan.getAttribute('data-monthly') && plan.getAttribute('data-monthly') !== '0') ? '/session' : '/mo';
      else term.textContent = '/package';
      animateNumber(numEl, from, to, 550);
    });
  }

  monthlyBtn.addEventListener('click',function(){
    monthlyBtn.classList.add('active');
    packageBtn.classList.remove('active');
    setPricing('monthly');
  });
  packageBtn.addEventListener('click',function(){
    packageBtn.classList.add('active');
    monthlyBtn.classList.remove('active');
    setPricing('package');
  });

  // Initialize pricing using monthly state
  setPricing('monthly');

  // Mood-to-Method mappings
  const methods = {
    overwhelmed:{
      title:'Short burst: Ground & Organize',
      desc:'A compact set of sessions to reduce immediate overload, prioritize tasks, and create simple routines to protect energy.',
      ctaLabel: 'Book a short intake',
      ctaUrl: '{{PRIMARY_CTA_URL}}'
    },
    stuck:{
      title:'Clarity series',
      desc:'A focused plan to identify barriers, test small changes, and map realistic next steps.',
      ctaLabel: 'Start a clarity inquiry',
      ctaUrl: '{{PRIMARY_CTA_URL}}'
    },
    caretaking:{
      title:'Boundaries & Renewal',
      desc:'Work that centers your needs and explores sustainable boundaries to reduce burnout and re-balance responsibilities.',
      ctaLabel: 'Explore boundary work',
      ctaUrl: '{{PRIMARY_CTA_URL}}'
    },
    transition:{
      title:'Transition support',
      desc:'A tailored sequence for navigating change, weighing options, and tending to the practical and emotional parts of transition.',
      ctaLabel: 'Discuss transition planning',
      ctaUrl: '{{PRIMARY_CTA_URL}}'
    }
  };

  function applyMethod(key){
    const heroTitle = document.querySelector('#hero-method .method-title');
    const heroDesc = document.querySelector('#hero-method .method-desc');
    const heroCta = document.getElementById('hero-cta');
    const fwTitle = document.getElementById('fw-title');
    const fwDesc = document.getElementById('fw-desc');
    const fwCta = document.getElementById('fw-cta');

    const m = methods[key] || methods['stuck'];
    // small morph animation
    fadeText(heroTitle, m.title);
    fadeText(heroDesc, m.desc);
    heroCta.textContent = m.ctaLabel;
    heroCta.href = m.ctaUrl;

    fadeText(fwTitle, 'Pathway: ' + m.title);
    fadeText(fwDesc, m.desc);
    fwCta.textContent = m.ctaLabel;
    fwCta.href = m.ctaUrl;
  }

  function fadeText(el, text){
    el.style.opacity = 0;
    setTimeout(()=>{ el.textContent = text; el.style.opacity = 1; }, 220);
  }

  // Bind mood controls (hero and side)
  const moodHero = document.getElementById('mood-hero');
  const moodSide = document.getElementById('mood-side');

  function bindMood(root){
    if(!root) return;
    root.addEventListener('click',function(e){
      const btn = e.target.closest('button[data-key]');
      if(!btn) return;
      const key = btn.getAttribute('data-key');
      // mark active in this group
      Array.from(root.querySelectorAll('button')).forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      applyMethod(key);
    });
  }
  bindMood(moodHero);
  bindMood(moodSide);

  // Small accessibility: close mobile menu
  const menuToggle = document.querySelector('.menu-toggle');
  menuToggle && menuToggle.addEventListener('click', ()=>{
    const nav = document.querySelector('.main-nav');
    if(nav.style.display === 'flex'){ nav.style.display = 'none'; }
    else { nav.style.display = 'flex'; nav.style.flexDirection = 'column'; }
  });

  // set default mood to 'stuck'
  setTimeout(()=>{
    applyMethod('stuck');
    // mark buttons
    const heroDefault = document.querySelector('#mood-hero button[data-key="stuck"]');
    const sideDefault = document.querySelector('#mood-side button[data-key="stuck"]');
    heroDefault && heroDefault.classList.add('active');
    sideDefault && sideDefault.classList.add('active');
  },120);
});
