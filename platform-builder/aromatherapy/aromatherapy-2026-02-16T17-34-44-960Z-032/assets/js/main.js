document.addEventListener('DOMContentLoaded',function(){
  // Year in footer
  var y=document.getElementById('year'); if(y) y.textContent=new Date().getFullYear();

  // Mobile nav toggle
  var navToggle=document.getElementById('navToggle');
  var navList=document.getElementById('navList');
  if(navToggle&&navList){
    navToggle.addEventListener('click',function(){
      var expanded=this.getAttribute('aria-expanded')==='true';
      this.setAttribute('aria-expanded', String(!expanded));
      if(navList.style.display==='flex') navList.style.display=''; else navList.style.display='flex';
    });
  }

  // Lead magnet form handling (no external calls) -- simulate download
  var leadForm=document.getElementById('leadForm');
  if(leadForm){
    leadForm.addEventListener('submit',function(e){
      e.preventDefault();
      var email=leadForm.querySelector('input[type="email"]').value.trim();
      if(!email||!email.includes('@')){
        alert('Please enter a valid email to receive the guide.');
        return;
      }
      try{localStorage.setItem('lead_email',email);}catch(e){}
      // create a small downloadable blob as the guide
      var content='Safe Home Aromatherapy\n\n- Dilution chart (2-5% typical for adults)\n- Patch-test checklist\n- Two gentle roller blends\n\nFor personalized guidance, book a consultation.';
      var blob=new Blob([content],{type:'text/plain'});
      var url=URL.createObjectURL(blob);
      var a=document.createElement('a'); a.href=url; a.download='safe-home-aromatherapy.txt'; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function(){URL.revokeObjectURL(url);},3000);
      alert('Guide downloaded. We also sent a confirmation to ' + email + ' (simulated).');
      leadForm.reset();
    });
  }

  // Smooth scroll for internal links
  document.querySelectorAll('a[href^="#"]').forEach(function(a){
    a.addEventListener('click',function(e){
      var target=document.querySelector(this.getAttribute('href'));
      if(target){e.preventDefault();target.scrollIntoView({behavior:'smooth'});}    
    });
  });
});