(function(){
  // Mobile nav toggle
  var toggle = document.getElementById('nav-toggle');
  var list = document.getElementById('nav-list');
  if(toggle){
    toggle.addEventListener('click',function(){
      var expanded = this.getAttribute('aria-expanded') === 'true';
      this.setAttribute('aria-expanded', (!expanded).toString());
      if(list.style.display === 'block') list.style.display = '';
      else list.style.display = 'block';
    });
  }

  // Insert current year
  var y = new Date().getFullYear();
  var el = document.getElementById('year');
  if(el) el.textContent = y;

  // Smooth scroll for internal links
  document.addEventListener('click', function(e){
    var a = e.target.closest('a');
    if(!a) return;
    var href = a.getAttribute('href')||'';
    if(href.indexOf('#')===0){
      e.preventDefault();
      var target = document.querySelector(href);
      if(target) target.scrollIntoView({behavior:'smooth'});
    }
  });

  // Small accessibility enhancement: focus outlines for keyboard users
  function handleFirstTab(e){
    if(e.key === 'Tab'){
      document.body.classList.add('user-is-tabbing');
      window.removeEventListener('keydown', handleFirstTab);
    }
  }
  window.addEventListener('keydown', handleFirstTab);
})();
