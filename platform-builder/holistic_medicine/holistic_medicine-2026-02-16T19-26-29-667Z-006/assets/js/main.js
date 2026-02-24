(function(){
  // Small UI helpers: nav toggle, year injection, smooth scroll
  var navToggle = document.getElementById('nav-toggle');
  var navList = document.getElementById('nav-list');
  if(navToggle){
    navToggle.addEventListener('click',function(){
      var open = navList.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  // Year
  var y = new Date().getFullYear();
  var yearEl = document.getElementById('year');
  if(yearEl) yearEl.textContent = y;

  // Smooth scroll for same-page anchors
  document.addEventListener('click', function(e){
    var a = e.target.closest('a');
    if(!a) return;
    var href = a.getAttribute('href');
    if(href && href.indexOf('#')===0){
      e.preventDefault();
      var id = href.slice(1);
      var el = document.getElementById(id);
      if(el){
        el.scrollIntoView({behavior:'smooth',block:'start'});
      }
    }
  });

  // Replace phone/email placeholders in any dynamic contexts (if present)
  function replacePlaceholders(){
    var phoneEls = document.querySelectorAll('[href^="tel:"]');
    phoneEls.forEach(function(el){
      var h = el.getAttribute('href');
      if(h && h.indexOf('{{PHONE}}')>-1){
        el.setAttribute('href', 'tel:{{PHONE}}');
      }
    });
    var mailEls = document.querySelectorAll('[href^="mailto:"]');
    mailEls.forEach(function(el){
      var h = el.getAttribute('href');
      if(h && h.indexOf('{{EMAIL}}')>-1){
        el.setAttribute('href', 'mailto:{{EMAIL}}');
      }
    });
  }
  replacePlaceholders();
})();