document.addEventListener('DOMContentLoaded', function(){
  // Pricing comparator toggle
  var toggleBtns = Array.from(document.querySelectorAll('.price-toggle button'));
  var priceEls = Array.from(document.querySelectorAll('.price'));

  function animateNumber(el, from, to){
    var span = el.querySelector('span');
    var duration = 420;
    var start = null;
    function step(ts){
      if(!start) start = ts;
      var progress = Math.min((ts - start)/duration, 1);
      var value = Math.round(from + (to - from) * progress);
      span.textContent = value;
      if(progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  toggleBtns.forEach(function(btn){
    btn.addEventListener('click', function(){
      toggleBtns.forEach(function(b){ b.classList.remove('active'); b.setAttribute('aria-pressed','false'); });
      btn.classList.add('active'); btn.setAttribute('aria-pressed','true');
      var mode = btn.getAttribute('data-mode');
      priceEls.forEach(function(p){
        var current = parseInt(p.querySelector('span').textContent, 10) || 0;
        var target = parseInt(p.getAttribute(mode === 'monthly' ? 'data-monthly' : 'data-package'), 10) || 0;
        animateNumber(p, current, target);
        var small = p.querySelector('small');
        if(mode === 'monthly'){
          // try to pick a suitable label
          if(target > 0) small.textContent = '/mo'; else small.textContent = '/session';
        } else {
          small.textContent = '/package';
        }
      });
    });
  });

  // Mood-to-Method selector
  var moodBtns = Array.from(document.querySelectorAll('.mood-selector button'));
  var methodTitle = document.querySelector('.method-title');
  var methodDesc = document.querySelector('.method-desc');
  var methodCta = document.querySelector('.method-cta');

  var map = {
    overwhelmed: {
      title: 'Calm & Stabilize',
      desc: 'Short, steady sessions to reduce immediate load and create small, safety-focused steps.',
      cta: 'Request a short consult'
    },
    stuck: {
      title: 'Map & Move',
      desc: 'A focused series that names patterns and tests small changes to shift them over time.',
      cta: 'Explore focused series'
    },
    transition: {
      title: 'Transition Support',
      desc: 'Flexible planning sessions to balance practical tasks and emotional transitions.',
      cta: 'Talk about a plan'
    },
    curious: {
      title: 'Clarity Sessions',
      desc: 'One or two targeted sessions to surface priorities and decide next steps with greater confidence.',
      cta: 'Book a clarity session'
    }
  };

  moodBtns.forEach(function(b){
    b.addEventListener('click', function(){
      moodBtns.forEach(function(x){ x.classList.remove('active'); });
      b.classList.add('active');
      var m = b.getAttribute('data-mood');
      var data = map[m] || {};
      // small morph animation
      [methodTitle, methodDesc, methodCta].forEach(function(n){ n.classList.add('mutate'); });
      setTimeout(function(){
        methodTitle.textContent = data.title || 'Recommended';
        methodDesc.textContent = data.desc || '';
        methodCta.textContent = data.cta || 'Start a conversation';
        // Update CTA target with a query hint to carry the chosen focus
        methodCta.setAttribute('href', 'book.html?focus=' + encodeURIComponent(data.title || 'Conversation'));
        [methodTitle, methodDesc, methodCta].forEach(function(n){ n.classList.remove('mutate'); });
      }, 180);
    });
  });

  // Initialize numeric displays to monthly values
  var initialMode = 'monthly';
  priceEls.forEach(function(p){
    var v = parseInt(p.getAttribute('data-' + initialMode), 10) || 0;
    p.querySelector('span').textContent = v;
  });
});