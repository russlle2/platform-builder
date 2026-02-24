// Lightweight interactivity for the clinic_modern template
document.addEventListener('DOMContentLoaded',function(){
  var navToggle = document.getElementById('navToggle');
  var nav = document.getElementById('nav');
  if(navToggle) navToggle.addEventListener('click',function(){
    var links = nav.querySelectorAll('a');
    for(var i=0;i<links.length;i++){links[i].style.display = links[i].style.display === 'inline-block' ? 'none' : 'inline-block'}
  });

  // Lead magnet form handler
  var magnetForm = document.getElementById('magnetForm');
  if(magnetForm){
    magnetForm.addEventListener('submit',function(e){
      e.preventDefault();
      var email = document.getElementById('email').value;
      if(!email || email.indexOf('@')===-1){
        alert('Please enter a valid email.');
        return;
      }
      // Simulate download and show confirmation
      magnetForm.querySelector('button').disabled = true;
      magnetForm.querySelector('button').textContent = 'Sending…';
      setTimeout(function(){
        magnetForm.innerHTML = '<p style="font-weight:600">Thanks — check your inbox for the guide.</p>';
      },900);
    });
  }

  // Smooth scroll for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(function(a){
    a.addEventListener('click',function(e){
      e.preventDefault();
      var id = this.getAttribute('href').substring(1);
      var el = document.getElementById(id);
      if(el) el.scrollIntoView({behavior:'smooth',block:'start'});
    });
  });
});