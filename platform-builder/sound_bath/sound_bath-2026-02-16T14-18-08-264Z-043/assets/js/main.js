(function(){
  // Minimal behaviors: mobile nav toggle and smooth scroll for internal links
  document.addEventListener('DOMContentLoaded',function(){
    var btn=document.querySelector('.nav-toggle');
    var nav=document.querySelector('.nav');
    if(btn && nav){
      btn.addEventListener('click',function(){
        if(nav.style.display==='flex'){nav.style.display='none';}
        else{nav.style.display='flex';nav.style.flexDirection='column';}
      });
    }

    // Smooth scroll for internal anchors
    document.querySelectorAll('a[href^="#"]').forEach(function(a){
      a.addEventListener('click',function(e){
        var t=document.querySelector(this.getAttribute('href'));
        if(t){e.preventDefault();t.scrollIntoView({behavior:'smooth',block:'start'});}
      });
    });

    // Small UX: open details if URL hash matches
    if(window.location.hash){
      try{var el=document.querySelector(window.location.hash);if(el && el.tagName==='DETAILS') el.open=true;}catch(e){}
    }
  });
})();