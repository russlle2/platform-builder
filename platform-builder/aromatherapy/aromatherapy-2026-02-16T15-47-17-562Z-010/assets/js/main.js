(function(){
  document.addEventListener('DOMContentLoaded',function(){
    // Mobile nav toggle
    var navToggle = document.getElementById('navToggle');
    var mainNav = document.getElementById('mainNav');
    navToggle && navToggle.addEventListener('click',function(){
      mainNav.classList.toggle('show');
    });

    // Insert current year
    var y = new Date().getFullYear();
    var el = document.getElementById('year');
    if(el) el.textContent = y;

    // Smooth scroll for in-page links
    document.querySelectorAll('a[href^="#"]').forEach(function(a){
      a.addEventListener('click',function(e){
        var id = a.getAttribute('href');
        if(id.length>1){
          var target = document.querySelector(id);
          if(target){
            e.preventDefault();
            target.scrollIntoView({behavior:'smooth'});
            // close nav on mobile
            mainNav && mainNav.classList.remove('show');
          }
        }
      });
    });
  });
})();
