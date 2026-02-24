(function(){
  // Mobile nav toggle
  var navToggle = document.getElementById('navToggle');
  var nav = document.querySelector('.nav-list');
  if(navToggle && nav){
    navToggle.addEventListener('click', function(){
      var expanded = this.getAttribute('aria-expanded') === 'true';
      this.setAttribute('aria-expanded', String(!expanded));
      nav.classList.toggle('show');
    });
  }

  // Simple FAQ accordion
  document.querySelectorAll('.accordion .qa').forEach(function(item){
    var btn = item.querySelector('.q');
    var ans = item.querySelector('.a');
    btn.addEventListener('click', function(){
      var open = btn.getAttribute('aria-expanded') === 'true';
      // close all
      document.querySelectorAll('.accordion .q').forEach(function(b){b.setAttribute('aria-expanded','false');b.parentElement.querySelector('.a').style.display='none';});
      if(!open){
        btn.setAttribute('aria-expanded','true');
        ans.style.display='block';
      }
    });
  });

  // Smooth scroll for internal anchors
  document.querySelectorAll('a[href^="#"]').forEach(function(a){
    a.addEventListener('click', function(e){
      e.preventDefault();
      var id = this.getAttribute('href').slice(1);
      var el = document.getElementById(id);
      if(el){el.scrollIntoView({behavior:'smooth',block:'start'});} 
    });
  });
})();