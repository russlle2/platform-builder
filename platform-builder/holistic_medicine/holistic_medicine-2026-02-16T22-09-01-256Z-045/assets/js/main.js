(function(){
  // Mobile nav toggle
  const nav = document.getElementById('nav');
  const navToggle = document.getElementById('navToggle');
  navToggle && navToggle.addEventListener('click', ()=>{
    nav.classList.toggle('open');
    if(nav.classList.contains('open')){
      nav.style.display='flex';nav.style.flexDirection='column';
    } else {nav.style.display='';nav.style.flexDirection='';}
  });

  // Smooth scroll for internal anchor links
  document.addEventListener('click', function(e){
    const a = e.target.closest('a');
    if(!a) return;
    if(a.getAttribute('href') && a.getAttribute('href').startsWith('#')){
      e.preventDefault();
      const id = a.getAttribute('href').slice(1);
      const el = document.getElementById(id);
      if(el) el.scrollIntoView({behavior:'smooth',block:'start'});
    }
  });

  // Lead magnet form (simulated)
  const leadForm = document.getElementById('leadForm');
  if(leadForm){
    leadForm.addEventListener('submit', function(e){
      e.preventDefault();
      const name = leadForm.querySelector('#name').value.trim();
      const email = leadForm.querySelector('#email').value.trim();
      if(!name || !email){
        alert('Please provide your name and email to receive the guide.');
        return;
      }
      // Simulate a submission and show success state
      const btn = leadForm.querySelector('button');
      btn.disabled = true; btn.textContent = 'Sending...';
      setTimeout(()=>{
        btn.textContent = 'Check your inbox';
        btn.classList.add('sent');
        // Minimal analytics hook (console)
        console.info('lead_captured',{name: name, email: email, source: 'lead_magnet'});
      },800);
    });
  }

})();
