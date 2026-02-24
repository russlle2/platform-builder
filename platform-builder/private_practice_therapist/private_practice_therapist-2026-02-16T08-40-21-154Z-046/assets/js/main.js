// Minimal interactive behavior for gallery layout
document.addEventListener('DOMContentLoaded',function(){
  // Simple accessibility: open/close details with keyboard
  document.querySelectorAll('details summary').forEach(function(s){
    s.addEventListener('keydown',function(e){
      if(e.key==='Enter' || e.key===' '){
        e.preventDefault();
        var parent = s.parentElement;
        parent.open = !parent.open;
      }
    });
  });

  // Smooth scroll for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(function(a){
    a.addEventListener('click',function(e){
      e.preventDefault();
      var id = a.getAttribute('href').slice(1);
      var el = document.getElementById(id);
      if(el) el.scrollIntoView({behavior:'smooth',block:'start'});
    });
  });
});