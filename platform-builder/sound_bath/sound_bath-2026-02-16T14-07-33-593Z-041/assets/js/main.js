(function(){
  // Small interactive helpers: menu toggle, year update, smooth scroll
  document.addEventListener('DOMContentLoaded',function(){
    // year
    var y=document.getElementById('year'); if(y) y.textContent=new Date().getFullYear();

    // menu toggle for small screens
    var btn=document.querySelector('.menu-toggle');
    var nav=document.querySelector('.primary-nav');
    btn && btn.addEventListener('click',function(){
      if(!nav) return; nav.style.display = (nav.style.display==='flex')? 'none' : 'flex';
    });

    // smooth scroll for anchors
    document.querySelectorAll('a[href^="#"]').forEach(function(a){
      a.addEventListener('click',function(e){
        var id = this.getAttribute('href').slice(1);
        var el = document.getElementById(id);
        if(el){ e.preventDefault(); el.scrollIntoView({behavior:'smooth',block:'start'}); }
      });
    });

    // Subtle ripple animation on hero background using CSS variables
    var pattern = document.querySelector('.hero .pattern');
    if(pattern){
      var t=0;
      setInterval(function(){
        t+=0.01; pattern.style.transform = 'translateY(' + Math.sin(t)*6 + 'px) rotate(' + (Math.sin(t/2)*0.6) + 'deg)';
      },40);
    }
  });
})();