(function(){
  // Mobile nav toggle
  const toggle = document.querySelector('.nav-toggle');
  const mobileNav = document.getElementById('mobile-nav');
  toggle && toggle.addEventListener('click', ()=>{
    const expanded = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!expanded));
    if(!expanded){ mobileNav.hidden = false } else { mobileNav.hidden = true }
  });

  // Lead magnet reveal & simple submit
  const lmToggle = document.getElementById('leadmagnet-toggle');
  const lmForm = document.getElementById('leadmagnet-form');
  const lmEmail = document.getElementById('lm-email');
  if(lmToggle){
    lmToggle.addEventListener('click', ()=>{
      const shown = lmForm.style.display === 'grid' || lmForm.getAttribute('aria-hidden') === 'false';
      lmForm.style.display = shown ? 'none' : 'grid';
      lmForm.setAttribute('aria-hidden', String(shown));
      if(!shown) lmEmail.focus();
    });
  }
  if(lmForm){
    lmForm.addEventListener('submit', (e)=>{
      e.preventDefault();
      const email = lmEmail.value.trim();
      if(!email) return alert('Please add an email');
      // Pretend to send; in production hook to an API
      lmForm.innerHTML = '<p class="muted">Thanks! Check your inbox for the guide.</p>';
      console.log('lead magnet signup', email);
    });
  }

  // Footer year
  const year = document.getElementById('year');
  if(year) year.textContent = new Date().getFullYear();

  // Smooth in-page links
  document.querySelectorAll('a[href^="#"]').forEach(a=>{
    a.addEventListener('click', (e)=>{
      const id = a.getAttribute('href').slice(1);
      const el = document.getElementById(id);
      if(el){ e.preventDefault(); el.scrollIntoView({behavior:'smooth'}); }
    });
  });
})();
