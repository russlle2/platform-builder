// Simple interactions for the bold_playful template
document.addEventListener('DOMContentLoaded', function(){
  var toggle = document.querySelector('.nav-toggle');
  var mobile = document.querySelector('.mobile-nav');
  if(toggle && mobile){
    toggle.addEventListener('click', function(){
      mobile.classList.toggle('hidden');
      toggle.setAttribute('aria-expanded', !mobile.classList.contains('hidden'));
    });
  }

  // Smooth scroll for same-page anchors
  document.querySelectorAll('a[href^="#"]').forEach(function(a){
    a.addEventListener('click', function(e){
      var id = this.getAttribute('href');
      var el = document.querySelector(id);
      if(el){
        e.preventDefault();
        el.scrollIntoView({behavior:'smooth',block:'start'});
      }
    });
  });

  // Track simple CTA clicks for a local console log (no analytics)
  document.querySelectorAll('.btn.primary, .cta .btn').forEach(function(btn){
    btn.addEventListener('click', function(){
      console.info('Primary CTA clicked', this.href || this.getAttribute('href'));
    });
  });

  // Small form prevention placeholder if a booking form is added later
  document.querySelectorAll('form').forEach(function(form){
    form.addEventListener('submit', function(e){
      var action = form.getAttribute('action') || '';
      // If no action, prevent accidental submissions in template
      if(!action || action === '#'){
        e.preventDefault();
        alert('This template form is a placeholder. Configure form submission in settings.');
      }
    });
  });
});
