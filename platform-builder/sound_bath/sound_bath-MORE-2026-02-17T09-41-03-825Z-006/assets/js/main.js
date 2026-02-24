(function(){
  // Utilities
  function q(selector, root){ return (root||document).querySelector(selector); }
  function qa(selector, root){ return Array.from((root||document).querySelectorAll(selector)); }

  // Year
  q('#year').textContent = new Date().getFullYear();

  // Mood-to-Method data
  var moodMap = {
    stressed: {
      title: 'Calm-Focus Immersion',
      copy: 'A compact session blending grounding breath patterns and low-tone bowls to reduce heat and return attention to the present.',
      cta: 'Book a calm-focus spot',
      href: '{{PRIMARY_CTA_URL}}?mood=stressed'
    },
    foggy: {
      title: 'Clarity Session',
      copy: 'Targets mental haze with rhythmic tones and brief movement to restore cognitive edge and task-readiness.',
      cta: 'Reserve a clarity seat',
      href: '{{PRIMARY_CTA_URL}}?mood=foggy'
    },
    sad: {
      title: 'Heart-Soothing Journey',
      copy: 'Gentle harmonic textures and guided breathing to support emotional settling and safe processing.',
      cta: 'Join a soothing journey',
      href: '{{PRIMARY_CTA_URL}}?mood=sad'
    },
    restless: {
      title: 'Ground & Anchor',
      copy: 'Movement + lower-range resonance to help the body find rhythm and release nervous agitation.',
      cta: 'Book a grounding session',
      href: '{{PRIMARY_CTA_URL}}?mood=restless'
    },
    curious: {
      title: 'Exploratory Immersion',
      copy: 'A more spacious set for exploration—great for those who want to try tonal textures and breath-led phases.',
      cta: 'Try an exploratory spot',
      href: '{{PRIMARY_CTA_URL}}?mood=curious'
    }
  };

  var moodBtns = qa('.mood-btn');
  var methodPanel = q('#methodPanel');
  var methodTitle = methodPanel.querySelector('.method-title');
  var methodCopy = methodPanel.querySelector('.method-copy');
  var moodCta = q('#moodCta');

  function setMood(key){
    var data = moodMap[key];
    if(!data) return;
    // update active button
    moodBtns.forEach(function(b){ b.classList.toggle('active', b.dataset.key===key); });
    // animate text change (crossfade)
    methodPanel.style.opacity = '0.5';
    setTimeout(function(){
      methodTitle.textContent = data.title;
      methodCopy.textContent = data.copy;
      moodCta.textContent = data.cta;
      moodCta.setAttribute('href', data.href);
      methodPanel.style.opacity = '1';
    },220);
  }

  moodBtns.forEach(function(btn){
    btn.addEventListener('click', function(){ setMood(btn.dataset.key); });
  });
  // default
  setMood('stressed');

  // Pricing comparator
  var toggles = qa('.price-toggle');
  var priceCards = qa('.card-price');
  var anims = [];

  function animateNumber(el, from, to, duration){
    var start = performance.now();
    var span = el.querySelector('.num');
    function tick(now){
      var t = Math.min(1,(now-start)/duration);
      var val = Math.round(from + (to-from)*t);
      span.textContent = val;
      if(t<1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  function setPricing(mode){
    priceCards.forEach(function(pc){
      var from = parseInt(pc.querySelector('.num').textContent,10)||0;
      var to = parseInt(pc.getAttribute(mode==='monthly'?'data-base-monthly':'data-base-package'),10);
      animateNumber(pc, from, to, 420);
    });
  }

  toggles.forEach(function(t){
    t.addEventListener('click', function(){
      toggles.forEach(function(x){x.classList.toggle('active', x===t);});
      setPricing(t.dataset.mode);
    });
  });

  // Initialize pricing with monthly
  setPricing('monthly');

  // primary CTA dynamic label sync: when mood changes, also update primary CTA label subtly
  var primaryCta = q('#primaryCta');
  // when moodCta is clicked it points to bookings; mirror the mood cta label on header CTA
  var observer = new MutationObserver(function(){
    primaryCta.textContent = moodCta.textContent;
    // keep link in sync to same booking URL
    var href = moodCta.getAttribute('href') || '{{PRIMARY_CTA_URL}}';
    primaryCta.setAttribute('href', href);
  });
  observer.observe(moodCta, {attributes:true,attributeFilter:['href']});

  // Small UX: hamburger toggle
  var hamb = q('.hamburger');
  hamb && hamb.addEventListener('click', function(){
    var nav = q('.main-nav');
    if(nav.style.display==='flex'){ nav.style.display='none'; hamb.textContent='☰'; }
    else{ nav.style.display='flex'; hamb.textContent='✕'; }
  });

})();