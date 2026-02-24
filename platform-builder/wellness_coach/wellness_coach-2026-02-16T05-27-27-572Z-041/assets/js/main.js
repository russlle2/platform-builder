// Main interactivity: nav toggle, smooth scroll, testimonial slider
(function(){
  var navToggle = document.getElementById('navToggle');
  var navLinks = document.getElementById('navLinks');
  var yearEl = document.getElementById('year');
  var prev = document.getElementById('prev');
  var next = document.getElementById('next');
  var slides = document.querySelectorAll('.quote');
  var current = 0;

  if(yearEl) yearEl.textContent = new Date().getFullYear();

  if(navToggle && navLinks){
    navToggle.addEventListener('click', function(){
      var open = navLinks.style.display === 'flex';
      navLinks.style.display = open ? '' : 'flex';
      navLinks.style.flexDirection = open ? '' : 'column';
    });
  }

  function showSlide(idx){
    slides.forEach(function(s,i){
      s.classList.toggle('active', i===idx);
    });
  }
  function nextSlide(){ current = (current+1) % slides.length; showSlide(current); }
  function prevSlide(){ current = (current-1+slides.length) % slides.length; showSlide(current); }

  if(next) next.addEventListener('click', nextSlide);
  if(prev) prev.addEventListener('click', prevSlide);

  // Auto rotate testimonials gently
  setInterval(nextSlide, 6000);

  // Smooth anchors
  document.querySelectorAll('a[href^="#"]').forEach(function(a){
    a.addEventListener('click', function(e){
      e.preventDefault();
      var target = document.querySelector(this.getAttribute('href'));
      if(target) target.scrollIntoView({behavior:'smooth',block:'start'});
    });
  });
})();
