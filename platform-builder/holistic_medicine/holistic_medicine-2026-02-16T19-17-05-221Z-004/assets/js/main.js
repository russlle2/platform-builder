(function(){
  // Mobile menu toggle
  const menuButton=document.querySelector('.menu-toggle');
  const nav=document.querySelector('.nav');
  if(menuButton){
    menuButton.addEventListener('click',()=>{
      const expanded=menuButton.getAttribute('aria-expanded')==='true';
      menuButton.setAttribute('aria-expanded',!expanded);
      if(nav) nav.style.display = expanded ? 'none' : 'block';
    });
  }

  // FAQ polyfill for keyboard
  document.querySelectorAll('.faq details').forEach(d=>{
    d.addEventListener('keydown',e=>{
      if(e.key==='Enter' || e.key===' '){
        e.preventDefault(); d.open = !d.open;
      }
    });
  });

  // Ripple effect on CTAs
  function rippleHandler(e){
    const btn=e.currentTarget;
    const rect=btn.getBoundingClientRect();
    const wave=document.createElement('span');
    wave.className='ripple-ctawave';
    const size=Math.max(rect.width,rect.height)*2;
    wave.style.width=wave.style.height=size+'px';
    wave.style.left=(e.clientX-rect.left - size/2)+'px';
    wave.style.top=(e.clientY-rect.top - size/2)+'px';
    btn.appendChild(wave);
    setTimeout(()=>wave.remove(),650);
  }
  document.querySelectorAll('.ripple-cta').forEach(el=>el.addEventListener('click',rippleHandler));

  // Smooth scroll for in-page CTA anchors
  document.querySelectorAll('a[href^="#"]').forEach(a=>{
    a.addEventListener('click',function(e){
      const target=document.querySelector(this.getAttribute('href'));
      if(target){e.preventDefault();target.scrollIntoView({behavior:'smooth',block:'start'});}
    });
  });

  // Small accessibility: focus outline toggle
  function handleFirstTab(e){
    if(e.key==='Tab') document.body.classList.add('user-is-tabbing');
    window.removeEventListener('keydown',handleFirstTab);
  }
  window.addEventListener('keydown',handleFirstTab);
})();