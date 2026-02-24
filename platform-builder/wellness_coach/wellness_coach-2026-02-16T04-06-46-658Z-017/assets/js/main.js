(function(){
  'use strict';
  // Small interactions: year, smooth scroll, lead form mock
  document.getElementById('year').textContent = new Date().getFullYear();

  // Smooth scroll for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(function(link){
    link.addEventListener('click', function(e){
      e.preventDefault();
      var id = this.getAttribute('href').slice(1);
      var el = document.getElementById(id);
      if(el) el.scrollIntoView({behavior:'smooth', block:'start'});
    });
  });

  var form = document.getElementById('lead-form');
  if(form){
    form.addEventListener('submit', function(e){
      e.preventDefault();
      var email = document.getElementById('email').value.trim();
      if(!email){
        alert('Please enter an email.');
        return;
      }
      // Lightweight UX: pretend to send guide
      var btn = form.querySelector('button');
      var old = btn.textContent;
      btn.textContent = 'Sending...';
      btn.disabled = true;
      setTimeout(function(){
        btn.textContent = 'Sent ✓';
        form.reset();
        setTimeout(function(){ btn.textContent = old; btn.disabled = false; }, 2200);
      }, 900);
    });
  }
})();