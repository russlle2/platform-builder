(function(){
  // Mobile nav toggle
  var navToggle=document.querySelector('.nav-toggle');
  var mainNav=document.querySelector('.main-nav');
  navToggle&&navToggle.addEventListener('click',function(){
    if(mainNav.style.display==='flex'){mainNav.style.display='none'}else{mainNav.style.display='flex'}
  });

  // Lead magnet modal
  var leadModal=document.getElementById('leadMagnet');
  var openBtn=document.getElementById('leadMagnetOpen');
  var closeBtn=document.getElementById('leadMagnetClose');
  var leadForm=document.getElementById('leadForm');

  function showModal(){if(leadModal){leadModal.setAttribute('aria-hidden','false');document.body.style.overflow='hidden'}}
  function hideModal(){if(leadModal){leadModal.setAttribute('aria-hidden','true');document.body.style.overflow='auto'}}

  openBtn&&openBtn.addEventListener('click',showModal);
  closeBtn&&closeBtn.addEventListener('click',hideModal);
  leadModal&&leadModal.addEventListener('click',function(e){if(e.target===leadModal)hideModal()});

  // Simple form handling
  leadForm&&leadForm.addEventListener('submit',function(e){
    e.preventDefault();
    var email=document.getElementById('leadEmail').value.trim();
    if(!email || email.indexOf('@')===-1){alert('Please enter a valid email.');return}
    // store locally as a stand-in for server
    var leads=JSON.parse(localStorage.getItem('leads')||'[]');
    leads.push({email:email,date:new Date().toISOString()});
    localStorage.setItem('leads',JSON.stringify(leads));
    alert('Thanks — the guide will arrive in your inbox.');
    hideModal();
  });

  // Smooth scroll for internal links
  document.querySelectorAll('a[href^="#"]').forEach(function(a){
    a.addEventListener('click',function(e){
      var id=a.getAttribute('href').slice(1);
      var el=document.getElementById(id);
      if(el){e.preventDefault();el.scrollIntoView({behavior:'smooth',block:'start'})}
    });
  });
})();