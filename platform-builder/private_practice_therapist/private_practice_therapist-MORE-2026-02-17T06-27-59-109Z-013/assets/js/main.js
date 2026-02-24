// Main interactive features: proof gallery rotation + badges tooltips + pricing toggle with animated numbers + mobile nav
document.addEventListener('DOMContentLoaded',function(){
  // Testimonial data (example placeholders); in production these would be replaced with real anonymized excerpts
  const testimonials = [
    {text: 'Meeting regularly felt less like "fixing" and more like steadily clearing the fog around a few entrenched patterns.', who: 'Client, mid-30s, professional'},
    {text: 'The package structure helped me focus — we set clear goals and I could feel the work shift within six sessions.', who: 'Client, late 20s'},
    {text: 'Membership gave me the breathing room to bring smaller, recurring issues without starting over each time.', who: 'Client, 40s, parent'}
  ];

  let current = 0; let rotating = true; let rotateTimer = null;
  const gallery = document.getElementById('proofGallery');
  const prevBtn = document.getElementById('prevTestimonial');
  const nextBtn = document.getElementById('nextTestimonial');
  const pauseBtn = document.getElementById('pauseTestimonial');

  function renderTestimonial(i){
    const t = testimonials[i];
    gallery.innerHTML = '';
    const block = document.createElement('div'); block.className='testimonial';
    const p = document.createElement('p'); p.textContent = '"' + t.text + '"';
    const who = document.createElement('div'); who.className='who'; who.textContent = t.who;
    block.appendChild(p); block.appendChild(who);
    gallery.appendChild(block);
  }

  function startRotate(){
    rotateTimer = setInterval(()=>{ current = (current+1) % testimonials.length; renderWithFade(current); },5000);
  }
  function stopRotate(){ clearInterval(rotateTimer); rotateTimer = null; }

  function renderWithFade(i){
    gallery.style.opacity = 0; setTimeout(()=>{ renderTestimonial(i); gallery.style.opacity = 1; },220);
  }

  prevBtn.addEventListener('click',function(){ current = (current-1+testimonials.length)%testimonials.length; renderWithFade(current); });
  nextBtn.addEventListener('click',function(){ current = (current+1)%testimonials.length; renderWithFade(current); });
  pauseBtn.addEventListener('click',function(){ rotating = !rotating; if(rotating){ startRotate(); pauseBtn.textContent='Pause'; } else { stopRotate(); pauseBtn.textContent='Resume'; } });

  renderTestimonial(current); startRotate();

  // Badges: show accessible tooltips on focus via aria (already via CSS), no extra JS necessary but make keyboard focusable
  document.querySelectorAll('.badge').forEach(b=>{ b.tabIndex=0; });

  // Pricing toggle with animated numbers
  const pricingToggle = document.getElementById('pricingToggle');
  const membersPriceEl = document.getElementById('membersPrice');
  const packagePriceEl = document.getElementById('packagePrice');

  function animateValue(el, start, end, duration){
    const startTime = performance.now();
    function frame(now){
      const progress = Math.min((now - startTime)/duration,1);
      const value = Math.round(start + (end-start)*progress);
      el.textContent = value === 0 ? 'Free' : ('$' + value);
      if(progress<1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  function updatePrices(){
    const showPackage = pricingToggle.checked;
    if(showPackage){
      // show package numbers
      animateValue(membersPriceEl, parseInt((membersPriceEl.textContent.replace(/[^0-9]/g,''))||160), parseInt(membersPriceEl.dataset.package||900), 600);
      animateValue(packagePriceEl, parseInt((packagePriceEl.textContent.replace(/[^0-9]/g,''))||650), parseInt(packagePriceEl.dataset.package||650), 600);
    } else {
      // show monthly
      animateValue(membersPriceEl, parseInt((membersPriceEl.textContent.replace(/[^0-9]/g,''))||900), parseInt(membersPriceEl.dataset.month||160), 600);
      animateValue(packagePriceEl, parseInt((packagePriceEl.textContent.replace(/[^0-9]/g,''))||650), parseInt(packagePriceEl.dataset.month||0), 600);
    }
  }

  pricingToggle.addEventListener('change', updatePrices);
  // initialize with monthly view
  pricingToggle.checked = false; updatePrices();

  // Mobile nav toggle
  const navToggle = document.getElementById('navToggle');
  const navList = document.getElementById('navList');
  navToggle.addEventListener('click', function(){ const expanded = this.getAttribute('aria-expanded') === 'true'; this.setAttribute('aria-expanded', String(!expanded)); navList.classList.toggle('show'); });

  // Accessibility: pause rotation when user focuses gallery
  gallery.addEventListener('focusin', ()=>{ if(rotating){ stopRotate(); pauseBtn.textContent='Resume'; rotating=false; }});
  gallery.addEventListener('focusout', ()=>{ if(!rotateTimer && !rotating){ rotating=true; startRotate(); pauseBtn.textContent='Pause'; }});
});