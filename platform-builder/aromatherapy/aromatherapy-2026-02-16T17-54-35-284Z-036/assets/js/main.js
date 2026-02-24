(function(){
  // Simple UI behaviors: year, nav toggle, smooth scroll
  document.addEventListener('DOMContentLoaded', function(){
    var y = document.getElementById('year'); if(y) y.textContent = new Date().getFullYear();
    var toggle = document.getElementById('navToggle');
    var nav = document.getElementById('mainNav');
    if(toggle && nav){
      toggle.addEventListener('click', function(){
        nav.classList.toggle('expanded');
        toggle.setAttribute('aria-expanded', nav.classList.contains('expanded') ? 'true' : 'false');
      });
    }

    // Smooth scroll for internal links
    document.querySelectorAll('a[href^="#"]').forEach(function(a){
      a.addEventListener('click', function(e){
        e.preventDefault();
        var id = this.getAttribute('href').slice(1);
        var el = document.getElementById(id);
        if(el) el.scrollIntoView({behavior:'smooth'});
      });
    });

    // Ripple effect: create circle on click
    document.querySelectorAll('.ripple').forEach(function(btn){
      btn.addEventListener('click', function(e){
        var rect = btn.getBoundingClientRect();
        var circle = document.createElement('span');
        var diameter = Math.max(rect.width, rect.height);
        var radius = diameter/2;
        circle.style.width = circle.style.height = diameter + 'px';
        circle.style.left = (e.clientX - rect.left - radius) + 'px';
        circle.style.top = (e.clientY - rect.top - radius) + 'px';
        circle.classList.add('ripple-effect');
        circle.style.position = 'absolute';
        circle.style.borderRadius = '50%';
        circle.style.transform = 'scale(0)';
        circle.style.background = 'rgba(255,255,255,0.35)';
        circle.style.pointerEvents = 'none';
        circle.style.transition = 'transform 600ms, opacity 900ms';
        btn.appendChild(circle);
        requestAnimationFrame(function(){ circle.style.transform = 'scale(4)'; circle.style.opacity = '0'; });
        setTimeout(function(){ try{ btn.removeChild(circle); }catch(e){} }, 1000);
      });
    });

  });
})();