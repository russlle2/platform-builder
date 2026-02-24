(function(){
  // Testimonials rotation
  const testimonialsData = [
    {quote:'"Small weekly shifts made my energy predictable and steady — the frameworks made it simple to repeat."', by:'A. from {{CITY}}'},
    {quote:'"I learned a simple system for evenings that helped my mornings completely change."', by:'J. in {{STATE}}'},
    {quote:'"The membership kept me honest and gave clear next steps each week."', by:'K.'}
  ];

  const testimonialsEl = document.getElementById('testimonials');
  let current = 0;
  function renderTestimonial(idx){
    testimonialsEl.innerHTML = '';
    const item = testimonialsData[idx];
    const article = document.createElement('article');
    article.className = 'testimonial active';
    article.setAttribute('data-index', idx);
    article.innerHTML = '<blockquote class="quote">'+item.quote+'</blockquote><p class="by">— '+item.by+'</p>';
    testimonialsEl.appendChild(article);
  }
  renderTestimonial(current);

  function nextTestimonial(){
    current = (current + 1) % testimonialsData.length;
    fadeTo(current);
  }
  function prevTestimonial(){
    current = (current - 1 + testimonialsData.length) % testimonialsData.length;
    fadeTo(current);
  }
  function fadeTo(idx){
    const old = testimonialsEl.querySelector('.testimonial');
    if(!old) return renderTestimonial(idx);
    old.classList.remove('active');
    setTimeout(()=>{ renderTestimonial(idx); }, 350);
  }

  document.getElementById('next').addEventListener('click', ()=>{ nextTestimonial(); resetTimer(); });
  document.getElementById('prev').addEventListener('click', ()=>{ prevTestimonial(); resetTimer(); });

  let rotateTimer = setInterval(nextTestimonial, 7000);
  function resetTimer(){ clearInterval(rotateTimer); rotateTimer = setInterval(nextTestimonial,7000); }

  // Badges tooltip handled by CSS using data-tip

  // Pricing comparator
  const toggleButtons = document.querySelectorAll('.toggle button');
  const priceCards = document.querySelectorAll('.card.price');
  let mode = 'monthly';

  function animateNumber(el, start, end, duration){
    const startTime = performance.now();
    function frame(now){
      const t = Math.min(1,(now-startTime)/duration);
      const val = Math.round(start + (end - start) * t);
      el.textContent = val;
      if(t < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  function updatePrices(newMode){
    priceCards.forEach(card=>{
      const numEl = card.querySelector('.number');
      const current = parseInt(numEl.textContent.replace(/[^0-9]/g,''),10) || 0;
      const target = parseInt(card.getAttribute(newMode === 'monthly' ? 'data-monthly' : 'data-package'),10);
      animateNumber(numEl, current, target, 450);
      const period = card.querySelector('.period');
      period.textContent = newMode === 'monthly' ? '/mo' : ' (package)';
    });
  }

  toggleButtons.forEach(btn=>{
    btn.addEventListener('click', ()=>{
      toggleButtons.forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      mode = btn.getAttribute('data-mode');
      updatePrices(mode);
    });
  });

  // Initialize package numbers when page loads (they are monthly by default in markup)
  // but ensure package labels are available for quick toggle
  priceCards.forEach(card=>{
    // ensure data-package exists and is numeric
    if(!card.hasAttribute('data-package')){
      const monthly = parseInt(card.getAttribute('data-monthly')||0,10);
      card.setAttribute('data-package', (monthly*3).toString());
    }
  });

})();