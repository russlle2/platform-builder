// Minimal interactive behaviors: nav toggle, FAQ accordion, year fill
document.addEventListener('DOMContentLoaded',function(){
  var navToggle = document.getElementById('navToggle');
  var nav = document.querySelector('.main-nav');
  if(navToggle){
    navToggle.addEventListener('click',function(){
      if(nav.style.display==='block'){nav.style.display=''}else{nav.style.display='block'}
    });
  }

  var faqs = Array.from(document.querySelectorAll('.faq-item'));
  faqs.forEach(function(btn){
    btn.addEventListener('click',function(){
      var expanded = this.getAttribute('aria-expanded') === 'true';
      faqs.forEach(function(b){b.setAttribute('aria-expanded','false')});
      this.setAttribute('aria-expanded', String(!expanded));
    });
  });

  var y = document.getElementById('year');
  if(y){ y.textContent = new Date().getFullYear(); }

  // Light smooth scroll for internal links
  document.querySelectorAll('a[href^="#"]').forEach(function(a){
    a.addEventListener('click',function(e){
      var t = document.querySelector(this.getAttribute('href'));
      if(t){ e.preventDefault(); t.scrollIntoView({behavior:'smooth'}); }
    });
  });
});