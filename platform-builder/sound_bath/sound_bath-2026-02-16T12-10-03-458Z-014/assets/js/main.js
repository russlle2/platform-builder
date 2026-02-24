// Minimal interactions: mobile nav, year update, smooth anchors
document.addEventListener('DOMContentLoaded',function(){
  var nav = document.getElementById('mainNav');
  var toggle = document.getElementById('navToggle');
  if(toggle){
    toggle.addEventListener('click',function(){
      if(nav.style.display === 'flex'){nav.style.display='none'} else {nav.style.display='flex';nav.style.flexDirection='column'}
    });
  }
  // set year
  var y = new Date().getFullYear();
  var el = document.getElementById('year'); if(el) el.textContent = y;

  // smooth scroll for internal links
  document.querySelectorAll('a[href^="#"]').forEach(function(a){
    a.addEventListener('click',function(e){
      var id = this.getAttribute('href').slice(1); var target = document.getElementById(id); if(target){e.preventDefault();target.scrollIntoView({behavior:'smooth'});} 
    });
  });

  // small accessibility: prefers-reduced-motion
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){
    document.querySelectorAll('.rings circle').forEach(function(c){c.style.animation='none'});
  }
});