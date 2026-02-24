(function(){
  // simple interactivity: mobile nav toggle, year insert
  document.addEventListener('DOMContentLoaded', function(){
    var btn = document.querySelector('.nav-toggle');
    var mobile = document.getElementById('mobile-nav');
    if(btn && mobile){
      btn.addEventListener('click', function(){
        var expanded = btn.getAttribute('aria-expanded') === 'true';
        btn.setAttribute('aria-expanded', String(!expanded));
        if(mobile.hasAttribute('hidden')) mobile.removeAttribute('hidden'); else mobile.setAttribute('hidden','');
      });
    }
    var year = document.getElementById('year');
    if(year) year.textContent = new Date().getFullYear();

    // simple focus trap for a future modal placeholder (no external libs)
    window.openBooking = function(url){
      // basic redirect for now
      window.location.href = url;
    };
  });
})();
