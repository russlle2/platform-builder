(function(){
  // State mapping
  const methods = {
    tethered: {
      gentle:{name:'Grounding Pulse',line:'Short anchoring sounds to steady the nervous system'},
      medium:{name:'Harmonic Flow',line:'Even pulses with room to notice and re-set'},
      intense:{name:'Focused Resonance',line:'Directed tones to shift tightness and agitation'}
    },
    drifting: {
      gentle:{name:'Slow Drift',line:'Soft sustained tones to ease heaviness'},
      medium:{name:'Layered Lull',line:'Overlapping textures that renew energy quietly'},
      intense:{name:'Deep Harbor',line:'Denser waves, shorter form — practical softening'}
    },
    ready: {
      gentle:{name:'Quiet Invitation',line:'A simple introduction to sound and breath together'},
      medium:{name:'Responsive Weave',line:'Interactive cues and gentle phrasing for exploration'},
      intense:{name:'Brisk Sutra',line:'Short, potent sequences for clear transitions'}
    }
  };

  const moodSelect = document.getElementById('mood');
  const mixButtons = Array.from(document.querySelectorAll('.mix-button'));
  const methodLine = document.getElementById('methodLine');
  const primaryCta = document.getElementById('primaryCta');
  const finalCta = document.getElementById('finalCta');
  const programGrid = document.getElementById('programGrid');
  const yearSpan = document.getElementById('year');

  yearSpan.textContent = new Date().getFullYear();

  let currentMix = 'gentle';

  function updateRecommendation(){
    const mood = moodSelect.value;
    const choice = methods[mood][currentMix];
    methodLine.textContent = `${choice.name} — ${choice.line}`;

    // Update CTA phrasing based on method intensity and mood
    let ctaText = (currentMix==='gentle')? 'Reserve a calm seat' : (currentMix==='medium')? 'Claim a balanced spot' : 'Book an anchored session';

    // Slight variation by mood
    if(mood==='tethered') ctaText = ctaText.replace('seat','spot').replace('spot','place');
    if(mood==='drifting') ctaText = ctaText.replace('Claim','Hold').replace('Book','Secure');

    primaryCta.textContent = ctaText;
    finalCta.textContent = ctaText;

    // Update visible program cards to reflect we suggest a highlighted program
    Array.from(programGrid.querySelectorAll('.card')).forEach((card, idx) => {
      const nameEl = card.querySelector('.program-name');
      const desc = card.querySelector('.desc');
      const price = card.querySelector('.price');

      // Tweak copy depending on mix
      if(idx===0){
        nameEl.textContent = choice.name;
        desc.textContent = choice.line + ' — group session.';
        price.textContent = (currentMix==='intense')? 'Suggested $25 — small group' : (currentMix==='medium')? 'Suggested $20' : 'Pay-what-feels-right';
      }
      if(idx===1){
        // Private offering
        const priv = (currentMix==='gentle')? 'breath-forward' : (currentMix==='medium')? 'pitch-and-breath' : 'focused-tone work';
        nameEl.textContent = (currentMix==='intense')? 'Resonant Harbor' : 'Resonant Harbor';
        desc.textContent = `Private ${priv} session — tailored support.`;
        price.textContent = (currentMix==='intense')? 'Sliding scale $80–$160' : 'Sliding scale $60–$120';
      }
      if(idx===2){
        nameEl.textContent = (currentMix==='intense')? 'Deep Well — Short Series' : 'Deep Well — Short Series';
        desc.textContent = 'Three brief gatherings; practice and tools for the week.';
        price.textContent = (currentMix==='intense')? 'Series $180' : 'Series $150';
      }
    });
  }

  // Mixer buttons
  mixButtons.forEach(btn=>{
    btn.addEventListener('click',()=>{
      mixButtons.forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      currentMix = btn.getAttribute('data-mix');
      updateRecommendation();
    });
  });

  // Mood change
  moodSelect.addEventListener('change',updateRecommendation);

  // Initial refine: set default
  updateRecommendation();

  // Enhance CTA click to add query params that reflect mood+mix (local demo without server)
  function attachCta(cta){
    cta.addEventListener('click',function(e){
      const url = new URL(cta.getAttribute('href'),window.location.origin);
      url.searchParams.set('mood',moodSelect.value);
      url.searchParams.set('mix',currentMix);
      cta.setAttribute('href',url.toString());
      // allow normal navigation
    });
  }
  attachCta(primaryCta);
  attachCta(finalCta);

})();