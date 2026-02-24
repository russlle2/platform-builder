(function(){
  document.addEventListener('DOMContentLoaded',function(){
    var btn=document.querySelector('.nav-toggle');
    var menu=document.getElementById('primary-menu');
    if(btn&&menu){
      btn.addEventListener('click',function(){
        var expanded=btn.getAttribute('aria-expanded')==='true';
        btn.setAttribute('aria-expanded', !expanded);
        menu.classList.toggle('show');
      });
    }

    // Smooth in-page scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(function(a){
      a.addEventListener('click',function(e){
        var target=document.querySelector(this.getAttribute('href'));
        if(target){
          e.preventDefault();
          target.scrollIntoView({behavior:'smooth',block:'start'});
        }
      });
    });

    // Make details accessible: ensure only one open behavior optional
    var details = document.querySelectorAll('details');
    details.forEach(function(d){
      d.addEventListener('toggle',function(){
        if(d.open){
          details.forEach(function(other){ if(other!==d) other.open=false });
        }
      });
    });
  });
})();