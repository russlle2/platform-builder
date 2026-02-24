document.addEventListener('DOMContentLoaded',function(){
  var btn=document.getElementById('menuToggle');
  btn && btn.addEventListener('click',function(){
    var nav=document.querySelector('.nav');
    if(!nav) return;
    if(nav.style.display==='flex'){nav.style.display='none';}else{nav.style.display='flex';nav.style.flexDirection='column';nav.style.gap='12px';}
  });

  // Basic accessibility: focus outlines for keyboard users
  document.body.addEventListener('keyup', function(e){
    if(e.key === 'Tab') document.documentElement.classList.add('show-focus');
  });

  // Simple link tracking for internal CTA (no external analytics)
  var primary=document.querySelector('a.btn.primary');
  primary && primary.addEventListener('click',function(){
    try{localStorage.setItem('last_cta',new Date().toISOString());}catch(e){}
  });
});
