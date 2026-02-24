(function(){
  // Utilities
  function qp(selector, ctx){ return (ctx||document).querySelector(selector) }
  function qpa(selector, ctx){ return Array.from((ctx||document).querySelectorAll(selector)) }

  // Year
  document.getElementById('year').textContent = new Date().getFullYear();

  // Testimonial gallery
  const gallery = qp('#testimonialGallery');
  const tests = qpa('.gallery .testimonial');
  const dots = qp('#testDots');
  const prevBtn = qp('#prevTest');
  const nextBtn = qp('#nextTest');
  let current = 0;
  let galleryTimer = null;

  function makeDots(){
    dots.innerHTML = '';
    tests.forEach((t,i)=>{
      const d = document.createElement('button');
      d.className = 'dot';
      d.setAttribute('aria-label','Show testimonial '+(i+1));
      d.textContent = i+1;
      d.addEventListener('click',()=>show(i));
      dots.appendChild(d);
    });
    updateDots();
  }
  function updateDots(){
    qpa('.dot', dots).forEach((d,i)=> d.classList.toggle('active', i===current));
  }
  function show(i){
    tests.forEach((t,idx)=>{
      t.style.display = idx===i? 'block' : 'none';
      t.setAttribute('aria-hidden', idx===i? 'false' : 'true');
    });
    current = i;
    updateDots();
    resetTimer();
  }
  function next(){ show((current+1) % tests.length) }
  function prev(){ show((current-1+tests.length) % tests.length) }
  function resetTimer(){ if(galleryTimer) clearInterval(galleryTimer); galleryTimer = setInterval(next,5000) }

  makeDots(); show(0);
  prevBtn.addEventListener('click', prev);
  nextBtn.addEventListener('click', next);

  // Badge tooltips (small custom enhancement)
  document.querySelectorAll('.cred .logos li').forEach(li=>{
    li.addEventListener('mouseenter', (e)=>{
      const tip = document.createElement('div');
      tip.className = 'org-tip';
      tip.textContent = li.getAttribute('title') || li.textContent;
      tip.style.position = 'absolute';
      tip.style.background = '#022';
      tip.style.color = '#b8ffe6';
      tip.style.padding = '6px 8px';
      tip.style.borderRadius = '6px';
      tip.style.fontSize = '12px';
      document.body.appendChild(tip);
      function move(ev){ tip.style.left = (ev.pageX + 12) + 'px'; tip.style.top = (ev.pageY + 12) + 'px'; }
      move(e);
      li._move = move;
      li.addEventListener('mousemove', move);
      li._tip = tip;
    });
    li.addEventListener('mouseleave', ()=>{
      if(li._tip){ document.body.removeChild(li._tip); li.removeEventListener('mousemove', li._move); li._tip = null }
    });
  });

  // Pricing comparator toggle with animated numbers
  const toggle = qp('#priceToggle');
  const priceA = qp('#priceA');
  const priceB = qp('#priceB');

  function animateNumber(el, from, to, duration){
    const start = performance.now();
    function frame(now){
      const t = Math.min(1, (now-start)/duration);
      const val = Math.round(from + (to-from) * (1 - Math.cos(t * Math.PI)) / 2); // ease
      el.textContent = val;
      if(t < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  function refreshPrices(){
    const isPackage = toggle.checked;
    // Read data attributes
    const aMonth = Number(priceA.parentNode.getAttribute('data-month'));
    const aPack = Number(priceA.parentNode.getAttribute('data-package'));
    const bMonth = Number(priceB.parentNode.getAttribute('data-month'));
    const bPack = Number(priceB.parentNode.getAttribute('data-package'));

    animateNumber(priceA, Number(priceA.textContent), isPackage ? aPack : aMonth, 600);
    animateNumber(priceB, Number(priceB.textContent), isPackage ? bPack : bMonth, 600);
    // Suffix adjustments
    priceA.parentNode.querySelector('.suffix').textContent = isPackage ? ' per series' : '/mo';
    priceB.parentNode.querySelector('.suffix').textContent = isPackage ? ' per series' : '/mo';
  }

  toggle.addEventListener('change', refreshPrices);

  // Initialize timer
  resetTimer();

  // Lightweight accessibility: allow left/right arrows to navigate gallery
  document.addEventListener('keydown', function(e){
    if(e.key === 'ArrowLeft') prev();
    if(e.key === 'ArrowRight') next();
  });

  // Next-event teaser (small, local module)
  // In a real site this would be dynamic; here we mock a next event.
  const nextEvent = { title: 'Community Session — Early Evening', date: '2026-03-05', time: '18:30', location: '{{CITY}}' };
  const eventEl = document.createElement('div');
  eventEl.className = 'next-event';
  eventEl.innerHTML = '<strong>Next: </strong>' + nextEvent.title + ' • ' + nextEvent.date + ' • ' + nextEvent.time + ' • ' + nextEvent.location + ' <a href="events.html">See calendar</a>';
  document.querySelector('.wrap').insertAdjacentElement('afterbegin', eventEl);
})();