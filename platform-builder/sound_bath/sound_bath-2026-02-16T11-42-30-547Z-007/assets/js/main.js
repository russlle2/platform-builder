document.addEventListener('DOMContentLoaded',function(){
  // mobile menu
  var btn=document.querySelector('.menu-toggle');
  var nav=document.querySelector('.nav');
  if(btn){btn.addEventListener('click',function(){
    var expanded = this.getAttribute('aria-expanded') === 'true';
    this.setAttribute('aria-expanded', (!expanded).toString());
    nav.style.display = expanded ? 'none' : 'flex';
  });}

  // diagnostic evaluate
  var evalBtn = document.getElementById('diag-evaluate');
  if(evalBtn){
    evalBtn.addEventListener('click',function(){
      var checks = Array.from(document.querySelectorAll('#diagnostic-list input[type="checkbox"]'));
      var count = checks.filter(function(c){return c.checked}).length;
      var out = document.getElementById('diag-result');
      if(count>=3){ out.textContent = 'This experience is likely a great fit for you today. Consider booking or reaching out if you have specific health questions.' }
      else{ out.textContent = 'You may prefer a private 1:1 session or to try short micro-practices first. Contact us to discuss adaptations.' }
    });
  }

  // set year
  var y=document.getElementById('year'); if(y) y.textContent = new Date().getFullYear();

  // smooth anchor links
  document.querySelectorAll('a[href^="#"]').forEach(function(a){
    a.addEventListener('click',function(e){
      e.preventDefault(); document.querySelector(this.getAttribute('href')).scrollIntoView({behavior:'smooth'});
    });
  });
});