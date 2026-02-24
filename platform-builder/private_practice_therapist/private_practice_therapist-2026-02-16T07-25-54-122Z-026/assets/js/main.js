(function(){
  // Simple interactions: mobile nav and booking quick modal
  document.addEventListener('DOMContentLoaded', function(){
    var btn = document.querySelector('.nav-toggle');
    var navList = document.querySelector('.nav-list');
    if(btn && navList){
      btn.addEventListener('click', function(){
        var shown = navList.style.display === 'flex' || navList.style.display === 'block';
        navList.style.display = shown ? 'none' : 'block';
      });
    }

    // Lightweight reveal on scroll for gallery items
    var revealItems = document.querySelectorAll('.pillar, .case');
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if(e.isIntersecting){
          e.target.classList.add('reveal');
          io.unobserve(e.target);
        }
      });
    }, {threshold:0.08});
    revealItems.forEach(function(el){ io.observe(el); });

    // Safe external CTA handling
    var ctas = document.querySelectorAll('a[href^="{{PRIMARY_CTA_URL}}"], a.btn.primary');
    ctas.forEach(function(a){
      a.addEventListener('click', function(e){
        // allow default navigation; placeholder for analytics or validation
      });
    });
  });

})();
