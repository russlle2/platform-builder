(function(){
  // Simple nav toggle
  var btn=document.querySelector('.nav-toggle');
  var nav=document.querySelector('.main-nav');
  btn&&btn.addEventListener('click',function(){
    if(nav.classList.contains('open')){
      nav.classList.remove('open');
      btn.innerText='☰';
    }else{
      nav.classList.add('open');
      btn.innerText='✕';
    }
  });

  // Smooth scroll for CTA links
  document.querySelectorAll('a[href^="#"]').forEach(function(a){
    a.addEventListener('click',function(e){
      e.preventDefault();
      var t=document.querySelector(this.getAttribute('href'));
      if(t) t.scrollIntoView({behavior:'smooth',block:'start'});
    });
  });

  // Insert NEXT_EVENT_DATE into elements that link to events
  document.querySelectorAll('a[href="/events.html"]').forEach(function(a){
    var next='{{NEXT_EVENT_DATE}}';
    if(next && next.indexOf('{')===-1){
      // only replace if placeholder appears filled in server side
      a.innerText = 'Next event — '+next;
    }
  });

  // tiny accessibility: add aria-expanded on toggle
  if(btn){
    btn.setAttribute('aria-expanded','false');
    btn.addEventListener('click',function(){
      var expanded = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!expanded));
    });
  }
})();
