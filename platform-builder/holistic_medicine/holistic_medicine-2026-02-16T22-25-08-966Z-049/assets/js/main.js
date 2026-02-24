// Main JS: lightweight interactions for nav and smooth CTA
(function(){
  var navToggle = document.getElementById('navToggle');
  var mainNav = document.getElementById('mainNav');
  if(navToggle && mainNav){
    navToggle.addEventListener('click', function(){
      mainNav.classList.toggle('show');
      navToggle.setAttribute('aria-expanded', mainNav.classList.contains('show'));
    });
  }

  // Smooth scroll for same-page anchors
  document.addEventListener('click', function(e){
    var t = e.target.closest('a[href^="#"]');
    if(t){
      e.preventDefault();
      var id = t.getAttribute('href').slice(1);
      var el = document.getElementById(id);
      if(el) el.scrollIntoView({behavior:'smooth',block:'start'});
    }
  });

  // Simple accessibility: focus main when skip (if implemented elsewhere)
  window.addEventListener('hashchange', function(){
    var id = location.hash.replace('#','');
    var el = document.getElementById(id);
    if(el) el.setAttribute('tabindex','-1') && el.focus();
  });
})();