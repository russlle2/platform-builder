// Main interactive behavior: pricing comparator + mood-to-method + small helpers
document.addEventListener('DOMContentLoaded',function(){
  // Year in footer
  var y=document.getElementById('year'); if(y) y.textContent=(new Date()).getFullYear();

  // Pricing comparator
  var toggle=document.getElementById('priceToggle');
  var priceEls=document.querySelectorAll('.price-value');

  function animateValue(el, start, end, duration){
    var startTime=null; var prefix=''; var suffix='';
    if(isNaN(start)) start=0; if(isNaN(end)) end=0;
    if(el.textContent.trim().startsWith('$')) prefix='$';
    function step(timestamp){
      if(!startTime) startTime=timestamp;
      var progress=Math.min((timestamp-startTime)/duration,1);
      var value=Math.round(start + (end-start)*progress);
      el.textContent = (value===0?"--": prefix + value);
      if(progress<1) window.requestAnimationFrame(step);
    }
    window.requestAnimationFrame(step);
  }

  function updatePrices(showPackage){
    priceEls.forEach(function(el){
      var monthly=el.getAttribute('data-monthly');
      var pack=el.getAttribute('data-package');
      var currentText=el.textContent.replace(/[^0-9\-]/g,'');
      var start = parseInt(currentText) || 0;
      var dest = showPackage ? (pack==='--'?0:parseInt(pack)) : (monthly==='--'?0:parseInt(monthly));
      animateValue(el,start,dest,420);
      // adjust unit text nearby
      var unit=el.parentElement.querySelector('.price-unit');
      if(unit){
        if(showPackage) unit.textContent = pack==='--'?'/pack':'/pack';
        else unit.textContent = monthly==='--'?'/session':'/month';
      }
    });
  }

  if(toggle){
    toggle.addEventListener('change',function(){
      updatePrices(toggle.checked);
    });
    // initial set (monthly view)
    updatePrices(false);
  }

  // Mood-to-Method
  var moods={
    overwhelmed: {
      title: 'Small, momentum-building steps',
      desc: 'When things feel like too much, we focus on simple experiments and supportive structure over a few weeks. This reduces decision fatigue and builds a predictable rhythm.',
      cta: 'Start with an intake'
    },
    stuck: {
      title: 'Clarifying stuck points',
      desc: 'If you feel stuck, brief targeted sessions can map patterns and test specific strategies so you can try changes with less uncertainty.',
      cta: 'Book a focused session'
    },
    restless: {
      title: 'Channeling rest into practice',
      desc: 'Restlessness often responds to short accountability and pacing. A cohort that practices weekly can keep energy directed and sustainable.',
      cta: 'Explore the Cohort Lab'
    },
    curious: {
      title: 'A curious, experimental stance',
      desc: 'Curiosity pairs well with brief skill-focused work: plan, try, reflect. We treat therapy like small experiments you can adjust as you go.',
      cta: 'Ask about options'
    }
  };

  var moodBtns=document.querySelectorAll('.mood-btn');
  var methodTitle=document.getElementById('methodTitle');
  var methodDesc=document.getElementById('methodDesc');
  var methodCta=document.getElementById('methodCta');

  moodBtns.forEach(function(btn){
    btn.addEventListener('click',function(){
      moodBtns.forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      var key=btn.getAttribute('data-key');
      var data=moods[key];
      if(!data) return;
      // simple morph animation
      if(methodTitle) { methodTitle.style.opacity=0; setTimeout(()=>{ methodTitle.textContent=data.title; methodTitle.style.opacity=1 },220); }
      if(methodDesc) { methodDesc.style.opacity=0; setTimeout(()=>{ methodDesc.textContent=data.desc; methodDesc.style.opacity=1 },220); }
      if(methodCta){ methodCta.textContent=data.cta; methodCta.setAttribute('href', '{{PRIMARY_CTA_URL}}'); }
    });
  });

  // Accessibility: allow keyboard toggles for mood buttons
  moodBtns.forEach(function(btn){btn.setAttribute('tabindex','0');btn.addEventListener('keydown',function(e){if(e.key==='Enter' || e.key===' ') btn.click();});});

});
