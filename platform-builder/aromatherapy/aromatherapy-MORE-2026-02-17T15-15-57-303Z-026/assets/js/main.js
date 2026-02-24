// Main JS: Proof Gallery rotation + badges tooltip + Pricing Comparator
document.addEventListener('DOMContentLoaded',function(){
  // Proof Gallery rotation
  const testimonials = Array.from(document.querySelectorAll('.testimonial'));
  let activeIndex = 0;
  function setActive(index){
    testimonials.forEach(t=>t.classList.remove('active'));
    const safe = ((index % testimonials.length)+testimonials.length)%testimonials.length;
    testimonials[safe].classList.add('active');
    activeIndex = safe;
  }
  setActive(0);
  let rotateTimer = setInterval(()=>setActive(activeIndex+1),5000);

  // Pause rotation when hovering gallery
  const gallery = document.querySelector('.gallery');
  if(gallery){
    gallery.addEventListener('mouseenter',()=>clearInterval(rotateTimer));
    gallery.addEventListener('mouseleave',()=>rotateTimer=setInterval(()=>setActive(activeIndex+1),5000));
  }

  // Badges tooltip
  const badges = document.querySelectorAll('.badge');
  const tooltip = document.getElementById('tooltip');
  badges.forEach(b=>{
    b.addEventListener('mouseenter',e=>{
      const tip = e.currentTarget.getAttribute('data-tip')||'';
      tooltip.textContent = tip;
    });
    b.addEventListener('focus',e=>{
      const tip = e.currentTarget.getAttribute('data-tip')||'';
      tooltip.textContent = tip;
    });
    b.addEventListener('mouseleave',()=>{tooltip.textContent='';});
    b.addEventListener('blur',()=>{tooltip.textContent='';});
  });

  // Mobile nav toggle
  const mobileToggle = document.querySelector('.mobile-toggle');
  mobileToggle && mobileToggle.addEventListener('click',()=>{
    const nav = document.querySelector('.main-nav');
    const expanded = mobileToggle.getAttribute('aria-expanded') === 'true';
    mobileToggle.setAttribute('aria-expanded', String(!expanded));
    if(nav) nav.style.display = expanded ? 'none' : 'flex';
  });

  // Pricing Comparator micro-widget implementation
  // We'll dynamically inject a small widget in footer for demo purposes
  function createPricingWidget(){
    const widget = document.createElement('div');
    widget.className = 'pricing-widget container';
    widget.innerHTML = `\
      <div style="display:flex;justify-content:space-between;align-items:center;gap:1rem">\
        <div>\
          <strong>Program options</strong>\
          <div class="muted" style="color:var(--muted);font-size:.95rem">Choose monthly support or one-time package</div>\
        </div>\
        <div style="min-width:260px">\
          <div class="switch">\
            <button data-mode="monthly" class="active">Monthly</button>\
            <button data-mode="package">Package</button>\
          </div>\
          <div class="prices">\
            <div class="price-card">\
              <div style="color:var(--muted);font-size:.85rem">Starter</div>\
              <div class="price-amount" data-monthly="39" data-package="120">$39</div>\
            </div>\
            <div class="price-card">\
              <div style="color:var(--muted);font-size:.85rem">Intensive</div>\
              <div class="price-amount" data-monthly="89" data-package="260">$89</div>\
            </div>\
          </div>\
        </div>\
      </div>`;
    return widget;
  }

  // Attach near CTA section
  const cta = document.getElementById('cta');
  if(cta){
    const widget = createPricingWidget();
    cta.appendChild(widget);

    // Wire up interactivity
    const buttons = widget.querySelectorAll('.switch button');
    const priceEls = widget.querySelectorAll('.price-amount');
    function animateValue(el, start, end, duration){
      const range = end - start;
      const startTime = performance.now();
      function step(now){
        const progress = Math.min((now - startTime)/duration, 1);
        const value = Math.round(start + range * progress);
        el.textContent = '$' + value;
        if(progress < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }

    buttons.forEach(btn=>btn.addEventListener('click',e=>{
      buttons.forEach(b=>b.classList.remove('active'));
      e.currentTarget.classList.add('active');
      const mode = e.currentTarget.getAttribute('data-mode');
      priceEls.forEach(pe=>{
        const current = parseInt(pe.textContent.replace(/[^0-9]/g,''),10) || 0;
        const target = parseInt(pe.getAttribute('data-' + mode),10) || 0;
        animateValue(pe,current,target,500);
      });
    }));
  }

});