(function(){
  var navToggle = document.getElementById('navToggle');
  var nav = document.getElementById('nav');
  if(navToggle && nav){
    navToggle.addEventListener('click', function(){
      if(nav.style.display === 'flex' || nav.style.display === ''){
        nav.style.display = nav.style.display === 'flex' ? 'none' : 'flex';
        nav.style.flexDirection = 'column';
      }
    });
  }

  // Smooth scroll for internal links
  document.addEventListener('click', function(e){
    var a = e.target.closest('a');
    if(!a) return;
    var href = a.getAttribute('href') || '';
    if(href.charAt(0) === '#' && href.length>1){
      var id = href.slice(1);
      var el = document.getElementById(id);
      if(el){
        e.preventDefault();
        el.scrollIntoView({behavior:'smooth'});
      }
    }
  });

  // Simple form behavior for book/contact (no backend)
  function interceptForms(){
    var forms = document.querySelectorAll('form');
    forms.forEach(function(f){
      f.addEventListener('submit', function(e){
        e.preventDefault();
        alert('Thank you — this demo site does not submit forms. Please contact ' + (document.body.textContent.match(/{{EMAIL}}/)||'') );
      });
    });
  }
  interceptForms();
})();