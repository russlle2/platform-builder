(function(){
  // Mobile nav toggle
  var btn = document.querySelector('.nav-toggle');
  var menu = document.getElementById('site-menu');
  btn && btn.addEventListener('click', function(){
    var expanded = this.getAttribute('aria-expanded') === 'true';
    this.setAttribute('aria-expanded', String(!expanded));
    menu.classList.toggle('show');
  });

  // Smooth scroll for internal links
  document.querySelectorAll('a[href^="#"]').forEach(function(a){
    a.addEventListener('click', function(e){
      e.preventDefault();
      var id = this.getAttribute('href').slice(1);
      var el = document.getElementById(id);
      if(el){ el.scrollIntoView({behavior:'smooth',block:'start'}); }
    });
  });

  // Primary CTA clicks (progressive enhancement)
  document.querySelectorAll('a[href="{{PRIMARY_CTA_URL}}"]').forEach(function(a){
    a.addEventListener('click', function(e){
      // keep default navigation, but track or show friendly message if needed
      console.log('Primary CTA clicked');
    });
  });
})();