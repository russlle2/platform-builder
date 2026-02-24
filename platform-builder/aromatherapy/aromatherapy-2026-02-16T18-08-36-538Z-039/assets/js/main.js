(function(){
  // basic interactivity: nav toggle, faq accordion, year
  document.addEventListener('DOMContentLoaded',function(){
    var navToggle = document.getElementById('navToggle');
    var navList = document.getElementById('navList');
    if(navToggle){
      navToggle.addEventListener('click',function(){
        var expanded = this.getAttribute('aria-expanded') === 'true';
        this.setAttribute('aria-expanded', String(!expanded));
        navList.classList.toggle('show');
      });
    }

    // FAQ accordion
    var qBtns = document.querySelectorAll('.faq-q');
    qBtns.forEach(function(btn){
      btn.addEventListener('click',function(){
        var expanded = this.getAttribute('aria-expanded') === 'true';
        // collapse others
        qBtns.forEach(function(b){b.setAttribute('aria-expanded','false');var a=b.nextElementSibling;if(a) a.hidden=true});
        this.setAttribute('aria-expanded', String(!expanded));
        var answer = this.nextElementSibling;
        if(answer){ answer.hidden = expanded; }
      });
    });

    // set year
    var y = new Date().getFullYear();
    var yearEl = document.getElementById('year');
    if(yearEl) yearEl.textContent = y;

    // smooth scroll for internal links
    document.querySelectorAll('a[href^="#"]').forEach(function(a){
      a.addEventListener('click',function(e){
        e.preventDefault();
        var t = document.querySelector(this.getAttribute('href'));
        if(t) t.scrollIntoView({behavior:'smooth'});
      });
    });
  });
})();