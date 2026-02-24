(function(){
  const mobileToggle = document.getElementById('mobileToggle');
  const primaryNav = document.getElementById('primaryNav');
  const leadForm = document.getElementById('leadForm');
  const leadModal = document.getElementById('leadModal');
  const modalClose = document.getElementById('modalClose');

  if(mobileToggle){
    mobileToggle.addEventListener('click', function(){
      const shown = primaryNav.style.display === 'flex';
      primaryNav.style.display = shown ? '' : 'flex';
      primaryNav.style.flexDirection = 'column';
    });
  }

  if(leadForm){
    leadForm.addEventListener('submit', function(e){
      e.preventDefault();
      const email = (document.getElementById('leadEmail')||{}).value || '';
      // Basic validation
      if(!email || !email.includes('@')){
        alert('Please provide a valid email to receive the guide.');
        return;
      }
      // Simulate send and show modal confirmation
      leadModal.setAttribute('aria-hidden','false');
      // In a real site, replace with fetch to your backend or CRM integration
    });
  }

  if(modalClose){
    modalClose.addEventListener('click', function(){
      leadModal.setAttribute('aria-hidden','true');
    });
  }

  // Close modal on outside click
  document.addEventListener('click', function(e){
    if(e.target === leadModal){
      leadModal.setAttribute('aria-hidden','true');
    }
  });

})();