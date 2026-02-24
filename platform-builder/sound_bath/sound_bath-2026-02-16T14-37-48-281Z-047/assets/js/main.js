(function(){
  'use strict';
  // Mobile nav toggle
  var btn = document.querySelector('.nav-toggle');
  var nav = document.getElementById('nav-list');
  if(btn && nav){
    btn.addEventListener('click',function(){
      var expanded = this.getAttribute('aria-expanded') === 'true';
      this.setAttribute('aria-expanded', String(!expanded));
      if(nav.style.display === 'flex' || nav.style.display === 'block'){
        nav.style.display = '';
      } else {
        nav.style.display = 'block';
        nav.style.flexDirection = 'column';
      }
    });
  }

  // FAQ accordion
  var questions = document.querySelectorAll('.faq-q');
  questions.forEach(function(q){
    q.addEventListener('click',function(){
      var expanded = this.getAttribute('aria-expanded') === 'true';
      this.setAttribute('aria-expanded',String(!expanded));
      var a = this.nextElementSibling;
      if(a){
        if(!expanded){ a.hidden = false; } else { a.hidden = true; }
      }
    });
  });

  // Smooth scroll for internal links
  document.querySelectorAll('a[href^="#"]').forEach(function(a){
    a.addEventListener('click',function(e){
      var id = this.getAttribute('href');
      if(id.length>1){
        e.preventDefault();
        document.querySelector(id).scrollIntoView({behavior:'smooth'});
      }
    });
  });

  // CTA click tracking (lightweight)
  document.querySelectorAll('a[href][class*="btn"]').forEach(function(el){
    el.addEventListener('click',function(){
      try{ if(window.dataLayer){window.dataLayer.push({event:'cta_click',label:this.textContent.trim()});} }catch(e){}
    });
  });

})();