(function(){
  document.addEventListener('DOMContentLoaded', function(){
    var nav = document.getElementById('nav');
    var toggle = document.getElementById('navToggle');
    if(toggle){
      toggle.addEventListener('click', function(){
        if(nav.style.display==='flex' || nav.style.display==='block'){
          nav.style.display='none';
        } else {
          nav.style.display='block';
        }
      });
    }

    // Smooth internal links
    document.querySelectorAll('a[href^="#"]').forEach(function(a){
      a.addEventListener('click', function(e){
        var id = a.getAttribute('href').slice(1);
        var el = document.getElementById(id);
        if(el){
          e.preventDefault();
          el.scrollIntoView({behavior:'smooth',block:'start'});
        }
      });
    });

    // Simple sample analytics hook (no external calls)
    window.trackEvent = function(name, data){
      try{console.log('track',name,data||{});}catch(e){}
    };

    // Accessibility: allow escape to close mobile nav
    document.addEventListener('keydown', function(e){
      if(e.key==='Escape' && nav && window.innerWidth < 880){
        nav.style.display='none';
      }
    });
  });
})();