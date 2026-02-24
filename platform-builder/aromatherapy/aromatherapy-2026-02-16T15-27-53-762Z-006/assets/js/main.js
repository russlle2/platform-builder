document.addEventListener('DOMContentLoaded',function(){
  // mobile menu
  var toggle=document.querySelector('.menu-toggle');
  var nav=document.getElementById('nav-list');
  if(toggle){
    toggle.addEventListener('click',function(){
      var expanded = this.getAttribute('aria-expanded') === 'true' || false;
      this.setAttribute('aria-expanded',!expanded);
      nav.classList.toggle('show');
    });
  }

  // year in footer
  var yearEl=document.getElementById('year'); if(yearEl) yearEl.textContent=new Date().getFullYear();

  // smooth scroll for internal links
  document.querySelectorAll('a[href^="#"]').forEach(function(a){
    a.addEventListener('click',function(e){
      e.preventDefault(); document.querySelector(this.getAttribute('href')).scrollIntoView({behavior:'smooth'});
    });
  });

  // basic CTA click tracking (no external network)
  document.querySelectorAll('.btn').forEach(function(b){
    b.addEventListener('click',function(){
      try{ window.localStorage.setItem('last_cta', JSON.stringify({label:this.textContent, time:Date.now()})); }catch(e){}
    });
  });

});