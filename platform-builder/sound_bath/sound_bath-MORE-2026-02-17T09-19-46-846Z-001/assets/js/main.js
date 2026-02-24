document.addEventListener('DOMContentLoaded',function(){
  const moodSelect = document.getElementById('mood');
  const intensityEls = document.getElementsByName('intensity');
  const rec = document.getElementById('recommendation');
  const programNameEl = rec.querySelector('.program-name');
  const programDescEl = rec.querySelector('.program-desc');
  const priceEl = rec.querySelector('.price');
  const durationEl = rec.querySelector('.duration');
  const primaryCta = document.getElementById('primaryCta');
  const bookingCta = document.getElementById('bookingCta');
  const nextEventEl = document.getElementById('nextEvent');
  const miniCal = document.getElementById('miniCalendar');
  const yearEl = document.getElementById('year');

  yearEl.textContent = new Date().getFullYear();

  // Map mood+intensity to programs (unique naming)
  const programs = {
    'restless':{
      gentle:{name:'Drift Session — Long Bow',desc:'Slow, continuous bowls and spacious silence to quiet the mental loop.',price:'$28 — drop-in',duration:'45 min',ctaLabel:'Book a Drift Session',ctaUrl:'/book.html?program=drift'},
      medium:{name:'Wave Session — Layered Bowls',desc:'Pulsed bowls with light chimes to steady attention without jolt.',price:'$38 — drop-in',duration:'60 min',ctaLabel:'Reserve a Wave Spot',ctaUrl:'/book.html?program=wave'},
      intense:{name:'Resonance Reset — Rhythmic Field',desc:'Denser overlays and harmonic movement for decisive release.',price:'$55 — drop-in',duration:'60 min',ctaLabel:'Join a Resonance Reset',ctaUrl:'/book.html?program=resonance'}
    },
    'anxious':{
      gentle:{name:'Lamp Quiet — Breath & Bowl',desc:'Warm, low bowls and breath pacing to calm the chest and nervous system.',price:'$30 — drop-in',duration:'40 min',ctaLabel:'Schedule a Quiet Lamp',ctaUrl:'/book.html?program=lamp'},
      medium:{name:'Harmonic Anchor',desc:'Anchored tones with soft percussive pulses to refocus scattered energy.',price:'$42 — drop-in',duration:'50 min',ctaLabel:'Book an Anchor',ctaUrl:'/book.html?program=anchor'},
      intense:{name:'Deep Tides',desc:'Intense, moving harmonics for clearing stuck adrenaline.',price:'$60 — drop-in',duration:'60 min',ctaLabel:'Try Deep Tides',ctaUrl:'/book.html?program=deep-tides'}
    },
    'tired':{
      gentle:{name:'Rest Wave — Micro Nap',desc:'Ultra-soft bowls and guided body scan to lean into restful sleep.',price:'$25 — drop-in',duration:'30 min',ctaLabel:'Try a Rest Wave',ctaUrl:'/book.html?program=rest-wave'},
      medium:{name:'Renew Flow',desc:'Balanced tones and breathwork to revive without overstimulating.',price:'$40 — drop-in',duration:'45 min',ctaLabel:'Reserve Renew Flow',ctaUrl:'/book.html?program=renew'},
      intense:{name:'Spark Series',desc:'Bright harmonic bursts to re-energize when gentle doesn\'t land.',price:'$52 — drop-in',duration:'50 min',ctaLabel:'Book the Spark',ctaUrl:'/book.html?program=spark'}
    },
    'reflective':{
      gentle:{name:'Lantern Session — Quiet Inquiry',desc:'Subtle tones and pauses to hold reflective attention.',price:'$32 — drop-in',duration:'50 min',ctaLabel:'Reserve a Lantern',ctaUrl:'/book.html?program=lantern'},
      medium:{name:'Tide & Thread',desc:'Interwoven bowls with brief prompts to weaving insight and body.',price:'$46 — drop-in',duration:'60 min',ctaLabel:'Book Tide & Thread',ctaUrl:'/book.html?program=tide-thread'},
      intense:{name:'Clarity Wave',desc:'Focused harmonics with movement cues to surface tangible shifts.',price:'$58 — drop-in',duration:'70 min',ctaLabel:'Join Clarity Wave',ctaUrl:'/book.html?program=clarity'}
    },
    'celebratory':{
      gentle:{name:'Glow Bath',desc:'Warm, joyful tones with open-space singing for light celebration.',price:'$35 — drop-in',duration:'45 min',ctaLabel:'Celebrate with a Glow Bath',ctaUrl:'/book.html?program=glow'},
      medium:{name:'Lift Series',desc:'Uplifting harmonic arcs and communal resonance for shared joy.',price:'$48 — drop-in',duration:'60 min',ctaLabel:'Reserve Lift',ctaUrl:'/book.html?program=lift'},
      intense:{name:'Full Chorus',desc:'Vibrant layers and rhythmic waves for ceremonial release.',price:'$70 — drop-in',duration:'75 min',ctaLabel:'Book Full Chorus',ctaUrl:'/book.html?program=chorus'}
    }
  };

  function getIntensity(){
    for(const r of intensityEls){ if(r.checked) return r.value; }
    return 'gentle';
  }

  function updateRecommendation(){
    const mood = moodSelect.value;
    const intensity = getIntensity();
    const data = (programs[mood] && programs[mood][intensity]) ? programs[mood][intensity] : null;
    if(!data) return;
    programNameEl.textContent = data.name;
    programDescEl.textContent = data.desc;
    priceEl.textContent = data.price;
    durationEl.textContent = data.duration;

    // update CTA text and href
    primaryCta.textContent = data.ctaLabel;
    primaryCta.href = data.ctaUrl;
    bookingCta.textContent = data.ctaLabel;
    bookingCta.href = data.ctaUrl;

    // visual morphing
    rec.classList.remove('program-suggest-gentle','program-suggest-medium','program-suggest-intense');
    rec.classList.add('program-suggest-' + intensity);
  }

  moodSelect.addEventListener('change',updateRecommendation);
  for(const r of intensityEls){ r.addEventListener('change',updateRecommendation); }

  // Initialize
  updateRecommendation();

  // Mini calendar and next-event teaser (simple local example)
  const upcoming = [
    {date:'2026-03-05',title:'Evening Drift — Singing Bowls',time:'7:00 PM'},
    {date:'2026-03-12',title:'Midday Reset — Short Focus Bath',time:'12:30 PM'},
    {date:'2026-03-20',title:'Resonant Release — Layered Harmonics',time:'6:30 PM'}
  ];
  // next event is first future date
  const today = new Date();
  let next = null;
  for(const ev of upcoming){
    const d = new Date(ev.date + 'T00:00:00');
    if(d >= today){ next = ev; break; }
  }
  if(next){
    nextEventEl.innerHTML = '<strong>' + next.title + '</strong><div>' + next.date + ' · ' + next.time + '</div>';
  } else {
    nextEventEl.textContent = 'No upcoming events listed — check full calendar.';
  }
  // populate mini calendar
  miniCal.innerHTML = '';
  upcoming.forEach(ev=>{
    const li = document.createElement('li');
    li.textContent = ev.date + ' — ' + ev.title + ' • ' + ev.time;
    miniCal.appendChild(li);
  });

  // Accessibility: keep focus states
  document.body.addEventListener('keyup',function(e){ if(e.key==='Tab') document.body.classList.add('show-focus'); });
});