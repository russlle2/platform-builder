(function(){
  // Minimal JS: menu toggle, smooth scroll, faq accordion, year injector
  document.addEventListener('DOMContentLoaded',function(){
    var toggle=document.querySelector('.menu-toggle');
    var nav=document.querySelector('.nav');
    if(toggle && nav){
      toggle.addEventListener('click',function(){
        if(nav.style.display==='block'){nav.style.display=''}else{nav.style.display='block'}
      });
    }

    // Smooth scroll for internal links
    document.querySelectorAll('a[href^="#"]').forEach(function(a){
      a.addEventListener('click',function(e){
        var id=this.getAttribute('href').slice(1);
        var el=document.getElementById(id);
        if(el){e.preventDefault();el.scrollIntoView({behavior:'smooth',block:'start'});}
      });
    });

    // FAQ accordion
    document.querySelectorAll('.faq .q').forEach(function(btn){
      btn.addEventListener('click',function(){
        var pane=this.nextElementSibling;
        var open = pane.style.display === 'block';
        document.querySelectorAll('.faq .a').forEach(function(p){p.style.display='none'});
        if(!open) pane.style.display='block';
      });
    });

    // Year
    var y=document.getElementById('year'); if(y) y.textContent=new Date().getFullYear();
  });
})();
