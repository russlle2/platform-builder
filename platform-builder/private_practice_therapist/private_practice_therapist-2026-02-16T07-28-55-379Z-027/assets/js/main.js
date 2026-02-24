// Minimal interaction for nav + lead magnet modal
(function(){
  var leadBtn = document.getElementById('openLead');
  var leadModal = document.getElementById('leadModal');
  var closeBtn = document.getElementById('closeLead');
  var leadForm = document.getElementById('leadForm');
  var navToggle = document.querySelector('.nav-toggle');
  var nav = document.querySelector('.nav');

  function openModal(){
    leadModal.setAttribute('aria-hidden','false');
    document.body.style.overflow = 'hidden';
  }
  function closeModal(){
    leadModal.setAttribute('aria-hidden','true');
    document.body.style.overflow = '';
  }

  if(leadBtn) leadBtn.addEventListener('click', openModal);
  if(closeBtn) closeBtn.addEventListener('click', closeModal);
  if(leadModal) leadModal.addEventListener('click', function(e){ if(e.target===leadModal) closeModal(); });

  if(leadForm) leadForm.addEventListener('submit', function(e){
    e.preventDefault();
    var email = leadForm.email.value || '';
    // Simulate sending — do not include external calls.
    leadForm.innerHTML = '<p>Thanks — the guide will arrive at '+ (email? email : 'your inbox') +'.</p>';
    setTimeout(closeModal,1500);
  });

  if(navToggle) navToggle.addEventListener('click', function(){
    var links = nav.querySelectorAll('a');
    for(var i=0;i<links.length;i++){ links[i].style.display = links[i].style.display === 'inline-block' ? 'none' : 'inline-block'; }
  });
})();