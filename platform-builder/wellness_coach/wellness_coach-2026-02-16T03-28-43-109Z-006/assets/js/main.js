(function(){
  // Simple interactivity: year update, burger toggle, FAQ accordion
  document.getElementById('year').textContent = new Date().getFullYear();

  var burger = document.querySelector('.burger');
  if(burger){
    burger.addEventListener('click', function(){
      var expanded = this.getAttribute('aria-expanded') === 'true';
      this.setAttribute('aria-expanded', String(!expanded));
      document.querySelector('.links').style.display = expanded ? 'none' : 'flex';
    });
  }

  var questions = document.querySelectorAll('.faq .q');
  questions.forEach(function(btn){
    btn.addEventListener('click', function(){
      var a = this.nextElementSibling;
      var open = a.style.display === 'block';
      // close others
      document.querySelectorAll('.faq .a').forEach(function(el){el.style.display='none'});
      a.style.display = open ? 'none' : 'block';
    });
  });

  // Minimal accessibility: focus outlines
  document.addEventListener('keyup', function(e){ if(e.key === 'Tab') document.body.classList.add('user-is-tabbing'); });
})();