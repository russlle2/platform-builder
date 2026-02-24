(function(){
  // Simple JS for small UX touches
  document.addEventListener('DOMContentLoaded',function(){
    var y = new Date().getFullYear();
    var el = document.getElementById('year'); if(el) el.textContent = y;

    // Smooth scroll for internal links
    var links = document.querySelectorAll('a[href^="#"]');
    links.forEach(function(a){
      a.addEventListener('click',function(e){
        var id = this.getAttribute('href');
        if(id.length>1){
          e.preventDefault();
          var target = document.querySelector(id);
          if(target) target.scrollIntoView({behavior:'smooth',block:'start'});
        }
      });
    });

    // Basic phone link protection (obfuscation placeholder)
    var phoneLinks = document.querySelectorAll('a[href^="tel:"]');
    phoneLinks.forEach(function(p){ p.dataset.protected = 'true'; });
  });
})();
