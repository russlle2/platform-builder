(function(){
  // Year
  document.getElementById('year').textContent = new Date().getFullYear();

  // Testimonials data
  const testimonials = [
    {text:'After a few sessions I could notice small shifts that added up — practical steps I could keep.',who:'— A. (client)'} ,
    {text:'The team helped me reframe daily choices into realistic routines rather than big rules.',who:'— J. (client)'} ,
    {text:'Clear communication, options explained with pros and cons; I felt respected in decisions.',who:'— R. (client)'}
  ];

  const testimonialsEl = document.getElementById('testimonials');
  let current = 0;

  function renderTestimonial(i){
    const t = testimonials[i];
    testimonialsEl.innerHTML = '';
    const div = document.createElement('div');
    div.className = 'testimonial';
    const p = document.createElement('p');
    p.textContent = t.text;
    const who = document.createElement('div');
    who.className = 'who';
    who.textContent = t.who;
    div.appendChild(p);
    div.appendChild(who);
    testimonialsEl.appendChild(div);
  }

  renderTestimonial(current);
  setInterval(()=>{
    current = (current + 1) % testimonials.length;
    // simple fade out/in
    testimonialsEl.style.opacity = 0;
    setTimeout(()=>{ renderTestimonial(current); testimonialsEl.style.opacity = 1; }, 300);
  },4500);

  // Badge tooltips are handled via CSS showing .tip on :hover; also show on focus for accessibility
  const badges = Array.from(document.querySelectorAll('.badge'));
  badges.forEach(b=>{ b.tabIndex = 0; b.addEventListener('focus', ()=> b.querySelector('.tip').style.opacity = 1); b.addEventListener('blur', ()=> b.querySelector('.tip').style.opacity = 0); });

  // Pricing comparator
  const toggle = document.getElementById('pricing-toggle');
  let mode = 'monthly';
  const amountEls = Array.from(document.querySelectorAll('.plan-price'));

  // Helper: animate value in child .amount
  function animateAmount(el, from, to, duration){
    const span = el.querySelector('.amount');
    const start = performance.now();
    function step(now){
      const t = Math.min(1, (now - start)/duration);
      const eased = t<.5 ? 2*t*t : -1 + (4 - 2*t)*t; // ease
      const val = Math.round(from + (to - from) * eased);
      span.textContent = val;
      if(t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  // Initialize prices
  amountEls.forEach(el=>{
    const m = parseInt(el.dataset.month,10) || 0;
    const p = parseInt(el.dataset.package,10) || 0;
    el.querySelector('.amount').textContent = m;
    // store values
  });

  toggle.addEventListener('click', ()=>{
    mode = mode === 'monthly' ? 'package' : 'monthly';
    toggle.textContent = mode === 'monthly' ? 'Monthly' : 'Package';
    toggle.setAttribute('aria-pressed', mode === 'package');
    amountEls.forEach(el=>{
      const from = parseInt(el.querySelector('.amount').textContent,10) || 0;
      const to = mode === 'monthly' ? parseInt(el.dataset.month,10) : parseInt(el.dataset.package,10);
      animateAmount(el, from, to, 550);
    });
  });

  // Ensure keyboard toggle: space/enter toggles
  toggle.addEventListener('keydown', (e)=>{ if(e.key === ' ' || e.key === 'Enter'){ e.preventDefault(); toggle.click(); } });

})();