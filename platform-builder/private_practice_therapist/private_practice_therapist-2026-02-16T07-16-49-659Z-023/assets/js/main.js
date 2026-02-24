(function(){
  var modal=document.getElementById('lead-modal');
  var openBtns=document.querySelectorAll('#open-lead, #open-lead-2');
  var closeBtn=document.getElementById('close-modal');
  var leadForm=document.getElementById('lead-form');
  var leadSuccess=document.getElementById('lead-success');
  var navToggle=document.querySelector('.nav-toggle');
  var nav=document.querySelector('.primary-nav');

  function showModal(){
    modal.setAttribute('aria-hidden','false');
  }
  function hideModal(){
    modal.setAttribute('aria-hidden','true');
    leadForm.classList.remove('hidden');
    leadSuccess.classList.add('hidden');
  }

  openBtns.forEach(function(b){b.addEventListener('click',showModal)});
  closeBtn.addEventListener('click',hideModal);
  modal.addEventListener('click',function(e){if(e.target===modal)hideModal()});

  leadForm.addEventListener('submit',function(e){
    e.preventDefault();
    var email=leadForm.email.value||'';
    if(!email || email.indexOf('@')===-1){
      alert('Please enter a valid email');
      return;
    }
    // Simulate delivery — do not store here.
    leadForm.classList.add('hidden');
    leadSuccess.classList.remove('hidden');
  });

  // nav toggle for small screens
  navToggle && navToggle.addEventListener('click',function(){
    if(nav.style.display==='block'){nav.style.display='none'}else{nav.style.display='block'}
  });

  // Accessibility: close modal with Escape
  document.addEventListener('keydown',function(e){if(e.key==='Escape'){hideModal()}});
})();