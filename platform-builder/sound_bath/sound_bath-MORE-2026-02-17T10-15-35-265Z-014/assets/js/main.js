// Local interactive logic: Mood-to-Method selector + Sound preference mixer
(function(){
  const moodButtons = document.querySelectorAll('#moodSelector .mood');
  const intensityButtons = document.querySelectorAll('#intensityMixer .intensity');
  const methodTitle = document.getElementById('methodTitle');
  const methodBlurb = document.getElementById('methodBlurb');
  const primaryCta = document.getElementById('primaryCta');
  const yearEl = document.getElementById('year');

  yearEl.textContent = new Date().getFullYear();

  // default
  let state = {mood:null,intensity:'medium'};

  // program matrix: mood x intensity => recommendation
  const programMatrix = {
    frayed: {
      gentle:{name:'Grounding Sequence',blurb:'A soft-settle practice with low-frequency tones to ease the nervous system.',ctaLabel:'Reserve Grounding',ctaPath:'{{PRIMARY_CTA_URL}}?style=grounding'},
      medium:{name:'Stabilize Session',blurb:'Layered bowls and guided breath to loosen tight shoulders and racing thoughts.',ctaLabel:'Book Stabilize',ctaPath:'{{PRIMARY_CTA_URL}}?style=stabilize'},
      intense:{name:'Release Flow',blurb:'Long-form resonance focused on release and expressive breathwork.',ctaLabel:'Apply for Release',ctaPath:'{{PRIMARY_CTA_URL}}?style=release'}
    },
    overfull:{
      gentle:{name:'Soft Pause',blurb:'Short, calming soundwork that creates breathing room in a busy day.',ctaLabel:'Book Soft Pause',ctaPath:'{{PRIMARY_CTA_URL}}?style=softpause'},
      medium:{name:'Clarify',blurb:'Intentional pacing and mid-range tones to help sort priorities and find calm.',ctaLabel:'Reserve Clarify',ctaPath:'{{PRIMARY_CTA_URL}}?style=clarify'},
      intense:{name:'Deep Sweep',blurb:'An energetic clearing set for intense days needing a strong transition.',ctaLabel:'Join Deep Sweep',ctaPath:'{{PRIMARY_CTA_URL}}?style=deepsweep'}
    },
    foggy:{
      gentle:{name:'Warm Focus',blurb:'Gentle harmonics to anchor attention and refresh clarity.',ctaLabel:'Try Warm Focus',ctaPath:'{{PRIMARY_CTA_URL}}?style=warmfocus'},
      medium:{name:'Tune-Up',blurb:'Mid-length session with tonal markers to restore cognitive space.',ctaLabel:'Book Tune-Up',ctaPath:'{{PRIMARY_CTA_URL}}?style=tuneup'},
      intense:{name:'Brightening',blurb:'High-energy resonance to cut through brain fog and activate presence.',ctaLabel:'Reserve Brightening',ctaPath:'{{PRIMARY_CTA_URL}}?style=brightening'}
    },
    curious:{
      gentle:{name:'Exploratory Ease',blurb:'A playful, low-pressure set to discover what sound opens you.',ctaLabel:'Explore Ease',ctaPath:'{{PRIMARY_CTA_URL}}?style=explore'},
      medium:{name:'Inquiry Session',blurb:'Guided experiments with tone and rhythm to deepen listening.',ctaLabel:'Reserve Inquiry',ctaPath:'{{PRIMARY_CTA_URL}}?style=inquiry'},
      intense:{name:'Immersive Lab',blurb:'Long exploratory work for people wanting a thorough sonic experience.',ctaLabel:'Join Immersive',ctaPath:'{{PRIMARY_CTA_URL}}?style=immersive'}
    },
    playful:{
      gentle:{name:'Light Play',blurb:'Soft textures and gentle rhythms, a friendly reset for the day.',ctaLabel:'Book Light Play',ctaPath:'{{PRIMARY_CTA_URL}}?style=lightplay'},
      medium:{name:'Rhythmic Shift',blurb:'Tune-driven session with lively pulses and movement cues.',ctaLabel:'Reserve Rhythmic',ctaPath:'{{PRIMARY_CTA_URL}}?style=rhythmic'},
      intense:{name:'Vivid Session',blurb:'A bold, expressive sound set for joyful arrival or release.',ctaLabel:'Try Vivid',ctaPath:'{{PRIMARY_CTA_URL}}?style=vivid'}
    },
    restful:{
      gentle:{name:'Slow Down',blurb:'Very slow, low tonal palette to deepen rest and support sleep preparation.',ctaLabel:'Book Slow Down',ctaPath:'{{PRIMARY_CTA_URL}}?style=slowdown'},
      medium:{name:'Nightfall',blurb:'Evening-focused sequence to tidy the day and ease transition to rest.',ctaLabel:'Reserve Nightfall',ctaPath:'{{PRIMARY_CTA_URL}}?style=nightfall'},
      intense:{name:'Deep Rest',blurb:'Extended time with deep frequencies for intensive restorative work.',ctaLabel:'Schedule Deep Rest',ctaPath:'{{PRIMARY_CTA_URL}}?style=deeprest'}
    }
  };

  function setActiveButtons(){
    moodButtons.forEach(b=>b.classList.toggle('active', b.dataset.mood===state.mood));
    intensityButtons.forEach(b=>b.classList.toggle('active', b.dataset.intensity===state.intensity));
  }

  function updateRecommendation(){
    if(!state.mood){
      methodTitle.textContent = 'Recommended approach';
      methodBlurb.textContent = 'Choose a mood and intensity to see a tailored suggestion.';
      primaryCta.textContent = '{{PRIMARY_CTA_LABEL}}';
      primaryCta.href = '{{PRIMARY_CTA_URL}}';
      return;
    }
    const rec = programMatrix[state.mood][state.intensity];
    methodTitle.textContent = rec.name;
    methodBlurb.textContent = rec.blurb;
    primaryCta.textContent = rec.ctaLabel;
    primaryCta.href = rec.ctaPath;
  }

  // attach events
  moodButtons.forEach(btn=>btn.addEventListener('click', ()=>{
    state.mood = btn.dataset.mood;
    // small animation
    btn.animate([{transform:'scale(1)'},{transform:'scale(1.04)'},{transform:'scale(1)'}],{duration:240,easing:'ease-out'});
    setActiveButtons();
    updateRecommendation();
    localStorage.setItem('sound:mood', state.mood);
  }));

  intensityButtons.forEach(btn=>btn.addEventListener('click', ()=>{
    state.intensity = btn.dataset.intensity;
    setActiveButtons();
    updateRecommendation();
    localStorage.setItem('sound:intensity', state.intensity);
  }));

  // restore
  const savedMood = localStorage.getItem('sound:mood');
  const savedIntensity = localStorage.getItem('sound:intensity');
  if(savedMood){ state.mood = savedMood; }
  if(savedIntensity){ state.intensity = savedIntensity; }
  setActiveButtons();
  updateRecommendation();

  // Accessibility: keyboard nav for intensity
  document.getElementById('intensityMixer').addEventListener('keydown', (e)=>{
    const items = Array.from(intensityButtons);
    const index = items.findIndex(i=>i.classList.contains('active'));
    if(e.key === 'ArrowRight' || e.key === 'ArrowDown'){
      const next = items[(index+1)%items.length]; next && next.click(); e.preventDefault();
    }
    if(e.key === 'ArrowLeft' || e.key === 'ArrowUp'){
      const prev = items[(index-1+items.length)%items.length]; prev && prev.click(); e.preventDefault();
    }
  });

})();
