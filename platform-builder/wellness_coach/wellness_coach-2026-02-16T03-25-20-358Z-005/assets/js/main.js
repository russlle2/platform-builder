document.addEventListener('DOMContentLoaded',function(){
  // year
  var y=document.getElementById('year'); if(y) y.textContent=new Date().getFullYear();

  // mobile nav toggle
  var btn=document.querySelector('.nav-toggle'), nav=document.querySelector('.nav');
  if(btn && nav){
    btn.addEventListener('click',function(){
      nav.classList.toggle('open');
      if(nav.classList.contains('open')){nav.style.display='flex'} else {nav.style.display=''}
    });
  }

  // lead magnet submission (mock)
  var lead=document.getElementById('leadmagnet');
  if(lead){
    lead.addEventListener('submit',function(e){
      e.preventDefault();
      var email=lead.querySelector('input[name="email"]').value;
      if(!email) return;
      // simple validation
      lead.querySelector('.btn.small').textContent='Sending…';
      setTimeout(function(){
        lead.querySelector('.btn.small').textContent='Sent';
        lead.reset();
        setTimeout(function(){lead.querySelector('.btn.small').textContent='Send me the guide';},2500);
      },900);
    });
  }

  // smooth scroll for internal links
  document.querySelectorAll('a[href^="#"]').forEach(function(a){
    a.addEventListener('click',function(e){
      var target=document.querySelector(this.getAttribute('href'));
      if(target){e.preventDefault();target.scrollIntoView({behavior:'smooth',block:'start'});}
    });
  });

  // accessible FAQ: toggle details with keyboard
  document.querySelectorAll('.faq-list details summary').forEach(function(s){
    s.addEventListener('keydown',function(e){if(e.key==='Enter' || e.key===' '){e.preventDefault(); this.parentElement.open = !this.parentElement.open;}});
  });
});