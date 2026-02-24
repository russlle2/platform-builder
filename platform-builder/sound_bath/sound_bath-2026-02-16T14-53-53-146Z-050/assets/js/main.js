(function(){
  // Simple UI interactions: year, nav toggle, smooth scroll, next-event formatting
  document.addEventListener('DOMContentLoaded',function(){
    var y=document.getElementById('year'); if(y) y.textContent=new Date().getFullYear();

    // mobile nav
    var toggle=document.getElementById('nav-toggle'); var navList=document.getElementById('nav-list');
    if(toggle && navList){
      toggle.addEventListener('click',function(){
        var open=navList.classList.toggle('show');
        toggle.setAttribute('aria-expanded', open ? 'true':'false');
      });
    }

    // Smooth anchors
    document.querySelectorAll('a[href^="#"]').forEach(function(a){
      a.addEventListener('click',function(e){
        e.preventDefault(); var id=this.getAttribute('href').slice(1); var el=document.getElementById(id); if(el) el.scrollIntoView({behavior:'smooth'});
      });
    });

    // Next event formatting into friendly text
    var next=document.getElementById('next-event');
    if(next){
      var raw=next.dataset.next; // expects ISO date
      if(raw && raw.indexOf('T')>-1){
        var dt=new Date(raw);
        if(!isNaN(dt)){ 
          var options={weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'numeric'};
          next.textContent=dt.toLocaleString(undefined,options);
        }
      }
    }

    // Gentle reveal on scroll
    var rAF = window.requestAnimationFrame || function(f){return setTimeout(f,16)};
    var revealEls = document.querySelectorAll('.diag-card, .price-card, .instruments, .habits li');
    function revealLoop(){
      revealEls.forEach(function(el){
        var r=el.getBoundingClientRect();
        if(r.top < (window.innerHeight - 80)) el.style.transform='translateY(0)';
      });
      rAF(revealLoop);
    }
    revealEls.forEach(function(el){ el.style.transition='transform 520ms cubic-bezier(.2,.9,.2,1)'; el.style.transform='translateY(18px)'; });
    revealLoop();
  });
})();