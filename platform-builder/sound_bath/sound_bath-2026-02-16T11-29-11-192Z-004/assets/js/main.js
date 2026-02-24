(function(){
  document.addEventListener('DOMContentLoaded',function(){
    // year
    var y=document.getElementById('year'); if(y) y.textContent=new Date().getFullYear();

    // mobile toggle
    var btn=document.querySelector('[data-toggle]');
    var nav=document.querySelector('.nav');
    if(btn) btn.addEventListener('click',function(){
      if(nav.style.display==='flex'){nav.style.display='none';}else{nav.style.display='flex';nav.style.flexDirection='column';nav.style.alignItems='flex-end';}
    });

    // smooth anchor scroll
    document.querySelectorAll('a[href^="#"]').forEach(function(a){
      a.addEventListener('click',function(e){
        e.preventDefault(); var t=document.querySelector(this.getAttribute('href')); if(t) t.scrollIntoView({behavior:'smooth',block:'start'});
      })
    });
  });

  // newsletter signup (stub)
  window.newsletterSignUp=function(e){
    e.preventDefault(); var form=e.target; var em=form.email.value; if(!em) return false; alert('Thanks — we\'ll notify ' + em + ' about upcoming circles.'); form.reset(); return false;
  };
})();
