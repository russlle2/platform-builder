(function(){
  // Year update
  document.getElementById('year').textContent = new Date().getFullYear();

  // Testimonial rotation
  const testimonials = Array.from(document.querySelectorAll('.testimonial'));
  const badges = document.getElementById('badges');
  const badgeTip = document.getElementById('badgeTip');
  let tIndex = 0;
  function showTest(i){
    testimonials.forEach((el,idx)=>el.classList.toggle('active',idx===i));
    // highlight badge if matches data-badge
    const active = testimonials[i];
    const key = active.getAttribute('data-badge');
    Array.from(badges.querySelectorAll('.badge')).forEach(b=>b.classList.toggle('active', b.getAttribute('data-key')===key));
  }
  showTest(0);
  setInterval(()=>{
    tIndex = (tIndex+1) % testimonials.length;
    showTest(tIndex);
  },4500);

  // Badge tooltips
  badges.addEventListener('mouseover', function(e){
    const btn = e.target.closest('.badge');
    if(!btn) return;
    const tip = btn.getAttribute('data-tip');
    badgeTip.textContent = tip;
  });
  badges.addEventListener('mouseout', function(){ badgeTip.textContent = ''; });

  // Pricing comparator with animated numbers
  const toggle = document.getElementById('priceToggle');
  const nums = Array.from(document.querySelectorAll('.price .num'));

  function animatePrice(el, from, to){
    const dur = 500; // ms
    const start = performance.now();
    function step(now){
      const t = Math.min(1,(now-start)/dur);
      const val = Math.round(from + (to-from)*t);
      el.textContent = val;
      if(t<1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function updatePrices(isPackage){
    nums.forEach(n=>{
      const parent = n.closest('.price');
      const month = parseInt(parent.getAttribute('data-month'),10);
      const pack = parseInt(parent.getAttribute('data-package'),10);
      const current = parseInt(n.textContent,10) || month;
      const target = isPackage ? pack : month;
      animatePrice(n,current,target);
    });
    // update toggle label
    const label = document.querySelector('.toggle-label');
    label.textContent = isPackage ? 'Package' : 'Monthly';
  }

  toggle.addEventListener('change',function(){ updatePrices(toggle.checked); });

  // Initialize prices based on default toggle state
  updatePrices(toggle.checked);

  // Accessibility: keyboard focus states for badges
  Array.from(document.querySelectorAll('.badge')).forEach(b=>{
    b.addEventListener('focus', ()=> badgeTip.textContent = b.getAttribute('data-tip'));
    b.addEventListener('blur', ()=> badgeTip.textContent = '');
  });

})();