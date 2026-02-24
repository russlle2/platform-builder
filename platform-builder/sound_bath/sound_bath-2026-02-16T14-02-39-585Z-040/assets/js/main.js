document.addEventListener('DOMContentLoaded',function(){
  // Lead magnet form basic behavior
  var lead = document.getElementById('leadForm');
  if(lead){
    lead.addEventListener('submit',function(e){
      e.preventDefault();
      var email = lead.querySelector('input[name="email"]').value || '';
      if(!/.+@.+\..+/.test(email)){
        alert('Please provide a valid email address.');
        return;
      }
      // Emulate success
      lead.querySelector('input[name="email"]').value = '';
      alert('Thanks — we\'ll send the Ritual Guide to ' + email + '.');
    })
  }

  // Simple toggle for details on mobile
  var details = document.querySelectorAll('details');
  details.forEach(function(d){
    d.addEventListener('toggle',function(){
      // smooth scroll when opening
      if(d.open) d.scrollIntoView({behavior:'smooth',block:'center'});
    })
  });

  // Navigation subtle highlight for current
  var navLinks = document.querySelectorAll('.nav a');
  navLinks.forEach(function(a){
    if(location.pathname.endsWith('index.html') && a.getAttribute('href') === 'events.html') return; // no-op
  });
});