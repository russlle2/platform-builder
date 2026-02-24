// Interactive widgets: pricing comparator and mood-to-method
document.addEventListener('DOMContentLoaded',function(){
  // Pricing toggle
  const toggle = document.getElementById('price-toggle');
  const labelMonthly = document.querySelector('.label-monthly');
  const labelPackage = document.querySelector('.label-package');
  const amounts = Array.from(document.querySelectorAll('.amount'));

  function animateValue(el, start, end, duration){
    const startTime = performance.now();
    function step(now){
      const t = Math.min(1,(now-startTime)/duration);
      const value = Math.round(start + (end-start)*t);
      el.textContent = '$' + value;
      if(t<1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function setPrices(usePackage){
    amounts.forEach(a => {
      const month = parseInt(a.getAttribute('data-month'),10) || 0;
      const pack = parseInt(a.getAttribute('data-package'),10) || month;
      const from = parseInt(a.textContent.replace(/[^0-9]/g,'')) || (usePackage?month:pack);
      const to = usePackage?pack:month;
      animateValue(a, from, to, 420);
    });
    if(usePackage){
      labelMonthly.classList.remove('active');
      labelPackage.classList.add('active');
    } else {
      labelMonthly.classList.add('active');
      labelPackage.classList.remove('active');
    }
  }

  if(toggle){
    // initialize based on default checked state
    setPrices(toggle.checked);
    toggle.addEventListener('change',function(e){
      setPrices(e.target.checked);
    });
  }

  // Mood-to-Method selector
  const moodButtons = document.querySelectorAll('.mood');
  const methodTitle = document.querySelector('.method-title');
  const methodDesc = document.querySelector('.method-desc');
  const methodCta = document.querySelector('.method-cta');
  const primaryCtas = document.querySelectorAll('.primary-cta');

  const methods = {
    overwhelmed:{
      title:'Micro-anchors & a single metric',
      desc:'Start with two tiny anchors (2–5 minutes) and one daily metric you can track. Short check-ins keep the plan light and steady.',
      cta:'Book a short reset'
    },
    flat:{
      title:'Energy scaffolds',
      desc:'Brief movement, breath, and a small structure to reclaim baseline energy. We design a predictable mini-routine to repeat daily.',
      cta:'Try an energy tune-up'
    },
    busy:{
      title:'Priority-first planning',
      desc:'We map priorities into time blocks and build a pre-commit template so your best work happens during realistic windows.',
      cta:'Schedule a planning day'
    },
    curious:{
      title:'Experiment & measure',
      desc:'Choose one practice to trial with clear criteria. Weekly reviews refine what to keep and what to drop.',
      cta:'Start an experiment'
    }
  };

  function selectMood(key, btn){
    moodButtons.forEach(b=>b.classList.remove('active'));
    if(btn) btn.classList.add('active');
    const m = methods[key] || methods['curious'];
    methodTitle.textContent = m.title;
    methodDesc.textContent = m.desc;
    methodCta.textContent = m.cta + ' — ' + (document.querySelector('.method-note a')?document.querySelector('.method-note a').textContent:'');
    // Update main CTAs to reflect suggested phrasing
    primaryCtas.forEach(el=>{
      el.textContent = m.cta;
      el.setAttribute('data-suggest',key);
    });
  }

  moodButtons.forEach(b=>{
    b.addEventListener('click',function(){
      selectMood(b.getAttribute('data-key'), b);
    });
  });

  // Default selection
  const defaultBtn = document.querySelector('.mood[data-key="curious"]');
  if(defaultBtn) selectMood('curious', defaultBtn);

  // Small nav toggle for mobile
  const navToggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('.main-nav');
  if(navToggle){
    navToggle.addEventListener('click', function(){
      if(nav.style.display==='flex') nav.style.display='none'; else nav.style.display='flex';
    });
  }

});