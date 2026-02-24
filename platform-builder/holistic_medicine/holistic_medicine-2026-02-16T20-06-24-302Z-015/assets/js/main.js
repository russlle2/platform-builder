(function(){
  // Simple interactions: nav toggle and dynamic year
  var navToggle = document.getElementById('navToggle');
  var navList = document.getElementById('navList');
  if(navToggle && navList){
    navToggle.addEventListener('click',function(){
      var expanded = this.getAttribute('aria-expanded') === 'true';
      this.setAttribute('aria-expanded', String(!expanded));
      navList.style.display = expanded ? '' : 'flex';
    });
  }
  var yearEl = document.getElementById('year');
  if(yearEl) yearEl.textContent = new Date().getFullYear();

  // Smooth scroll for internal anchor links
  document.addEventListener('click', function(e){
    var t = e.target.closest('a');
    if(!t) return;
    var href = t.getAttribute('href');
    if(!href || href.indexOf('#')!==0) return;
    e.preventDefault();
    var dest = document.querySelector(href);
    if(dest) dest.scrollIntoView({behavior:'smooth',block:'start'});
  });
})();
