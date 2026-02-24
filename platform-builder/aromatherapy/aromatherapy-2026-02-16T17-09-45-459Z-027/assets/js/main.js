document.addEventListener('DOMContentLoaded',function(){
  // FAQ accordion
  document.querySelectorAll('.faq-q').forEach(function(btn){
    btn.addEventListener('click',function(){
      const expanded = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!expanded));
      const panel = btn.nextElementSibling;
      if(panel){
        if(expanded){ panel.hidden = true; }
        else { panel.hidden = false; }
      }
    });
  });

  // Schedule quick-book buttons
  document.querySelectorAll('.schedule .btn.small').forEach(function(b){
    b.addEventListener('click',function(e){
      const url = b.dataset.url || window.location.href;
      // safe-forward to booking link
      window.location.href = url;
    });
  });

  // Simple CTA smooth scroll for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(function(a){
    a.addEventListener('click',function(e){
      const id = a.getAttribute('href').slice(1);
      const el = document.getElementById(id);
      if(el){
        e.preventDefault();
        el.scrollIntoView({behavior:'smooth',block:'start'});
      }
    });
  });

  // Accessibility: ensure focusable brand
  const brand = document.querySelector('.brand');
  if(brand){ brand.setAttribute('tabindex','0'); }
});