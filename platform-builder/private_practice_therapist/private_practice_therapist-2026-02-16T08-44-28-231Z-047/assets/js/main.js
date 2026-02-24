document.addEventListener('DOMContentLoaded', function(){
  var toggle = document.getElementById('mobile-toggle');
  var nav = document.getElementById('primary-nav');
  toggle && toggle.addEventListener('click', function(){
    if(nav.style.display==='flex'){ nav.style.display='none'; }
    else{ nav.style.display='flex'; nav.style.flexDirection='column'; nav.style.gap='12px'; }
  });

  // Smooth internal links
  document.querySelectorAll('a[href^="#"]').forEach(function(a){
    a.addEventListener('click', function(e){
      e.preventDefault(); document.querySelector(a.getAttribute('href')).scrollIntoView({behavior:'smooth'});
    });
  });

  // Basic accessibility: focus visible outline for keyboard navigation
  document.body.addEventListener('keydown', function(e){
    if(e.key==='Tab'){ document.documentElement.classList.add('show-focus'); }
  });

  // Replace tel placeholder formatting if needed
  // Minimal form behavior (if a booking link opens a modal, keep simple redirect)
  var ctas = document.querySelectorAll('a[href$="/book.html"], a[href*="book.html"], a[href*="{{PRIMARY_CTA_URL}}"]');
  ctas.forEach(function(cta){
    cta.addEventListener('click', function(e){
      // allow default navigation — could be replaced with an overlay booking flow
    });
  });
});