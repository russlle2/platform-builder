(function(){
  // Simple interactivity: nav toggle, lead magnet handling, and smooth anchor behavior
  document.addEventListener('DOMContentLoaded',function(){
    var toggle=document.querySelector('.nav-toggle');
    var navList=document.querySelector('.nav-list');
    if(toggle){
      toggle.addEventListener('click',function(){
        var expanded=this.getAttribute('aria-expanded')=== 'true';
        this.setAttribute('aria-expanded', String(!expanded));
        if(navList){navList.style.display = expanded? 'none':'flex';}
      });
    }

    // Lead magnet form
    var leadForm=document.getElementById('leadForm');
    if(leadForm){
      leadForm.addEventListener('submit',function(e){
        e.preventDefault();
        var email=document.getElementById('leadEmail').value;
        if(!email) return;
        try{localStorage.setItem('lead_email',email);}catch(err){}
        // simple UX swap
        leadForm.innerHTML = '<div class="thanks"><strong>Thanks!</strong> Check your inbox for the guide.</div>';
      });
    }

    // Smooth links within the page
    var anchors=document.querySelectorAll('a[href^="#"]');
    anchors.forEach(function(a){
      a.addEventListener('click',function(e){
        e.preventDefault();
        var target=document.querySelector(this.getAttribute('href'));
        if(target) target.scrollIntoView({behavior:'smooth',block:'start'});
      });
    });

    // CTA tracking: store last CTA click
    var ctas=document.querySelectorAll('a[href]');
    ctas.forEach(function(c){
      c.addEventListener('click',function(){
        try{localStorage.setItem('last_cta',this.getAttribute('href'));}catch(e){}
      });
    });
  });
})();
