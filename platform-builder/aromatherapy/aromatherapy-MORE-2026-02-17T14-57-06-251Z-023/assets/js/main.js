(function(){
  // Mood-to-Method selector logic
  const moodSelect = document.getElementById('mood');
  const methodCopy = document.querySelector('.method-copy');
  const moodCta = document.getElementById('mood-cta');
  const heroCta = document.getElementById('hero-cta');

  const suggestions = {
    'neutral':{
      title:'A brief orienting ritual',
      copy:'Try 2 minutes of mindful inhalation: 3 slow nose inhales, hold 2 seconds, slow exhale. Use a single drop on a tissue at arm\'s length. May support clarity and presence.',
      cta:'Suggest a starter blend'
    },
    'tired':{
      title:'Lift-and-refresh method',
      copy:'Diffuse a citrus-forward single-note for short bursts (10–15 minutes). Consider 0.5–1% dilution for topical roll-ons. Avoid direct skin contact without patch testing.',
      cta:'Explore energizing blends'
    },
    'anxious':{
      title:'Ground-and-breathe',
      copy:'Pair 4–6 slow diaphragmatic breaths with a soft floral-herb inhalation. Use a pulled-card inhaler or cloth—not direct skin for sensitive folks. May support a calmer window of attention.',
      cta:'Find calming options'
    },
    'scattered':{
      title:'Focus anchor',
      copy:'Use a quick 30-second scent check: inhale from a cotton ball, name three things you see, smell, hear. A mint or light citrus top note may help orient attention in brief bursts.',
      cta:'See focus blends'
    },
    'sleepy':{
      title:'Evening settling',
      copy:'A small pouch or bedside spritz with low-concentration floral and woody notes can be used 20–30 minutes before bed. Always patch test and avoid strong concentrations near fragile breathing.',
      cta:'Browse sleep-friendly blends'
    },
    'joyful':{
      title:'Brighten and celebrate',
      copy:'Create a tiny ritual: place a few drops in a diffuser bracelet or inhaler to revisit throughout the day. Keep blends light and well-diluted to avoid sensory fatigue.',
      cta:'Pick an uplifting blend'
    }
  };

  function updateMethod(value){
    const s = suggestions[value] || suggestions['neutral'];
    methodCopy.innerHTML = '<strong>' + s.title + ':</strong> ' + s.copy;
    moodCta.textContent = s.cta;
    // also update hero CTA for coherence
    heroCta.textContent = s.cta;
  }

  if(moodSelect){
    moodSelect.addEventListener('change', function(e){
      updateMethod(e.target.value);
    });
    // initialize
    updateMethod(moodSelect.value || 'neutral');
  }

  // Aroma wheel interactions
  const wheel = document.getElementById('aroma-wheel');
  const noteInfo = document.getElementById('note-info');
  const paths = wheel.querySelectorAll('path[data-note]');

  function clearHighlight(){
    paths.forEach(p=>p.classList.remove('dim'));
    noteInfo.textContent = 'Hover a note for a short description.';
  }

  paths.forEach(p=>{
    p.addEventListener('mouseenter', ()=>{
      const note = p.getAttribute('data-note');
      const desc = p.getAttribute('data-desc');
      // Dim others
      paths.forEach(o=>{ if(o!==p) o.classList.add('dim'); });
      noteInfo.textContent = note + ': ' + desc;
    });
    p.addEventListener('focus', ()=>{
      const note = p.getAttribute('data-note');
      const desc = p.getAttribute('data-desc');
      paths.forEach(o=>{ if(o!==p) o.classList.add('dim'); });
      noteInfo.textContent = note + ': ' + desc;
    });
    p.addEventListener('mouseleave', ()=>{ clearHighlight(); });
    p.addEventListener('blur', ()=>{ clearHighlight(); });
    // keyboard support to read details on Enter/Space
    p.setAttribute('tabindex', '0');
    p.addEventListener('keydown', (ev)=>{
      if(ev.key === 'Enter' || ev.key === ' '){
        ev.preventDefault();
        const note = p.getAttribute('data-note');
        const desc = p.getAttribute('data-desc');
        noteInfo.textContent = note + ': ' + desc;
      }
    });
  });

  // Small accessibility tweak: announce CTA change
  const ariaLive = document.createElement('div');
  ariaLive.setAttribute('aria-live','polite');
  ariaLive.style.position = 'absolute';
  ariaLive.style.left = '-9999px';
  document.body.appendChild(ariaLive);
  const observer = new MutationObserver(()=>{ ariaLive.textContent = heroCta.textContent; });
  observer.observe(heroCta,{childList:true});

})();