(function(){
  // Mobile nav toggle
  var btn = document.getElementById('nav-toggle');
  var nav = document.getElementById('site-nav');
  if(btn && nav){
    btn.addEventListener('click', function(){
      var open = nav.style.display === 'flex';
      nav.style.display = open ? 'none' : 'flex';
      nav.style.flexDirection = 'column';
      nav.style.gap = '0.5rem';
    });
  }

  // Accordion
  Array.prototype.slice.call(document.querySelectorAll('.acc-toggle')).forEach(function(t){
    t.addEventListener('click', function(){
      var p = t.nextElementSibling;
      var isOpen = p.classList.contains('open');
      // close all
      document.querySelectorAll('.acc-panel').forEach(function(pn){pn.classList.remove('open');pn.style.maxHeight=null});
      if(!isOpen){
        p.classList.add('open');
        p.style.maxHeight = p.scrollHeight + 'px';
      }
    });
  });

  // Simple smooth scroll on internal links
  document.querySelectorAll('a[href^="#"]').forEach(function(a){
    a.addEventListener('click', function(e){
      var t = document.querySelector(a.getAttribute('href'));
      if(t){e.preventDefault();t.scrollIntoView({behavior:'smooth',block:'start'});}
    });
  });

  // Prevent accidental form submits for demo forms
  document.querySelectorAll('form').forEach(function(f){
    f.addEventListener('submit', function(e){
      e.preventDefault();
      alert('This demo site does not process forms. Please contact via ' + (window.location.protocol.indexOf('http')===0? 'email':'') );
    });
  });
})();