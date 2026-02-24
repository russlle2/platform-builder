(function(){
  // Simple interactions: lead magnet submit and menu toggle
  var menuToggle=document.getElementById('menuToggle');
  if(menuToggle){
    menuToggle.addEventListener('click',function(){
      document.body.classList.toggle('nav-open');
      alert('Navigation toggled for demo.');
    });
  }

  var downloadBtn=document.getElementById('downloadGuide');
  if(downloadBtn){
    downloadBtn.addEventListener('click',function(){
      var ok=confirm('Would you like the welcome guide emailed to you?');
      if(ok){
        window.location.hash='#lead-magnet';
        document.getElementById('email') && document.getElementById('email').focus();
      }
    });
  }

  var leadForm=document.getElementById('leadForm');
  if(leadForm){
    leadForm.addEventListener('submit',function(e){
      e.preventDefault();
      var email=document.getElementById('email').value;
      if(!email || !email.includes('@')){
        alert('Please provide a valid email address.');
        return;
      }
      // Simulated submission
      alert('Thanks — the guide will be sent to ' + email + '. You can also reach us at {{EMAIL}}');
      leadForm.reset();
    });
    // Also wire the button in case form uses onsubmit=false
    var submitBtn=document.getElementById('submitLead');
    submitBtn && submitBtn.addEventListener('click',function(){ leadForm.dispatchEvent(new Event('submit')) });
  }
})();
