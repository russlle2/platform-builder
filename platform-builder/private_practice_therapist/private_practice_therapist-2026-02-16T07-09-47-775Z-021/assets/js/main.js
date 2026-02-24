document.addEventListener('DOMContentLoaded',function(){
  // simple nav toggle for small screens
  var toggle=document.querySelector('.nav-toggle');
  var nav=document.querySelector('.nav');
  if(toggle && nav){
    toggle.addEventListener('click',function(){
      if(nav.style.display==='block'){nav.style.display='none'}else{nav.style.display='block'}
    });
  }

  // smooth scroll for internal links
  document.querySelectorAll('a[href^="#"]').forEach(function(a){
    a.addEventListener('click',function(e){
      e.preventDefault();
      var id=this.getAttribute('href').slice(1);
      var el=document.getElementById(id);
      if(el) el.scrollIntoView({behavior:'smooth',block:'start'});
    });
  });

  // Small accessibility: focus outlines on keyboard navigation
  document.body.addEventListener('keydown',function(e){
    if(e.key==='Tab') document.documentElement.classList.add('keyboard-nav');
  });
});
