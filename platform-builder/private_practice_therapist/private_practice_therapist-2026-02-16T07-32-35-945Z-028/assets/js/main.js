document.addEventListener('DOMContentLoaded',function(){
  // Year
  var y=document.getElementById('year'); if(y) y.textContent=new Date().getFullYear();

  // Mobile nav toggle
  var nav=document.getElementById('primaryNav');
  var btn=document.getElementById('navToggle');
  btn.addEventListener('click',function(){
    if(nav.style.display==='flex'){nav.style.display='none';btn.textContent='☰';}
    else{nav.style.display='flex';nav.style.flexDirection='column';btn.textContent='✕';}
  });

  // Smooth scroll for internal anchors
  document.querySelectorAll('a[href^="#"]').forEach(function(a){
    a.addEventListener('click',function(e){
      var t=document.querySelector(this.getAttribute('href'));
      if(t){e.preventDefault();t.scrollIntoView({behavior:'smooth',block:'start'});}
    });
  });

  // Simple accessibility: trap focus for navigation on small screens
  window.addEventListener('resize',function(){ if(window.innerWidth>880){ if(nav) nav.style.display='flex'; btn.textContent='☰'; }});
});