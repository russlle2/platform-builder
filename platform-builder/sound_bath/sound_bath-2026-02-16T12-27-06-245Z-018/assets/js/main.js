// Lightweight interactions: ripple on click and simple form feedback
(function(){
  function makeRipple(e){
    var target = document.querySelector('.hero-visual') || document.body;
    var ripple = document.createElement('div');
    ripple.className = 'ripple';
    var rect = target.getBoundingClientRect();
    var x = (e.clientX || rect.left + rect.width/2) - rect.left;
    var y = (e.clientY || rect.top + rect.height/2) - rect.top;
    ripple.style.left = x + 'px';
    ripple.style.top = y + 'px';
    ripple.style.width = ripple.style.height = Math.max(rect.width,rect.height) * 0.7 + 'px';
    target.appendChild(ripple);
    setTimeout(function(){ ripple.remove(); }, 900);
  }
  document.addEventListener('click', function(e){
    // only ripple for clicks inside hero or hero-visual
    if(e.target.closest('.hero') || e.target.closest('.hero-visual')) makeRipple(e);
  });

  // Simple form handler: small validation and gentle confirm
  var form = document.getElementById('bookForm');
  if(form){
    form.addEventListener('submit', function(ev){
      ev.preventDefault();
      var name = form.querySelector('[name="name"]').value.trim();
      var email = form.querySelector('[name="email"]').value.trim();
      if(!name || !email){
        alert('Please share your name and email to reserve.');
        return;
      }
      // emulate redirect to CTA URL with params
      var url = form.action || window.location.href;
      url += (url.indexOf('?')>-1? '&':'?') + 'name=' + encodeURIComponent(name) + '&email=' + encodeURIComponent(email);
      // gentle UI feedback
      var btn = form.querySelector('button');
      var old = btn.textContent;
      btn.textContent = 'Reserving...';
      setTimeout(function(){
        btn.textContent = old;
        window.location.href = url;
      },600);
    });
  }
})();