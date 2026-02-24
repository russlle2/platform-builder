(function(){
  // Simple interactions: nav toggle, lead capture mock, year, slider
  document.addEventListener('DOMContentLoaded',function(){
    // year
    var y=document.getElementById('year'); if(y) y.textContent=new Date().getFullYear();

    // nav toggle
    var toggle=document.querySelector('.nav-toggle');
    var nav=document.querySelector('.main-nav');
    toggle && toggle.addEventListener('click',function(){
      if(nav.style.display==='block') nav.style.display=''; else nav.style.display='block';
    });

    // simple slider auto-scroll
    var slider=document.querySelector('[data-slider]');
    if(slider){
      var pos=0; setInterval(function(){
        pos = (pos + 300) % (slider.scrollWidth || 1000);
        slider.scrollTo({left:pos,behavior:'smooth'});
      },3500);
    }

    // lead form fake submission
    var leadForm=document.getElementById('leadForm');
    if(leadForm){
      leadForm.addEventListener('submit',function(e){
        e.preventDefault();
        var email=leadForm.querySelector('input[name="email"]').value;
        leadForm.querySelector('input').disabled=true;
        var btn=leadForm.querySelector('button');
        btn.textContent='Sending...';
        setTimeout(function(){
          btn.textContent='Sent ✓';
          leadForm.reset();
          leadForm.querySelector('input').disabled=false;
        },1000);
      });
    }

    // smooth anchor links
    document.querySelectorAll('a[href^="#"]').forEach(function(a){
      a.addEventListener('click',function(e){
        e.preventDefault(); var t=document.querySelector(this.getAttribute('href')); if(t) t.scrollIntoView({behavior:'smooth',block:'start'});
      });
    });
  });
})();