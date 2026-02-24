// Minimal JS for nav toggle, accordions and smooth scroll
document.addEventListener('DOMContentLoaded',function(){
  var toggle=document.getElementById('navToggle');
  var nav=document.getElementById('mainNav');
  if(toggle && nav){
    toggle.addEventListener('click',function(){
      nav.style.display = (nav.style.display === 'flex' ? 'none' : 'flex');
    });
  }
  // Smooth scroll for in-page anchors
  document.querySelectorAll('a[href^="#"]').forEach(function(a){
    a.addEventListener('click',function(e){
      var target=document.querySelector(this.getAttribute('href'));
      if(target){
        e.preventDefault();
        target.scrollIntoView({behavior:'smooth',block:'start'});
      }
    });
  });
  // Accessible details polyfill for older browsers
  document.querySelectorAll('details').forEach(function(d){
    var summary=d.querySelector('summary');
    if(summary){
      summary.addEventListener('click',function(e){
        // let native handle it; toggle aria
        setTimeout(function(){
          d.setAttribute('aria-open', d.open ? 'true' : 'false');
        },10);
      });
    }
  });
});