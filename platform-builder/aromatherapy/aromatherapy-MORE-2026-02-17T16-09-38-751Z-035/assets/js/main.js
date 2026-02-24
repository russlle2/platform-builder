(function(){
  // Scroll-triggered reveal with respect for prefers-reduced-motion
  function initReveal(){
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const els = document.querySelectorAll('[data-reveal]');
    if(prefersReduced){
      els.forEach(e=>e.classList.add('revealed'));
      return;
    }
    const obs = new IntersectionObserver((entries,io)=>{
      entries.forEach(entry=>{
        if(entry.isIntersecting){
          entry.target.classList.add('revealed');
          io.unobserve(entry.target);
        }
      });
    },{threshold:0.12});
    els.forEach(e=>obs.observe(e));
  }

  // Mobile nav toggle
  function initNav(){
    const btn = document.querySelector('.menu-toggle');
    const nav = document.querySelector('.nav');
    if(!btn) return;
    btn.addEventListener('click',()=>{
      const expanded = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!expanded));
      if(!expanded){
        nav.style.display = 'flex';
      } else {
        nav.style.display = '';
      }
    });
  }

  // Session Planner widget
  function initPlanner(){
    const goal = document.getElementById('goal');
    const scent = document.getElementById('scent-profile');
    const length = document.getElementById('length');
    const pets = document.getElementById('has-pets');
    const pregnant = document.getElementById('pregnant');
    const sensitive = document.getElementById('sensitive');
    const out = document.getElementById('plan-output');
    const gen = document.getElementById('generate');
    const copyBtn = document.getElementById('copy-plan');

    function recommend(){
      // Simple rule-based recommendations, safety-forward
      const g = goal.value;
      const s = scent.value;
      const l = length.value;
      const hasPets = pets.checked;
      const isPreg = pregnant.checked;
      const isSens = sensitive.checked;

      let notes = [];
      notes.push('Plan generated:');
      notes.push('- Goal: ' + (g === 'calm' ? 'Calm / Stress ease' : g === 'focus' ? 'Focus / Clarity' : g === 'sleep' ? 'Support for winding down' : 'Gentle uplift'));
      notes.push('- Scent profile: ' + s);
      notes.push('- Session length: ' + l + ' minutes');

      // Base blend suggestions (non-medical language)
      const blends = {
        calm:['Lavender','Sweet Marjoram','Cedarwood'],
        focus:['Rosemary','Basil','Lemon'],
        sleep:['Lavender','Roman Chamomile','Mandarin'],
        energy:['Grapefruit','Peppermint','Ginger']
      };
      const pick = blends[g] || blends['calm'];
      // Adjust for scent preferences
      let chosen = pick.slice(0,2);
      if(s==='floral') chosen[1] = 'Geranium';
      if(s==='citrus') chosen[0] = 'Sweet Orange';
      if(s==='woody') chosen.push('Vetiver');
      if(s==='herbal') chosen[1] = 'Lavandin';

      notes.push('- Suggested notes: ' + chosen.join(', '));

      // Dilution guidance
      let dilution = '1-2% typical for short topical use (approx 6-12 drops per 30ml carrier).';
      if(l === '5') dilution = '0.5-1% for very short topical contact or a single inhalation practice.';
      if(isSens) dilution = '0.5% or less recommended due to sensitivity.';
      if(isPreg) dilution = 'Use only pregnancy-appropriate oils; lower dilution (0.5-1%) and inhalation-first methods preferred.';

      notes.push('- Dilution guidance: ' + dilution);

      // Delivery method
      let method = 'Inhalation using a diffuser or a tissue inhale. For topical, use diluted roll-on to forearm after patch test.';
      if(hasPets) method = 'Prefer distant diffusion (short bursts), or personal inhalation (tissue) to limit pet exposure.';
      if(isPreg) method = 'Prefer personal inhalation or a small diffuser in a well-ventilated space; avoid direct topical use unless approved.';
      notes.push('- Delivery: ' + method);

      // Safety notes
      notes.push('\nSafety & practical notes:');
      notes.push('- Perform a patch test: apply a small diluted amount to inner forearm and wait 24 hours for reactivity.');
      notes.push('- Avoid undiluted application.');
      notes.push('- If you have pets, select pet-safer oils and ventilate rooms.');
      notes.push('- If pregnant or nursing, disclose status to your practitioner and avoid certain oils.');
      notes.push('- If irritation occurs, discontinue use and consult a qualified provider.');

      // Short ritual
      const ritual = l === '5' ? 'Three steady inhalations from a tissue; breathe normally for one minute.' : l === '15' ? 'Five minutes of focused inhalation, followed by a gentle 5-minute grounding routine.' : 'Full consultation with blend testing and a guided 30-minute practice.';
      notes.push('\nSuggested micro-ritual: ' + ritual);

      return notes.join('\n');
    }

    gen.addEventListener('click',()=>{
      const text = recommend();
      out.textContent = text;
      copyBtn.disabled = false;
    });

    copyBtn.addEventListener('click',async()=>{
      const text = out.textContent || '';
      try{
        await navigator.clipboard.writeText(text);
        copyBtn.textContent = 'Copied';
        setTimeout(()=>copyBtn.textContent = 'Copy summary',2000);
      }catch(e){
        // fallback
        const ta = document.createElement('textarea');
        ta.value = text;document.body.appendChild(ta);ta.select();
        try{document.execCommand('copy');copyBtn.textContent='Copied';setTimeout(()=>copyBtn.textContent='Copy summary',2000)}catch(err){alert('Copy failed — select the plan text and copy manually.')}
        ta.remove();
      }
    });
  }

  document.addEventListener('DOMContentLoaded',()=>{
    initReveal();
    initNav();
    initPlanner();
  });
})();