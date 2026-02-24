(function(){
  'use strict';
  // Mobile nav
  var navToggle = document.querySelector('.nav-toggle');
  var navList = document.getElementById('menu');
  if(navToggle){
    navToggle.addEventListener('click', function(){
      var vis = navList.getAttribute('data-visible') === 'true';
      navList.setAttribute('data-visible', (!vis).toString());
      navToggle.setAttribute('aria-expanded', (!vis).toString());
    });
  }

  // Testimonial rotator
  var testiIndex = 0;
  var testis = Array.prototype.slice.call(document.querySelectorAll('.testi-rotator .testi'));
  var nextBtn = document.querySelector('.rot-next');
  var prevBtn = document.querySelector('.rot-prev');
  function showTesti(i){
    testis.forEach(function(t){ t.classList.add('hidden'); });
    var node = testis[i];
    if(node){ node.classList.remove('hidden'); }
  }
  function advanceTesti(dir){
    testiIndex = (testiIndex + dir + testis.length) % testis.length;
    showTesti(testiIndex);
  }
  if(nextBtn) nextBtn.addEventListener('click', function(){ advanceTesti(1); });
  if(prevBtn) prevBtn.addEventListener('click', function(){ advanceTesti(-1); });
  // auto-rotate every 7s
  setInterval(function(){ advanceTesti(1); }, 7000);

  // Badge tooltips
  var badges = document.querySelectorAll('.badge');
  var tipEl;
  badges.forEach(function(b){
    b.addEventListener('mouseenter', function(e){
      var text = b.getAttribute('data-tooltip');
      tipEl = document.createElement('div');
      tipEl.className = 'tooltip';
      tipEl.textContent = text;
      document.body.appendChild(tipEl);
      var rect = b.getBoundingClientRect();
      tipEl.style.left = (rect.left + rect.width/2 - tipEl.offsetWidth/2) + 'px';
      tipEl.style.top = (rect.top - tipEl.offsetHeight - 8) + 'px';
    });
    b.addEventListener('mouseleave', function(){ if(tipEl){ tipEl.remove(); tipEl=null; } });
  });

  // Pricing comparator with animated numbers
  var toggleBtns = document.querySelectorAll('.toggle-btn');
  var priceEls = document.querySelectorAll('.price-card .price');
  var currentMode = 'package';

  function animateNumber(el, start, end, duration){
    var startTime = null;
    function step(ts){
      if(!startTime) startTime = ts;
      var progress = Math.min((ts - startTime)/duration, 1);
      var value = Math.round(start + (end - start) * easeOutCubic(progress));
      el.textContent = '$' + value;
      if(progress < 1){ requestAnimationFrame(step); }
    }
    requestAnimationFrame(step);
  }
  function easeOutCubic(t){ return 1 - Math.pow(1 - t, 3); }

  function switchPricing(mode){
    priceEls.forEach(function(el){
      var pkg = parseInt(el.getAttribute('data-package'),10) || 0;
      var mon = parseInt(el.getAttribute('data-monthly'),10) || pkg;
      var from = parseInt(el.textContent.replace(/[^0-9]/g,''),10) || (mode=== 'package' ? mon : pkg);
      var to = (mode === 'package') ? pkg : mon;
      animateNumber(el, from, to, 600);
    });
  }

  toggleBtns.forEach(function(btn){
    btn.addEventListener('click', function(){
      toggleBtns.forEach(function(b){ b.classList.remove('active'); b.setAttribute('aria-pressed','false'); });
      btn.classList.add('active');
      btn.setAttribute('aria-pressed','true');
      var mode = btn.getAttribute('data-mode');
      if(mode === currentMode) return;
      currentMode = mode;
      switchPricing(mode);
    });
  });

  // Initialize prices to package
  document.addEventListener('DOMContentLoaded', function(){
    switchPricing('package');
  });

})();