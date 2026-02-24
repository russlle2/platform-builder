(function(){
  // Mobile nav toggle
  var toggle = document.getElementById('navToggle');
  var nav = document.getElementById('mainNav');
  if(toggle && nav){
    toggle.addEventListener('click', function(){
      nav.classList.toggle('open');
      var expanded = nav.classList.contains('open');
      toggle.setAttribute('aria-expanded', expanded);
    });
  }

  // Smooth scroll for anchor links
  document.addEventListener('click', function(e){
    var t = e.target;
    if(t.tagName === 'A' && t.getAttribute('href') && t.getAttribute('href').startsWith('#')){
      var id = t.getAttribute('href').slice(1);
      var el = document.getElementById(id);
      if(el){ e.preventDefault(); el.scrollIntoView({behavior:'smooth',block:'start'}); }
    }
  });

  // Lead magnet form: emulate download + basic validation
  var form = document.getElementById('magnetForm');
  if(form){
    form.addEventListener('submit', function(ev){
      ev.preventDefault();
      var name = document.getElementById('name').value.trim();
      var email = document.getElementById('email').value.trim();
      if(!email){ alert('Please provide an email to receive the guide.'); return; }
      // Minimal email regex
      if(!/\S+@\S+\.\S+/.test(email)){ alert('Please provide a valid email.'); return; }
      // faux submit: show friendly confirmation
      form.querySelector('button').textContent = 'Sending…';
      setTimeout(function(){
        form.innerHTML = '<p class="tiny">Thanks, '+(name?name:'friend')+" — your guide is on its way. Check your inbox for an email from {{BUSINESS_NAME}}.</p>";
      },800);
    });
  }

})();
