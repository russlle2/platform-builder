(function(){
  // Simple nav toggle
  var navToggle = document.getElementById('navToggle');
  var mainNav = document.getElementById('mainNav');
  if(navToggle){
    navToggle.addEventListener('click', function(){
      mainNav.classList.toggle('open');
    });
  }

  // Lead magnet form simulation
  var leadForm = document.getElementById('leadForm');
  if(leadForm){
    leadForm.addEventListener('submit', function(e){
      e.preventDefault();
      var email = (document.getElementById('email')||{}).value || '';
      if(!email || email.indexOf('@')===-1){
        alert('Please provide a valid email');
        return;
      }
      // Simulate subscribe and provide download
      alert('Thank you! A confirmation has been sent to ' + email + '. You will receive the breathing track and schedule.');
      leadForm.reset();
    });
  }

  // Accessibility: reduce motion preference
  var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  if(prefersReduced.matches){
    document.documentElement.style.scrollBehavior = 'auto';
  }
})();
