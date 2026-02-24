(function(){
  // Utility: animate number from start to end
  function animateNumber(el, from, to, duration){
    let start = null;
    const step = timestamp => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start)/duration,1);
      const value = Math.round(from + (to - from)*progress);
      el.textContent = '$'+value;
      if(progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  // Pricing comparator
  const pricingToggle = document.getElementById('pricing-toggle');
  const tiers = Array.from(document.querySelectorAll('.tier'));
  function updatePricing(usePackage){
    tiers.forEach(tier=>{
      const numEl = tier.querySelector('.num');
      const unitEl = tier.querySelector('.unit');
      const monthly = Number(tier.dataset.monthly);
      const pack = Number(tier.dataset.package);
      const from = parseInt((numEl.textContent||'$0').replace('$','')) || 0;
      const to = usePackage ? pack : monthly;
      // Animate
      animateNumber(numEl, from, to, 450);
      unitEl.textContent = usePackage ? '' : '/mo';
      // update CTA phrasing
      const cta = tier.querySelector('.tier-cta');
      cta.textContent = usePackage ? 'Buy package' : 'Subscribe';
    });
  }
  if(pricingToggle){
    pricingToggle.addEventListener('change', function(e){
      updatePricing(e.target.checked);
    });
    // initialize to monthly (unchecked)
    updatePricing(false);
  }

  // Mood-to-Method mapping
  const moodMap = {
    calm: {
      title: 'Gentle Resonance',
      desc: 'Long bowls and breath counts to ease subtle tension and invite clarity.',
      cta: 'Try a drop-in',
      id: 'calm'
    },
    wired: {
      title: 'Ground & Anchor',
      desc: 'Rhythmic vibro-mapping with firm breath cues to settle nervous energy.',
      cta: 'Book an anchor session',
      id: 'wired'
    },
    foggy: {
      title: 'Focus Bells',
      desc: 'Short bell anchors and guided posture shifts to cut through mental fog.',
      cta: 'Reserve a focus slot',
      id: 'foggy'
    },
    flat: {
      title: 'Slow Restore',
      desc: 'Lower tones and supportive cues designed to rebuild gentle metabolic energy.',
      cta: 'Schedule a private session',
      id: 'flat'
    },
    celebrate: {
      title: 'Deep Tides',
      desc: 'Layered harmonics and extended holds for deepening and refinement.',
      cta: 'Join the series',
      id: 'celebrate'
    }
  };

  // Attach to each .mood-method block
  document.querySelectorAll('.mood-method').forEach(block=>{
    const select = block.querySelector('.mood-select');
    const titleEl = block.querySelector('.method-title');
    const descEl = block.querySelector('.method-desc');
    const ctaEl = block.querySelector('.primary-cta');
    const template = block.dataset.ctaTemplate || '{{PRIMARY_CTA_URL}}';

    function applyMood(key){
      const info = moodMap[key] || moodMap['calm'];
      if(titleEl) titleEl.textContent = 'Recommended: '+info.title;
      if(descEl) descEl.textContent = info.desc;
      if(ctaEl){
        ctaEl.textContent = info.cta;
        // if template contains {id} replace, else set base
        if(template.indexOf('{id}')>-1){
          ctaEl.href = template.replace('{id}', info.id);
        } else {
          // append mood as query param
          const base = block.dataset.ctaBase || template;
          ctaEl.href = base + (base.indexOf('?')>-1 ? '&' : '?') + 'mood='+info.id;
        }
      }
    }

    if(select){
      select.addEventListener('change', function(e){
        applyMood(e.target.value);
      });
      // initialize
      applyMood(select.value || 'calm');
    }
  });

  // Small helpers
  // Set footer year
  const yearEl = document.getElementById('year'); if(yearEl) yearEl.textContent = new Date().getFullYear();

  // Simple mobile menu toggle
  const menuToggle = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.nav');
  if(menuToggle && nav){
    menuToggle.addEventListener('click', function(){
      const open = this.getAttribute('aria-expanded') === 'true';
      this.setAttribute('aria-expanded', String(!open));
      nav.style.display = open ? 'none' : 'flex';
    });
  }

})();
