(function(){
  // Basic interactive behaviors: nav toggle, lead magnet form, modal
  var navToggle = document.getElementById('navToggle');
  var navList = document.getElementById('navList');
  if(navToggle){
    navToggle.addEventListener('click',function(){
      var expanded = this.getAttribute('aria-expanded') === 'true';
      this.setAttribute('aria-expanded', String(!expanded));
      if(navList.style.display === 'block'){ navList.style.display = ''; } else { navList.style.display = 'block'; }
    });
  }

  var leadBtn = document.getElementById('leadMagnetBtn');
  var modal = document.getElementById('modal');
  var modalContent = document.getElementById('modalContent');
  var modalClose = document.getElementById('modalClose');
  function openModal(html){
    modalContent.innerHTML = html;
    modal.setAttribute('aria-hidden','false');
  }
  function closeModal(){ modal.setAttribute('aria-hidden','true'); }
  if(leadBtn){ leadBtn.addEventListener('click', function(){ openModal('<h3>Get the worksheet</h3><p>Enter your email in the form below to receive a short PDF with a guided exercise.</p><p><a href="#leadForm">Go to sign-up form ↓</a></p>'); }); }
  if(modalClose){ modalClose.addEventListener('click', closeModal); }
  modal.addEventListener('click', function(e){ if(e.target===modal){ closeModal(); } });

  var leadForm = document.getElementById('leadForm');
  if(leadForm){
    leadForm.addEventListener('submit', function(e){
      e.preventDefault();
      var email = document.getElementById('leadEmail').value.trim();
      if(!email || email.indexOf('@')===-1){ openModal('<p>Please enter a valid email address.</p>'); return; }
      // Simulated send — in real deployment, hook to email provider
      openModal('<h3>Worksheet on its way</h3><p>Thank you. The worksheet will be sent to '+email+'. If you don\'t receive it within an hour, email {{EMAIL}}.</p>');
      leadForm.reset();
    });
  }

  // Year in footer
  var y = new Date().getFullYear();
  var yearNode = document.getElementById('year');
  if(yearNode) yearNode.textContent = y;
})();
