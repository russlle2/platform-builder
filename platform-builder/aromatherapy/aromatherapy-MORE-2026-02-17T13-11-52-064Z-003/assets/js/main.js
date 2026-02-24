// Session Planner and Blend Builder
(function(){
  function el(id){return document.getElementById(id)}

  // Planner
  var buildBtn = el('build-plan');
  var copyPlanBtn = el('copy-plan');
  var planOut = el('plan-output');

  function buildPlan(){
    var goal = el('goal').value;
    var length = el('length').value;
    var env = el('environment').value;
    var notes = el('notes').value.trim();

    var suggestions = {
      calm: 'Lavender + cedar inhalation; a gentle roll-on for wrists.',
      focus: 'Citrus top note with a wood base; short inhalation between tasks.',
      sleep: 'Soft floral and resin notes; diffuse 20 minutes before bed.',
      mood: 'Bright citrus with a light floral lift; personal inhaler for midday.',
      energy: 'Peppermint or bright citrus; brief inhalation on waking.'
    };

    var application = env === 'portable' ? 'personal inhaler or roll-on' : (env === 'desk' ? 'diffuser or inhaler at the desk' : (env === 'bedroom' ? 'diffuser or pillow mist' : 'diffuser/ambient scent'));

    var planText = [];
    planText.push('Session Planner — personalized summary');
    planText.push('Goal: ' + goal);
    planText.push('Length: ' + length + ' minutes');
    planText.push('Environment: ' + env + ' (' + application + ')');
    planText.push('Suggested approach: ' + (suggestions[goal] || 'Gentle inhalation or a diluted roll-on.'));
    if(notes) planText.push('Notes: ' + notes);

    planText.push('\nSafety & notes:');
    planText.push('- This guidance is not medical advice and aromatherapy may support wellbeing.');
    planText.push('- Patch test diluted blends 24 hours prior to extended topical use.');
    planText.push('- Avoid direct application near eyes or mucous membranes.');
    planText.push('- Consult a healthcare provider for pregnancy, nursing, or medical conditions. Keep essential oils away from pets and children.');

    planOut.textContent = planText.join('\n');
    copyPlanBtn.disabled = false;
  }

  function copyPlan(){
    navigator.clipboard.writeText(planOut.textContent).then(function(){
      copyPlanBtn.textContent = 'Copied';
      setTimeout(function(){copyPlanBtn.textContent = 'Copy summary'},1200);
    });
  }

  buildBtn.addEventListener('click', buildPlan);
  copyPlanBtn.addEventListener('click', copyPlan);

  // Blend Builder
  var buildBlendBtn = el('build-blend');
  var copyBlendBtn = el('copy-blend');
  var blendOut = el('blend-output');

  function dropsForVolume(ml, percent){
    // approximate: 1 ml ≈ 20 drops, so total drops = ml * 20
    var totalDrops = ml * 20;
    return Math.round(totalDrops * (percent/100));
  }

  function dilutionGuidance(containerMl){
    // safety-first dilution suggestions
    // 0.5% for sensitive (elderly, children), 1-2% for general topical use, 3% max short-term
    var guide = [];
    guide.push('Dilution guide for ' + containerMl + ' ml:');
    guide.push('- 0.5% (sensitive): ' + dropsForVolume(containerMl,0.5) + ' drops total of essential oils.');
    guide.push('- 1% (gentle): ' + dropsForVolume(containerMl,1) + ' drops total of essential oils.');
    guide.push('- 2% (typical adult topical): ' + dropsForVolume(containerMl,2) + ' drops total of essential oils.');
    guide.push('- 3% (short-term aromatherapy blends): ' + dropsForVolume(containerMl,3) + ' drops total of essential oils.');
    guide.push('Always measure drops carefully; perform a patch test on inner forearm and wait 24 hours.');
    return guide.join('\n');
  }

  function buildBlend(){
    var vibe = el('vibe').value;
    var container = parseInt(el('container').value,10);
    var carrier = el('carrier').value;

    var ml = container; // container value was user-selected ml
    // choose a simple 3-note recipe per vibe
    var recipes = {
      calm: [{name:'Lavender',pct:40},{name:'Cedarwood',pct:35},{name:'Bergamot',pct:25}],
      focus: [{name:'Sweet Orange',pct:45},{name:'Rosemary',pct:30},{name:'Cypress',pct:25}],
      sleep: [{name:'Roman Chamomile',pct:40},{name:'Frankincense',pct:35},{name:'Sweet Marjoram',pct:25}],
      energize: [{name:'Peppermint',pct:40},{name:'Grapefruit',pct:35},{name:'Lemongrass',pct:25}]
    };

    var recipe = recipes[vibe] || recipes.calm;
    var guide = dilutionGuidance(ml);

    // compute drops per note at 1% and 2% for example
    function computeDrops(percentTotal){
      var totalDrops = Math.round(ml * 20 * (percentTotal/100));
      return recipe.map(function(note){
        var d = Math.round(totalDrops * (note.pct/100));
        return {note:note.name,drops:d,pct:note.pct};
      });
    }

    var onePct = computeDrops(1);
    var twoPct = computeDrops(2);

    var out = [];
    out.push('Blend Card — ' + vibe.charAt(0).toUpperCase() + vibe.slice(1));
    out.push('Container: ' + ml + ' ml (' + carrier + ')');
    out.push('\nSuggested composition (by %) and drops for 1% total dilution:');
    onePct.forEach(function(r){ out.push('- ' + r.note + ': ' + r.pct + '% — approx ' + r.drops + ' drops'); });
    out.push('\nFor 2% total dilution (stronger adult use):');
    twoPct.forEach(function(r){ out.push('- ' + r.note + ': ' + r.pct + '% — approx ' + r.drops + ' drops'); });
    out.push('\n' + guide);

    out.push('\nSafety reminders:');
    out.push('- This is informational only and not medical advice.');
    out.push('- Avoid use during pregnancy or consult a licensed professional.');
    out.push('- Keep blends away from pets; many essential oils are toxic to animals.');
    out.push('- Store blends in a cool, dark place and label with date and dilution.');

    blendOut.textContent = out.join('\n');
    copyBlendBtn.disabled = false;
  }

  function copyBlend(){
    navigator.clipboard.writeText(blendOut.textContent).then(function(){
      copyBlendBtn.textContent = 'Copied';
      setTimeout(function(){copyBlendBtn.textContent = 'Copy blend'},1200);
    });
  }

  if(buildBlendBtn) buildBlendBtn.addEventListener('click', buildBlend);
  if(copyBlendBtn) copyBlendBtn.addEventListener('click', copyBlend);

})();