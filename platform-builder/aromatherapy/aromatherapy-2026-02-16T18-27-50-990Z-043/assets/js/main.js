(function(){
  // Small UI behaviors: nav toggle, diag form, year update
  var navToggle = document.getElementById('navToggle');
  var navList = document.getElementById('primaryNav');
  if(navToggle){
    navToggle.addEventListener('click', function(){
      var expanded = this.getAttribute('aria-expanded') === 'true';
      this.setAttribute('aria-expanded', String(!expanded));
      if(navList.style.display === 'flex') navList.style.display = '';
      else navList.style.display = 'flex';
    });
  }

  var diag = document.getElementById('diagForm');
  if(diag){
    diag.addEventListener('submit', function(e){
      e.preventDefault();
      var btn = this.querySelector('button[type="submit"]');
      btn.textContent = 'Saved';
      setTimeout(function(){ btn.textContent = 'Save preferences'; },1500);
      // very light local save for convenience (not personal data safe storage)
      try{ localStorage.setItem('aroma_diag', JSON.stringify(Object.fromEntries(new FormData(diag)))); }catch(e){}
    });
    var reset = document.getElementById('diagReset');
    if(reset) reset.addEventListener('click', function(){ diag.reset(); localStorage.removeItem('aroma_diag'); });
    // restore if present
    try{
      var data = JSON.parse(localStorage.getItem('aroma_diag')||'null');
      if(data) Object.keys(data).forEach(function(k){ var el=diag.elements[k]; if(el) el.value = data[k]; });
    }catch(e){}
  }

  // Insert current year
  var y = document.getElementById('year'); if(y) y.textContent = new Date().getFullYear();

  // Simple focus trap for accessibility on small nav open
  document.addEventListener('click', function(e){ if(!navList.contains(e.target) && !navToggle.contains(e.target)){
    if(window.innerWidth<=800) navList.style.display = '';
  }});
})();