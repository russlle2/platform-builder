// Main interactivity for Session Planner and Blend Builder
document.addEventListener('DOMContentLoaded',function(){
  // Year in footer
  document.getElementById('year').textContent = new Date().getFullYear();

  // Session Planner
  const chips = document.getElementById('focus-chips');
  let selectedFocus = null;
  chips.addEventListener('click', function(e){
    if(!e.target.matches('.chip')) return;
    [...chips.querySelectorAll('.chip')].forEach(c=>c.classList.remove('active'));
    e.target.classList.add('active');
    selectedFocus = e.target.getAttribute('data-focus');
  });

  const buildBtn = document.getElementById('build-plan');
  const copyPlanBtn = document.getElementById('copy-plan');
  const planOutput = document.getElementById('plan-output');

  buildBtn.addEventListener('click', function(){
    const duration = document.getElementById('duration').value;
    const frequency = document.getElementById('frequency').value;
    const tone = document.getElementById('tone').value;
    if(!selectedFocus){
      planOutput.textContent = 'Please choose a focus to build your plan.'; copyPlanBtn.disabled = true; return;
    }
    const summary = buildPlanSummary(selectedFocus,duration,frequency,tone);
    planOutput.textContent = summary;
    copyPlanBtn.disabled = false;
  });

  copyPlanBtn.addEventListener('click', function(){
    navigator.clipboard.writeText(planOutput.textContent).then(()=>{
      copyPlanBtn.textContent = 'Copied!';
      setTimeout(()=>copyPlanBtn.textContent='Copy summary',1500);
    });
  });

  function buildPlanSummary(focus,duration,frequency,tone){
    const lines = [];
    lines.push('Session Planner — personalized summary');
    lines.push('Focus: '+focus);
    lines.push('Duration: '+duration+' minutes');
    lines.push('Frequency: '+frequency);
    lines.push('Tone: '+tone);
    lines.push('Suggested routine:');
    lines.push('- Begin with 2 slow inhales from a chosen scent for 30 seconds.');
    lines.push('- During the session, use a diffuser or inhaler; keep scent subtle and intentional.');
    lines.push('- Close with a short note: 1 minute of quiet reflection or journal.');
    lines.push('Notes: Always perform a patch test for topical use. Consult a healthcare provider if pregnant or caring for infants, and take pet safety into account.');
    return lines.join('\n');
  }

  // Blend Builder
  const buildBlendBtn = document.getElementById('build-blend');
  const copyBlendBtn = document.getElementById('copy-blend');
  const blendOutput = document.getElementById('blend-output');

  buildBlendBtn.addEventListener('click', function(){
    const vibe = document.getElementById('vibe').value;
    const bottleSize = parseInt(document.getElementById('bottle-size').value,10);
    const intensity = parseInt(document.getElementById('intensity').value,10);
    const guide = buildBlend(vibe,bottleSize,intensity);
    blendOutput.innerText = guide.cardText;
    copyBlendBtn.disabled = false;
    copyBlendBtn.dataset.payload = guide.cardText;
  });

  copyBlendBtn.addEventListener('click', function(){
    const text = copyBlendBtn.dataset.payload || '';
    navigator.clipboard.writeText(text).then(()=>{
      copyBlendBtn.textContent = 'Copied!';
      setTimeout(()=>copyBlendBtn.textContent='Copy blend card',1500);
    });
  });

  function buildBlend(vibe,ml,intensity){
    // Simple safe templates (non-medical); dilution percent based on intensity
    const dilutionPercent = intensity; // 1,2,3
    const dropsPerMl = 20; // approx
    const totalDrops = Math.round(ml * dropsPerMl);
    const eoDrops = Math.max(1, Math.round(totalDrops * (dilutionPercent/100)));
    // Create a lightweight blend recipe
    let oils = [];
    if(vibe==='calming') oils = ['Lavender','Roman Chamomile','Sweet Orange'];
    if(vibe==='uplifting') oils = ['Bergamot','Sweet Orange','Grapefruit'];
    if(vibe==='grounding') oils = ['Cedarwood','Frankincense','Vetiver'];
    if(vibe==='sleep') oils = ['Lavender','Cedarwood','Marjoram'];
    if(vibe==='clarity') oils = ['Rosemary','Peppermint','Lemon'];

    // Distribute drops across the oils (simple even split)
    const perOil = Math.max(1,Math.round(eoDrops / oils.length));
    const parts = oils.map(o=>`${o}: ${perOil} drops`).join(', ');

    const dilutionNote = `Dilution guide: ${dilutionPercent}% final concentration for adults when used topically. For a ${ml} ml bottle, add approximately ${eoDrops} drops of essential oil(s) total, then top with carrier oil (e.g., fractionated coconut, jojoba) to fill the bottle. Adjust concentration lower for children, sensitive skin, or if pregnant; consult a professional.`;

    const cardText = `Blend Card — Vibe: ${capitalize(vibe)}\nBottle: ${ml} ml\nIntensity: ${dilutionPercent}%\nOils: ${parts}\n${dilutionNote}\nSafety: Patch test before topical use. Keep away from eyes. Consider pet and pregnancy guidance before use.`;

    return {cardText, dilutionPercent, oils};
  }

  function capitalize(s){return s.charAt(0).toUpperCase()+s.slice(1)}

});
