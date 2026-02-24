(function(){
  // Mobile nav toggle
  const toggle=document.querySelector('.nav-toggle');
  const nav=document.querySelector('.primary-nav');
  if(toggle){
    toggle.addEventListener('click',()=>{
      nav.style.display = nav.style.display === 'flex' ? 'none' : 'flex';
    });
  }

  // Smooth scroll for in-page links
  document.querySelectorAll('a[href^="#"]').forEach(a=>{
    a.addEventListener('click',e=>{
      const id=a.getAttribute('href');
      if(id.length>1){
        e.preventDefault();
        const el=document.querySelector(id);
        if(el) el.scrollIntoView({behavior:'smooth',block:'start'});
      }
    });
  });

  // FAQ: allow toggling details for older browsers
  document.querySelectorAll('details').forEach(det=>{
    const summary=det.querySelector('summary');
    if(summary){
      summary.addEventListener('click',e=>{
        // native behavior will toggle; ensure single open at time
        setTimeout(()=>{
          document.querySelectorAll('details').forEach(d=>{ if(d!==det) d.removeAttribute('open'); });
        },10);
      });
    }
  });

  // Placeholder for join CTA analytics or form
  document.querySelectorAll('a[href="{{PRIMARY_CTA_URL}}"]').forEach(btn=>{
    btn.addEventListener('click',(e)=>{
      // Track intent (no network calls)
      console.log('Primary CTA clicked');
    });
  });
})();