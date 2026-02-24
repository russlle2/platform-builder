(function(){
  // Mobile nav toggle
  var btn = document.querySelector('.menu-toggle');
  var nav = document.querySelector('.nav');
  if(btn && nav){
    btn.addEventListener('click',function(){
      var expanded = this.getAttribute('aria-expanded') === 'true';
      this.setAttribute('aria-expanded', !expanded);
      nav.style.display = expanded ? 'none' : 'flex';
    });
  }

  // FAQ accordion
  var qs = document.querySelectorAll('.faq-item .q');
  qs.forEach(function(q){
    q.addEventListener('click',function(e){
      var a = this.nextElementSibling;
      var open = a.style.display === 'block';
      // close others in same container
      document.querySelectorAll('.faq-item .a').forEach(function(x){x.style.display='none'});
      a.style.display = open ? 'none' : 'block';
    });
  });

  // Smooth scroll for links with hash
  document.querySelectorAll('a[href^="#"]').forEach(function(a){
    a.addEventListener('click',function(e){
      e.preventDefault();
      var id = this.getAttribute('href').slice(1);
      var el = document.getElementById(id);
      if(el) el.scrollIntoView({behavior:'smooth',block:'start'});
    });
  });

  // CTA pulse animation when visible
  function pulseCTA(){
    var c = document.querySelector('.btn.primary');
    if(!c) return;
    c.animate([{transform:'scale(1)'},{transform:'scale(1.03)'},{transform:'scale(1)'}],{duration:2500,iterations:Infinity,delay:600});
  }
  document.addEventListener('DOMContentLoaded',pulseCTA);
})();