(function(){
  // Minimal interactivity: nav toggle, set year, smooth scroll for hash links
  var btn = document.querySelector('.nav-toggle');
  var nav = document.querySelector('nav');
  var navList = document.getElementById('nav-list');
  if(btn){
    btn.addEventListener('click', function(){
      var expanded = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!expanded));
      if(!expanded){
        nav.setAttribute('aria-expanded','true');
        navList.style.display = 'flex';
      } else {
        nav.setAttribute('aria-expanded','false');
        navList.style.display = '';
      }
    });
  }

  // Set year in footer
  var y = new Date().getFullYear();
  var yearEl = document.getElementById('year');
  if(yearEl) yearEl.textContent = y;

  // Smooth scroll for internal links
  document.addEventListener('click', function(e){
    var a = e.target.closest('a');
    if(!a) return;
    var href = a.getAttribute('href');
    if(href && href.startsWith('#')){
      e.preventDefault();
      var target = document.querySelector(href);
      if(target) target.scrollIntoView({behavior:'smooth',block:'start'});
    }
  });

  // Lightweight analytics stub for CTA clicks
  var ctas = document.querySelectorAll('a.cta, a.primary');
  ctas.forEach(function(el){
    el.addEventListener('click', function(){
      try{console.info('CTA clicked:', el.textContent);}catch(e){}
    });
  });
})();