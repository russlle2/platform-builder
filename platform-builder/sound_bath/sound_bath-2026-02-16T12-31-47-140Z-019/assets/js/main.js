(function(){
  // Mobile nav toggle
  var navToggle = document.getElementById('navToggle');
  var nav = document.getElementById('nav');
  navToggle && navToggle.addEventListener('click',function(){
    nav.classList.toggle('show');
  });

  // Simple testimonial rotator
  var slider = document.getElementById('testi');
  if(slider){
    var quotes = slider.querySelectorAll('.quote');
    var idx = 0;
    function show(i){
      quotes.forEach(function(q, n){ q.classList.toggle('active', n===i); });
    }
    setInterval(function(){
      idx = (idx + 1) % quotes.length; show(idx);
    },5000);
  }

  // Smooth scroll for CTAs linking to anchors on this page
  document.addEventListener('click',function(e){
    var t = e.target.closest('a');
    if(!t) return;
    var href = t.getAttribute('href');
    if(href && href.charAt(0)==='#'){
      e.preventDefault();
      var el = document.querySelector(href);
      if(el) el.scrollIntoView({behavior:'smooth',block:'start'});
    }
  });
})();
