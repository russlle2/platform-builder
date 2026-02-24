(function(){
  // Basic UI: nav toggle, form handling, ripple effect and year
  document.addEventListener('DOMContentLoaded', function(){
    var navToggle = document.getElementById('navToggle');
    var mainNav = document.getElementById('mainNav');
    var yearEl = document.getElementById('year');
    if(navToggle){navToggle.addEventListener('click', function(){
      if(mainNav.style.display === 'flex'){mainNav.style.display = '';} else {mainNav.style.display = 'flex';}
    });}
    if(yearEl){yearEl.textContent = new Date().getFullYear();}

    // Join form: simple validation and faux submit
    var joinForm = document.getElementById('joinForm');
    var joinBtn = document.getElementById('joinBtn');
    if(joinForm){
      joinForm.addEventListener('submit', function(e){
        e.preventDefault();
        var email = joinForm.querySelector('input[type="email"]').value;
        if(!email || !email.includes('@')){
          alert('Please provide a valid email address.');
          return;
        }
        joinBtn.textContent = 'Request sent';
        joinBtn.disabled = true;
        setTimeout(function(){
          joinBtn.textContent = 'Request Invite';
          joinBtn.disabled = false;
          joinForm.querySelector('input[type="email"]').value = '';
          alert('Thanks — we will be in touch with membership details.');
        },1200);
      });
    }

    // Ripple effect for primary CTAs
    var ctas = document.querySelectorAll('.primary-cta');
    ctas.forEach(function(btn){
      btn.classList.add('ripple');
      btn.addEventListener('click', function(e){
        var el = e.currentTarget;
        el.classList.remove('active');
        void el.offsetWidth; // reflow
        el.classList.add('active');
      });
    });

    // Small accessibility: add focus outlines for keyboard users
    function handleFirstTab(e){
      if(e.key === 'Tab'){
        document.body.classList.add('user-is-tabbing');
        window.removeEventListener('keydown', handleFirstTab);
      }
    }
    window.addEventListener('keydown', handleFirstTab);
  });
})();