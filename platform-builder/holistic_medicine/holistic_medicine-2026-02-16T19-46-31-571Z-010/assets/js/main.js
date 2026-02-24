(function(){
  // Small interactive helpers: year, menu toggle, smooth scroll, form stub
  document.getElementById('year').textContent = new Date().getFullYear();
  var btn = document.querySelector('.menu-toggle');
  if(btn){
    btn.addEventListener('click', function(){
      var nav = document.querySelector('.nav');
      nav.classList.toggle('open');
      btn.textContent = nav.classList.contains('open') ? '✕' : '☰';
    });
  }

  // Smooth anchor scrolling
  document.querySelectorAll('a[href^="#"]').forEach(function(a){
    a.addEventListener('click', function(e){
      e.preventDefault();
      var id = a.getAttribute('href').slice(1);
      var el = document.getElementById(id);
      if(el) el.scrollIntoView({behavior:'smooth',block:'start'});
    });
  });

  // Basic CTA analytics stub (no network calls)
  document.querySelectorAll('a.btn').forEach(function(a){
    a.addEventListener('click', function(){
      try{console.log('CTA click:', a.textContent.trim());}catch(e){}
    });
  });
})();
