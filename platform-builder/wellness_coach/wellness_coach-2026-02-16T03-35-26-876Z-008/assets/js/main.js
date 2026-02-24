(function(){
  // Simple interaction for menu and accessible toggles
  const navToggle = document.getElementById('navToggle');
  navToggle && navToggle.addEventListener('click', function(){
    const expanded = this.getAttribute('aria-expanded') === 'true';
    this.setAttribute('aria-expanded', String(!expanded));
    // simple mobile nav: toggle class on body
    document.body.classList.toggle('nav-open');
    alert('Menu toggle: mobile navigation would open here.');
  });

  // Smooth scroll for in-page links
  document.querySelectorAll('a[href^="#"]').forEach(a=>{
    a.addEventListener('click', function(e){
      e.preventDefault(); const id = this.getAttribute('href').slice(1);
      const el = document.getElementById(id); if(!el) return;
      el.scrollIntoView({behavior:'smooth',block:'start'});
    });
  });

  // Lightweight form stub: capture primary CTA clicks for progressive profiling
  document.querySelectorAll('.btn-primary').forEach(btn=>{
    btn.addEventListener('click', function(){
      // In a real site we'd fire a modal or track event; keep it local and privacy-friendly
      console.log('Primary CTA clicked');
    });
  });
})();
