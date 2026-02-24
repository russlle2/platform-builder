(function(){
  // Simple interaction: nav toggle and subscribe form handling
  var navToggle = document.getElementById('navToggle');
  navToggle && navToggle.addEventListener('click', function(){
    var nav = document.querySelector('.main-nav');
    if(!nav) return;
    if(nav.style.display === 'block') nav.style.display = '';
    else nav.style.display = 'block';
  });

  var form = document.getElementById('subscribeForm');
  form && form.addEventListener('submit', function(e){
    e.preventDefault();
    var email = form.querySelector('input[type="email"]').value || '';
    var ok = /\S+@\S+\.\S+/.test(email);
    if(!ok){
      alert('Please enter a valid email address to receive the safety starter guide.');
      return;
    }
    // Simulate success — no external calls
    form.reset();
    var btn = form.querySelector('button');
    var old = btn.textContent;
    btn.textContent = 'Sent — check your inbox';
    btn.disabled = true;
    setTimeout(function(){ btn.textContent = old; btn.disabled = false; }, 3500);
  });

  // Convenience: smooth scroll for internal links
  document.addEventListener('click', function(e){
    var a = e.target.closest('a');
    if(!a) return;
    var href = a.getAttribute('href');
    if(href && href.startsWith('#')){
      e.preventDefault();
      var el = document.querySelector(href);
      if(el) el.scrollIntoView({behavior:'smooth'});
    }
  });
})();
