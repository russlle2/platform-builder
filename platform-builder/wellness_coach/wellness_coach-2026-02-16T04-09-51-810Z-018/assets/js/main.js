(function(){
  // Simple nav toggle
  var btn=document.getElementById('navToggle');
  var nav=document.querySelector('.nav');
  btn&&btn.addEventListener('click',function(){
    if(nav.style.display==='flex'){nav.style.display='none'}else{nav.style.display='flex';nav.style.flexDirection='column';nav.style.gap='12px'}
  });

  // Lead magnet form handling — prevents navigation and simulates success
  var leadForm=document.getElementById('leadForm');
  if(leadForm){
    leadForm.addEventListener('submit',function(e){
      e.preventDefault();
      var email=document.getElementById('emailInput').value;
      if(!email) return;
      leadForm.querySelector('button').textContent='Sending...';
      setTimeout(function(){
        leadForm.innerHTML='<p class="muted">Thanks — the 5-day guide is on its way to '+(email)+'.</p>';
      },800);
    });
  }

  // Smooth scroll for in-page links
  document.querySelectorAll('a[href^="#"]').forEach(function(a){
    a.addEventListener('click',function(e){
      var tgt=document.querySelector(this.getAttribute('href'));
      if(tgt){e.preventDefault();tgt.scrollIntoView({behavior:'smooth',block:'start'})}
    });
  });
})();
