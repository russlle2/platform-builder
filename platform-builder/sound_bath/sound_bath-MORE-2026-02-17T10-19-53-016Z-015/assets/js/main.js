(function(){
  'use strict';
  // Simple local UI controller for Mood-to-Method & Sound Preference Mixer
  const moodTool = document.getElementById('mood-tool');
  const mixerTool = document.getElementById('mixer-tool');
  const programCards = document.getElementById('program-cards');
  const primaryCta = document.getElementById('primary-cta');
  const secondaryCta = document.getElementById('secondary-cta');
  const nextSummary = document.getElementById('next-summary');
  const calendarList = document.getElementById('calendar-list');

  // Placeholder mapping for methods per mood and intensity
  const library = {
    'drained':{
      gentle:[{title:'Drift & Reset',desc:'A slow layering of soft bowls and breath guidance to restore energy.',price:'1 credit / $35'},{title:'Short Restore',desc:'A 30-minute gentle sit, ideal for midday recovery.',price:'1 credit / $28'}],
      medium:[{title:'Flow Reset',desc:'Medium texture bowls with subtle gong swells for steadying.',price:'2 credits / $60'},{title:'Focus Drift',desc:'40-minute sit focused on breath and tone.',price:'2 credits / $55'}],
      intense:[{title:'Deep Recharge',desc:'Intense harmonic layers for a stronger visceral shift.',price:'3 credits / $85'}]
    },
    'stressed':{
      gentle:[{title:'Quiet Anchor',desc:'Low tones paired with guided exhalations.',price:'1 credit / $32'}],
      medium:[{title:'Pulse Calm',desc:'Rhythmic bowls to steady the nervous system.',price:'2 credits / $58'}],
      intense:[{title:'Full Release',desc:'Robust harmonic shifts to support release and re-set.',price:'3 credits / $92'}]
    },
    'scattered':{
      gentle:[{title:'Soft Focus',desc:'Gentle repetitive textures to invite attention.',price:'1 credit / $30'}],
      medium:[{title:'Centering Pulse',desc:'Structured layers to help organize attention.',price:'2 credits / $60'}],
      intense:[{title:'Clear Wave',desc:'Sharper overtones and clearing sequences for high distraction.',price:'3 credits / $90'}]
    },
    'overloaded':{
      gentle:[{title:'Envelope',desc:'Very soft, slow tones to create buffer and calm.',price:'1 credit / $34'}],
      medium:[{title:'Balance Session',desc:'Tactile low-frequency support with mid-range textures.',price:'2 credits / $62'}],
      intense:[{title:'Reset Intensive',desc:'Extended intense layering for strong reorientation.',price:'4 credits / $130'}]
    },
    'quiet':{
      gentle:[{title:'Curious Drift',desc:'Light harmonic play, explorative and open.',price:'1 credit / $28'}],
      medium:[{title:'Exploration Set',desc:'Medium textures for attentive listening and inquiry.',price:'2 credits / $50'}],
      intense:[{title:'Deep Resonance',desc:'Full-bodied sound exploration for deep listening.',price:'3 credits / $88'}]
    }
  };

  // default state
  let state = {mood:'quiet', intensity:'gentle'};

  function renderPrograms(){
    const picks = library[state.mood][state.intensity] || [];
    programCards.innerHTML = '';
    picks.forEach(p => {
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = '<h3>'+escapeHtml(p.title)+'</h3><p class="muted">'+escapeHtml(p.desc)+'</p><div class="price">'+escapeHtml(p.price)+'</div><div style="margin-top:10px"><a class="btn primary" href="'+encodeUriPlaceholder('book.html')+'">'+ctaLabelFor(state)+'</a></div>';
      programCards.appendChild(card);
    });
  }

  function ctaLabelFor(s){
    // craft CTA label tailored to mood + intensity
    const moodMap = {drained:'Reserve a gentle slot',stressed:'Book a calming session',scattered:'Claim a focusing seat',overloaded:'Book a reset intensive',quiet:'Reserve an exploratory sit'};
    const intensityMap = {gentle:' (gentle)',medium:' (mid)',intense:' (intense)'};
    return (moodMap[s.mood] || 'Book a session') + intensityMap[s.intensity];
  }

  function encodeUriPlaceholder(href){
    // keep placeholder URL if present
    if(window.location.href.indexOf('{{PRIMARY_CTA_URL}}')>-1) return '{{PRIMARY_CTA_URL}}';
    return href;
  }

  function escapeHtml(str){ return String(str).replace(/[&<>\"]/g, function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','\\':'\\\\','"':'&quot;'}[c];}); }

  // attach mood buttons
  moodTool.querySelectorAll('button').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      moodTool.querySelectorAll('button').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      state.mood = btn.getAttribute('data-mood');
      updateUi();
    });
  });

  // attach mixer
  mixerTool.querySelectorAll('button').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      mixerTool.querySelectorAll('button').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      state.intensity = btn.getAttribute('data-intensity');
      updateUi();
    });
  });

  // update CTAs and recommendation
  function updateUi(){
    renderPrograms();
    const label = ctaLabelFor(state);
    // replace primary CTA label text but keep placeholder URL if present
    primaryCta.textContent = label;
    secondaryCta.textContent = label;
    // example: change primary href to include mood+intensity as query params if primary url is not the placeholder
    if(primaryCta.getAttribute('href') && primaryCta.getAttribute('href') !== '{{PRIMARY_CTA_URL}}'){
      primaryCta.setAttribute('href',''+primaryCta.getAttribute('href').split('?')[0]+'?mood='+state.mood+'&intensity='+state.intensity);
      secondaryCta.setAttribute('href',''+secondaryCta.getAttribute('href').split('?')[0]+'?mood='+state.mood+'&intensity='+state.intensity);
    }
  }

  // Small local events module
  const events = generateMockEvents();
  function generateMockEvents(){
    const now = new Date();
    const list = [];
    for(let i=1;i<8;i++){
      const d = new Date(now.getTime() + i*24*60*60*1000);
      const iso = d.toISOString();
      list.push({id:i,title:(i%2? 'Evening Sound Circle':'Midday Mini'),date:iso,spots: Math.max(0,10-i)});
    }
    return list;
  }

  function renderEvents(){
    if(events.length===0){ nextSummary.innerHTML = '<div class="muted">No upcoming gatherings</div>'; return; }
    const next = events[0];
    const nd = new Date(next.date);
    nextSummary.innerHTML = '<strong>'+escapeHtml(next.title)+'</strong><div class="muted">'+nd.toDateString()+' — available spots: '+next.spots+'</div><div style="margin-top:10px"><a class="btn primary" href="events.html">Join this circle</a></div>';
    calendarList.innerHTML = '';
    events.slice(0,6).forEach(ev =>{
      const li = document.createElement('div');
      const date = new Date(ev.date);
      li.className='cal-item';
      li.style.padding='8px 6px';
      li.style.borderBottom='1px solid rgba(255,255,255,0.02)';
      li.innerHTML = '<div style="font-weight:600">'+escapeHtml(ev.title)+'</div><div class="muted" style="font-size:13px">'+date.toDateString()+' • spots: '+ev.spots+'</div>';
      calendarList.appendChild(li);
    });
  }

  // initialize
  document.getElementById('year').textContent = new Date().getFullYear();
  // set initial active button states
  // mark corresponding buttons
  const moodBtn = moodTool.querySelector('button[data-mood="'+state.mood+'"]'); if(moodBtn) moodBtn.classList.add('active');
  const intensityBtn = mixerTool.querySelector('button[data-intensity="'+state.intensity+'"]'); if(intensityBtn) intensityBtn.classList.add('active');
  // set placeholder CTAs: if primary contains placeholder token, keep it; else set defaults
  if(primaryCta.getAttribute('href') === '{{PRIMARY_CTA_URL}}'){
    // leave as-is
  } else {
    primaryCta.setAttribute('href','book.html');
  }
  if(secondaryCta.getAttribute('href') === '{{PRIMARY_CTA_URL}}'){
    // leave
  } else {
    secondaryCta.setAttribute('href','book.html');
  }

  renderEvents();
  updateUi();

  // Accessibility: keyboard support for tool buttons
  document.querySelectorAll('.mood-options button, .mixer-options button').forEach(b=>{
    b.setAttribute('tabindex','0');
    b.addEventListener('keydown', function(e){ if(e.key==='Enter' || e.key===' ') { e.preventDefault(); this.click(); } });
  });

})();
