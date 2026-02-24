(function(){
  // Nav toggle for small screens
  var navToggle = document.querySelector('.nav-toggle');
  var nav = document.querySelector('.nav');
  if(navToggle){
    navToggle.addEventListener('click', function(){
      if(nav.style.display === 'block') nav.style.display = '';
      else nav.style.display = 'block';
    });
  }

  // Mood-to-Method logic (used twice on page)
  var moodMap = {
    overwhelmed: {
      title: 'Shortening decisions: a 3-step pause',
      detail: 'Anchor one 2-minute cue, follow with a single tiny action, and log one quick note. Start for 5 days.',
      cta: 'Book a 15-min pause call',
      url: 'book.html?mood=overwhelmed'
    },
    stalled: {
      title: 'Restart micro momentum',
      detail: 'Choose one visible win (5 mins), practice it twice this week, and schedule a 20-min review.',
      cta: 'Reserve a momentum spot',
      url: 'book.html?mood=stalled'
    },
    wired: {
      title: 'Wind-down rituals that work',
      detail: 'Create a 4-step evening anchor and test it for 10 nights; we’ll refine the order together.',
      cta: 'Start a wind-down plan',
      url: 'book.html?mood=wired'
    }
  };

  function bindMoodOptions(root){
    var options = root.querySelectorAll('.mood');
    var targetSelector = root.getAttribute('data-target');
    var ctaSelector = root.getAttribute('data-cta');
    var target = targetSelector ? document.querySelector(targetSelector) : null;
    var ctaEl = ctaSelector ? document.querySelector(ctaSelector) : null;

    options.forEach(function(btn){
      btn.addEventListener('click', function(){
        var key = btn.getAttribute('data-key');
        var map = moodMap[key];
        if(!map) return;
        // update suggestion
        if(target){
          target.classList.add('fade');
          setTimeout(function(){
            target.innerHTML = '<strong>'+map.title+'</strong> — '+map.detail;
            target.classList.remove('fade');
          },150);
        }
        // update CTA button text and link if available
        if(ctaEl){
          ctaEl.dataset.original = ctaEl.textContent;
          ctaEl.textContent = map.cta;
          ctaEl.setAttribute('href', map.url);
        }
      });
    });
  }

  // Initialize both mood option groups
  var moodGroups = document.querySelectorAll('.mood-options');
  moodGroups.forEach(function(group){ bindMoodOptions(group); });

  // Pricing comparator with animated numbers
  var toggle = document.getElementById('priceToggle');
  var planEls = document.querySelectorAll('.price');
  var animDuration = 400; // ms

  function animateNumber(el, start, end, duration){
    var startTime = null;
    var span = el.querySelector('span');
    if(!span) return;
    function step(ts){
      if(!startTime) startTime = ts;
      var progress = Math.min((ts - startTime)/duration, 1);
      var value = Math.round(start + (end - start) * progress);
      span.textContent = value.toString();
      if(progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function setPrices(usePackage){
    planEls.forEach(function(el){
      var month = parseInt(el.getAttribute('data-month'),10)||0;
      var pack = parseInt(el.getAttribute('data-package'),10)||0;
      var from = parseInt(el.querySelector('span').textContent,10)||0;
      var to = usePackage ? pack : month;
      animateNumber(el, from, to, animDuration);
    });
  }

  if(toggle){
    toggle.addEventListener('change', function(){
      setPrices(toggle.checked);
    });
  }

  // Initialize prices to monthly (ensures correct span values)
  document.addEventListener('DOMContentLoaded', function(){
    setPrices(false);
  });

})();
