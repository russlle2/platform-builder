(function(){
  // Year in footer
  document.addEventListener('DOMContentLoaded',function(){
    var y = document.getElementById('year'); if(y) y.textContent = new Date().getFullYear();
  });

  // Testimonial rotator
  var rotator = (function(){
    var container = document.getElementById('testimonials');
    if(!container) return;
    var items = Array.prototype.slice.call(container.querySelectorAll('.testimonial'));
    var index = 0;
    function show(i){
      items.forEach(function(it,idx){
        if(idx===i){ it.classList.add('active'); }
        else { it.classList.remove('active'); }
      });
    }
    show(index);
    setInterval(function(){ index = (index+1)%items.length; show(index); },4500);
  })();

  // Badge tooltip (uses a single tooltip element)
  var tooltip = document.createElement('div');
  tooltip.className = 'tooltip';
  document.body.appendChild(tooltip);
  var badges = document.querySelectorAll('.badge');
  badges.forEach(function(b){
    b.addEventListener('mouseenter',function(e){
      var tip = b.getAttribute('data-tip') || b.textContent;
      tooltip.textContent = tip;
      var rect = b.getBoundingClientRect();
      tooltip.style.left = (rect.right + 12) + 'px';
      tooltip.style.top = (rect.top + window.scrollY) + 'px';
      tooltip.style.opacity = 1;
      tooltip.style.transform = 'translateY(0)';
    });
    b.addEventListener('mouseleave',function(){
      tooltip.style.opacity = 0; tooltip.style.transform = 'translateY(6px)';
    });
  });

  // Pricing comparator with animated numbers
  function animateNumber(el, start, end, duration){
    var startTime = null;
    function step(ts){
      if(!startTime) startTime = ts;
      var progress = Math.min((ts - startTime)/duration,1);
      var value = Math.round(start + (end - start) * (1 - Math.pow(1-progress,3))); // ease
      el.textContent = '$' + value;
      if(progress<1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  var toggleButtons = document.querySelectorAll('.toggle-row .toggle');
  var priceEls = document.querySelectorAll('.price');
  toggleButtons.forEach(function(btn){
    btn.addEventListener('click',function(){
      toggleButtons.forEach(function(b){ b.classList.toggle('active', b===btn); });
      var mode = btn.getAttribute('data-mode');
      priceEls.forEach(function(pe){
        var target = parseInt(pe.getAttribute(mode==='monthly' ? 'data-month' : 'data-package'),10) || 0;
        var current = parseInt(pe.textContent.replace(/[^0-9]/g,''),10) || 0;
        animateNumber(pe,current,target,600);
      });
    });
  });

  // Accessibility: nav toggle
  var navToggle = document.querySelector('.nav-toggle');
  navToggle && navToggle.addEventListener('click',function(){
    var nav = document.querySelector('.main-nav');
    if(!nav) return;
    if(nav.style.display==='flex'){ nav.style.display='none'; }
    else{ nav.style.display='flex'; nav.style.flexDirection='column'; }
  });
})();
