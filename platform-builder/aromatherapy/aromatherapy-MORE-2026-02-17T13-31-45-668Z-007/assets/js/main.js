// Main JS: pricing comparator + mood-to-method selector + small UI helpers
(function(){
  // Utilities
  function $(sel, ctx){return (ctx||document).querySelector(sel)}
  function $all(sel, ctx){return Array.from((ctx||document).querySelectorAll(sel))}

  // Mobile nav
  const mobileToggle = $('.mobile-toggle');
  const nav = document.querySelector('.nav');
  mobileToggle && mobileToggle.addEventListener('click', function(){
    if(nav.style.display==='flex'){nav.style.display='none'}else{nav.style.display='flex';nav.style.flexDirection='column'}
  });

  // Pricing Comparator
  const priceToggle = $('#priceToggle');
  const priceEls = $all('.price');
  let animFrame = null;

  function animateNumber(el, start, end, duration){
    const startTime = performance.now();
    cancelAnimationFrame(animFrame);
    function tick(now){
      const t = Math.min(1,(now - startTime)/duration);
      const eased = t<.5 ? 2*t*t : -1 + (4-2*t)*t; // simple ease
      const val = Math.round(start + (end - start) * eased);
      el.textContent = '$' + val;
      if(t<1) animFrame = requestAnimationFrame(tick);
    }
    animFrame = requestAnimationFrame(tick);
  }

  function updatePrices(usePackage){
    priceEls.forEach(el=>{
      const monthly = parseInt(el.getAttribute('data-monthly'),10);
      const pack = parseInt(el.getAttribute('data-package'),10);
      const currentText = el.textContent.replace(/[^0-9]/g,'');
      const current = currentText?parseInt(currentText,10): (usePackage?monthly:pack);
      const target = usePackage?pack:monthly;
      animateNumber(el,current,target,500);
    });
  }

  if(priceToggle){
    priceToggle.addEventListener('change', function(){
      updatePrices(this.checked);
    });
    // initial state: monthly
    updatePrices(false);
  }

  // Mood-to-Method selector
  const moodOptions = $('#moodOptions');
  const moodRec = $('#moodApproach');
  const moodCta = $('#moodCta');
  const primaryCta = $('#primaryCta');

  const moodMap = {
    'stressed':{
      text: 'A 5–10 minute grounding inhale sequence with a calming roll-on to support unwinding.',
      cta: {label: 'Book a grounding session', url: '/book.html#grounding'}
    },
    'sleepy':{
      text: 'Gentle uplifting citrus notes and a brief breathing pattern to invite wakefulness.',
      cta: {label: 'Try a morning micro-practice', url: '/services.html#morning'}
    },
    'scattered':{
      text: 'Short focus ritual: a focused inhale, pause, and single-task prompt with a blend to assist attention.',
      cta: {label: 'Join a Focus Atelier', url: '/services.html#focus'}
    },
    'need-clarity':{
      text: 'Clarity mini: a simple ritual to map priorities and a clarifying diffuse for 10 minutes.',
      cta: {label: 'Explore clarity options', url: '/offers.html'}
    }
  };

  function setMood(key, el){
    // update active state
    $all('.mood-btn').forEach(b=>b.classList.remove('active'));
    el.classList.add('active');
    const info = moodMap[key];
    moodRec.textContent = info.text;
    moodCta.textContent = info.cta.label;
    moodCta.setAttribute('href', info.cta.url);
    // also morph the main CTA phrasing briefly
    primaryCta.textContent = info.cta.label;
    primaryCta.setAttribute('href', info.cta.url);
    primaryCta.classList.add('pulse');
    setTimeout(()=>primaryCta.classList.remove('pulse'),800);
  }

  if(moodOptions){
    $all('.mood-btn', moodOptions).forEach(btn=>{
      btn.addEventListener('click', function(e){
        const key = this.getAttribute('data-key');
        setMood(key, this);
      });
    });
  }

  // Initialize with first mood selected
  (function initMood(){
    const first = $all('.mood-btn')[0];
    first && first.click();
  })();

  // Small visual class for CTA pulse
  const style = document.createElement('style');
  style.textContent = '.pulse{animation:pulse 0.8s ease} @keyframes pulse{0%{transform:scale(1)}50%{transform:scale(1.05)}100%{transform:scale(1)}}';
  document.head.appendChild(style);

})();