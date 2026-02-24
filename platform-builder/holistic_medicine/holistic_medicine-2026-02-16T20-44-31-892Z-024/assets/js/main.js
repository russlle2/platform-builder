(function(){
  // Simple interactivity: mobile nav + faux form submit
  var navToggle = document.getElementById('navToggle');
  var nav = document.getElementById('primaryNav');
  if(navToggle && nav){
    navToggle.addEventListener('click', function(){
      nav.classList.toggle('show');
    });
  }

  var form = document.getElementById('contactForm');
  if(form){
    form.addEventListener('submit', function(e){
      e.preventDefault();
      // Minimal validation
      var name = form.querySelector('#name');
      var email = form.querySelector('#email');
      if(!name.value || !email.value){
        alert('Please provide name and email.');
        return;
      }
      // Simulate sending and redirecting to primary CTA
      var btn = form.querySelector('button');
      btn.disabled = true; btn.textContent = 'Scheduling...';
      setTimeout(function(){
        // In a production site this would navigate to booking flow
        window.location.href = form.action || '/book.html';
      },800);
    });
  }

  // Accessibility: reduce motion respect
  try{
    var media = window.matchMedia('(prefers-reduced-motion: reduce)');
    if(media && media.matches){
      document.documentElement.classList.add('reduced-motion');
    }
  }catch(e){}
})();
