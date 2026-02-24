document.addEventListener('DOMContentLoaded',function(){
  // Year auto-update
  var y = document.getElementById('year'); if(y) y.textContent = new Date().getFullYear();

  // Mobile nav toggle
  var btn = document.querySelector('.nav-toggle');
  var nav = document.querySelector('.nav ul');
  if(btn && nav){
    btn.addEventListener('click',function(){
      var expanded = this.getAttribute('aria-expanded') === 'true';
      this.setAttribute('aria-expanded', String(!expanded));
      if(nav.style.display === 'flex') nav.style.display = '';
      else nav.style.display = 'flex';
    });
  }

  // Lead magnet form - simulate sending guide
  var leadForm = document.getElementById('leadForm');
  if(leadForm){
    leadForm.addEventListener('submit', function(e){
      e.preventDefault();
      var email = leadForm.email.value;
      if(!email) return alert('Please enter your email.');
      // Minimal UX: show a thank-you state
      var btn = leadForm.querySelector('button');
      btn.textContent = 'Sending…';
      setTimeout(function(){
        btn.textContent = 'Sent — check your inbox';
        leadForm.email.value = '';
      },900);
    });
  }

  // CTA ripple keyboard support
  document.querySelectorAll('.ripple').forEach(function(el){
    el.addEventListener('keydown', function(e){
      if(e.key === 'Enter' || e.key === ' '){
        el.classList.add('active');
        setTimeout(function(){el.classList.remove('active');},300);
      }
    });
  });
});