// Session Planner & Blend Builder
document.addEventListener('DOMContentLoaded',function(){
  // Session Planner
  const spGoal = document.getElementById('sp-goal');
  const spDuration = document.getElementById('sp-duration');
  const spDelivery = document.getElementById('sp-delivery');
  const spNotes = document.getElementById('sp-notes');
  const spGenerate = document.getElementById('sp-generate');
  const spOutput = document.getElementById('sp-output');
  const spCopy = document.getElementById('sp-copy');

  function buildSessionText(){
    const goal = spGoal.value;
    const duration = spDuration.value;
    const delivery = spDelivery.value;
    const notes = spNotes.value.trim() || 'None noted';

    const intro = 'Session plan — a short guide to try at home (non-medical)';
    const lines = [];
    lines.push(intro);
    lines.push('Goal: ' + goal);
    lines.push('Duration: ' + duration + ' minutes');
    lines.push('Method: ' + (delivery === 'diffuser' ? 'Diffuser' : delivery === 'inhalation' ? 'Inhalation (cloth or gentle inhaler)' : 'Topical — diluted');
    lines.push('Safety notes: ' + notes);
    lines.push('Suggested approach:');
    if(delivery === 'diffuser'){
      lines.push('- Use a small dose: run diffuser for short cycles of 10–15 minutes, ventilate the space.');
    } else if(delivery === 'inhalation'){
      lines.push('- Add 1–2 drops to a cloth or inhaler. Keep at arm\'s length and breathe gently.');
    } else {
      lines.push('- Use a safe dilution. Perform a patch test before topical use.');
    }
    lines.push('Notes on safety: Always patch test and avoid known allergens. For pregnancy, nursing, children, or pets seek tailored guidance.');
    return lines.join('\n');
  }

  spGenerate.addEventListener('click',function(){
    const text = buildSessionText();
    spOutput.textContent = text;
    spCopy.disabled = false;
  });

  spCopy.addEventListener('click',function(){
    const text = spOutput.textContent;
    if(!text) return;
    navigator.clipboard.writeText(text).then(()=>{
      spCopy.textContent = 'Copied';
      setTimeout(()=> spCopy.textContent = 'Copy summary',1200);
    });
  });

  // Blend Builder
  const bbVibe = document.getElementById('bb-vibe');
  const bbSize = document.getElementById('bb-size');
  const bbStrength = document.getElementById('bb-strength');
  const bbGenerate = document.getElementById('bb-generate');
  const bbOutput = document.getElementById('bb-output');
  const bbCopy = document.getElementById('bb-copy');

  const vibeRecipes = {
    calming:[{oil:'Lavender',part:3},{oil:'Sweet Orange',part:1},{oil:'Roman Chamomile',part:1}],
    grounding:[{oil:'Cedarwood',part:3},{oil:'Vetiver',part:1},{oil:'Bergamot (bergapten-free preferred)',part:1}],
    clarity:[{oil:'Rosemary (camphor-free)',part:2},{oil:'Lemon',part:2},{oil:'Peppermint',part:1}],
    bright:[{oil:'Sweet Orange',part:3},{oil:'Grapefruit',part:1},{oil:'Basil',part:1}]
  };

  function dropsForSizeAndStrength(sizeMl,strPercent){
    // Rough guide: 1 ml ≈ 20 drops. Calculate total drops = sizeMl * 20 * (strPercent/100)
    const totalDrops = Math.round(sizeMl * 20 * (strPercent/100));
    return totalDrops || 1;
  }

  function buildBlendCard(){
    const vibe = bbVibe.value;
    const size = Number(bbSize.value);
    const strengthPercent = Number(bbStrength.value);
    const recipe = vibeRecipes[vibe] || vibeRecipes.calming;
    const totalDrops = dropsForSizeAndStrength(size,strengthPercent);
    const totalParts = recipe.reduce((s,r)=>s+r.part,0);

    const lines = [];
    lines.push('Blend card — non-medical guidance');
    lines.push('Vibe: ' + vibe);
    lines.push('Carrier size: ' + size + ' ml');
    lines.push('Target strength: ' + strengthPercent + '%');
    lines.push('Estimated essential oil drops (total): ' + totalDrops);
    lines.push('Recipe:');
    recipe.forEach(r=>{
      const drops = Math.max(1,Math.round(totalDrops * (r.part/totalParts)));
      lines.push('- ' + r.oil + ': ' + drops + ' drop' + (drops>1?'s':''));
    });
    lines.push('\nDilution guidance:');
    lines.push('- 0.5% ~ very light: ~' + Math.round(size*20*0.005) + ' drops per ' + size + ' ml');
    lines.push('- 1% ~ everyday: ~' + Math.round(size*20*0.01) + ' drops per ' + size + ' ml');
    lines.push('- 2% ~ short-term: ~' + Math.round(size*20*0.02) + ' drops per ' + size + ' ml');
    lines.push('\nSafety notes:');
    lines.push('- For topical use always dilute and perform a patch test.');
    lines.push('- Keep blends away from eyes and mucous membranes.');
    lines.push('- Some oils are not recommended for pregnancy, infants, or sensitive pets. Disclose these before using.');

    return lines.join('\n');
  }

  bbGenerate.addEventListener('click',function(){
    const card = buildBlendCard();
    bbOutput.textContent = card;
    bbCopy.disabled = false;
  });

  bbCopy.addEventListener('click',function(){
    const text = bbOutput.textContent;
    if(!text) return;
    navigator.clipboard.writeText(text).then(()=>{
      bbCopy.textContent = 'Copied';
      setTimeout(()=> bbCopy.textContent = 'Copy blend card',1200);
    });
  });

});
