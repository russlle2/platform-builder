(function(){
  // helper to set year
  document.getElementById('year').textContent = new Date().getFullYear();

  // Mood-to-Method selector
  const moodMap = {
    stressed: {
      title: 'Short inhale ritual',
      desc: 'Three mindful inhales with a travel inhaler; includes dilution and patch test guidance. May support a steadier breath.',
      ctaLabel: 'Reserve a Calm Session',
      ctaUrl: '{{PRIMARY_CTA_URL}}'
    },
    tired: {
      title: 'Micro-awaken ritual',
      desc: 'A light citrus-focused inhaler and a 15-minute technique to boost alertness safely. May support clearer focus.',
      ctaLabel: 'Book a Focus Lift',
      ctaUrl: '{{PRIMARY_CTA_URL}}'
    },
    foggy: {
      title: 'Clarity practice',
      desc: 'A guided scent pairing and short journaling cue. May support momentary clarity and routine formation.',
      ctaLabel: 'Try a Clarity Session',
      ctaUrl: '{{PRIMARY_CTA_URL}}'
    },
    restless: {
      title: 'Evening wind-down',
      desc: 'A gentle blend and breathing sequence with patch-test steps. May support relaxation before sleep.',
      ctaLabel: 'Start an Evening Ritual',
      ctaUrl: '{{PRIMARY_CTA_URL}}'
    },
    energized: {
      title: 'Sustained energy practice',
      desc: 'A brief scent anchoring technique to sustain productive energy without overstimulation.',
      ctaLabel: 'Schedule an Energy Session',
      ctaUrl: '{{PRIMARY_CTA_URL}}'
    }
  };

  const moodGroup = document.getElementById('mood');
  const reco = document.getElementById('mood-recommendation');
  const primaryCta = document.getElementById('primary-cta');

  moodGroup.addEventListener('click', function(e){
    const btn = e.target.closest('button[data-mood]');
    if(!btn) return;
    // update aria states
    [...moodGroup.querySelectorAll('button')].forEach(b=> b.setAttribute('aria-checked','false'));
    btn.setAttribute('aria-checked','true');
    const key = btn.getAttribute('data-mood');
    const info = moodMap[key];
    if(info){
      reco.textContent = info.title + ' — ' + info.desc;
      // animate CTA label change
      primaryCta.textContent = info.ctaLabel || primaryCta.textContent;
      primaryCta.setAttribute('href', info.ctaUrl || primaryCta.getAttribute('href'));
    }
  });

  // Pricing comparator with animated numbers
  const toggle = document.getElementById('price-toggle');
  const cards = Array.from(document.querySelectorAll('.price-card'));
  let mode = 'month'; // month or package

  function animateNumber(el, start, end, duration){
    const startTime = performance.now();
    function tick(now){
      const t = Math.min(1,(now - startTime)/duration);
      const val = Math.round(start + (end - start) * t);
      el.textContent = '$' + val;
      if(t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  function refreshPrices(toMode){
    cards.forEach(card=>{
      const numEl = card.querySelector('.num');
      const month = parseFloat(card.getAttribute('data-month')) || 0;
      const pack = parseFloat(card.getAttribute('data-package')) || 0;
      const from = parseInt(numEl.textContent.replace('$','')) || 0;
      const to = toMode === 'month' ? month : pack;
      animateNumber(numEl, from, to, 600);
    });
  }

  toggle.addEventListener('click', function(){
    mode = mode === 'month' ? 'package' : 'month';
    const pressed = mode === 'package';
    toggle.setAttribute('aria-pressed', pressed ? 'true' : 'false');
    refreshPrices(mode);
  });

  // initialize prices to month values
  window.addEventListener('load', function(){
    cards.forEach(card=>{
      const numEl = card.querySelector('.num');
      numEl.textContent = '$' + (card.getAttribute('data-month') || '0');
    });
  });

  // Accessibility: allow keyboard selection of mood buttons
  moodGroup.addEventListener('keydown', function(e){
    const keys = ['ArrowRight','ArrowLeft','ArrowUp','ArrowDown'];
    if(!keys.includes(e.key)) return;
    const buttons = Array.from(moodGroup.querySelectorAll('button'));
    const active = buttons.findIndex(b=>b.getAttribute('aria-checked')==='true');
    let idx = active === -1 ? 0 : active;
    if(e.key === 'ArrowRight' || e.key === 'ArrowDown') idx = (idx + 1) % buttons.length;
    if(e.key === 'ArrowLeft' || e.key === 'ArrowUp') idx = (idx - 1 + buttons.length) % buttons.length;
    buttons[idx].focus();
    buttons[idx].click();
    e.preventDefault();
  });

})();
