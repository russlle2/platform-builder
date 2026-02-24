(function(){
  // Mobile nav toggle
  var btn = document.getElementById('nav-toggle');
  var nav = document.getElementById('main-nav');
  btn && btn.addEventListener('click', function(){
    if(nav.style.display==='flex'){nav.style.display='none';}
    else{nav.style.display='flex';nav.style.flexDirection='column';}
  });

  // Smooth scroll for in-page anchors
  document.addEventListener('click', function(e){
    var t = e.target.closest('a');
    if(!t) return;
    var href = t.getAttribute('href')||'';
    if(href.indexOf('#')===0){
      e.preventDefault();
      var el = document.querySelector(href);
      if(el) el.scrollIntoView({behavior:'smooth',block:'start'});
    }
  });

  // Insert NEXT_EVENT_DATE into localized element if available
  window.addEventListener('DOMContentLoaded', function(){
    var el = document.getElementById('next-event-date');
    if(el && el.textContent.indexOf('{{NEXT_EVENT_DATE}}')!==-1){
      // placeholder present; leave for server to replace. If not replaced, show friendly copy.
      el.textContent = el.textContent.replace('{{NEXT_EVENT_DATE}}','Upcoming — check events');
    }
  });
})();
