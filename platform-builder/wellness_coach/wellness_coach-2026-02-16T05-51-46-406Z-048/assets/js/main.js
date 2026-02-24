// Minimal interactions for the Earthy Warm template
document.addEventListener('DOMContentLoaded',function(){
  // Mobile nav toggle
  var navToggle=document.getElementById('navToggle');
  var navList=document.getElementById('navList');
  if(navToggle){
    navToggle.addEventListener('click',function(){
      var expanded=this.getAttribute('aria-expanded')=== 'true';
      this.setAttribute('aria-expanded', !expanded);
      if(navList.style.display==='flex' || navList.style.display==='block'){
        navList.style.display='none';
      } else {
        navList.style.display='block';
      }
    });
  }

  // Smooth scroll for internal links
  document.querySelectorAll('a[href^="#"]').forEach(function(anchor){
    anchor.addEventListener('click',function(e){
      e.preventDefault();
      var target=document.querySelector(this.getAttribute('href'));
      if(target){target.scrollIntoView({behavior:'smooth',block:'start'});} 
    });
  });

  // Lead form handling (mock)
  var leadForm=document.getElementById('leadForm');
  if(leadForm){
    leadForm.addEventListener('submit',function(e){
      e.preventDefault();
      var email=document.getElementById('leadEmail').value;
      if(!email){
        alert('Please enter an email');
        return;
      }
      // fake send
      leadForm.querySelector('button').textContent='Sending...';
      setTimeout(function(){
        leadForm.querySelector('button').textContent='Sent';
        leadForm.reset();
        alert('Guide on its way — check your inbox!');
      },900);
    });
  }

  // Simple focus outline for keyboard users
  function handleFirstTab(e){
    if(e.key==='Tab'){
      document.body.classList.add('show-focus');
      window.removeEventListener('keydown',handleFirstTab);
    }
  }
  window.addEventListener('keydown',handleFirstTab);
});