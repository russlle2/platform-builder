(function(){
  // Scroll-triggered reveal
  const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const reveals = document.querySelectorAll('.reveal');

  function revealElement(el){
    el.classList.add('is-visible');
  }

  if(prefersReduced){
    reveals.forEach(revealElement);
  } else if('IntersectionObserver' in window){
    const obs = new IntersectionObserver((entries, observer)=>{
      entries.forEach(entry=>{
        if(entry.isIntersecting){
          revealElement(entry.target);
          observer.unobserve(entry.target);
        }
      });
    },{threshold:0.12});
    reveals.forEach(r=>obs.observe(r));
  } else {
    // fallback
    reveals.forEach(revealElement);
  }

  // Simple nav toggle
  const toggle = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.main-nav');
  if(toggle){
    toggle.addEventListener('click', ()=>{
      const expanded = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!expanded));
      if(nav) nav.style.display = expanded ? '' : 'flex';
    });
  }

  // Session Planner
  const planner = (function(){
    const form = document.getElementById('planner-form');
    const btn = document.getElementById('sp-generate');
    const clear = document.getElementById('sp-clear');
    const outputWrap = document.getElementById('sp-output');
    const summaryEl = document.getElementById('sp-summary');
    const copyBtn = document.getElementById('sp-copy');
    const dlBtn = document.getElementById('sp-download');

    function buildPlan(){
      const name = document.getElementById('sp-name').value.trim();
      const intent = document.getElementById('sp-intent').value;
      const mood = document.getElementById('sp-mood').value;
      const time = document.getElementById('sp-time').value;
      const delivery = document.getElementById('sp-delivery').value;
      const considerations = document.getElementById('sp-considerations').value;

      // Simple recommendation logic
      const blends = {
        relax:['Lavender','Petitgrain','Sweet Orange'],
        focus:['Rosemary','Lemon','Basil'],
        ground:['Vetiver','Cedarwood','Frankincense'],
        energy:['Grapefruit','Peppermint','Bergamot']
      };

      const selected = blends[intent] || blends.relax;
      const shortList = selected.slice(0,3).join(', ');

      const dilution = (delivery==='topical')? '5% recommended (30ml carrier = 15 drops essential total)':'Inhalation or diffuser; topical not needed';

      const safetyNotes = [];
      safetyNotes.push('Perform a patch test for topical applications and stop if irritation occurs.');
      if(considerations==='pets') safetyNotes.push('Use pet-safe options and avoid direct exposure to animals; ventilate space.');
      if(considerations==='pregnancy') safetyNotes.push('Some oils are avoided during pregnancy; consult your healthcare provider for topical use.');
      if(considerations==='sensitive') safetyNotes.push('Use lower dilutions and shorter exposures.');

      const planLines = [];
      planLines.push(name?`Client: ${name}`:'Client: (unnamed)');
      planLines.push(`Intention: ${intent} — ${time} minutes via ${delivery}`);
      planLines.push(`Mood context: ${mood}`);
      planLines.push('Recommended single-session blend: ' + shortList + '.');
      planLines.push('Suggested delivery: ' + (delivery==='diffuse'? 'Diffuse in a small room with intermittent cycles.' : (delivery==='inhaler'? 'Personal inhaler: 1-2 gentle inhales when needed.' : (delivery==='topical'? 'Topical roll-on at suggested dilution.' : 'Room spritz, light misting.'))));
      planLines.push('Dilution guidance: ' + dilution);
      planLines.push('Safety notes:');
      safetyNotes.forEach(n=>planLines.push('- ' + n));
      planLines.push('\nSession sketch:');
      planLines.push((time==='5')? 'Quick inhale: 1 min focused breathing with inhaler, then resume activity.' : (time==='15')? '15-minute guided inhalation or diffuser cycle; sit quietly and breathe.' : '30-minute session: a gentle diffuser cycle and a grounding topical application (if appropriate).');

      return planLines.join('\n');
    }

    function showPlan(){
      const text = buildPlan();
      summaryEl.textContent = text;
      outputWrap.hidden = false;
    }

    function copyPlan(){
      const text = summaryEl.textContent || '';
      if(!text) return;
      if(navigator.clipboard && navigator.clipboard.writeText){
        navigator.clipboard.writeText(text).then(()=>{
          copyBtn.textContent = 'Copied';
          setTimeout(()=>copyBtn.textContent = 'Copy summary',1200);
        });
      } else {
        // fallback
        const ta = document.createElement('textarea');
        ta.value = text; document.body.appendChild(ta); ta.select();
        try{document.execCommand('copy'); copyBtn.textContent = 'Copied'; setTimeout(()=>copyBtn.textContent = 'Copy summary',1200);}catch(e){}
        document.body.removeChild(ta);
      }
    }

    function downloadPlan(){
      const text = summaryEl.textContent || '';
      if(!text) return;
      const blob = new Blob([text],{type:'text/plain'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'session-plan.txt'; document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }

    if(btn) btn.addEventListener('click', showPlan);
    if(clear) clear.addEventListener('click', ()=>{form.reset(); summaryEl.textContent=''; outputWrap.hidden=true;});
    if(copyBtn) copyBtn.addEventListener('click', copyPlan);
    if(dlBtn) dlBtn.addEventListener('click', downloadPlan);

    return {buildPlan};
  })();
})();