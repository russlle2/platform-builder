(function(){
  // small interactions for clinic_modern site
  document.getElementById('year').textContent = new Date().getFullYear();

  // nav toggle for mobile
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.querySelector('.nav ul');
  if(toggle){
    toggle.addEventListener('click', function(){
      if(nav.style.display === 'flex'){ nav.style.display = ''; }
      else{ nav.style.display = 'flex'; nav.style.flexDirection = 'column'; }
    });
  }

  // FAQ accordion
  Array.prototype.slice.call(document.querySelectorAll('.faq-q')).forEach(function(btn){
    btn.addEventListener('click', function(){
      var a = this.nextElementSibling;
      if(a.style.display === 'block'){ a.style.display = ''; }
      else{ a.style.display = 'block'; }
    });
  });

  // Lead magnet form faux submit
  var form = document.getElementById('magnet-form');
  if(form){
    form.addEventListener('submit', function(e){
      e.preventDefault();
      var email = form.email.value;
      if(!email) return;
      // simple feedback
      var btn = form.querySelector('button');
      btn.disabled = true;
      btn.textContent = 'Sending...';
      setTimeout(function(){
        btn.textContent = 'Check your inbox';
        form.email.value = '';
        btn.classList.add('sent');
      }, 900);
    });
  }

})();