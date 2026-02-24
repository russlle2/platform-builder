(function(){
  var navToggle = document.getElementById('navToggle');
  var nav = document.querySelector('.nav ul');
  if(navToggle){
    navToggle.addEventListener('click', function(){
      if(nav.style.display === 'flex'){nav.style.display = 'none';navToggle.textContent = 'Menu'} else {nav.style.display = 'flex';navToggle.textContent = 'Close'}
    });
  }

  // smooth scroll for in-page links
  var links = document.querySelectorAll('a[href^="#"]');
  links.forEach(function(a){
    a.addEventListener('click', function(e){
      var target = document.querySelector(this.getAttribute('href'));
      if(target){
        e.preventDefault();
        window.scrollTo({top: target.offsetTop - 24, behavior: 'smooth'});
      }
    });
  });

  // lightweight accessibility: focus outlines when keyboard used
  function handleFirstTab(e) {
    if(e.key === 'Tab'){
      document.body.classList.add('show-focus');
      window.removeEventListener('keydown', handleFirstTab);
    }
  }
  window.addEventListener('keydown', handleFirstTab);
})();
