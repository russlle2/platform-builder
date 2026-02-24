(function(){
  // Mobile nav toggle
  const btn = document.querySelector('.nav-toggle');
  const nav = document.querySelector('.nav');
  btn && btn.addEventListener('click', ()=>{
    const expanded = btn.getAttribute('aria-expanded') === 'true';
    btn.setAttribute('aria-expanded', String(!expanded));
    if(nav) nav.style.display = expanded ? 'none' : 'flex';
  });

  // Simple focus trap for future modal usage (placeholder)
  window.openContact = function(){
    // navigate to booking URL placeholder
    location.href = 'book.html';
  };

  // Accessibility: skip to main on first tab
  document.addEventListener('keydown', (e)=>{
    if(e.key === 'Tab'){
      const el = document.querySelector('main');
      if(el) el.setAttribute('tabindex','-1');
    }
  });
})();
