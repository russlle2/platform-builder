document.addEventListener('DOMContentLoaded',function(){
  // Year in footer
  var yearEl=document.getElementById('year');if(yearEl){yearEl.textContent=new Date().getFullYear();}

  // Mobile nav toggle
  var toggle=document.querySelector('.nav-toggle');
  var navList=document.getElementById('nav-list');
  if(toggle && navList){
    toggle.addEventListener('click',function(){
      var expanded=this.getAttribute('aria-expanded')==='true';
      this.setAttribute('aria-expanded',!expanded);
      navList.classList.toggle('show');
    });
  }

  // Smooth scroll for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(function(a){
    a.addEventListener('click',function(e){
      var id=this.getAttribute('href').slice(1);
      var el=document.getElementById(id);
      if(el){ e.preventDefault(); el.scrollIntoView({behavior:'smooth',block:'start'}); }
    });
  });

  // Lead magnet form: local simulation (no external calls)
  var leadForm=document.getElementById('leadForm');
  if(leadForm){
    leadForm.addEventListener('submit',function(e){
      e.preventDefault();
      var email=leadForm.querySelector('input[name="email"]').value.trim();
      if(!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)){
        alert('Please enter a valid email to receive the guide.');
        return;
      }
      // Simulate saving and provide download link
      leadForm.querySelector('input[name="email"]').value='';
      alert('Thank you! The guide has been sent to ' + email + ' (simulated).');
    });
  }

  // Primary CTA local hook for safety
  document.querySelectorAll('.primary-cta').forEach(function(btn){
    btn.addEventListener('click',function(e){
      // allow normal navigation if it's a real link; no-op here
    });
  });
});