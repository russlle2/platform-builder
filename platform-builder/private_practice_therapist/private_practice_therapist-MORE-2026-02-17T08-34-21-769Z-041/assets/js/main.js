(function(){
  // Simple testimonial rotator for the mini gallery and the large gallery
  function rotateSlides(containerSelector, interval){
    var container=document.querySelector(containerSelector);
    if(!container) return;
    var slides=[].slice.call(container.querySelectorAll('.slide, .t-slide'));
    if(!slides.length) return;
    var current=0;
    function show(i){
      slides.forEach(function(s,idx){
        s.classList.toggle('active', idx===i);
      });
    }
    show(0);
    var timer=setInterval(function(){
      current=(current+1)%slides.length;
      show(current);
    }, interval||6000);
    return {stop:function(){clearInterval(timer)}};
  }

  // Rotate mini proof slides
  rotateSlides('#proof-gallery .slides',6000);
  // Rotate larger testimonials
  var big = rotateSlides('.slides-large',7000);

  // Gallery manual controls
  document.getElementById('prev-test') && document.getElementById('prev-test').addEventListener('click', function(){
    var slides = document.querySelectorAll('.slides-large .t-slide');
    var activeIndex = Array.prototype.findIndex.call(slides, function(s){return s.classList.contains('active')});
    var next = (activeIndex - 1 + slides.length) % slides.length;
    slides[activeIndex].classList.remove('active');
    slides[next].classList.add('active');
  });
  document.getElementById('next-test') && document.getElementById('next-test').addEventListener('click', function(){
    var slides = document.querySelectorAll('.slides-large .t-slide');
    var activeIndex = Array.prototype.findIndex.call(slides, function(s){return s.classList.contains('active')});
    var next = (activeIndex + 1) % slides.length;
    slides[activeIndex].classList.remove('active');
    slides[next].classList.add('active');
  });

  // Accordion behaviour
  var accordions = document.querySelectorAll('.accordion .acc-toggle');
  accordions.forEach(function(btn){
    btn.addEventListener('click', function(){
      var expanded = btn.getAttribute('aria-expanded') === 'true';
      // collapse all for a simple single-open pattern
      accordions.forEach(function(b){b.setAttribute('aria-expanded','false');});
      if(!expanded){
        btn.setAttribute('aria-expanded','true');
      }
    });
    // allow keyboard enter/space
    btn.addEventListener('keydown', function(e){
      if(e.key === 'Enter' || e.key === ' '){
        e.preventDefault(); btn.click();
      }
    });
  });

  // Progressive enhancement: badges tooltips already via CSS, but add accessible title as well
  var badges = document.querySelectorAll('.badge[data-tooltip]');
  badges.forEach(function(b){
    if(!b.getAttribute('aria-label')) b.setAttribute('aria-label', b.getAttribute('data-tooltip'));
  });

  // Small accessibility: ensure focus outlines
  document.body.addEventListener('keyup', function(e){ if(e.key==='Tab') document.body.classList.add('show-focus'); });

})();
