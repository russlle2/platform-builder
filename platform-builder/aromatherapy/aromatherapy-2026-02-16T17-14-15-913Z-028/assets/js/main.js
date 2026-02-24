(function(){
  document.getElementById('year').textContent = new Date().getFullYear();
  var navToggle = document.getElementById('navToggle');
  var mainNav = document.getElementById('mainNav');
  navToggle && navToggle.addEventListener('click', function(){
    if(mainNav.style.display === 'flex'){
      mainNav.style.display = '';
    } else {
      mainNav.style.display = 'flex';
      mainNav.style.flexDirection = 'column';
    }
  });

  // FAQ toggles
  var faqQs = document.querySelectorAll('.faq-q');
  faqQs.forEach(function(btn){
    btn.addEventListener('click', function(){
      var a = btn.nextElementSibling;
      if(!a) return;
      if(a.style.display === 'block') a.style.display = 'none'; else a.style.display = 'block';
    });
  });

  // Smooth scroll for in-page anchors
  document.querySelectorAll('a[href^="#"]').forEach(function(a){
    a.addEventListener('click', function(e){
      var id = a.getAttribute('href');
      if(id.length>1){
        var el = document.querySelector(id);
        if(el){
          e.preventDefault();
          el.scrollIntoView({behavior:'smooth',block:'start'});
        }
      }
    });
  });

  // Prevent accidental submission on example forms (none on index but useful)
  document.querySelectorAll('form').forEach(function(f){
    f.addEventListener('submit', function(e){
      e.preventDefault();
      alert('This is a demo form. Please book via the scheduling page.');
    });
  });
})();