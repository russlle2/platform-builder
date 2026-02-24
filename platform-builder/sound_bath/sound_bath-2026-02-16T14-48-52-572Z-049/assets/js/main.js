(function(){
  document.addEventListener('DOMContentLoaded',function(){
    // year in footer
    var y=document.getElementById('year'); if(y) y.textContent=(new Date()).getFullYear();

    // mobile menu toggle
    var btn=document.querySelector('.menu-toggle');
    var nav=document.querySelector('.nav');
    if(btn && nav){
      btn.addEventListener('click',function(){
        var expanded=btn.getAttribute('aria-expanded')==='true';
        btn.setAttribute('aria-expanded',(!expanded).toString());
        nav.style.display = expanded ? 'none' : 'flex';
      });
    }

    // smooth anchors
    document.querySelectorAll('a[href^="#"]').forEach(function(a){
      a.addEventListener('click',function(e){
        e.preventDefault(); var t=document.querySelector(this.getAttribute('href')); if(t) t.scrollIntoView({behavior:'smooth',block:'start'});
      });
    });

    // basic focus ring accessibility
    document.body.addEventListener('keydown',function(e){ if(e.key==='Tab') document.body.classList.add('show-focus'); });
  });
})();