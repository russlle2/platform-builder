// Main interactive behaviors: rotating proof gallery + pricing comparator
document.addEventListener('DOMContentLoaded',function(){
  // Testimonials dataset (kept local)
  const testimonials = [
    {text:'I keep a 3-minute morning practice now. It made decisions easier across the day.',author:'— S. (cohort participant)',badges:['micro-practices','peer-led']},
    {text:'The weekly lab helped me test tiny steps that actually stuck. No overwhelm.',author:'— J. (small business owner)',badges:['frameworks','practical']},
    {text':'Loved the group accountability. We shared wins and small experiments every week.',author:'— R. (teacher)',badges:['community','short-sessions']}
  ];

  let idx = 0;
  const txt = document.getElementById('testimonial-text');
  const auth = document.getElementById('testimonial-author');
  const badgesEl = document.getElementById('testimonial-badges');

  function showTestimonial(i){
    const t = testimonials[i];
    // fade animation
    txt.style.opacity = 0; auth.style.opacity = 0; badgesEl.style.opacity = 0;
    setTimeout(()=>{
      txt.textContent = t.text;
      auth.textContent = t.author;
      badgesEl.innerHTML = '';
      t.badges.forEach(b=>{
        const bEl = document.createElement('div');
        bEl.className='badge';
        bEl.tabIndex=0;
        bEl.textContent = b.replace(/-/g,' ');
        bEl.setAttribute('data-tip','Verified in cohort sessions');
        // custom tooltip interactions
        bEl.addEventListener('mouseenter', showTip);
        bEl.addEventListener('focus', showTip);
        bEl.addEventListener('mouseleave', hideTip);
        bEl.addEventListener('blur', hideTip);
        badgesEl.appendChild(bEl);
      });
      // fade in
      txt.style.opacity = 1; auth.style.opacity = 1; badgesEl.style.opacity = 1;
    },250);
  }

  function cycle(){
    idx = (idx+1) % testimonials.length;
    showTestimonial(idx);
  }

  showTestimonial(idx);
  const rot = setInterval(cycle,5500);

  // Tooltip element
  let tipEl;
  function ensureTip(){
    if(!tipEl){
      tipEl = document.createElement('div');
      tipEl.className='tooltip';
      document.body.appendChild(tipEl);
    }
  }
  function showTip(e){
    ensureTip();
    const content = e.currentTarget.getAttribute('data-tip') || '';
    tipEl.textContent = content;
    const rect = e.currentTarget.getBoundingClientRect();
    tipEl.style.left = (rect.left + window.scrollX + rect.width/2) + 'px';
    tipEl.style.top = (rect.top + window.scrollY - 10) + 'px';
    tipEl.classList.add('show');
    // basic positioning
    tipEl.style.transform = 'translate(-50%,-8px)';
  }
  function hideTip(){
    if(tipEl) tipEl.classList.remove('show');
  }

  // PRICING COMPARATOR (micro widget)
  // We'll dynamically inject a small comparator into the hero card for quick preview
  const heroCard = document.querySelector('.card.highlight');
  if(heroCard){
    const comp = document.createElement('div');
    comp.className='pricing-compare';
    comp.innerHTML = '\n      <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px">\n        <button class="btn small active" data-plan="month">Monthly</button>\n        <button class="btn small" data-plan="package">Package</button>\n      </div>\n      <div style="display:flex;align-items:baseline;gap:10px">\n        <div style="font-size:1.4rem;font-weight:700">$<span id="price-num">99</span></div>\n        <div class="muted" id="price-term">/month</div>\n      </div>\n    ';
    comp.style.marginTop='12px';
    heroCard.appendChild(comp);

    const priceNum = comp.querySelector('#price-num');
    const priceTerm = comp.querySelector('#price-term');
    const btns = comp.querySelectorAll('button[data-plan]');
    // Pricing values (unique names & framing)
    const pricing = {month:99,package:399};
    let current = pricing.month;

    function animateNumber(el,from,to,duration){
      const start = performance.now();
      function frame(now){
        const t = Math.min(1,(now-start)/duration);
        const value = Math.round(from + (to-from)*t);
        el.textContent = value;
        if(t < 1) requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    }

    btns.forEach(b=>{
      b.addEventListener('click',()=>{
        btns.forEach(x=>x.classList.remove('active'));
        b.classList.add('active');
        const plan = b.getAttribute('data-plan');
        const target = pricing[plan];
        animateNumber(priceNum,parseInt(priceNum.textContent,10), target, 500);
        priceTerm.textContent = plan==='month'?'/month':'one-time package';
      });
    });
    // style small buttons
    comp.querySelectorAll('.btn.small').forEach(b=>{b.style.padding='6px 8px';b.style.borderRadius='8px';b.style.fontSize='0.85rem'});
  }

});
