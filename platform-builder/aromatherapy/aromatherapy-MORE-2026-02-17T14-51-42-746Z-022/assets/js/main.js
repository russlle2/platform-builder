(function(){
  // Aroma wheel interactions
  var center = document.getElementById('wheel-center');
  var items = document.querySelectorAll('.wheel-ring li');
  items.forEach(function(li){
    li.addEventListener('mouseover', function(){
      var label = li.getAttribute('data-label') || li.textContent;
      var desc = li.getAttribute('data-desc') || '';
      center.textContent = label + ' — ' + desc;
    });
    li.addEventListener('focus', function(){ li.dispatchEvent(new Event('mouseover')); });
    li.addEventListener('mouseout', function(){ center.textContent = 'Hover a note'; });
    li.addEventListener('blur', function(){ center.textContent = 'Hover a note'; });
  });

  // Proof gallery rotation
  var quotes = document.querySelectorAll('#testimonials .quote');
  var current = 0;
  var nextBtn = document.getElementById('next');
  var prevBtn = document.getElementById('prev');
  function show(index){
    quotes.forEach(function(q,i){
      q.classList.toggle('current', i===index);
    });
  }
  function advance(n){
    current = (current + n + quotes.length) % quotes.length;
    show(current);
  }
  var rot = setInterval(function(){ advance(1); }, 6000);
  if(nextBtn) nextBtn.addEventListener('click', function(){ clearInterval(rot); advance(1); });
  if(prevBtn) prevBtn.addEventListener('click', function(){ clearInterval(rot); advance(-1); });

  // Badge tooltips
  var badges = document.querySelectorAll('.badge');
  var tt;
  badges.forEach(function(b){
    b.addEventListener('mouseenter', function(e){
      var tip = b.getAttribute('data-tip');
      if(!tip) return;
      tt = document.createElement('div');
      tt.className = 'tooltip';
      tt.textContent = tip;
      document.body.appendChild(tt);
      var r = b.getBoundingClientRect();
      tt.style.left = (r.left + (r.width/2) - (tt.offsetWidth/2)) + 'px';
      tt.style.top = (r.top - tt.offsetHeight - 8) + 'px';
    });
    b.addEventListener('focus', function(){ b.dispatchEvent(new Event('mouseenter')); });
    b.addEventListener('mouseleave', function(){ if(tt){ tt.remove(); tt = null; } });
    b.addEventListener('blur', function(){ if(tt){ tt.remove(); tt = null; } });
  });

  // Accessibility: pause rotation when focus enters testimonials
  var testimonials = document.getElementById('testimonials');
  testimonials.addEventListener('focusin', function(){ clearInterval(rot); });
  testimonials.addEventListener('focusout', function(){ rot = setInterval(function(){ advance(1); }, 6000); });
})();