(function(){
  // Mobile nav toggle
  var btn = document.querySelector('.nav-toggle');
  var nav = document.querySelector('.main-nav');
  if(btn && nav){
    btn.addEventListener('click', function(){
      var open = nav.classList.toggle('show');
      btn.setAttribute('aria-expanded', open? 'true':'false');
    });
  }

  // Smooth scroll for internal links
  document.addEventListener('click', function(e){
    var a = e.target.closest('a');
    if(!a) return;
    var href = a.getAttribute('href') || '';
    if(href.startsWith('#')){
      var id = href.slice(1);
      var el = document.getElementById(id);
      if(el){
        e.preventDefault();
        window.scrollTo({top: el.offsetTop - 60, behavior: 'smooth'});
      }
    }
  });

  // Simple link sanitizer for primary CTA
  var ctas = document.querySelectorAll('a.cta, a.button.primary');
  ctas.forEach(function(c){
    var href = c.getAttribute('href') || '';
    if(href.indexOf('javascript:')!==-1){
      c.setAttribute('href','#');
    }
  });
})();