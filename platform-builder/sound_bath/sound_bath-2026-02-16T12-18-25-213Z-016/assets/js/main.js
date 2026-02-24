(function(){
  // Simple UI: year inject, mobile nav toggle, smooth scroll
  document.addEventListener('DOMContentLoaded', function(){
    var y = new Date().getFullYear();
    var el = document.getElementById('year'); if(el) el.textContent = y;

    var toggle = document.querySelector('.nav-toggle');
    var nav = document.querySelector('.main-nav');
    if(toggle && nav){
      toggle.addEventListener('click', function(){
        var open = this.getAttribute('aria-expanded') === 'true';
        this.setAttribute('aria-expanded', String(!open));
        nav.style.display = open ? 'none' : 'block';
      });
    }

    // smooth scroll for internal anchors
    document.querySelectorAll('a[href^="#"]').forEach(function(a){
      a.addEventListener('click', function(e){
        var id = this.getAttribute('href').slice(1);
        var target = document.getElementById(id);
        if(target){
          e.preventDefault(); target.scrollIntoView({behavior:'smooth',block:'start'});
        }
      });
    });

    // Reduce motion if user prefers
    if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){
      document.querySelectorAll('.kicker').forEach(function(n){n.style.animation='none'});
    }
  });
})();