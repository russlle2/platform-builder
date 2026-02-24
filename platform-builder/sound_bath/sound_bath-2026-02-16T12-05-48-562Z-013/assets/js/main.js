(function(){
  // Smooth scroll for internal links
  document.querySelectorAll('a[href^="#"]').forEach(function(a){
    a.addEventListener('click',function(e){
      e.preventDefault();
      var t = document.querySelector(this.getAttribute('href'));
      if(t) t.scrollIntoView({behavior:'smooth',block:'start'});
    });
  });

  // Accordion for FAQs
  document.querySelectorAll('.faq-q').forEach(function(btn){
    btn.addEventListener('click',function(){
      var next = this.nextElementSibling;
      var open = next.style.display === 'block';
      // close all
      document.querySelectorAll('.faq-a').forEach(function(n){n.style.display='none'});
      if(!open){ next.style.display = 'block'; next.scrollIntoView({behavior:'smooth',block:'center'}); }
    });
  });

  // subtle hero ripple on CTA click
  var hero = document.querySelector('.hero');
  var cta = document.querySelector('.hero .primary');
  if(hero && cta){
    cta.addEventListener('click',function(e){
      var r = document.createElement('div');
      r.className = 'ripple-effect';
      var s = Math.max(hero.offsetWidth,hero.offsetHeight)*1.2;
      r.style.width = r.style.height = s + 'px';
      var rect = hero.getBoundingClientRect();
      r.style.left = (rect.width/2) + 'px';
      r.style.top = (rect.height/2) + 'px';
      r.style.background = 'radial-gradient(circle at center, rgba(138,211,199,0.15), transparent 40%)';
      r.style.transition = 'opacity 900ms ease-out, transform 900ms ease-out';
      hero.appendChild(r);
      requestAnimationFrame(function(){ r.style.transform = 'scale(1.2)'; r.style.opacity = '0'; });
      setTimeout(function(){ try{ hero.removeChild(r); }catch(e){} },1000);
    });
  }

  // enhance external links
  document.querySelectorAll('a[href^="http"]').forEach(function(a){ a.setAttribute('rel','noopener'); a.setAttribute('target','_blank'); });
})();