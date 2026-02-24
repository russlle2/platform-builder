(function(){
  // Year
  document.getElementById('year').textContent = new Date().getFullYear();

  // Mood-to-Method mappings for two sections
  const moods = {
    overloaded: {title:'Unclutter & choose','desc':'A 10-minute triage: clear three tasks, set one timer, mark one to delegate. Pair with a focused 30-min session to reorganize the day.','ctaLabel':'Book a quick triage','ctaUrl':'/book.html?plan=triage'},
    flat: {title:'Spark small wins','desc':'Pick one tiny, satisfying task and finish it; then follow a 15-minute guided practice to rebuild momentum. Good for low-energy days.','ctaLabel':'Schedule a short lift','ctaUrl':'/book.html?plan=lift'},
    curious: {title:'Explore with guidance','desc':'Try a brief experiment: one new habit for three days with a short debrief session. Designed to test gently and learn.','ctaLabel':'Try the experiment','ctaUrl':'/programs.html?plan=trial'},
    restless: {title:'Calm & re-anchor','desc':'Two breathing rounds plus a 20-minute session focused on tethering attention and re-establishing steady pacing.','ctaLabel':'Reserve a calm session','ctaUrl':'/book.html?plan=calm'}
  };

  // Attach mood buttons (diagnostic)
  document.querySelectorAll('.diagnostic .mood').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const key = btn.dataset.key;
      applyMood(key,'diagnostic');
      // visual active
      document.querySelectorAll('.diagnostic .mood').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // Attach plan-level radio inputs (plan section) as second Mood-to-Method
  document.querySelectorAll('input[name="plan-mood"]').forEach(radio=>{
    radio.addEventListener('change',()=>{
      const val = radio.value;
      // map small set
      const map = {steady:'flat',reset:'overloaded',build:'curious'};
      applyMood(map[val],'plan');
    });
  });

  function applyMood(key, area){
    const data = moods[key] || {title:'A simple start','desc':'Choose a small step and keep it visible. Sessions pair with daily micro-practices.','ctaLabel':'Begin','ctaUrl':'{{PRIMARY_CTA_URL}}'};
    if(area==='diagnostic'){
      document.getElementById('method-title').textContent = data.title;
      document.getElementById('method-desc').textContent = data.desc;
      const cta = document.getElementById('method-cta');
      cta.textContent = data.ctaLabel;
      cta.href = data.ctaUrl;
    } else if(area==='plan'){
      document.getElementById('plan-title').textContent = data.title;
      document.getElementById('plan-desc').textContent = data.desc;
      const cta = document.getElementById('plan-cta');
      cta.textContent = data.ctaLabel;
      cta.href = data.ctaUrl;
    }
    // gently pulse the CTA to signal change
    const pulseTargets = document.querySelectorAll('#method-cta,#plan-cta');
    pulseTargets.forEach(el=>{el.animate([{transform:'scale(1)'},{transform:'scale(1.04)'},{transform:'scale(1)'}],{duration:420,iterations:1})});
  }

  // Pricing comparator
  const toggle = document.getElementById('price-toggle');
  const tiers = document.querySelectorAll('.pricing .tier');

  function animateNumber(el, start, end, suffix){
    const duration = 520; // ms
    const startTime = performance.now();
    function step(now){
      const t = Math.min(1,(now-startTime)/duration);
      const eased = (1 - Math.cos(Math.PI * t)) / 2; // ease-in-out
      const current = Math.round(start + (end-start) * eased);
      el.textContent = current;
      if(t<1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function updatePrices(isMonthly){
    tiers.forEach(tier=>{
      const priceEl = tier.querySelector('.price .num');
      const month = parseInt(tier.querySelector('.price').dataset.month,10);
      const pack = parseInt(tier.querySelector('.price').dataset.package,10);
      const current = parseInt(priceEl.textContent,10) || 0;
      const target = isMonthly ? month : pack;
      animateNumber(priceEl,current,target);
      // adjust small label
      const small = tier.querySelector('.price small');
      small.textContent = isMonthly ? '/mo' : ' (package)';
    });
    // toggle label
    document.querySelector('.toggle-label').textContent = isMonthly ? 'Monthly' : 'Package';
  }

  // initialize with monthly view
  toggle.checked = true;
  updatePrices(true);

  toggle.addEventListener('change',()=>{
    updatePrices(toggle.checked);
  });

  // Accessibility: keyboard mood nav
  document.querySelectorAll('.mood').forEach(btn=>{btn.setAttribute('tabindex','0');btn.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' ')btn.click();})});

})();