(function(){
  // simple nav toggle
  var navToggle=document.getElementById('navToggle');
  var nav=document.getElementById('nav');
  navToggle&&navToggle.addEventListener('click',function(){
    if(nav.style.display==='flex'){nav.style.display='none';navToggle.textContent='☰';}
    else{nav.style.display='flex';nav.style.flexDirection='column';navToggle.textContent='✕';}
  });

  // schedule accordion
  var events=document.querySelectorAll('.event');
  events.forEach(function(ev){
    var btn=ev.querySelector('.toggle');
    var body=ev.querySelector('.event-body');
    if(!btn||!body) return;
    btn.addEventListener('click',function(){
      var open = body.style.display==='block';
      document.querySelectorAll('.event-body').forEach(function(b){b.style.display='none'});
      if(!open){body.style.display='block'}
    });
  });

  // details fallback for older browsers
  document.querySelectorAll('details summary').forEach(function(s){
    s.addEventListener('click',function(e){
      var d=this.parentNode;
      setTimeout(function(){d.classList.toggle('open',d.open)},20);
    });
  });

  // set year
  var y=document.getElementById('year'); if(y) y.textContent=new Date().getFullYear();

  // smooth scroll for internal CTAs
  document.querySelectorAll('a[href^="#"]').forEach(function(a){
    a.addEventListener('click',function(e){
      e.preventDefault(); var t=document.querySelector(this.getAttribute('href')); if(t) t.scrollIntoView({behavior:'smooth'});
    });
  });
})();