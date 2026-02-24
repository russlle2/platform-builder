document.addEventListener('DOMContentLoaded',function(){
  // year
  const y=document.getElementById('year'); if(y) y.textContent=new Date().getFullYear();

  // mobile menu toggle
  const toggle=document.querySelector('.menu-toggle');
  const navLinks=document.querySelectorAll('.nav-link');
  toggle && toggle.addEventListener('click',()=>{
    navLinks.forEach(a=>{a.style.display = a.style.display === 'inline-block' ? 'none' : 'inline-block'})
  });

  // Smooth scroll for internal anchors
  document.querySelectorAll('a[href^="#"]').forEach(a=>{
    a.addEventListener('click',function(e){
      e.preventDefault(); const id=this.getAttribute('href').slice(1); const el=document.getElementById(id);
      if(el) el.scrollIntoView({behavior:'smooth',block:'start'});
    })
  });

  // Simple CTA click tracking (non-network)
  document.querySelectorAll('a[href]') .forEach(a=>{
    a.addEventListener('click',()=>{
      try{console.log('CTA click:', a.getAttribute('href'))}catch(e){}
    })
  });

  // Small accessibility helper: focus outline for keyboard users
  function handleFirstTab(e){
    if(e.keyCode===9){document.body.classList.add('user-is-tabbing');window.removeEventListener('keydown',handleFirstTab)}
  }
  window.addEventListener('keydown',handleFirstTab);
});