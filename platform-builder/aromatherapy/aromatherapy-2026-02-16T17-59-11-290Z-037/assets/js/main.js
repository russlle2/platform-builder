(function(){
  // Mobile nav toggle
  var navToggle = document.getElementById('navToggle');
  var mainNav = document.getElementById('mainNav');
  navToggle && navToggle.addEventListener('click', function(){
    var open = mainNav.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', open? 'true' : 'false');
  });

  // Lead magnet form handling (client-side only)
  var leadForm = document.getElementById('leadForm');
  var modal = document.getElementById('modal');
  var modalClose = document.getElementById('modalClose');
  var modalOk = document.getElementById('modalOk');

  function openModal(){
    if(!modal) return;
    modal.setAttribute('aria-hidden','false');
  }
  function closeModal(){
    if(!modal) return;
    modal.setAttribute('aria-hidden','true');
  }

  if(leadForm){
    leadForm.addEventListener('submit', function(e){
      e.preventDefault();
      var email = (leadForm.elements['email']||{}).value||'';
      if(!email || email.indexOf('@')===-1){
        alert('Please enter a valid email to receive the guide.');
        return;
      }
      // Simulate sending — store in localStorage as a lightweight lead capture
      try{localStorage.setItem('aroma_lead', JSON.stringify({email:email,ts:Date.now()}));}catch(e){}
      openModal();
    });
  }
  modalClose && modalClose.addEventListener('click', closeModal);
  modalOk && modalOk.addEventListener('click', closeModal);

  // Year in footer
  var y = new Date().getFullYear();
  var el = document.getElementById('year');
  if(el) el.textContent = y;

  // Accessibility: close nav on escape
  document.addEventListener('keydown', function(e){
    if(e.key === 'Escape'){
      mainNav && mainNav.classList.remove('open');
      navToggle && navToggle.setAttribute('aria-expanded','false');
      closeModal();
    }
  });
})();
