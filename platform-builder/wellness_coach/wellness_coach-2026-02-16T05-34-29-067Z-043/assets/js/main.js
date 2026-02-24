(function(){
  // Basic interactive behaviours: nav toggle, lead form, year
  document.addEventListener('DOMContentLoaded',function(){
    var toggle=document.getElementById('nav-toggle');
    var nav=document.getElementById('main-nav');
    toggle&&toggle.addEventListener('click',function(){
      if(nav.style.display==='flex'){nav.style.display='none'}else{nav.style.display='flex'}
    });

    var form=document.getElementById('lead-form');
    if(form){
      form.addEventListener('submit',function(e){
        e.preventDefault();
        var email=form.email.value.trim();
        if(!email || email.indexOf('@')===-1){
          alert('Please enter a valid email address');
          return;
        }
        // simulated submit: save to localStorage and thank the user
        try{localStorage.setItem('lead_'+Date.now(),JSON.stringify({email:email,ts:Date.now()}))}catch(err){}
        form.innerHTML='<p class="small">Thanks — the guide is on its way to '+email+'. Check your inbox.</p>';
      });
    }

    // FAQ toggles: allow one open at a time
    var details=document.querySelectorAll('.faq details');
    details.forEach(function(d){
      d.addEventListener('click',function(){
        details.forEach(function(other){ if(other!==d) other.removeAttribute('open'); });
      });
    });

    // set year
    var y=document.getElementById('year'); if(y) y.textContent=new Date().getFullYear();

    // smooth scroll for same-page anchors
    document.querySelectorAll('a[href^="#"]').forEach(function(a){
      a.addEventListener('click',function(e){
        e.preventDefault(); var target=document.querySelector(this.getAttribute('href'));
        if(target) target.scrollIntoView({behavior:'smooth',block:'start'});
      });
    });
  });
})();