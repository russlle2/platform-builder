// Minimal interactivity: nav toggle, smooth scroll, year injection
document.addEventListener('DOMContentLoaded',function(){
  var navToggle=document.getElementById('nav-toggle');
  var navList=document.getElementById('nav-list');
  if(navToggle){
    navToggle.addEventListener('click',function(){
      var expanded = this.getAttribute('aria-expanded') === 'true';
      this.setAttribute('aria-expanded', String(!expanded));
      navList.classList.toggle('show');
    });
  }

  // Smooth scroll for internal links
  document.querySelectorAll('a[href^="#"]').forEach(function(a){
    a.addEventListener('click',function(e){
      e.preventDefault();
      var id = this.getAttribute('href').slice(1);
      var el = document.getElementById(id);
      if(el) el.scrollIntoView({behavior:'smooth',block:'start'});
    });
  });

  // year
  var y = new Date().getFullYear();
  var el = document.getElementById('year');
  if(el) el.textContent = y;

  // Minor accessibility: allow details toggle via keydown
  document.querySelectorAll('.faq details').forEach(function(d){
    d.addEventListener('keydown',function(e){ if(e.key === 'Enter' || e.key === ' ') d.open = !d.open });
  });
});