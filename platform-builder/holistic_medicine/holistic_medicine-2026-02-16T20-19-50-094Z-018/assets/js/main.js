// Minimal interactivity: nav toggle, smooth scroll, lead form
document.addEventListener('DOMContentLoaded',function(){
  var toggle=document.getElementById('nav-toggle');
  var list=document.getElementById('nav-list');
  if(toggle){toggle.addEventListener('click',function(){
    var expanded = this.getAttribute('aria-expanded') === 'true';
    this.setAttribute('aria-expanded', !expanded);
    list.classList.toggle('show');
  });}

  // Smooth scrolling for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(function(a){
    a.addEventListener('click',function(e){
      e.preventDefault();
      var id = this.getAttribute('href').slice(1);
      var el = document.getElementById(id);
      if(el) el.scrollIntoView({behavior:'smooth'});
    });
  });

  // Lead magnet form - simulate subscribe and show thanks
  var leadForm = document.getElementById('lead-form');
  if(leadForm){
    leadForm.addEventListener('submit',function(e){
      e.preventDefault();
      var email = document.getElementById('lead-email').value;
      if(!email) return;
      // rudimentary localStorage to remember
      try{ localStorage.setItem('lead_email', email); }catch(e){}
      leadForm.innerHTML = '<p style="color:#dffbf0;font-weight:600">Thanks! Check your inbox for the guide. <small style="display:block;color:#9ad9c6;margin-top:6px">We respect your privacy.</small></p>';
    });
  }
});