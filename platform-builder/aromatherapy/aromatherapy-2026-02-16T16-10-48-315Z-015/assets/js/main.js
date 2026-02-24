(function(){
  // Mobile nav toggle
  var toggle=document.getElementById('nav-toggle');
  var nav=document.getElementById('main-nav');
  if(toggle && nav){
    toggle.addEventListener('click',function(){
      nav.classList.toggle('open');
    });
  }

  // Intake quick screen -> suggest simple guidance (safety-forward)
  var submit=document.getElementById('screen-submit');
  if(submit){
    submit.addEventListener('click',function(){
      var allergy=document.getElementById('allergy').value;
      var pregnancy=document.getElementById('pregnancy').value;
      var pets=document.getElementById('pets').value;
      var msg='Suggested next steps:\n';
      if(allergy==='yes') msg += '- We recommend a conservative patch-test and consulting for specific allergens.\n';
      else msg += '- No known allergies: proceed with low dilutions and patch tests.\n';
      if(pregnancy==='yes') msg += '- Pregnancy/breastfeeding: we offer tailored guidance; book a consult before regular use.\n';
      if(pets==='yes') msg += '- Pets at home: we will prioritise pet-safe profiles and diffusion limits.\n';
      msg += '\nFor personalised plans and labeled dilutions, please book a Full Consultation.';
      alert(msg);
    });
  }

  // Smooth scroll for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(function(a){
    a.addEventListener('click',function(e){
      e.preventDefault();
      var t=document.querySelector(this.getAttribute('href'));
      if(t) t.scrollIntoView({behavior:'smooth'});
    });
  });

  // Year in footer
  var year=document.getElementById('year'); if(year) year.textContent=new Date().getFullYear();
})();