(function(){
  var mobileToggle = document.querySelector('.mobile-toggle');
  var nav = document.querySelector('.nav');
  if(mobileToggle){
    mobileToggle.addEventListener('click', function(){
      if(nav.style.display === 'flex') nav.style.display = '';
      else nav.style.display = 'flex';
    });
  }

  // Modal logic for lead magnet
  var modal = document.getElementById('modal');
  var openGuide = document.getElementById('open-guide');
  var closeModal = document.getElementById('close-modal');
  var backdrop = document.getElementById('backdrop');
  function showModal(){ if(modal){ modal.setAttribute('aria-hidden','false'); } }
  function hideModal(){ if(modal){ modal.setAttribute('aria-hidden','true'); } }
  if(openGuide){ openGuide.addEventListener('click', showModal); }
  if(closeModal){ closeModal.addEventListener('click', hideModal); }
  if(backdrop){ backdrop.addEventListener('click', hideModal); }

  // Form handlers — simple front-end only
  var guideForm = document.getElementById('guide-form');
  var emailInput = document.getElementById('email');
  var downloadBtn = document.getElementById('download-btn');
  if(guideForm){
    guideForm.addEventListener('submit', function(e){
      e.preventDefault();
      var val = emailInput.value || '';
      if(!val || !val.includes('@')){
        emailInput.focus();
        return;
      }
      downloadBtn.textContent = 'Sent ✓';
      setTimeout(function(){ downloadBtn.textContent = 'Send the guide'; emailInput.value=''; },2000);
    });
  }

  var modalForm = document.getElementById('modal-form');
  var modalEmail = document.getElementById('modal-email');
  var modalSend = document.getElementById('modal-send');
  if(modalForm){
    modalForm.addEventListener('submit', function(e){
      e.preventDefault();
      var v = modalEmail.value || '';
      if(!v || !v.includes('@')){ modalEmail.focus(); return; }
      modalSend.textContent = 'Sent ✓';
      setTimeout(function(){ hideModal(); modalSend.textContent = 'Send'; modalEmail.value=''; },1200);
    });
  }

  // Accessibility: close modal with Esc
  document.addEventListener('keydown', function(e){ if(e.key==='Escape'){ hideModal(); } });
})();