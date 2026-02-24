document.addEventListener('DOMContentLoaded',function(){
  // Mobile nav toggle
  var navToggle=document.getElementById('nav-toggle');
  var nav=document.getElementById('main-nav');
  navToggle&&navToggle.addEventListener('click',function(){
    if(nav.style.display==='flex'){nav.style.display='none';navToggle.setAttribute('aria-expanded','false');}
    else{nav.style.display='flex';nav.style.flexDirection='column';nav.style.gap='10px';navToggle.setAttribute('aria-expanded','true');}
  });

  // FAQ accordion
  var qButtons=document.querySelectorAll('.faq-q');
  qButtons.forEach(function(btn){
    btn.addEventListener('click',function(){
      var a=this.nextElementSibling;
      var open=a.style.display==='block';
      // close others
      document.querySelectorAll('.faq-a').forEach(function(el){el.style.display='none'});
      if(!open){a.style.display='block'}
    });
  });

  // Smooth scroll for internal links
  document.querySelectorAll('a[href^="#"]').forEach(function(anchor){
    anchor.addEventListener('click',function(e){
      e.preventDefault();
      var id=this.getAttribute('href').slice(1);
      var el=document.getElementById(id);
      if(el){el.scrollIntoView({behavior:'smooth',block:'start'});}
    });
  });

  // Basic accessibility: ensure nav visible on resize
  window.addEventListener('resize',function(){
    if(window.innerWidth>880 && nav){nav.style.display='flex';nav.style.flexDirection='row'}
  });
});