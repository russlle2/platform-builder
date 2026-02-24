(function(){
  'use strict';
  // set year
  var y=document.getElementById('year'); if(y) y.textContent=new Date().getFullYear();

  // smooth scroll for internal links
  document.querySelectorAll('a[href^="#"]').forEach(function(a){
    a.addEventListener('click',function(e){
      var target=document.querySelector(this.getAttribute('href'));
      if(target){e.preventDefault();target.scrollIntoView({behavior:'smooth',block:'start'});}    
    });
  });

  // Diagnostic form
  var diagForm=document.getElementById('diag-form');
  var diagResult=document.getElementById('diag-result');
  var diagText=document.getElementById('diag-text');
  if(diagForm){
    diagForm.addEventListener('submit',function(e){
      e.preventDefault();
      var fd=new FormData(diagForm);
      var area=fd.get('area');
      var consistency=Number(fd.get('consistency')||0);
      var barrier=fd.get('barrier')||'unclear priority';
      var tip='Start with a 2-minute signal each day that targets '+area+'.';
      if(consistency<4) tip='Begin with a micro-commitment of 2–5 minutes and match it to your current energy. '+tip;
      if(barrier) tip+= ' Notice that '+barrier+' and design around it.';
      diagText.textContent=tip;
      diagResult.hidden=false;
      // store for later
      try{localStorage.setItem('lastDiagnostic',JSON.stringify({area:area,consistency:consistency,barrier:barrier,tip:tip,ts:Date.now()}));}catch(e){}
    });
    var skipBtn=document.getElementById('diag-skip');
    if(skipBtn) skipBtn.addEventListener('click',function(){document.getElementById('plan').scrollIntoView({behavior:'smooth'})});
  }

  // Lead form handler (stub)
  var leadForm=document.getElementById('lead-form');
  if(leadForm){
    leadForm.addEventListener('submit',function(e){
      e.preventDefault();
      var email=leadForm.querySelector('input[name="email"]').value;
      // basic validation
      if(!email || email.indexOf('@')===-1){alert('Please enter a valid email');return}
      // simulate storing
      try{localStorage.setItem('leadEmail',email);}catch(e){}
      alert('Thanks — the Mindful Momentum Guide is on its way to '+email);
      leadForm.reset();
    });
  }

})();
