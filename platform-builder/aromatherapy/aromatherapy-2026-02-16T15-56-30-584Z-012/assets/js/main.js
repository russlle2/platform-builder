// Minimal JS: nav toggle, FAQ accordion, lead form
document.addEventListener('DOMContentLoaded',function(){
  // year
  var y = document.getElementById('year'); if(y) y.textContent = new Date().getFullYear();

  // nav toggle
  var toggle = document.querySelector('.nav-toggle');
  var navList = document.querySelector('.nav-list');
  if(toggle){
    toggle.addEventListener('click',function(){
      var open = this.getAttribute('aria-expanded') === 'true';
      this.setAttribute('aria-expanded', String(!open));
      if(navList) navList.style.display = open ? 'none' : 'flex';
    });
  }

  // accordion
  var questions = document.querySelectorAll('.accordion .q');
  questions.forEach(function(btn){
    btn.addEventListener('click',function(){
      var a = this.nextElementSibling;
      var open = a.style.display === 'block';
      // close all
      document.querySelectorAll('.accordion .a').forEach(function(el){el.style.display='none'});
      if(!open) a.style.display='block';
    });
  });

  // lead form
  var leadForm = document.getElementById('leadForm');
  if(leadForm){
    leadForm.addEventListener('submit',function(e){
      e.preventDefault();
      var email = leadForm.querySelector('input[type="email"]').value;
      if(!email || !/.+@.+\..+/.test(email)){
        alert('Please provide a valid email.');
        return;
      }
      // Simulate a lightweight client-side response
      leadForm.innerHTML = '<p class="fine-print">Thanks! Check your inbox for the guide. You can close this tab or explore the site.</p>';
    });
  }

  // smooth anchor behavior for internal links
  document.querySelectorAll('a[href^="#"]').forEach(function(a){
    a.addEventListener('click',function(e){
      e.preventDefault(); var t = document.querySelector(this.getAttribute('href')); if(t) t.scrollIntoView({behavior:'smooth'});
    });
  });
});
