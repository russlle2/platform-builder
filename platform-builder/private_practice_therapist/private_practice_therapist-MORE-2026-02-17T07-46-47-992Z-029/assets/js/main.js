(function(){
  // Basic interactive behaviors: mobile nav, rotating testimonials, badges tooltips handled by CSS, pricing comparator
  document.addEventListener('DOMContentLoaded',function(){
    // year
    var y=document.getElementById('year'); if(y) y.textContent=new Date().getFullYear();

    // mobile nav
    var mt=document.querySelector('.mobile-toggle');
    var nav=document.querySelector('.main-nav');
    if(mt && nav){
      mt.addEventListener('click',function(){
        var open = this.getAttribute('aria-expanded') === 'true';
        this.setAttribute('aria-expanded', String(!open));
        nav.style.display = open ? 'none' : 'flex';
      });
    }

    // Testimonials rotation
    var testimonials = document.querySelectorAll('.testimonial');
    var nextBtn = document.querySelector('.gallery-controls .next');
    var prevBtn = document.querySelector('.gallery-controls .prev');
    var pauseBtn = document.querySelector('.gallery-controls .pause');
    var current = 0;
    var interval = 6000;
    var timer = null;

    function showTest(i){
      testimonials.forEach(function(t){t.classList.remove('active');});
      var t = testimonials[i]; if(t) t.classList.add('active');
      current = i;
    }
    function next(){ showTest((current+1)%testimonials.length); }
    function prev(){ showTest((current-1+testimonials.length)%testimonials.length); }
    function start(){ stop(); timer=setInterval(next, interval); pauseBtn && pauseBtn.setAttribute('aria-pressed','false'); }
    function stop(){ if(timer){clearInterval(timer); timer=null;} pauseBtn && pauseBtn.setAttribute('aria-pressed','true'); }

    if(testimonials.length){ start(); }
    if(nextBtn) nextBtn.addEventListener('click', function(){ next(); stop(); });
    if(prevBtn) prevBtn.addEventListener('click', function(){ prev(); stop(); });
    if(pauseBtn) pauseBtn.addEventListener('click', function(){ if(timer) stop(); else start(); });

    // Keyboard accessibility for testimonials
    document.querySelectorAll('.badge').forEach(function(b){
      b.addEventListener('keydown',function(e){ if(e.key==='Enter' || e.key===' ') { e.preventDefault(); this.querySelector('.tooltip') && (this.querySelector('.tooltip').style.visibility='visible'); }});
    });

    // Pricing comparator with animated numbers
    var freqButtons = document.querySelectorAll('.pricing-comparator .freq');
    var priceItems = document.querySelectorAll('.pricing-comparator .price-item');
    function animateNumber(el, from, to){
      var start = null; var duration = 420; from = Number(from); to = Number(to);
      function step(ts){
        if(!start) start = ts; var progress = Math.min((ts - start) / duration,1);
        var val = Math.round(from + (to - from) * progress);
        el.textContent = val;
        if(progress < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }
    freqButtons.forEach(function(btn){
      btn.addEventListener('click', function(){
        freqButtons.forEach(function(b){b.classList.remove('active');});
        this.classList.add('active');
        var freq = this.getAttribute('data-frequency');
        priceItems.forEach(function(item){
          var span = item.querySelector('.num');
          var from = Number(span.textContent) || 0;
          var to = Number(item.getAttribute('data-' + freq));
          animateNumber(span, from, to);
        });
      });
    });

    // Initialize displayed numbers to monthly
    var initBtn = document.querySelector('.pricing-comparator .freq.active');
    if(initBtn){ initBtn.click(); }
  });
})();