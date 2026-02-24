(function(){
  // Mood-to-Method selector
  const moods = document.querySelectorAll('.mood');
  const methodTitle = document.getElementById('method-title');
  const methodDesc = document.getElementById('method-desc');
  const methodCTA = document.getElementById('method-cta');
  const primaryCTA = document.getElementById('primary-cta');
  const stripeCTA = document.getElementById('stripe-cta');

  const state = {
    current: null,
    map: {
      calm: {
        title: 'Slow breath ritual',
        desc: 'A low-intensity blend with gentle floral and woody anchors. Try inhaling slowly for 6 counts, hold 2, release 6. May support a calmer nervous system; keep blends diluted and patch test before topical use.',
        cta: 'Begin a calm consult',
        url: 'book.html?mood=calm'
      },
      focus: {
        title: 'Clear-focus method',
        desc: 'A bright citrus-forward approach to promote attentive moments. Use ephemeral inhalation (one or two quick sniffs) and short desk mists. Avoid direct application near children and pets.',
        cta: 'Try a focus session',
        url: 'book.html?mood=focus'
      },
      energize: {
        title: 'Spark sequence',
        desc: 'Lively top notes paired with a warm base to lift the sense and invite movement. Use for short bursts only; be mindful of sensitivities and ventilation.',
        cta: 'Book an energize consult',
        url: 'book.html?mood=energize'
      },
      reset: {
        title: 'Reset & reframe',
        desc: 'A concise reset blend: a balancing mid-note with soft woods to create a punctuation point in your day. We include a brief ritual and dilution guide.',
        cta: 'Start a reset session',
        url: 'book.html?mood=reset'
      },
      sleep: {
        title: 'Evening wind-down',
        desc: 'A low-volatility, soothing blend intended for evenings. Use sparingly and off pillows; a cloth or diffuser at low setting is safest. Not a substitute for medical care.',
        cta: 'Explore sleep support',
        url: 'book.html?mood=sleep'
      }
    }
  };

  function setActiveMood(key){
    state.current = key;
    moods.forEach(b=>b.classList.toggle('active', b.dataset.mood===key));
    const m = state.map[key];
    methodTitle.textContent = m.title;
    methodDesc.textContent = m.desc;
    methodCTA.textContent = m.cta;
    methodCTA.href = m.url;
    // Update primary CTAs to mirror the mood phrasing
    if(primaryCTA) primaryCTA.textContent = m.cta;
    if(stripeCTA) stripeCTA.href = m.url;
  }

  moods.forEach(b=>{
    b.addEventListener('click',()=>setActiveMood(b.dataset.mood));
    b.addEventListener('keydown',(e)=>{ if(e.key==='Enter' || e.key===' ') { e.preventDefault(); setActiveMood(b.dataset.mood); } });
  });

  // Initialize to 'calm'
  setActiveMood('calm');

  // Aroma wheel interactions
  const notePanelName = document.getElementById('note-name');
  const notePanelDesc = document.getElementById('note-desc');
  const notes = document.querySelectorAll('#wheel-svg .note');

  const noteInfo = {
    bergamot: {name:'Bergamot (top)',desc:'Citrus-laced and bright. Often used to lift the spirit; avoid sun exposure after skin contact.'},
    grapefruit: {name:'Grapefruit (top)',desc:'Crisp and tart. May support alertness; dilute before topical use.'},
    litsea: {name:'Litsea (top)',desc:'Fresh and light; a gentle citrus substitute in many blends.'},
    lavender: {name:'Lavender (middle)',desc:'Soft floral familiar used for calming rituals; perform a patch test for skin sensitivity.'},
    clary: {name:'Clary sage (middle)',desc:'Herbaceous and slightly sweet. Use with attention if pregnant; consult a provider.'},
    geranium: {name:'Geranium (middle)',desc:'Green-floral with balancing qualities; dilute for topical application.'},
    vetiver: {name:'Vetiver (base)',desc:'Earthy, grounding base note. Strong in scent—use in small proportions.'},
    sandalwood: {name:'Sandalwood (base)',desc:'Creamy wood scent that anchors blends. Avoid impurities; source matters.'},
    patchouli: {name:'Patchouli (base)',desc:'Deep and resinous; a little goes a long way in blends.'}
  };

  notes.forEach(n=>{
    const key = n.dataset.note;
    n.addEventListener('mouseenter',()=>{
      const info = noteInfo[key];
      if(info){
        notePanelName.textContent = info.name;
        notePanelDesc.textContent = info.desc;
      }
      n.querySelector('circle').setAttribute('r', Math.min(16, (parseInt(n.querySelector('circle').getAttribute('r'))||8) + 6));
    });
    n.addEventListener('mouseleave',()=>{
      notePanelName.textContent = 'Hover a note';
      notePanelDesc.textContent = 'Top, middle, and base notes each unfold differently. Hover any dot for a short descriptor and safe-use tips.';
      const c = n.querySelector('circle');
      if(c){ c.setAttribute('r', c.getAttribute('r')>8?8:c.getAttribute('r')) }
    });
    // keyboard interactions
    n.setAttribute('tabindex','0');
    n.addEventListener('focus', ()=> n.dispatchEvent(new Event('mouseenter')));
    n.addEventListener('blur', ()=> n.dispatchEvent(new Event('mouseleave')));
  });

  // Year in footer
  const yearEl = document.getElementById('year');
  if(yearEl) yearEl.textContent = new Date().getFullYear();

  // Light analytics stub (no network calls)
  console.log('Aromatherapy landing interactive loaded');
})();