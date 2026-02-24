// Minimal interactions: modal, lead form, smooth anchors
document.addEventListener('DOMContentLoaded',function(){
  var modal=document.getElementById('modal');
  var leadBtn=document.getElementById('leadMagnetBtn');
  var closeBtn=document.getElementById('closeModal');
  var modalForm=document.getElementById('modalForm');
  var leadForm=document.getElementById('leadForm');

  function openModal(){ modal.setAttribute('aria-hidden','false'); document.body.style.overflow='hidden'; }
  function closeModal(){ modal.setAttribute('aria-hidden','true'); document.body.style.overflow='auto'; }

  if(leadBtn) leadBtn.addEventListener('click',openModal);
  if(closeBtn) closeBtn.addEventListener('click',closeModal);
  if(modal) modal.addEventListener('click',function(e){ if(e.target===modal) closeModal(); });

  function handleFormSubmit(e){
    e.preventDefault();
    var email=(e.target.querySelector('input[type="email"]')||{}).value||'';
    if(!email || email.indexOf('@')===-1){ alert('Please enter a valid email to receive the guide.'); return; }
    // simple simulated success flow
    closeModal();
    alert('Thanks — the guide is on its way to '+email+'.');
    e.target.reset();
  }

  if(modalForm) modalForm.addEventListener('submit',handleFormSubmit);
  if(leadForm) leadForm.addEventListener('submit',function(e){ e.preventDefault(); var email=document.getElementById('leadEmail').value||''; if(email.indexOf('@')===-1){ alert('Please provide a valid email.'); return; } alert('Guide sent to '+email); leadForm.reset(); });

  // Smooth scroll for internal links
  document.querySelectorAll('a[href^="#"]').forEach(function(a){ a.addEventListener('click',function(e){ e.preventDefault(); var id=a.getAttribute('href').slice(1); var el=document.getElementById(id); if(el) el.scrollIntoView({behavior:'smooth',block:'start'}); }); });
});
