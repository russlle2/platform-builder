(function(){
  // Utilities
  function $(sel, root) { return (root||document).querySelector(sel); }
  function $all(sel, root) { return Array.from((root||document).querySelectorAll(sel)); }

  // Year in footer
  var year = new Date().getFullYear();
  var yearNode = document.getElementById('year'); if(yearNode) yearNode.textContent = year;

  // Aroma wheel interactions
  var wheel = document.getElementById('aroma-wheel');
  var info = document.getElementById('wheel-info');
  if(wheel && info){
    var arcs = wheel.querySelectorAll('.arc');
    arcs.forEach(function(a){
      a.addEventListener('mouseenter', function(e){
        var name = a.getAttribute('data-name') || 'Note';
        var desc = a.getAttribute('data-desc') || '';
        info.textContent = name + ': ' + desc;
      });
      a.addEventListener('focus', function(){ a.dispatchEvent(new Event('mouseenter')); });
      a.addEventListener('mouseleave', function(){ info.textContent = 'Hover a segment to learn more'; });
    });

    // Keyboard: use arrow keys to cycle arcs
    var idx = 0;
    var arcList = Array.from(arcs);
    wheel.addEventListener('keydown', function(e){
      if(e.key === 'ArrowRight' || e.key === 'ArrowDown'){
        idx = (idx + 1) % arcList.length; arcList[idx].dispatchEvent(new Event('mouseenter'));
      } else if(e.key === 'ArrowLeft' || e.key === 'ArrowUp'){
        idx = (idx - 1 + arcList.length) % arcList.length; arcList[idx].dispatchEvent(new Event('mouseenter'));
      }
    });
  }

  // Proof gallery: rotating testimonials & badges
  var testimonials = [
    {quote: 'A short session helped me breathe a different way — a tiny ritual that fits my morning.', who: '— K.'},
    {quote: 'Clear guidance on dilution and a gentle roll-on that I could use safely at home.', who: '— L.'},
    {quote: 'Practical, kind, and safety-focused. The suggestions were easy to try.', who: '— R.'}
  ];
  var rotator = document.getElementById('testimonial-rotator');
  var current = 0; var rotTimer = null;
  function renderTestimonial(i){
    if(!rotator) return;
    var t = testimonials[i % testimonials.length];
    rotator.innerHTML = '<blockquote>"'+ t.quote +'"<footer>'+ t.who +'</footer></blockquote>';
  }
  function startRotator(){
    renderTestimonial(current);
    rotTimer = setInterval(function(){ current = (current+1) % testimonials.length; renderTestimonial(current); },5000);
  }
  function stopRotator(){ if(rotTimer) clearInterval(rotTimer); rotTimer = null; }
  startRotator();

  // Rotator controls
  var prev = document.getElementById('rot-prev');
  var next = document.getElementById('rot-next');
  if(prev) prev.addEventListener('click', function(){ stopRotator(); current=(current-1+testimonials.length)%testimonials.length; renderTestimonial(current); startRotator(); });
  if(next) next.addEventListener('click', function(){ stopRotator(); current=(current+1)%testimonials.length; renderTestimonial(current); startRotator(); });

  // Badge tooltips (for touch devices: tap to reveal)
  $all('.badge').forEach(function(b){
    b.addEventListener('click', function(e){
      // Toggle a temporary tooltip element for touch
      var tip = document.createElement('div');
      tip.className = 'temp-tip';
      tip.textContent = b.getAttribute('data-tooltip');
      tip.style.position = 'fixed';
      tip.style.left = (e.clientX) + 'px';
      tip.style.top = (e.clientY + 18) + 'px';
      tip.style.background = '#111'; tip.style.color = '#fff'; tip.style.padding = '8px'; tip.style.borderRadius = '6px'; tip.style.zIndex = 9999; document.body.appendChild(tip);
      setTimeout(function(){ if(tip && tip.parentNode) tip.parentNode.removeChild(tip); },2500);
    });
  });

  // Accessibility: make arcs focusable
  document.querySelectorAll('.arc').forEach(function(a){ a.setAttribute('tabindex','0'); });

})();
