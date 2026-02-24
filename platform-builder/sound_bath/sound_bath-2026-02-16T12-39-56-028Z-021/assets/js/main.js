(function(){
  // Mobile nav toggle
  var btn=document.querySelector('.nav-toggle');
  var nav=document.getElementById('main-nav');
  if(btn && nav){
    btn.addEventListener('click',function(){
      var expanded = this.getAttribute('aria-expanded') === 'true';
      this.setAttribute('aria-expanded', String(!expanded));
      nav.style.display = expanded ? '' : 'flex';
      nav.style.flexDirection = expanded ? '' : 'column';
    });
  }

  // Smooth scroll for internal links
  document.addEventListener('click',function(e){
    var a = e.target.closest('a');
    if(!a) return;
    var href = a.getAttribute('href')||'';
    if(href.indexOf('#')===0){
      var id = href.slice(1);
      var el = document.getElementById(id);
      if(el){
        e.preventDefault();
        el.scrollIntoView({behavior:'smooth',block:'start'});
      }
    }
  });

  // Accessibility: reduce motion if requested
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){
    document.documentElement.style.scrollBehavior = 'auto';
  }
})();