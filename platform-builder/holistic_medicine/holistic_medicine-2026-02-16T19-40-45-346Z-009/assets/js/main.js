(function(){
  "use strict";
  // Mobile nav toggle
  var btn = document.querySelector('.nav-toggle');
  var nav = document.querySelector('.nav');
  if(btn && nav){
    btn.addEventListener('click',function(){
      if(nav.style.display==='flex'){nav.style.display='none';}
      else{nav.style.display='flex';nav.style.flexDirection='column';nav.style.gap='12px'}
    });
  }

  // Lead magnet form handling: simulate sending and store email locally
  var form = document.getElementById('lead-form');
  if(form){
    form.addEventListener('submit',function(e){
      e.preventDefault();
      var email = form.querySelector('input[name="email"]').value;
      if(!email) return;
      try{localStorage.setItem('lead_email',email);}catch(e){}
      // friendly inline feedback
      var btn = form.querySelector('button');
      var old = btn.textContent;
      btn.textContent = 'Sending...';
      btn.disabled = true;
      setTimeout(function(){
        btn.textContent = 'Sent — check your inbox';
        btn.classList.remove('primary');
        btn.style.opacity = '0.95';
      },900);
    });
  }

  // Progressive enhancement: smooth links for primary CTA
  var ctas = document.querySelectorAll('a[href^="#"], a.cta-link');
  ctas.forEach(function(a){
    a.addEventListener('click',function(e){
      // allow normal behavior when external
    });
  });

  // small decorative float effect for svg dots
  var doc = document.documentElement;
  window.addEventListener('mousemove',function(e){
    var dots = document.querySelectorAll('.floating-dots circle');
    dots.forEach(function(c, i){
      var dx = (e.clientX - window.innerWidth/2) * (0.002 * (i+1));
      var dy = (e.clientY - window.innerHeight/2) * (0.002 * (i+1));
      c.setAttribute('transform','translate('+dx+','+dy+')');
    });
  });
})();