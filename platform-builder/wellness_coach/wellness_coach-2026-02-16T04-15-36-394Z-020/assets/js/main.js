// Small interactive helpers: nav toggle, lead magnet form, FAQ state
document.addEventListener('DOMContentLoaded',function(){
  // Year in footer
  var y=document.getElementById('year'); if(y) y.textContent = new Date().getFullYear();

  // Mobile nav
  var navToggle=document.getElementById('nav-toggle');
  var mainNav=document.getElementById('main-nav');
  navToggle && navToggle.addEventListener('click',function(){
    var expanded = this.getAttribute('aria-expanded') === 'true';
    this.setAttribute('aria-expanded', String(!expanded));
    var links = mainNav.querySelectorAll('a');
    links.forEach(function(a){ a.style.display = expanded ? null : 'inline-block'; });
  });

  // Lead form: simple validation and friendly message
  var leadForm = document.getElementById('lead-form');
  if(leadForm){
    leadForm.addEventListener('submit', function(e){
      e.preventDefault();
      var email = leadForm.querySelector('input[name="email"]').value;
      if(!email || !/.+@.+\..+/.test(email)){
        alert('Please enter a valid email.');
        return;
      }
      // simulate download / subscribe
      leadForm.innerHTML = '<p class="success">Thanks — check your inbox for the guide.</p>';
      // In a real build, post to your mailing endpoint here.
    });
  }

  // FAQ: allow only one open at a time
  var details = document.querySelectorAll('.faq-list details');
  details.forEach(function(d){
    d.addEventListener('toggle', function(){
      if(this.open){
        details.forEach(function(other){ if(other !== d) other.open = false; });
      }
    });
  });

  // Smooth links for anchors
  document.querySelectorAll('a[href^="#"]').forEach(function(a){
    a.addEventListener('click',function(e){
      e.preventDefault(); var id=this.getAttribute('href').slice(1); var el=document.getElementById(id);
      if(el) el.scrollIntoView({behavior:'smooth', block:'start'});
    });
  });
});
