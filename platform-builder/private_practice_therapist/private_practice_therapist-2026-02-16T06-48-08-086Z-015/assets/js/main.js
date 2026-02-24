document.addEventListener('DOMContentLoaded',function(){
  var nav=document.querySelector('.main-nav ul');
  var btn=document.getElementById('navToggle');
  if(btn){btn.addEventListener('click',function(){
    if(nav.style.display==='flex'){nav.style.display='none';}else{nav.style.display='flex';nav.style.flexDirection='column';}
  });}

  // Smooth scroll for in-page anchors
  document.querySelectorAll('a[href^="#"]').forEach(function(a){
    a.addEventListener('click',function(e){
      var id=this.getAttribute('href').slice(1);
      var el=document.getElementById(id);
      if(el){e.preventDefault();el.scrollIntoView({behavior:'smooth',block:'start'});}
    });
  });

  // Basic accessibility: close mobile nav on outside click
  document.addEventListener('click',function(e){
    if(nav && btn && e.target!==nav && e.target!==btn && !nav.contains(e.target)){
      if(window.innerWidth<900) nav.style.display='none';
    }
  });

});