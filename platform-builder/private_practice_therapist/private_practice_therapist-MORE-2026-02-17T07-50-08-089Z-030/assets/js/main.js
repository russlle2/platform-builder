(function(){
  // Mood-to-Method selector
  var moodButtons = document.querySelectorAll('#mood .mood-options button');
  var moodResultTitle = document.querySelector('#mood-result .method-title');
  var moodResultCopy = document.querySelector('#mood-result .method-copy');
  var moodCta = document.getElementById('mood-cta');
  var bottomCta = document.getElementById('primary-cta-bottom');

  var moods = {
    overwhelmed: {
      title: 'Stabilizing plan',
      copy: 'Short, practical steps focused on immediate coping and reducing reactivity. We set a few small, achievable goals and check progress session-to-session.',
      cta: 'Schedule a stabilizing session'
    },
    stuck: {
      title: 'Exploratory focus',
      copy: 'A series that maps patterns, tests small changes, and builds momentum. We prioritize clarity and practical experiments between sessions.',
      cta: 'Book an exploratory series'
    },
    transitioning: {
      title: 'Transition guidance',
      copy: 'Support that helps you navigate choices and new roles with realistic planning and emotional steadiness.',
      cta: 'Plan transitional support'
    },
    coping: {
      title: 'Maintenance check-ins',
      copy: 'Short periodic check-ins to maintain gains and troubleshoot new challenges as they arise.',
      cta: 'Start regular check-ins'
    }
  };

  function selectMood(key, button){
    // update ARIA and styles
    moodButtons.forEach(function(b){
      b.setAttribute('aria-checked','false');
      b.classList.remove('active');
    });
    if(button){ button.setAttribute('aria-checked','true'); button.classList.add('active'); }

    var data = moods[key];
    if(!data) return;
    // morph content
    moodResultTitle.textContent = data.title;
    moodResultCopy.textContent = data.copy;
    moodCta.textContent = data.cta;
    // create a contextual link (append a query for tracking, not external)
    var base = '{{PRIMARY_CTA_URL}}';
    moodCta.href = base + '?focus=' + encodeURIComponent(key);
    // also update bottom CTA to be more specific but keep base
    if(bottomCta){ bottomCta.textContent = data.cta; bottomCta.href = base + '?focus=' + encodeURIComponent(key); }
  }

  moodButtons.forEach(function(b){
    b.addEventListener('click', function(){
      var key = b.getAttribute('data-key');
      selectMood(key,b);
    });
    b.addEventListener('keydown', function(e){ if(e.key==='Enter' || e.key===' '){ e.preventDefault(); b.click(); } });
  });

  // Pricing comparator animation
  var toggle = document.getElementById('price-toggle');
  var amounts = document.querySelectorAll('.price-amount');
  var animating = false;

  function animateNumber(el, from, to, duration){
    if(animating) return; animating = true;
    var start = null;
    var diff = to - from;
    function step(ts){
      if(!start) start = ts;
      var progress = Math.min((ts - start)/duration, 1);
      var current = Math.round(from + diff * easeOutCubic(progress));
      el.textContent = '$' + current;
      if(progress < 1) requestAnimationFrame(step); else animating = false;
    }
    requestAnimationFrame(step);
  }
  function easeOutCubic(t){ return (--t)*t*t + 1 }

  function updatePrices(usePackage){
    amounts.forEach(function(el){
      var monthly = parseInt(el.getAttribute('data-monthly'),10);
      var pack = parseInt(el.getAttribute('data-package'),10);
      var from = parseInt(el.textContent.replace(/[^0-9]/g,''),10) || monthly;
      var to = usePackage ? pack : monthly;
      animateNumber(el, from, to, 550);
    });
  }

  if(toggle){
    toggle.addEventListener('change', function(){ updatePrices(toggle.checked); });
    // initialize from DOM data attributes
    // ensure visible values match monthly by default
    amounts.forEach(function(el){ el.textContent = '$' + el.getAttribute('data-monthly'); });
  }

  // Accessibility: keyboard focus styles for mood options
  document.addEventListener('keydown', function(e){
    if(e.key === 'Tab') document.body.classList.add('user-tab');
  });

  // Expose a small debug hook
  window.__therapyDemo = { selectMood: selectMood, updatePrices: updatePrices };
})();
