// Minimal interactive behaviors: mobile nav, lead capture, accessibility
document.addEventListener('DOMContentLoaded',function(){
  var navToggle = document.getElementById('nav-toggle');
  var siteNav = document.getElementById('site-nav');
  if(navToggle){
    navToggle.addEventListener('click',function(){
      var expanded = this.getAttribute('aria-expanded') === 'true';
      this.setAttribute('aria-expanded', String(!expanded));
      siteNav.classList.toggle('open');
    });
  }

  // Lead magnet form: fake submit and show success message
  var leadForm = document.getElementById('lead-form');
  var leadSuccess = document.getElementById('lead-success');
  if(leadForm){
    leadForm.addEventListener('submit',function(e){
      e.preventDefault();
      var email = leadForm.email.value.trim();
      if(!email || email.indexOf('@')===-1){
        alert('Please enter a valid email.');
        return;
      }
      // Simulate network and reveal success
      leadForm.querySelector('button').disabled = true;
      leadForm.querySelector('button').textContent = 'Sending...';
      setTimeout(function(){
        leadForm.hidden = true;
        leadSuccess.hidden = false;
        // simple localStorage flag so returning user sees thank-you
        try{localStorage.setItem('lead_signed','1')}catch(e){}
      },800);
    });
  }

  // small enhancement: make details summary keyboard-friendly
  document.querySelectorAll('details summary').forEach(function(s){
    s.addEventListener('keydown',function(e){
      if(e.key === 'Enter' || e.key === ' '){
        e.preventDefault(); this.parentElement.open = !this.parentElement.open;
      }
    });
  });

  // Accessibility focus outline toggle
  function handleFirstTab(e) {
    if(e.key === 'Tab'){
      document.body.classList.add('user-is-tabbing');
      window.removeEventListener('keydown', handleFirstTab);
    }
  }
  window.addEventListener('keydown', handleFirstTab);
});