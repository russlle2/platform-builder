(function(){
  // Utilities
  function q(sel, ctx){return (ctx||document).querySelector(sel)}
  function qa(sel, ctx){return Array.from((ctx||document).querySelectorAll(sel))}

  // Year
  q('#year').textContent = new Date().getFullYear();

  // Pricing toggle with animated numbers
  var toggle = q('#priceToggle');
  var priceEls = qa('.price');

  function animateValue(el, start, end, duration){
    var startTimestamp = null; var step = function(timestamp){
      if(!startTimestamp) startTimestamp = timestamp;
      var progress = Math.min((timestamp - startTimestamp) / duration, 1);
      var value = Math.round(start + (end - start) * easeOutCubic(progress));
      el.textContent = '$' + value + (el.dataset.suffix||'');
      if(progress < 1){
        window.requestAnimationFrame(step);
      }
    };
    window.requestAnimationFrame(step);
  }
  function easeOutCubic(t){return (--t)*t*t+1}

  function updatePrices(usePackage){
    priceEls.forEach(function(el){
      var monthly = parseInt(el.dataset.monthly,10) || 0;
      var pack = parseInt(el.dataset.package,10) || 0;
      var from = parseInt(el.textContent.replace(/[^0-9]/g,''),10) || (usePackage?monthly:pack);
      var to = usePackage ? pack : monthly;
      // handle 0 as literal (e.g., not a subscription)
      animateValue(el, from, to, 520);
      el.classList.add('animate');
      setTimeout(function(){el.classList.remove('animate')},600);
    });
  }

  // Initialize prices to monthly by default
  window.addEventListener('load', function(){
    priceEls.forEach(function(el){ el.textContent = '$' + (el.dataset.monthly || '0'); el.dataset.suffix = ''; });
  });

  toggle.addEventListener('change', function(e){ updatePrices(e.target.checked); });

  // Mood-to-Method mapping
  var moodMap = {
    grounded: {
      title: 'Gentle Grounding',
      desc: 'A warm, slightly resinous blend for steady breathing: slow three breaths with mindful focus. Use a low-dilution roll-on or a single inhalation from a tissue. Patch-test first.',
      cta: 'Try a grounding ritual'
    },
    uplifted: {
      title: 'Cooling Rebalance',
      desc: 'A citrus-mint inhalation sequence to support settling from heightened stress. Keep dilution low and avoid direct face application.',
      cta: 'Explore calming approaches'
    },
    focus: {
      title: 'Clarify & Center',
      desc: 'A crisp herb-citrus pairing for focused breaths and short desk spritz. May support attention for short windows without clinical claims.',
      cta: 'Get a focus mini-session'
    },
    rest: {
      title: 'Soothing Wind-down',
      desc: 'A soft, floral base in very low dilution for pre-sleep routine. Use near-sleep diffusion at low intensity; avoid direct skin if sensitive.',
      cta: 'Start a sleep-friendly practice'
    }
  };

  // First mood selector (buttons)
  qa('.mood').forEach(function(btn){
    btn.addEventListener('click', function(){
      var key = btn.dataset.key;
      var data = moodMap[key];
      if(!data) return;
      var reco = q('#mood-reco');
      q('.reco-title', reco).textContent = data.title || '';
      q('.reco-desc', reco).textContent = data.desc || data.desc;
      var cta = q('#mood-cta');
      cta.textContent = data.cta || '{{PRIMARY_CTA_LABEL}}';
      // subtle pulse animation
      reco.animate([{transform:'translateY(6px)',opacity:0},{transform:'translateY(0)',opacity:1}],{duration:220,easing:'ease-out'});
    });
  });

  // Second mood selector (select) updates card
  var select = q('#mood-select');
  if(select){
    select.addEventListener('change', function(){
      var key = select.value; var data = moodMap[key] || {};
      q('#mood-card-title').textContent = data.title || '';
      q('#mood-card-text').textContent = data.desc || '';
      q('#mood-card-cta').textContent = data.cta || '{{PRIMARY_CTA_LABEL}}';
    });
  }

  // Simple nav toggle for small screens
  var navToggle = q('.nav-toggle');
  navToggle && navToggle.addEventListener('click', function(){
    var nav = q('.main-nav');
    if(nav.style.display === 'flex'){ nav.style.display='none'; } else { nav.style.display='flex'; nav.style.flexDirection='column'; }
  });

})();