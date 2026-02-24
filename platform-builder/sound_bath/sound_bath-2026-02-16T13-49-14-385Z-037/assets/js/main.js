(function(){
  // Simple UI interactions: menu toggle + smooth anchor scroll
  var menuToggle = document.getElementById('menuToggle');
  var navList = document.getElementById('navList');
  if(menuToggle){
    menuToggle.addEventListener('click', function(){
      var expanded = this.getAttribute('aria-expanded') === 'true';
      this.setAttribute('aria-expanded', String(!expanded));
      if(navList.style.display === 'flex'){
        navList.style.display = '';
      } else {
        navList.style.display = 'flex';
        navList.style.flexDirection = 'column';
        navList.style.background = 'rgba(4,8,16,0.9)';
      }
    });
  }

  // Smooth scroll for internal links
  document.addEventListener('click', function(e){
    var t = e.target.closest('a');
    if(!t) return;
    if(t.getAttribute('href') && t.getAttribute('href').startsWith('#')){
      e.preventDefault();
      var id = t.getAttribute('href').slice(1);
      var el = document.getElementById(id);
      if(el) el.scrollIntoView({behavior:'smooth',block:'start'});
    }
  });

  // Lightweight reveal on scroll
  function reveal(){
    var panels = document.querySelectorAll('.panel');
    panels.forEach(function(p, i){
      var r = p.getBoundingClientRect();
      if(r.top < window.innerHeight - 80){
        p.style.transform = 'translateY(0)';
        p.style.opacity = 1;
      }
    });
  }
  document.addEventListener('scroll', reveal);
  window.addEventListener('load', function(){
    document.querySelectorAll('.panel').forEach(function(p){p.style.transition='all 600ms cubic-bezier(.2,.9,.2,1)';p.style.transform='translateY(18px)';p.style.opacity=0});
    reveal();
  });
})();