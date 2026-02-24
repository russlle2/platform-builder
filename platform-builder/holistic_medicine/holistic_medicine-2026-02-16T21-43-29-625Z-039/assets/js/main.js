(function(){
  // Mobile nav toggle
  const navToggle = document.getElementById('navToggle');
  const nav = document.getElementById('mainNav');
  navToggle && navToggle.addEventListener('click', ()=>{
    const expanded = navToggle.getAttribute('aria-expanded') === 'true';
    navToggle.setAttribute('aria-expanded', String(!expanded));
    if(nav.style.display === 'block'){
      nav.style.display = '';
    } else {
      nav.style.display = 'block';
    }
  });

  // Smooth scroll for same-page anchors
  document.addEventListener('click', function(e){
    const a = e.target.closest('a[href^="#"]');
    if(!a) return;
    e.preventDefault();
    const id = a.getAttribute('href').slice(1);
    const el = document.getElementById(id);
    if(el) el.scrollIntoView({behavior:'smooth',block:'start'});
  });

  // Lead magnet form handling (mock)
  const leadForm = document.getElementById('leadForm');
  if(leadForm){
    leadForm.addEventListener('submit', function(e){
      e.preventDefault();
      const email = document.getElementById('leadEmail').value.trim();
      if(!email || !email.includes('@')){
        alert('Please enter a valid email to receive the guide.');
        return;
      }
      // Simulate successful signup + provide the guide link
      const guideUrl = '/assets/guide/rebalance.pdf';
      try{navigator.clipboard && navigator.clipboard.writeText(email);}catch(e){}
      leadForm.innerHTML = '<p class="sent">Thank you! Check your inbox for the guide. If you don\'t see it, check promotions or spam.</p>';
      // Fire a gentle visual acknowledgement
      const bar = document.querySelector('.cta-band');
      if(bar){bar.animate([{opacity:0.85},{opacity:1}],{duration:600})}
      console.log('Lead captured (mock):', email);
    });
  }

  // Simple load animation trigger
  window.addEventListener('load', function(){document.documentElement.classList.add('loaded')});
})();