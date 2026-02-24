// Main JS: rotates testimonials, badge tooltips, pricing toggle animation, mobile nav
document.addEventListener('DOMContentLoaded',function(){
  // Mobile nav
  var toggle = document.querySelector('.mobile-toggle');
  if(toggle){
    toggle.addEventListener('click',function(){
      var nav = document.querySelector('.nav');
      if(nav.style.display === 'flex'){nav.style.display='none'} else {nav.style.display='flex';nav.style.flexDirection='column'}
    });
  }

  // Testimonial rotator
  (function(){
    var rotator = document.getElementById('testimonialRotator');
    if(!rotator) return;
    var quotes = Array.from(rotator.querySelectorAll('.quote'));
    var idx = 0;
    function show(i){
      quotes.forEach(function(q,ii){
        q.classList.toggle('hidden', ii!==i);
      });
    }
    show(0);
    setInterval(function(){
      idx = (idx+1)%quotes.length;
      show(idx);
    },4000);
  })();

  // Badges with tooltips
  (function(){
    var badges = document.querySelectorAll('#credBadges .badge');
    badges.forEach(function(b){
      var tipText = b.getAttribute('data-tip');
      if(!tipText) return;
      var tip = document.createElement('div');
      tip.className = 'tip';
      tip.textContent = tipText;
      b.appendChild(tip);
      b.addEventListener('mouseenter',function(){ b.setAttribute('data-show-tip','true'); });
      b.addEventListener('mouseleave',function(){ b.setAttribute('data-show-tip','false'); });
      b.addEventListener('focus',function(){ b.setAttribute('data-show-tip','true'); });
      b.addEventListener('blur',function(){ b.setAttribute('data-show-tip','false'); });
    });
  })();

  // Pricing comparator (monthly vs package) with animated numbers
  (function(){
    var toggle = document.getElementById('billingToggle');
    var nums = document.querySelectorAll('.price-amount .num');
    function animateTo(el, target){
      var start = parseInt(el.textContent,10) || 0;
      var end = parseInt(target,10);
      var duration = 420;
      var startTime = performance.now();
      function step(t){
        var p = Math.min(1,(t-startTime)/duration);
        var val = Math.round(start + (end-start)*p);
        el.textContent = val;
        if(p<1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }
    function updatePrices(usePackage){
      document.querySelectorAll('.price-amount').forEach(function(pa){
        var monthly = pa.getAttribute('data-monthly');
        var pack = pa.getAttribute('data-package');
        var target = usePackage ? pack : monthly;
        var displayEl = pa.querySelector('.num');
        animateTo(displayEl, target);
      });
    }
    if(toggle){
      toggle.addEventListener('change',function(e){
        updatePrices(e.target.checked);
      });
      // initial sync: unchecked = monthly
      updatePrices(false);
    }
  })();

  // Accessibility: set current year
  var y = document.getElementById('year'); if(y) y.textContent = new Date().getFullYear();

});
