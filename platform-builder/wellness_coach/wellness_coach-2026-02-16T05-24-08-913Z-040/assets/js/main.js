(function(){
  document.getElementById('year').textContent = new Date().getFullYear();
  // Mobile nav
  var toggle = document.querySelector('.nav-toggle');
  if(toggle){
    toggle.addEventListener('click', function(){
      document.querySelector('.nav').classList.toggle('open');
    });
  }

  // FAQ accordion
  Array.from(document.querySelectorAll('.faq .q')).forEach(function(button){
    button.addEventListener('click', function(){
      var a = this.nextElementSibling;
      var open = a.style.display === 'block';
      // close others
      document.querySelectorAll('.faq .a').forEach(function(el){el.style.display='none'});
      a.style.display = open ? 'none' : 'block';
    });
  });

  // Lead magnet form — simple in-page handling
  var form = document.getElementById('lead-form');
  if(form){
    form.addEventListener('submit', function(e){
      e.preventDefault();
      var email = form.querySelector('input[name="email"]').value;
      if(!email) return alert('Please enter an email');
      // Simulate success
      form.querySelector('.meta').textContent = 'Thanks — check your inbox for the guide.';
      form.reset();
    });
  }

  // Smooth scroll for internal links
  document.querySelectorAll('a[href^="#"]').forEach(function(a){
    a.addEventListener('click', function(e){
      var h = this.getAttribute('href');
      if(h.length>1){
        e.preventDefault();
        var el = document.querySelector(h);
        if(el) el.scrollIntoView({behavior:'smooth',block:'start'});
      }
    });
  });
})();