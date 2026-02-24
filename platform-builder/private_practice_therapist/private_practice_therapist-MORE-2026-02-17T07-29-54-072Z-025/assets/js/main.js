(function(){
  // Mood-to-Method mapping
  const methods = {
    overwhelmed: {
      name: 'Stabilize Intensive',
      desc: 'A short, concentrated set of sessions aimed at stabilizing overwhelming feelings, identifying immediate coping steps, and creating a brief safety and action plan.',
      price: 'Short intensives typically arranged as one 90-minute session or a set of three weekly sessions.'
    },
    stuck: {
      name: 'Pattern Work Bundle',
      desc: 'A focused bundle designed to explore recurring patterns, try small experiments between sessions, and build momentum toward practical changes.',
      price: 'Typically 6 sessions planned over several weeks; tailored to goals.'
    },
    transitioning: {
      name: 'Transition Toolkit',
      desc: 'Support for navigating role, relationship, or career transitions with strategies for decision-making, self-care, and boundary-setting.',
      price: 'Offered as a short package or ongoing check-ins depending on pace of transition.'
    },
    curious: {
      name: 'Orientation Consult',
      desc: 'A single session to assess needs, experiment with an approach, and co-design next steps if desired.',
      price: 'Single-session consult available; useful for planning next steps.'
    }
  };

  // DOM refs
  const moodButtons = document.querySelectorAll('.mood-btn');
  const methodName = document.getElementById('method-name');
  const methodDesc = document.getElementById('method-desc');
  const methodPrice = document.getElementById('method-price');
  const primaryCta = document.getElementById('primary-cta');
  const secondaryCta = document.getElementById('secondary-cta');

  function setActiveMood(mood){
    moodButtons.forEach(btn=>{
      const is = btn.dataset.mood===mood;
      btn.setAttribute('aria-pressed', is? 'true' : 'false');
    });

    const m = methods[mood] || methods.curious;
    methodName.textContent = m.name;
    methodDesc.textContent = m.desc;
    methodPrice.textContent = m.price;

    // Update CTA phrasing to reflect recommended approach
    primaryCta.textContent = `Start ${m.name}`;
    primaryCta.href = primaryCta.getAttribute('href'); // keep URL placeholder intact
    secondaryCta.textContent = `Book ${m.name}`;
  }

  moodButtons.forEach(btn=>{
    btn.addEventListener('click', ()=>{
      setActiveMood(btn.dataset.mood);
    });
    btn.addEventListener('keydown', (e)=>{
      if(e.key === 'Enter' || e.key === ' '){
        e.preventDefault();
        btn.click();
      }
    });
  });

  // Initialize default mood
  setActiveMood('curious');

  // Accordion logic for confidentiality
  const acc = document.getElementById('confidentiality-accordion');
  if(acc){
    const toggle = acc.querySelector('.accordion-toggle');
    const panel = acc.querySelector('.accordion-panel');
    toggle.addEventListener('click', ()=>{
      const open = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!open));
      if(open){
        panel.style.display = 'none';
      } else {
        panel.style.display = 'block';
      }
    });
  }

  // Footer year
  document.getElementById('year').textContent = new Date().getFullYear();
})();
