(function(){
  // Small interactive helpers for the template
  document.addEventListener('DOMContentLoaded',function(){
    var yearEl = document.getElementById('year');
    if(yearEl) yearEl.textContent = new Date().getFullYear();

    var menu = document.querySelector('.menu-toggle');
    var nav = document.querySelector('.main-nav');
    if(menu && nav){
      menu.addEventListener('click',function(){
        var open = this.getAttribute('aria-expanded') === 'true';
        this.setAttribute('aria-expanded', String(!open));
        nav.style.display = open ? '' : 'flex';
      });
    }

    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(function(a){
      a.addEventListener('click',function(e){
        e.preventDefault();
        var id = this.getAttribute('href').slice(1);
        var el = document.getElementById(id);
        if(el) el.scrollIntoView({behavior:'smooth',block:'start'});
      });
    });

    // Generate a small calendar teaser on events link hover (progressive enhancement)
    var nextEvent = document.getElementById('next-event');
    if(nextEvent){
      nextEvent.addEventListener('click', function(){
        // If CMS replaces {{NEXT_EVENT_DATE}} this will be real; otherwise show a friendly prompt
        if(nextEvent.textContent.indexOf('{{') !== -1){
          alert('Visit the Upcoming page to see full schedule.');
        }
      });
    }
  });
})();
