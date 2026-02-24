document.addEventListener('DOMContentLoaded',function(){
  // Mood-to-Method mapping
  const mapping = {
    navigation: {
      title: 'Focused Planning Intensive',
      desc: 'We identify the immediate pressures, map options, and craft the smallest feasible next step to reduce overwhelm.',
      ctaText: 'Book a Planning Intensive',
      ctaSuffix: 'planning'
    },
    anchor: {
      title: 'Stabilization & Grounding Session',
      desc: 'Tools and short exercises to settle the body and mind, plus a brief plan for managing spikes between sessions.',
      ctaText: 'Book a Grounding Session',
      ctaSuffix: 'grounding'
    },
    reflection: {
      title: 'Exploratory Insight Intensive',
      desc: 'A reflective session that helps name patterns and clarifies meaning so you can make considered changes with less friction.',
      ctaText: 'Book an Insight Intensive',
      ctaSuffix: 'insight'
    },
    focus: {
      title: 'Decision-Focused Session',
      desc: 'A concentrated session for comparing options, weighing values, and leaving with a concrete action plan you can try right away.',
      ctaText: 'Book a Decision Session',
      ctaSuffix: 'decision'
    }
  };

  const radios = document.querySelectorAll('input[name="mood"]');
  const titleEl = document.getElementById('method-title');
  const descEl = document.getElementById('method-desc');
  const methodCta = document.getElementById('method-cta');
  const primaryCta = document.getElementById('primary-cta');
  const primaryCta2 = document.getElementById('primary-cta-2');

  function applyMood(mood){
    const m = mapping[mood] || mapping.navigation;
    titleEl.textContent = m.title;
    descEl.textContent = m.desc;
    // update CTAs: respectful phrasing
    methodCta.textContent = m.ctaText;
    methodCta.setAttribute('data-suffix', m.ctaSuffix);
    // compose a friendly CTA label for main CTA buttons
    if(primaryCta){
      primaryCta.textContent = m.ctaText.replace(/^Book /i, 'Request ');
    }
    if(primaryCta2){
      primaryCta2.textContent = m.ctaText;
    }
  }

  radios.forEach(r=>{
    r.addEventListener('change',function(e){
      if(e.target.checked){
        applyMood(e.target.value);
      }
    });
  });

  // initialize
  const checked = document.querySelector('input[name="mood"]:checked');
  if(checked) applyMood(checked.value);

  // Accordion controls for confidentiality section
  const toggles = document.querySelectorAll('.accordion-toggle');
  toggles.forEach(btn=>{
    btn.addEventListener('click', function(){
      const expanded = this.getAttribute('aria-expanded') === 'true';
      this.setAttribute('aria-expanded', String(!expanded));
      const panel = this.nextElementSibling;
      if(!expanded){ panel.classList.add('open'); }
      else { panel.classList.remove('open'); }
    });
  });

  // A11y: allow keyboard toggles
  toggles.forEach(btn=>{
    btn.addEventListener('keydown', function(e){
      if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); this.click(); }
    });
  });

  // Enhancement: method CTA leads to booking with mood hint in hash
  const methodLink = document.getElementById('method-cta');
  methodLink.addEventListener('click', function(e){
    const suffix = this.getAttribute('data-suffix') || 'plan';
    // append a short fragment so intake form can read mood hint
    this.href = this.getAttribute('href').split('#')[0] + '#mood=' + encodeURIComponent(suffix);
  });

  // keep primary CTA consistent
  [primaryCta, primaryCta2].forEach(el=>{
    if(!el) return;
    el.addEventListener('click', function(){
      // no telem, just a gentle style change on click
      this.classList.add('clicked');
      setTimeout(()=>this.classList.remove('clicked'),600);
    });
  });

});