(function(){
  // Proof Gallery rotation
  const testimonials = Array.from(document.querySelectorAll('.testimonial'));
  let tIndex = testimonials.findIndex(t => t.classList.contains('active')) || 0;
  function rotateTestimonial(){
    testimonials.forEach((t,i)=> t.classList.toggle('active', i===tIndex));
    tIndex = (tIndex + 1) % testimonials.length;
  }
  if(testimonials.length>0){
    setInterval(rotateTestimonial,5000);
  }

  // Badge tooltips
  const tooltip = document.createElement('div');
  tooltip.className = 'tooltip';
  document.body.appendChild(tooltip);
  document.querySelectorAll('.badge[data-tooltip]').forEach(b=>{
    b.addEventListener('mouseenter', (e)=>{
      tooltip.textContent = b.getAttribute('data-tooltip');
      const rect = b.getBoundingClientRect();
      tooltip.style.left = (rect.left + rect.width/2) + 'px';
      tooltip.style.top = (rect.top - 10) + 'px';
      tooltip.style.opacity = '1';
      tooltip.style.transform = 'translate(-50%,-10px)';
    });
    b.addEventListener('mousemove', (e)=>{
      tooltip.style.left = (e.clientX) + 'px';
      tooltip.style.top = (e.clientY - 18) + 'px';
    });
    b.addEventListener('mouseleave', ()=>{
      tooltip.style.opacity = '0';
      tooltip.style.transform = 'translate(-50%,-6px)';
    });
  });

  // Pricing comparator with animated numbers
  const toggle = document.getElementById('priceToggle');
  const prices = Array.from(document.querySelectorAll('.price'));
  function animateValue(el, start, end, duration){
    const startTime = performance.now();
    function frame(now){
      const progress = Math.min((now - startTime)/duration,1);
      const value = Math.round(start + (end - start) * progress);
      el.textContent = '$' + value;
      if(progress<1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }
  // initialize display based on default toggle state (unchecked => monthly)
  function updatePrices(isPackage){
    prices.forEach(p=>{
      const month = parseInt(p.getAttribute('data-month'),10)||0;
      const pack = parseInt(p.getAttribute('data-package'),10)||0;
      const from = parseInt(p.textContent.replace(/[^0-9]/g,''),10)|| (isPackage?month:pack);
      const to = isPackage?pack:month;
      animateValue(p, from, to, 600);
    });
  }
  if(toggle){
    // set initial from attributes
    prices.forEach(p=>{
      const m = p.getAttribute('data-month');
      p.textContent = '$' + (m||'0');
    });
    toggle.addEventListener('change', ()=>{
      updatePrices(toggle.checked);
    });
  }

  // Accessibility: allow space on focused toggle
  if(toggle){
    toggle.addEventListener('keydown', (e)=>{
      if(e.key === ' ' || e.key === 'Enter'){
        e.preventDefault();
        toggle.checked = !toggle.checked;
        updatePrices(toggle.checked);
      }
    });
  }

})();