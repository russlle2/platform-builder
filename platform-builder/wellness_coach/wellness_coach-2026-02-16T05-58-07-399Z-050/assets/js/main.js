(function(){
  // small interactive helpers: nav toggle, year, lead magnet form
  document.addEventListener('DOMContentLoaded',function(){
    var navToggle=document.getElementById('nav-toggle');
    var nav=document.getElementById('main-nav');
    if(navToggle){navToggle.addEventListener('click',function(){
      nav.classList.toggle('open');
      navToggle.setAttribute('aria-expanded',nav.classList.contains('open'));
    });}

    // year
    var y=document.getElementById('year'); if(y) y.textContent=new Date().getFullYear();

    // lead magnet form
    var form=document.getElementById('magnet-form');
    var success=document.getElementById('magnet-success');
    if(form){
      form.addEventListener('submit',function(e){
        e.preventDefault();
        var email=form.email.value.trim();
        if(!email || email.indexOf('@')===-1){
          form.email.focus();
          return;
        }
        try{localStorage.setItem('lead_email',email);}catch(err){}
        form.classList.add('hidden');
        if(success) success.classList.remove('hidden');
        // simulate download link open
        setTimeout(function(){
          window.open('/assets/Habit-Map.pdf','_blank');
        },600);
      });
    }

    // smooth in-page scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(function(a){
      a.addEventListener('click',function(e){
        var target=document.querySelector(this.getAttribute('href'));
        if(target){e.preventDefault();target.scrollIntoView({behavior:'smooth',block:'start'});} 
      });
    });
  });
})();
