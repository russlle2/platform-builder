(function(){
  // Simple UI behaviors: year, nav toggle, FAQ, next event label
  document.addEventListener('DOMContentLoaded',function(){
    var year = document.getElementById('year'); if(year) year.textContent = new Date().getFullYear();

    // Nav toggle for small screens
    var toggle = document.querySelector('.nav-toggle');
    var nav = document.querySelector('.main-nav');
    if(toggle && nav){
      toggle.addEventListener('click',function(){
        nav.style.display = nav.style.display === 'flex' ? 'none' : 'flex';
      });
    }

    // FAQ native details styling helper
    var details = document.querySelectorAll('.faq details');
    details.forEach(function(d){
      d.addEventListener('toggle',function(){
        if(d.open){ d.style.boxShadow = '0 6px 20px rgba(2,6,23,0.6)'; } else { d.style.boxShadow = 'none'; }
      });
    });

    // Inject next event date from data attribute (placeholder kept for templating)
    var next = document.querySelector('.next-event');
    if(next){
      var val = next.getAttribute('data-next') || '{{NEXT_EVENT_DATE}}';
      next.textContent = val;
    }

    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(function(a){
      a.addEventListener('click',function(e){
        var target = document.querySelector(this.getAttribute('href'));
        if(target){ e.preventDefault(); target.scrollIntoView({behavior:'smooth'}); }
      });
    });
  });
})();