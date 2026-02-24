(function(){
  // Simple interactions: nav toggle, lead magnet form, year insert, smooth scroll
  var burger = document.getElementById('burger');
  var nav = document.getElementById('mainNav');
  if(burger){
    burger.addEventListener('click', function(){
      if(nav.style.display==='flex') nav.style.display=''; else nav.style.display='flex';
    });
  }

  var yearEl = document.getElementById('year');
  if(yearEl) yearEl.textContent = new Date().getFullYear();

  var form = document.getElementById('magnetForm');
  if(form){
    form.addEventListener('submit', function(e){
      e.preventDefault();
      var email = form.email.value.trim();
      if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)){
        alert('Please enter a valid email address');
        return;
      }
      // Simulate simple client-side success
      form.querySelector('button').textContent = 'Sending...';
      setTimeout(function(){
        form.innerHTML = '<p>Thanks — check your inbox for the One-Week Reset. If you do not receive it, email {{EMAIL}}.</p>';
      },800);
    });
  }

  // Anchor smooth scroll for internal links
  document.querySelectorAll('a[href^="#"]').forEach(function(a){
    a.addEventListener('click', function(e){
      var id = a.getAttribute('href');
      var el = document.querySelector(id);
      if(el){
        e.preventDefault();
        el.scrollIntoView({behavior:'smooth',block:'start'});
      }
    });
  });
})();