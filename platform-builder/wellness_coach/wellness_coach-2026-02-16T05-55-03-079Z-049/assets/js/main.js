(function(){
  var navToggle = document.getElementById('navToggle');
  navToggle && navToggle.addEventListener('click',function(){
    document.body.classList.toggle('nav-open');
    var links = document.querySelectorAll('.nav a');
    links.forEach(function(a){
      a.style.display = a.style.display === 'inline-block' ? '' : 'inline-block';
    });
  });

  // Smooth scroll for internal links
  document.querySelectorAll('a[href^="#"]').forEach(function(anchor){
    anchor.addEventListener('click', function(e){
      var target = document.querySelector(this.getAttribute('href'));
      if(target){ e.preventDefault(); target.scrollIntoView({behavior:'smooth',block:'start'}); }
    });
  });

  // Lead form: simple optimistic UX
  var leadForm = document.getElementById('leadForm');
  if(leadForm){
    leadForm.addEventListener('submit', function(e){
      e.preventDefault();
      var btn = leadForm.querySelector('button');
      btn.disabled = true; btn.textContent = 'Sending…';
      setTimeout(function(){
        btn.textContent = 'Check your inbox';
        btn.classList.remove('primary');
      },800);
    });
  }
})();
