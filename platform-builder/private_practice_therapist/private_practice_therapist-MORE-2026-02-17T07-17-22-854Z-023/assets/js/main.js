(function(){
  // Utilities
  function $(sel, ctx){ return (ctx||document).querySelector(sel) }
  function $all(sel, ctx){ return Array.from((ctx||document).querySelectorAll(sel)) }

  // Year in footer
  document.getElementById('year').textContent = new Date().getFullYear();

  // Nav toggle for mobile
  var navToggle = $('.nav-toggle');
  var navList = $('.nav-list');
  if(navToggle){
    navToggle.addEventListener('click', function(){
      var open = this.getAttribute('aria-expanded') === 'true';
      this.setAttribute('aria-expanded', !open);
      navList.style.display = open ? '' : 'flex';
    });
  }

  // Pricing comparator
  var priceSwitch = document.getElementById('priceSwitch');
  var prices = $all('.price-card .price');

  function animateNumber(el, from, to){
    var start = performance.now();
    var dur = 600;
    el.setAttribute('data-anim','true');
    function step(ts){
      var t = Math.min(1,(ts-start)/dur);
      var val = Math.round(from + (to - from) * easeOutCubic(t));
      el.textContent = formatCurrency(val);
      if(t < 1) requestAnimationFrame(step);
      else el.removeAttribute('data-anim');
    }
    requestAnimationFrame(step);
  }
  function easeOutCubic(t){ return 1 - Math.pow(1 - t, 3) }
  function formatCurrency(n){
    if(n >= 1000) return '$' + (n/1000).toFixed(n%1000===0?0:1) + 'k';
    return '$' + n;
  }

  function updatePrices(usePackage){
    prices.forEach(function(p){
      var base = usePackage ? Number(p.getAttribute('data-package')) : Number(p.getAttribute('data-month'));
      var currentText = p.textContent.replace(/[^0-9.]/g,'');
      var current = Number(currentText) || 0;
      animateNumber(p, current, base);
    });
  }

  if(priceSwitch){
    // initialize from checkbox
    updatePrices(priceSwitch.checked);
    priceSwitch.addEventListener('change', function(){
      updatePrices(this.checked);
    });
  }

  // Mood-to-Method selector
  var moodButtons = $all('.mood');
  var methodName = $('#methodName');
  var methodDesc = $('#methodDesc');
  var methodTitle = $('#methodTitle');
  var methodCta = $('#methodCta');
  var primaryCta = $('#primaryCta');
  var finalCta = $('#finalCta');

  var methods = {
    'steady-work':{
      title:'Short series for pacing',
      desc:'A regular, weekly frame to work on overwhelm, pacing, and pragmatic routines. We focus on making small adjustments and noticing what changes.',
      ctaText:'Book a short series',
      ctaUrl:'{{PRIMARY_CTA_URL}}'
    },
    'clarity-sprint':{
      title:'4-session clarity sprint',
      desc:'A tightly focused package to map a decision, test a few steps, and leave with a clear plan you can try between sessions.',
      ctaText:'Reserve a guided sprint',
      ctaUrl:'{{PRIMARY_CTA_URL}}'
    },
    'transition-lab':{
      title:'Intensive planning block',
      desc:'Concentrated sessions designed to clarify major choices and practical next steps. Useful when life is shifting quickly.',
      ctaText:'Plan an intensive',
      ctaUrl:'{{PRIMARY_CTA_URL}}'
    },
    'managing-anxiety':{
      title:'Focused package for anxious moments',
      desc:'Short-term tools and in-session skill practice to reduce reactivity and create a steadier base for decision-making.',
      ctaText:'Start a focused package',
      ctaUrl:'{{PRIMARY_CTA_URL}}'
    }
  };

  function clearActive(){
    moodButtons.forEach(function(b){ b.classList.remove('active') })
  }

  moodButtons.forEach(function(btn){
    btn.addEventListener('click', function(){
      clearActive();
      this.classList.add('active');
      var methodKey = this.getAttribute('data-method');
      var method = methods[methodKey];
      if(!method) return;
      // Morph text with subtle animation
      methodName.style.opacity = 0;
      methodDesc.style.opacity = 0;
      setTimeout(function(){
        methodName.textContent = method.title;
        methodDesc.textContent = method.desc;
        methodCta.textContent = method.ctaText;
        methodCta.href = method.ctaUrl;
        // Also update header CTA to feel contextual
        primaryCta.textContent = method.ctaText;
        primaryCta.href = method.ctaUrl;
        finalCta.textContent = method.ctaText;
        finalCta.href = method.ctaUrl;
        methodName.style.opacity = 1;
        methodDesc.style.opacity = 1;
      }, 220);
    });
  });

  // Accessibility: keyboard support for mood buttons
  moodButtons.forEach(function(b){
    b.setAttribute('tabindex', '0');
    b.addEventListener('keydown', function(e){ if(e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.click() } });
  });

})();