// Main JS for rotating testimonials, pricing comparator, and simple interactions
(function(){
  // Testimonials rotation
  const testimonials = Array.from(document.querySelectorAll('.testimonial'));
  let tIndex = 0;
  function showTestimonial(i){
    testimonials.forEach((el,idx)=>{
      el.classList.toggle('active', idx===i);
    });
  }
  if(testimonials.length){
    showTestimonial(0);
    const nextBtn = document.getElementById('next-t');
    const prevBtn = document.getElementById('prev-t');
    nextBtn && nextBtn.addEventListener('click', ()=>{ tIndex=(tIndex+1)%testimonials.length; showTestimonial(tIndex); });
    prevBtn && prevBtn.addEventListener('click', ()=>{ tIndex=(tIndex-1+testimonials.length)%testimonials.length; showTestimonial(tIndex); });
    setInterval(()=>{ tIndex=(tIndex+1)%testimonials.length; showTestimonial(tIndex); },5000);
  }

  // Pricing comparator
  function animateNumber(el, from, to, duration){
    const start = performance.now();
    function step(now){
      const t = Math.min(1,(now-start)/duration);
      const val = Math.round(from + (to-from)*t);
      el.textContent = '$'+val;
      if(t<1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  const comparator = document.getElementById('pricing-comparator');
  if(comparator){
    const buttons = comparator.querySelectorAll('.toggle button');
    const amountEls = comparator.querySelectorAll('.amount');
    let mode = 'monthly';
    function setMode(m){
      mode = m;
      buttons.forEach(b=>b.classList.toggle('active', b.dataset.mode===m));
      amountEls.forEach(el=>{
        const from = parseInt(el.textContent.replace(/[^0-9]/g,''))||0;
        const to = parseInt(el.dataset[m]||0,10);
        animateNumber(el, from, to, 380);
      });
    }
    buttons.forEach(b=>b.addEventListener('click', ()=>setMode(b.dataset.mode)));
    // initial values: read data-monthly
    amountEls.forEach(el=>{
      el.textContent = '$'+(el.dataset.monthly||'0');
    });
    setMode('monthly');
  }

  // Mobile nav toggle
  const mToggle = document.querySelector('.mobile-toggle');
  const nav = document.querySelector('.primary-nav');
  if(mToggle && nav){
    mToggle.addEventListener('click', ()=>{
      nav.style.display = (nav.style.display==='flex')? 'none' : 'flex';
      nav.style.flexDirection = 'column';
    });
  }

  // Simple next-event minimal enhancement: attach to event if present
  const nextEvent = document.getElementById('next-event');
  if(nextEvent){
    nextEvent.addEventListener('click', ()=>{ window.location.href='/events.html'; });
  }
})();