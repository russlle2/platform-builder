document.addEventListener('DOMContentLoaded',function(){
  var nav=document.getElementById('nav');
  var toggle=document.getElementById('navToggle');
  if(toggle){toggle.addEventListener('click',function(){nav.classList.toggle('open');});}

  // smooth scroll for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(function(a){
    a.addEventListener('click',function(e){
      var href=a.getAttribute('href');
      if(href.length>1){
        e.preventDefault();
        var target=document.querySelector(href);
        if(target) target.scrollIntoView({behavior:'smooth',block:'start'});
      }
    });
  });

  // lead magnet form handler (simple client-side mock)
  var leadForm=document.getElementById('leadForm');
  if(leadForm){
    leadForm.addEventListener('submit',function(e){
      e.preventDefault();
      var email=leadForm.querySelector('input[name="email"]').value;
      if(!email) return;
      leadForm.querySelector('input').value='';
      leadForm.querySelector('label').textContent='Thanks — check your inbox for the guide.';
      // visual confirmation
      leadForm.querySelector('button').disabled=true;
    });
  }

  // lightweight accessibility: add focus outlines when keyboard used
  function handleFirstTab(e){
    if(e.key==='Tab') document.body.classList.add('user-is-tabbing');
    window.removeEventListener('keydown',handleFirstTab);
  }
  window.addEventListener('keydown',handleFirstTab);
});