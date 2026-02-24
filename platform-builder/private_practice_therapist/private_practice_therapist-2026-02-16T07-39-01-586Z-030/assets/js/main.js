// Small interactions: mobile menu, lead magnet modal simulation, basic form handling
(function(){
  const menu = document.querySelector('.mobile-menu');
  const nav = document.querySelector('.main-nav');
  if(menu){
    menu.addEventListener('click',()=>{
      if(nav.style.display==='block') nav.style.display=''; else nav.style.display='block';
    });
  }

  // Lead magnet: show a small in-page confirmation
  const leadForm = document.getElementById('leadForm');
  if(leadForm){
    leadForm.addEventListener('submit',function(e){
      e.preventDefault();
      const email = leadForm.querySelector('input[name="email"]').value;
      if(!email || email.indexOf('@')===-1){
        alert('Please enter a valid email to receive the guide.');
        return;
      }
      // Simulate sending
      leadForm.querySelector('button').disabled = true;
      leadForm.querySelector('button').textContent = 'Sending…';
      setTimeout(()=>{
        leadForm.innerHTML = '<p class="small">Thanks — the guide has been sent to <strong>'+email+'</strong>. Check your inbox.</p>';
      },900);
    });
  }

  // Download guide quick button
  const dl = document.getElementById('downloadGuide');
  if(dl){
    dl.addEventListener('click',()=>{
      document.getElementById('leadEmail')?.focus();
      window.scrollTo({top: document.getElementById('lead-magnet').offsetTop - 20, behavior:'smooth'});
    });
  }

  // Smooth anchors
  document.querySelectorAll('a[href^="#"]').forEach(a=>{
    a.addEventListener('click',function(e){
      e.preventDefault();
      const id = this.getAttribute('href').slice(1);
      const el = document.getElementById(id);
      if(el) el.scrollIntoView({behavior:'smooth', block:'start'});
    });
  });
})();