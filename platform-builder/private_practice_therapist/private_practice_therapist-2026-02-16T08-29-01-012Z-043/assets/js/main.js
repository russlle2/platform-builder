// Minimal interactive behaviors for the site
document.addEventListener('DOMContentLoaded',function(){
  // Update copyright year
  var y = new Date().getFullYear();
  var el = document.getElementById('year');
  if(el) el.textContent = y;

  // Smooth scroll for internal links
  document.querySelectorAll('a[href^="#"]').forEach(function(a){
    a.addEventListener('click',function(e){
      e.preventDefault();
      var t = document.querySelector(this.getAttribute('href'));
      if(t) t.scrollIntoView({behavior:'smooth'});
    });
  });

  // Lead magnet form handling (simple, no external calls)
  var form = document.getElementById('leadForm');
  if(form){
    form.addEventListener('submit',function(e){
      e.preventDefault();
      var email = (form.querySelector('input[type="email"]')||{}).value || '';
      if(!email || !email.includes('@')){
        alert('Please enter a valid email address.');
        return;
      }
      // Simulate sending: show confirmation and reset
      alert('Thanks! The guide will arrive at ' + email + '.');
      form.reset();
    });
  }
});