(function(){
  // Year in footer
  document.getElementById('year').textContent = new Date().getFullYear();

  // Modal open/close
  var modal = document.getElementById('modal');
  var leadOpen = document.getElementById('leadOpen');
  var modalClose = document.getElementById('modalClose');
  leadOpen && leadOpen.addEventListener('click', function(){
    modal.setAttribute('aria-hidden','false');
    document.getElementById('modalEmail').focus();
  });
  modalClose && modalClose.addEventListener('click', function(){ modal.setAttribute('aria-hidden','true'); });
  modal.addEventListener('click', function(e){ if(e.target===modal) modal.setAttribute('aria-hidden','true'); });

  // Lead form handling (inline + modal) — lightweight, no external calls
  function handleLead(form, emailInput){
    form.addEventListener('submit', function(ev){
      ev.preventDefault();
      var email = emailInput.value.trim();
      if(!email || email.indexOf('@')===-1){
        emailInput.focus();
        alert('Please enter a valid email to receive the guide.');
        return;
      }
      // Simulate sending
      form.querySelector('button').disabled = true;
      form.querySelector('button').textContent = 'Sending...';
      setTimeout(function(){
        form.querySelector('button').textContent = 'Sent ✓';
        form.reset();
        if(modal.getAttribute('aria-hidden')==='false') modal.setAttribute('aria-hidden','true');
        setTimeout(function(){ form.querySelector('button').disabled = false; form.querySelector('button').textContent = 'Send the guide'; },1500);
        alert('Guide sent to ' + email + '. Check your inbox.');
      },900);
    });
  }
  var leadForm = document.getElementById('leadForm');
  if(leadForm) handleLead(leadForm, leadForm.querySelector('input[name="email"]'));
  var modalForm = document.getElementById('modalForm');
  if(modalForm) handleLead(modalForm, document.getElementById('modalEmail'));
})();
