(function(){
  const navToggle = document.getElementById('navToggle');
  const mainNav = document.getElementById('mainNav');
  if(navToggle){
    navToggle.addEventListener('click', ()=>{
      const open = mainNav.getAttribute('aria-open') === 'true';
      mainNav.setAttribute('aria-open', String(!open));
    });
  }

  const openLead = document.getElementById('openLeadMag');
  const leadMag = document.getElementById('leadMag');
  const closeLead = document.getElementById('closeLead');
  const leadForm = document.getElementById('leadForm');

  function showLead(){ if(leadMag) leadMag.setAttribute('aria-hidden','false'); }
  function hideLead(){ if(leadMag) leadMag.setAttribute('aria-hidden','true'); }

  if(openLead) openLead.addEventListener('click', showLead);
  if(closeLead) closeLead.addEventListener('click', hideLead);
  if(leadMag) leadMag.addEventListener('click', (e)=>{ if(e.target===leadMag) hideLead(); });

  if(leadForm){
    leadForm.addEventListener('submit', function(e){
      e.preventDefault();
      const email = leadForm.querySelector('[name="email"]').value.trim();
      if(!email || !email.includes('@')){
        alert('Please provide a valid email.');
        return;
      }
      // Simulate submission
      leadForm.querySelector('button').textContent = 'Sent ✓';
      setTimeout(hideLead,1200);
    });
  }

  // Accessibility helper: close modal with Escape
  document.addEventListener('keydown', function(e){
    if(e.key === 'Escape'){
      if(leadMag && leadMag.getAttribute('aria-hidden') === 'false') hideLead();
      if(mainNav && mainNav.getAttribute('aria-open') === 'true') mainNav.setAttribute('aria-open','false');
    }
  });
})();