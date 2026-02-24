// Minimal interactive behavior: mobile nav, modal, lead form
document.addEventListener('DOMContentLoaded',function(){
  var mobileToggle=document.getElementById('mobileToggle');
  var nav=document.querySelector('.nav');
  if(mobileToggle){
    mobileToggle.addEventListener('click',function(){
      var expanded = this.getAttribute('aria-expanded') === 'true';
      this.setAttribute('aria-expanded', String(!expanded));
      if(nav) nav.style.display = expanded ? 'none' : 'block';
    });
  }

  // Modal
  var openGuide = document.getElementById('openGuide');
  var guideModal = document.getElementById('guideModal');
  var closeModal = document.getElementById('closeModal');
  if(openGuide){
    openGuide.addEventListener('click',function(){
      guideModal.setAttribute('aria-hidden','false');
      document.getElementById('modalEmail').focus();
    });
  }
  if(closeModal){
    closeModal.addEventListener('click',function(){
      guideModal.setAttribute('aria-hidden','true');
    });
  }
  guideModal.addEventListener('click',function(e){
    if(e.target===guideModal){ guideModal.setAttribute('aria-hidden','true'); }
  });

  // Lead form / modal form simple handling
  function handleFormSubmit(e){
    e.preventDefault();
    var email = e.target.querySelector('input[type="email"]').value.trim();
    if(!email || !/^\S+@\S+\.\S+$/.test(email)){
      alert('Please enter a valid email.');
      return;
    }
    // Placeholder: in a real site this would POST to a server or mailing service.
    alert('Thanks — the guide will arrive shortly to ' + email + '.');
    // reset form fields
    e.target.reset();
    // close modal if present
    if(guideModal) guideModal.setAttribute('aria-hidden','true');
  }

  var leadForm = document.getElementById('leadForm');
  var modalForm = document.getElementById('modalForm');
  if(leadForm) leadForm.addEventListener('submit',handleFormSubmit);
  if(modalForm) modalForm.addEventListener('submit',handleFormSubmit);

  // Smooth scroll for internal links
  document.querySelectorAll('a[href^="#"]').forEach(function(a){
    a.addEventListener('click',function(e){
      var id = this.getAttribute('href').slice(1);
      var el = document.getElementById(id);
      if(el){ e.preventDefault(); el.scrollIntoView({behavior:'smooth'}); }
    });
  });
});