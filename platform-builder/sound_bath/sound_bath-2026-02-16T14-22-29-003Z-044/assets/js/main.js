(function(){
  // Mobile nav toggle
  var btn = document.querySelector('.nav-toggle');
  var nav = document.querySelector('.nav');
  btn && btn.addEventListener('click', function(){
    if(nav.style.display === 'flex'){
      nav.style.display = '';
    } else {
      nav.style.display = 'flex';
      nav.style.flexDirection = 'column';
      nav.style.background = 'rgba(255,255,255,0.98)';
      nav.style.position = 'absolute';
      nav.style.right = '20px';
      nav.style.top = '64px';
      nav.style.padding = '12px';
      nav.style.borderRadius = '12px';
      nav.style.boxShadow = '0 10px 30px rgba(30,30,40,0.06)';
    }
  });

  // Ripple effect on hero click for sensory flourish
  var hero = document.getElementById('hero');
  hero && hero.addEventListener('click', function(e){
    var layer = document.querySelector('.ripple-layer');
    if(!layer) return;
    var ripple = document.createElement('div');
    ripple.className = 'ripple';
    var rect = hero.getBoundingClientRect();
    var x = e.clientX - rect.left;
    var y = e.clientY - rect.top;
    ripple.style.left = (x - 10) + 'px';
    ripple.style.top = (y - 10) + 'px';
    ripple.style.width = '20px';
    ripple.style.height = '20px';
    layer.appendChild(ripple);
    setTimeout(function(){ ripple.remove(); }, 1400);
  });

  // Simple focus reveal for accessibility
  var focusables = document.querySelectorAll('a,button,summary');
  focusables.forEach(function(el){
    el.addEventListener('focus', function(){ el.classList.add('focus-visible'); });
    el.addEventListener('blur', function(){ el.classList.remove('focus-visible'); });
  });
})();