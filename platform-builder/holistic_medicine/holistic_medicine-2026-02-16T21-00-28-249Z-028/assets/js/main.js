(function(){
  // simple interactivity: mobile nav toggle, smooth scroll, current year
  document.addEventListener('DOMContentLoaded',function(){
    var navToggle = document.getElementById('navToggle');
    var navList = document.getElementById('navList');
    if(navToggle){
      navToggle.addEventListener('click',function(){
        var expanded = this.getAttribute('aria-expanded') === 'true';
        this.setAttribute('aria-expanded', String(!expanded));
        if(navList.style.display === 'flex'){ navList.style.display = 'none'; }
        else{ navList.style.display = 'flex'; navList.style.flexDirection = 'column'; }
      });
    }

    // smooth scroll for in-page links
    document.querySelectorAll('a[href^="#"]').forEach(function(a){
      a.addEventListener('click',function(e){
        var id = this.getAttribute('href').slice(1);
        var el = document.getElementById(id);
        if(el){ e.preventDefault(); el.scrollIntoView({behavior:'smooth',block:'start'}); }
      });
    });

    // attach small interaction for events: highlight next upcoming
    var events = document.querySelectorAll('#eventsList li');
    if(events.length){
      var today = new Date();
      var nextIdx = -1;
      events.forEach(function(li,i){
        var d = li.getAttribute('data-date');
        if(d){
          var dt = new Date(d+'T00:00:00');
          if(nextIdx===-1 && dt >= new Date(today.getFullYear(), today.getMonth(), today.getDate())){ nextIdx = i; }
        }
      });
      if(nextIdx>-1){ events[nextIdx].style.boxShadow = '0 6px 18px rgba(58,107,90,0.08)'; }
    }

    var yearEl = document.getElementById('year');
    if(yearEl) yearEl.textContent = new Date().getFullYear();
  });
})();
