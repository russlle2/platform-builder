// Main JS for testimonial rotation, badge tooltips, and pricing comparator
document.addEventListener('DOMContentLoaded',function(){
  // Testimonials rotation
  (function rotateTestimonials(){
    const container=document.getElementById('testimonials');
    if(!container) return;
    const quotes=Array.from(container.querySelectorAll('.quote'));
    let idx=0;
    quotes.forEach((q,i)=>{q.style.display=i===0? 'block':'none'});
    setInterval(()=>{
      quotes[idx].style.opacity=0;
      setTimeout(()=>{quotes[idx].style.display='none';quotes[idx].style.opacity=1},400);
      idx=(idx+1)%quotes.length;
      quotes[idx].style.display='block';
      quotes[idx].style.opacity=0;
      setTimeout(()=>{quotes[idx].style.opacity=1},30);
    },4500);
  })();

  // Badge tooltip logic
  (function badgeTooltips(){
    let tipEl=null;
    function showTip(text,target){
      hideTip();
      tipEl=document.createElement('div');
      tipEl.className='tooltip';
      tipEl.textContent=text;
      document.body.appendChild(tipEl);
      const r=target.getBoundingClientRect();
      tipEl.style.left=(r.right+8)+'px';
      tipEl.style.top=(window.scrollY + r.top)+'px';
    }
    function hideTip(){if(tipEl && tipEl.parentNode){tipEl.parentNode.removeChild(tipEl);tipEl=null}}
    const badgeEls=document.querySelectorAll('.badge, .cred-badge, .cred-badge, .cred-badge, .cred-badge, .cred-badge, .cred-badge, .cred-badge, .cred-badge, .badge');
    badgeEls.forEach(b=>{
      const tip=b.getAttribute('data-tip');
      if(!tip) return;
      b.addEventListener('mouseenter',()=>showTip(tip,b));
      b.addEventListener('focus',()=>showTip(tip,b));
      b.addEventListener('mouseleave',hideTip);
      b.addEventListener('blur',hideTip);
    });
    window.addEventListener('scroll',hideTip);
  })();

  // Pricing comparator (multiple instances support)
  (function pricingComparator(){
    function animateValue(el, start, end, duration){
      const range=end-start;let startTime=null;
      function step(timestamp){
        if(!startTime) startTime=timestamp;
        const progress=Math.min((timestamp-startTime)/duration,1);
        const val=Math.round(start + range*progress);
        el.textContent = '$' + val + (el.dataset.suffix||'');
        if(progress<1) window.requestAnimationFrame(step);
      }
      window.requestAnimationFrame(step);
    }

    const toggles=document.querySelectorAll('.price-toggle');
    toggles.forEach(toggle=>{
      const targetId=toggle.getAttribute('data-target');
      const targetEl = targetId ? document.getElementById(targetId) : toggle.nextElementSibling;
      const btns=toggle.querySelectorAll('.toggle-btn');
      btns.forEach(btn=>{
        btn.addEventListener('click',()=>{
          btns.forEach(b=>b.classList.remove('active'));
          btn.classList.add('active');
          const mode=btn.getAttribute('data-mode');
          // Find the price element to update
          const priceEl = targetEl || toggle.parentElement.querySelector('.plan-price,.price-value');
          if(!priceEl) return;
          const monthly = parseInt(priceEl.getAttribute('data-monthly')||priceEl.dataset.monthly,10)||0;
          const pack = parseInt(priceEl.getAttribute('data-package')||priceEl.dataset.package,10)||0;
          const currentText = priceEl.textContent||'';
          const numericNow = parseInt(currentText.replace(/[^0-9]/g,''),10)||0;
          const suffix = priceEl.textContent.replace(/[^\/a-z ]/gi,'');
          priceEl.dataset.suffix = suffix.trim();
          const to = mode==='monthly' ? monthly : pack;
          animateValue(priceEl, numericNow, to, 600);
        });
      });
    });

    // Initialize toggles default values
    const priceDisplays=document.querySelectorAll('.plan-price, .price-value');
    priceDisplays.forEach(el=>{
      const m=parseInt(el.getAttribute('data-monthly')||el.dataset.monthly,10)||0;
      const p=parseInt(el.getAttribute('data-package')||el.dataset.package,10)||0;
      // Default to monthly display
      if(m){el.textContent='$'+m + (el.textContent.includes('/')? ' /mo':'')}
    });
  })();

});
