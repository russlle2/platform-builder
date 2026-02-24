(function(){
  // small interaction: year, nav toggle, reveal
  document.addEventListener('DOMContentLoaded',function(){
    var y = document.getElementById('year'); if(y) y.textContent = new Date().getFullYear();

    var toggle = document.getElementById('nav-toggle');
    var nav = document.getElementById('nav-list');
    if(toggle && nav){
      toggle.addEventListener('click',function(){
        var open = this.getAttribute('aria-expanded') === 'true';
        this.setAttribute('aria-expanded', String(!open));
        nav.style.display = open ? 'none' : 'flex';
      });
    }

    // simple intersection reveal for elements with fade-in class
    var els = document.querySelectorAll('section, .case, .pillar, details');
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if(e.isIntersecting){
          e.target.classList.add('visible');
        }
      });
    },{threshold:0.08});
    els.forEach(function(el){el.classList.add('fade-in');io.observe(el);});

    // smooth scroll for CTA links
    document.querySelectorAll('a[href^="#"]').forEach(function(a){
      a.addEventListener('click',function(e){
        var t = document.querySelector(this.getAttribute('href'));
        if(t){ e.preventDefault(); t.scrollIntoView({behavior:'smooth',block:'start'}); }
      });
    });
  });
})();