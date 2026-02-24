(function(){
  // Small interactive behaviors: year, nav toggle, FAQ accordion
  document.addEventListener('DOMContentLoaded',function(){
    var y = new Date().getFullYear();
    var el = document.getElementById('year'); if(el) el.textContent = y;

    var toggle = document.querySelector('.nav-toggle');
    var nav = document.querySelector('.nav-links');
    if(toggle && nav){
      toggle.addEventListener('click',function(){
        nav.style.display = nav.style.display === 'flex' ? 'none' : 'flex';
      });
    }

    var qs = document.querySelectorAll('.accordion .q');
    qs.forEach(function(btn){
      btn.addEventListener('click',function(){
        var target = btn.getAttribute('data-target');
        var panel = document.getElementById(target);
        if(!panel) return;
        var open = panel.style.display === 'block';
        // Close all
        document.querySelectorAll('.accordion .a').forEach(function(a){a.style.display='none'});
        if(!open) panel.style.display = 'block';
        // smooth scroll into view for small screens
        if(window.innerWidth < 880 && !open){ setTimeout(function(){ panel.scrollIntoView({behavior:'smooth',block:'center'})},80)}
      })
    });

    // Deep-link accordion if hash present
    if(location.hash){
      var a = document.querySelector(location.hash);
      if(a && a.classList.contains('a')) a.style.display='block';
    }
  });
})();