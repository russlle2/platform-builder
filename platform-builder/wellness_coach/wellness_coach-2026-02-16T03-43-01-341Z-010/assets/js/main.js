(function(){
  document.getElementById('year').textContent = new Date().getFullYear();

  // Mobile toggle
  var toggle = document.querySelector('.menu-toggle');
  var nav = document.querySelector('.nav');
  toggle && toggle.addEventListener('click', function(){
    if(nav.style.display === 'block') nav.style.display = '';
    else nav.style.display = 'block';
  });

  // Lead magnet form handling (stub)
  var leadForm = document.getElementById('leadForm');
  if(leadForm){
    leadForm.addEventListener('submit', function(e){
      e.preventDefault();
      var name = leadForm.name.value.trim();
      var email = leadForm.email.value.trim();
      if(!email || !name){
        alert('Please enter your name and email.');
        return;
      }
      // Simulate success
      leadForm.reset();
      alert('Thanks! The guide is on its way to ' + email + '.');
    });
  }
})();
