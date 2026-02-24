document.addEventListener('DOMContentLoaded',function(){
  var navToggle=document.getElementById('navToggle');
  var nav=document.getElementById('siteNav');
  navToggle.addEventListener('click',function(){
    if(nav.style.display==='flex'){nav.style.display='none';navToggle.setAttribute('aria-expanded','false');}
    else{nav.style.display='flex';nav.style.flexDirection='column';navToggle.setAttribute('aria-expanded','true');}
  });

  // Smooth scroll for same-page anchors
  document.querySelectorAll('a[href^="#"]').forEach(function(link){
    link.addEventListener('click',function(e){
      var target=document.querySelector(this.getAttribute('href'));
      if(target){e.preventDefault();target.scrollIntoView({behavior:'smooth',block:'start'});}
    });
  });

  // Simple accessible focus management after nav open
  document.addEventListener('click',function(e){
    if(!nav.contains(e.target) && e.target!==navToggle && window.innerWidth<900){nav.style.display='none';navToggle.setAttribute('aria-expanded','false');}
  });
});