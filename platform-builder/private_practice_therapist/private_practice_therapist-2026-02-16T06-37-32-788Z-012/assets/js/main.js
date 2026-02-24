// Minimal JS: menu toggle and smooth scroll
document.addEventListener('DOMContentLoaded',function(){
  var toggle=document.getElementById('menuToggle');
  var nav=document.getElementById('mainNav');
  if(toggle){
    toggle.addEventListener('click',function(){
      var expanded = this.getAttribute('aria-expanded') === 'true';
      this.setAttribute('aria-expanded', String(!expanded));
      if(nav.style.display === 'block'){ nav.style.display=''; }
      else { nav.style.display='block'; }
    });
  }

  // Smooth scroll for internal links
  document.querySelectorAll('a[href^="#"]').forEach(function(link){
    link.addEventListener('click',function(e){
      e.preventDefault();
      var target = document.querySelector(this.getAttribute('href'));
      if(target){ target.scrollIntoView({behavior:'smooth',block:'start'}); }
    });
  });

  // Basic accessible focus for skip to main (if present)
});
