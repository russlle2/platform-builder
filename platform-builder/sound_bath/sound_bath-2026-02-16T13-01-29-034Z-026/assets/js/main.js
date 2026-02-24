(function(){
  // Menu toggle for small screens
  var btn = document.getElementById('menuToggle');
  var nav = document.querySelector('.nav');
  btn && btn.addEventListener('click', function(){
    var expanded = this.getAttribute('aria-expanded') === 'true';
    this.setAttribute('aria-expanded', String(!expanded));
    nav.style.display = expanded ? 'none' : 'flex';
  });

  // Smooth internal links
  document.querySelectorAll('a[href^="#"]').forEach(function(a){
    a.addEventListener('click', function(e){
      e.preventDefault();
      var t = document.querySelector(this.getAttribute('href'));
      t && t.scrollIntoView({behavior:'smooth'});
    });
  });

  // Insert next event date from placeholder into elements that contain it
  document.querySelectorAll('*').forEach(function(el){
    if(el.innerHTML && el.innerHTML.indexOf('{{NEXT_EVENT_DATE}}')!==-1){
      el.innerHTML = el.innerHTML.replace(/\{\{NEXT_EVENT_DATE\}\}/g, '{{NEXT_EVENT_DATE}}');
    }
  });

  // Lightweight reveal on scroll
  var observer = new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      if(e.isIntersecting){ e.target.classList.add('in'); }
    });
  },{threshold:.08});
  document.querySelectorAll('.section').forEach(function(s){ observer.observe(s); });
})();
