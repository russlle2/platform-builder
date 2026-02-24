(function(){
  // Basic UI behaviors: mobile nav, testimonial carousel, dynamic year
  var navToggle = document.getElementById('navToggle');
  var navList = document.getElementById('navList');
  if(navToggle){
    navToggle.addEventListener('click', function(){
      var expanded = this.getAttribute('aria-expanded') === 'true';
      this.setAttribute('aria-expanded', String(!expanded));
      if(navList.style.display === 'flex'){
        navList.style.display = '';
      } else {
        navList.style.display = 'flex';
      }
    });
  }

  // Testimonials carousel
  var testiWrap = document.getElementById('testiWrap');
  var testimonials = testiWrap ? testiWrap.querySelectorAll('.testi') : [];
  var idx = 0;
  function showTesti(i){
    testimonials.forEach(function(t){t.classList.remove('active');});
    if(testimonials[i]) testimonials[i].classList.add('active');
  }
  if(testimonials.length){
    showTesti(0);
    document.getElementById('prevTesti').addEventListener('click', function(){ idx = (idx-1+testimonials.length)%testimonials.length; showTesti(idx); });
    document.getElementById('nextTesti').addEventListener('click', function(){ idx = (idx+1)%testimonials.length; showTesti(idx); });
    // auto-rotate
    setInterval(function(){ idx = (idx+1)%testimonials.length; showTesti(idx); }, 7000);
  }

  // Fill year
  var yearEl = document.getElementById('year'); if(yearEl) yearEl.textContent = new Date().getFullYear();

  // Smooth scroll for internal links
  document.querySelectorAll('a[href^="#"]').forEach(function(a){
    a.addEventListener('click', function(e){
      var id = this.getAttribute('href').slice(1);
      var el = document.getElementById(id);
      if(el){ e.preventDefault(); el.scrollIntoView({behavior:'smooth',block:'start'}); }
    });
  });
})();