document.addEventListener('DOMContentLoaded',function(){
  // year
  var y = new Date().getFullYear();
  var el = document.getElementById('year'); if(el) el.textContent = y;

  // mobile nav
  var navToggle = document.getElementById('nav-toggle');
  var mainNav = document.getElementById('main-nav');
  navToggle && navToggle.addEventListener('click', function(){
    if(mainNav.style.display === 'flex'){ mainNav.style.display = 'none'; }
    else{ mainNav.style.display = 'flex'; mainNav.style.flexDirection = 'column'; }
  });

  // Smooth scroll for internal anchors
  document.querySelectorAll('a[href^="#"]').forEach(function(a){
    a.addEventListener('click', function(e){
      e.preventDefault();
      var tgt = document.querySelector(this.getAttribute('href'));
      if(tgt) tgt.scrollIntoView({behavior:'smooth',block:'start'});
    });
  });

  // Simple focus outline for keyboard users
  function handleFirstTab(e){
    if(e.key === 'Tab'){
      document.body.classList.add('user-is-tabbing');
      window.removeEventListener('keydown', handleFirstTab);
    }
  }
  window.addEventListener('keydown', handleFirstTab);
});