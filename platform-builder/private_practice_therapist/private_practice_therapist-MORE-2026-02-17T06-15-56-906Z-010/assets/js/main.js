(function(){
  // Proof Gallery rotation
  const testimonials = [
    {text:'"Being in the cohort gave me a practice I could actually keep up with."', who:'— cohort attendee'},
    {text:'"Short private sessions clarified what I wanted to focus on in the group."', who:'— private-session client'},
    {text:'"Clear structure and gentle accountability helped change the daily noise."', who:'— participant'},
    {text:'"I left with small, useful steps instead of vague advice."', who:'— recent joiner'}
  ];
  let idx=0;
  const quoteEl=document.getElementById('quote');
  const attribEl=document.getElementById('attribution');
  function rotateTestimonial(){
    idx=(idx+1)%testimonials.length;
    // fade animate
    quoteEl.style.opacity=0;attribEl.style.opacity=0;
    setTimeout(()=>{
      quoteEl.textContent=testimonials[idx].text;
      attribEl.textContent=testimonials[idx].who;
      quoteEl.style.opacity=1;attribEl.style.opacity=1;
    },350);
  }
  setInterval(rotateTestimonial,5000);

  // Pricing comparator with animated numbers
  const monthlyBtn=document.getElementById('monthlyBtn');
  const packageBtn=document.getElementById('packageBtn');
  const priceValue=document.getElementById('priceValue');

  const prices = {monthly:120, package:420};
  let current='monthly';

  function animateNumber(from,to,duration=500){
    const start=performance.now();
    function frame(now){
      const t=Math.min(1,(now-start)/duration);
      const eased = t<0.5?2*t*t: -1+(4-2*t)*t; // ease
      const value=Math.round(from + (to-from)*eased);
      priceValue.textContent = '$'+value;
      if(t<1) requestAnimationFrame(frame);
      else priceValue.textContent = '$'+to;
    }
    requestAnimationFrame(frame);
  }

  monthlyBtn.addEventListener('click',()=>{
    if(current==='monthly')return;
    monthlyBtn.classList.add('active'); packageBtn.classList.remove('active');
    animateNumber(prices.package,prices.monthly);
    current='monthly';
    // update note text
    document.querySelector('.price-anim .note').textContent='per month';
  });
  packageBtn.addEventListener('click',()=>{
    if(current==='package')return;
    packageBtn.classList.add('active'); monthlyBtn.classList.remove('active');
    animateNumber(prices.monthly,prices.package);
    current='package';
    document.querySelector('.price-anim .note').textContent='one-time package';
  });

  // Mobile nav toggle
  const mToggle=document.querySelector('.mobile-toggle');
  const nav=document.querySelector('.nav nav');
  mToggle && mToggle.addEventListener('click',()=>{
    if(nav.style.display==='flex') nav.style.display='none'; else nav.style.display='flex';
    nav.style.flexDirection='column';
  });

  // Init values
  priceValue.textContent = '$'+prices.monthly;
})();