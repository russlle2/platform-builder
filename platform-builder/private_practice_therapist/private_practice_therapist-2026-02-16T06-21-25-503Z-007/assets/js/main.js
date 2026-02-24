// Minimal JS for interactivity: menu, smooth scroll, basic accessibility
document.addEventListener('DOMContentLoaded',function(){
  var menuToggle=document.getElementById('menuToggle');
  var mainNav=document.getElementById('mainNav');
  if(menuToggle){
    menuToggle.addEventListener('click',function(){
      mainNav.classList.toggle('show');
      var open=mainNav.classList.contains('show');
      menuToggle.setAttribute('aria-expanded',open? 'true':'false');
    });
  }

  // Smooth scroll for local links
  document.querySelectorAll('a[href^="#"]').forEach(function(anchor){
    anchor.addEventListener('click',function(e){
      e.preventDefault();
      var id=this.getAttribute('href').slice(1);
      var el=document.getElementById(id);
      if(el){ el.scrollIntoView({behavior:'smooth',block:'start'}); }
    });
  });

  // Basic analytics-free click handler for CTA redirection (keeps design private)
  var ctas=document.querySelectorAll('a[href*="{{PRIMARY_CTA_URL}}"]');
  ctas.forEach(function(a){
    a.addEventListener('click',function(){
      // small visual cue before navigation
      a.classList.add('clicked');
      setTimeout(function(){ window.location=a.getAttribute('href'); },180);
    });
  });
});
