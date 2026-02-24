document.addEventListener('DOMContentLoaded',function(){
  // year
  var y=document.getElementById('year'); if(y) y.textContent=new Date().getFullYear();

  // nav toggle
  var btn=document.querySelector('.nav-toggle');
  var nav=document.querySelector('.nav');
  if(btn && nav){
    btn.addEventListener('click',function(){
      var expanded=this.getAttribute('aria-expanded')==='true';
      this.setAttribute('aria-expanded',!expanded);
      nav.style.display = expanded ? 'none' : 'flex';
    });
    window.addEventListener('resize',function(){ if(window.innerWidth>900) nav.style.display='flex'; });
  }

  // accordion
  document.querySelectorAll('.qa').forEach(function(item){
    var q=item.querySelector('.q');
    var a=item.querySelector('.a');
    q.addEventListener('click',function(){
      var open=this.getAttribute('aria-expanded')==='true';
      document.querySelectorAll('.qa .q').forEach(function(b){ b.setAttribute('aria-expanded','false'); b.nextElementSibling.style.display='none'; });
      if(!open){
        this.setAttribute('aria-expanded','true');
        a.style.display='block';
      }
    });
  });

  // smooth scroll for in-page anchors
  document.querySelectorAll('a[href^="#"]').forEach(function(link){
    link.addEventListener('click',function(e){
      e.preventDefault(); var id=this.getAttribute('href').slice(1); var el=document.getElementById(id); if(el) el.scrollIntoView({behavior:'smooth',block:'start'});
    });
  });

});