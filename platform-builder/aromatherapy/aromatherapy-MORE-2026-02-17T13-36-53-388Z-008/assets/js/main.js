(function(){
  // Pricing Comparator
  const toggle = document.getElementById('priceToggle');
  const toggleLabel = document.getElementById('toggleLabel');
  const priceNums = Array.from(document.querySelectorAll('.price-amount .num'));
  const priceCards = Array.from(document.querySelectorAll('.price-amount'));

  function animateNumber(el, start, end, duration){
    const startTime = performance.now();
    function tick(now){
      const t = Math.min(1,(now-startTime)/duration);
      const eased = t<.5?2*t*t: -1 + (4-2*t)*t; // simple ease
      const val = Math.round(start + (end-start)*eased);
      el.textContent = val;
      if(t<1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  function refreshPrices(isPackage){
    priceCards.forEach((card)=>{
      const numEl = card.querySelector('.num');
      const month = Number(card.getAttribute('data-month'))||0;
      const pack = Number(card.getAttribute('data-package'))||0;
      const from = Number(numEl.textContent)||month;
      const to = isPackage?pack:month;
      animateNumber(numEl, from, to, 500);
    });
    toggleLabel.textContent = isPackage? 'Package':'Monthly';
  }

  toggle.addEventListener('change', (e)=>{
    refreshPrices(e.target.checked);
  });

  // initialize
  refreshPrices(false);

  // Mood-to-Method selector
  const moods = {
    stressed:{title:'Soothing anchor',desc:'Short grounding inhalations and a green-woody touch to ease intensity.',blend:'Lavender + Petitgrain (gentle)',approach:'Three slow belly breaths with scent at the first exhale','safety':'Dilute 1-2% for topical use. Patch test.'},
    foggy:{title:'Clarity cue',desc:'Bright citrus notes to gently reorient attention without overstimulation.',blend:'Sweet Orange + Rosemary (diffuse briefly)',approach:'Diffuse for 10 minutes before focused work','safety':'Avoid direct ingestion; keep away from birds.'},
    tired:{title:'Evening ease',desc:'Warm, soft aromas that may signal downshift and rest when used at low concentration.',blend:'Chamomile CO2 + Bergamot',approach:'Diffuse low volume during dimming lights','safety':'Not for use with infants; consult if pregnant.'},
    tingly:{title:'Calm close',desc:'Low-dose grounding notes and breath pacing to ease nervous energy.',blend:'Cedarwood + Mandarin',approach:'Inhale from tissue for 6 slow breaths','safety':'Patch test for skin sensitivity.'},
    cheery:{title:'Elevated ease',desc:'Light floral-citrus for celebratory ease that still feels steady.',blend:'Neroli + Grapefruit',approach:'Diffuse sparingly during a small celebration','safety':'Keep away from curious pets; dilute for sprays.'}
  };

  const moodButtons = document.querySelectorAll('.mood');
  const titleEl = document.querySelector('.method-title');
  const descEl = document.querySelector('.method-desc');
  const blendEl = document.getElementById('blendSample');
  const approachEl = document.getElementById('methodApproach');
  const safetyEl = document.getElementById('safetyNote');
  const moodCTA = document.getElementById('moodCTA');

  function setMood(key, btn){
    const data = moods[key];
    if(!data) return;
    // animate text change
    [titleEl,descEl,blendEl,approachEl,safetyEl].forEach(el=>{
      el.classList.add('mood-animate');
      setTimeout(()=>el.classList.remove('mood-animate'),350);
    });
    titleEl.textContent = data.title;
    descEl.textContent = data.desc;
    blendEl.textContent = data.blend;
    approachEl.textContent = data.approach;
    safetyEl.textContent = data.safety + ' See FAQ for dilution and pets.';
    // update CTA verb and url param
    moodCTA.textContent = {
      stressed:'Try a calming session',
      foggy:'Try a clarity mini',
      tired:'Try a gentle wind-down',
      tingly:'Try a short grounding',
      cheery:'Try a bright cue'
    }[key] || 'Start a practice';
    // add query param to CTA link for tracking
    const base = '{{PRIMARY_CTA_URL}}';
    moodCTA.setAttribute('href', base + '?mood=' + encodeURIComponent(key));

    // visual state
    moodButtons.forEach(b=>b.classList.remove('active'));
    if(btn) btn.classList.add('active');
  }

  moodButtons.forEach(btn=>{
    btn.addEventListener('click', function(){
      setMood(this.getAttribute('data-key'), this);
    });
  });

  // footer year
  document.getElementById('year').textContent = new Date().getFullYear();

})();