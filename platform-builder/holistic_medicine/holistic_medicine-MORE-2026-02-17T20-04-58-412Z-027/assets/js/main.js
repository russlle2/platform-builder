(function(){
  // Pricing comparator: toggle and animate numbers
  function animateNumber(el, start, end, duration){
    var startTime=null; var diff=end-start;
    function step(ts){
      if(!startTime) startTime=ts;
      var progress=Math.min((ts-startTime)/duration,1);
      var value=Math.round(start + diff * easeOutCubic(progress));
      el.textContent = value;
      if(progress<1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  function easeOutCubic(t){ return (--t)*t*t+1 }

  var toggleBtns = document.querySelectorAll('.toggle-btn');
  var animEls = document.querySelectorAll('.anim, .price-num');
  var currentMode = 'monthly';

  function setMode(mode){
    currentMode = mode;
    toggleBtns.forEach(function(b){b.classList.toggle('active', b.dataset.mode===mode)});
    animEls.forEach(function(el){
      var from = parseInt(el.textContent,10) || 0;
      var to = parseInt(el.dataset[mode],10) || 0;
      animateNumber(el, from, to, 500);
    });
  }
  toggleBtns.forEach(function(btn){
    btn.addEventListener('click', function(){ setMode(this.dataset.mode); });
  });

  // Initialize with monthly mode after DOM ready
  document.addEventListener('DOMContentLoaded', function(){
    setMode('monthly');
  });

  // Proof Gallery rotation
  var gallery = document.querySelector('.gallery');
  if(gallery){
    var slides = gallery.querySelectorAll('.slide');
    var thumbs = document.querySelectorAll('.thumb');
    var index = 0; var interval = 6000; var rot;
    function show(i){
      slides.forEach(function(s){ s.classList.toggle('active', +s.dataset.index===i); });
      thumbs.forEach(function(t){ t.classList.toggle('active', +t.dataset.index===i); });
      index = i;
    }
    function next(){ show((index+1) % slides.length); }
    thumbs.forEach(function(t){ t.addEventListener('click', function(){ clearInterval(rot); show(+this.dataset.index); rot=setInterval(next, interval); }); });
    rot = setInterval(next, interval);
  }

  // Mobile nav toggle
  var mobileToggle = document.querySelector('.mobile-toggle');
  var mainNav = document.querySelector('.main-nav');
  if(mobileToggle && mainNav){
    mobileToggle.addEventListener('click', function(){
      var expanded = this.getAttribute('aria-expanded') === 'true';
      this.setAttribute('aria-expanded', String(!expanded));
      mainNav.style.display = expanded ? 'none' : 'flex';
    });
  }

  // Simple deep-link CTA handler (ensures placeholders still work if configured)
  var ctas = document.querySelectorAll('a[href^="{{PRIMARY_CTA_URL}}"]');
  // No-op: placeholder present in HTML until templated

})();