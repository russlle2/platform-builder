(function(){
  // Simple UI interactions: nav toggle, form handling, FAQ polyfill
  document.addEventListener('DOMContentLoaded',function(){
    var navToggle = document.querySelector('.nav-toggle');
    var mainNav = document.getElementById('main-nav');
    if(navToggle){
      navToggle.addEventListener('click',function(){
        var expanded = this.getAttribute('aria-expanded') === 'true';
        this.setAttribute('aria-expanded', String(!expanded));
        mainNav.classList.toggle('open');
      });
    }

    // FAQ: ensure details toggles for browsers without native support
    var details = document.querySelectorAll('details');
    details.forEach(function(d){
      d.addEventListener('toggle', function(){
        // close siblings for compact UI
        if(d.open){
          details.forEach(function(s){ if(s!==d) s.open = false; });
        }
      });
    });

    // Lead magnet form
    var form = document.getElementById('magnet-form');
    if(form){
      var status = form.querySelector('.status');
      form.addEventListener('submit',function(ev){
        ev.preventDefault();
        var email = form.email.value.trim();
        var consent = !!form.consent.checked;
        if(!email || !consent){
          status.textContent = 'Please provide an email and consent.';
          return;
        }
        // very light validation
        if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)){
          status.textContent = 'Please enter a valid email address.';
          return;
        }
        // simulate save and download
        try{ localStorage.setItem('aroma_lead_'+email, new Date().toISOString()); }catch(e){}
        status.textContent = 'Thanks — your guide is on its way. Check your inbox.';
        form.querySelector('button').disabled = true;
        setTimeout(function(){
          status.textContent = 'If you don\'t see it, check promotions or spam folders.';
        },2500);
      });
    }

    // Small flourish: set current year
    var y = new Date().getFullYear();
    var el = document.getElementById('year'); if(el) el.textContent = y;

  });
})();