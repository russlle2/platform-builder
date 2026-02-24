// Basic interactivity: mobile nav, modal, lead form, accordion
document.addEventListener('DOMContentLoaded',function(){
  var mobileToggle = document.getElementById('mobile-nav-toggle');
  var mainNav = document.getElementById('main-nav');
  if(mobileToggle&&mainNav){
    mobileToggle.addEventListener('click',function(){
      mainNav.style.display = mainNav.style.display === 'flex' ? 'none' : 'flex';
    });
  }

  var openLead = document.getElementById('open-lead');
  var modal = document.getElementById('modal');
  var modalClose = document.getElementById('modal-close');
  var leadForm = document.getElementById('lead-form');

  function showModal(){
    if(modal){modal.style.display='flex';modal.setAttribute('aria-hidden','false');}
  }
  function hideModal(){
    if(modal){modal.style.display='none';modal.setAttribute('aria-hidden','true');}
  }
  if(openLead){openLead.addEventListener('click',showModal);} 
  if(modalClose){modalClose.addEventListener('click',hideModal);} 
  if(modal){modal.addEventListener('click',function(e){if(e.target===modal)hideModal();});}

  if(leadForm){
    leadForm.addEventListener('submit',function(e){
      e.preventDefault();
      var email = document.getElementById('lead-email').value || '';
      // Simple validation
      if(!email || email.indexOf('@')===-1){
        alert('Please enter a valid email');
        return;
      }
      // Pretend to send — in real site replace with API
      showModal();
    });
  }

  // Accordion toggles
  var toggles = document.querySelectorAll('.acc-toggle');
  toggles.forEach(function(btn){
    btn.addEventListener('click',function(){
      var expanded = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!expanded));
      var panel = btn.nextElementSibling;
      if(panel){ panel.style.display = expanded ? 'none' : 'block'; }
    });
  });
});
