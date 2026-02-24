document.addEventListener('DOMContentLoaded',function(){
  // Year in footer
  var y=document.getElementById('year'); if(y) y.textContent=(new Date()).getFullYear();

  // Nav toggle for small screens
  var toggle=document.querySelector('.nav-toggle');
  var navList=document.getElementById('nav-list');
  if(toggle && navList){
    toggle.addEventListener('click',function(){
      var expanded = this.getAttribute('aria-expanded') === 'true';
      this.setAttribute('aria-expanded', String(!expanded));
      if(!expanded){ navList.style.display='flex'; navList.style.flexDirection='column'; } else { navList.style.display='none'; }
    });
  }

  // Simple accordion
  var accBtns = document.querySelectorAll('.acc-btn');
  accBtns.forEach(function(btn){
    btn.addEventListener('click',function(){
      var expanded = this.getAttribute('aria-expanded') === 'true';
      // collapse all
      accBtns.forEach(function(b){b.setAttribute('aria-expanded','false');});
      if(!expanded){ this.setAttribute('aria-expanded','true'); }
    });
  });

  // Smooth scroll for internal links
  document.querySelectorAll('a[href^="#"]').forEach(function(a){
    a.addEventListener('click',function(e){
      e.preventDefault(); var target = document.querySelector(this.getAttribute('href')); if(target) target.scrollIntoView({behavior:'smooth'});
    });
  });

});