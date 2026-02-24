(function(){
  // Mobile nav toggle
  var btn=document.querySelector('.nav-toggle');
  var nav=document.getElementById('main-nav');
  if(btn&&nav){
    btn.addEventListener('click',function(){
      var open=nav.classList.toggle('open');
      var expanded = open ? 'true' : 'false';
      btn.setAttribute('aria-expanded', expanded);
    });
  }

  // Simple accordion for FAQ
  document.querySelectorAll('.accordion .q').forEach(function(el){
    var btn=el.querySelector('.q-btn');
    btn.addEventListener('click',function(){
      var currentlyOpen = el.classList.contains('open');
      // close others
      document.querySelectorAll('.accordion .q.open').forEach(function(x){ x.classList.remove('open'); });
      if(!currentlyOpen) el.classList.add('open');
    });
  });

  // Smooth scroll for CTAs
  document.querySelectorAll('a[href^="#"]').forEach(function(a){
    a.addEventListener('click',function(e){
      var target = document.querySelector(this.getAttribute('href'));
      if(target){ e.preventDefault(); target.scrollIntoView({behavior:'smooth',block:'start'}); }
    });
  });

  // Year in footer
  var y=document.getElementById('year'); if(y) y.textContent=new Date().getFullYear();
})();