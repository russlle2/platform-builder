(function(){
  // Helper utilities
  function el(id){return document.getElementById(id)}
  function copyText(t){navigator.clipboard && navigator.clipboard.writeText(t)}

  // Session Planner logic
  var plannerBuild = el('planner-build');
  var plannerCopy = el('planner-copy');
  var plannerOutput = el('planner-output');

  function safeDilutionRecommendation(context){
    // context: sensitivity, pregnancy, pets, duration
    var base=2; // percent
    if(context.sensitivity==='high') base=0.5;
    if(context.sensitivity==='medium') base=1.0;
    if(context.duration>=30) base = Math.max(0.5, base - 0.2);
    // pregnancy and pets reduce or change oils; here we just note and set lower
    if(context.pregnancy) base = Math.min(base,0.5);
    if(context.pets) base = Math.min(base,1.0);
    return Math.round(base*10)/10; // one decimal
  }

  function recommendOils(goal, pets, pregnancy){
    var map = {
      relax:['Lavender','Sweet Orange','Roman Chamomile'],
      focus:['Rosemary','Bergamot','Peppermint'],
      sleep:['Lavender','Cedarwood','Marjoram'],
      mood:['Sweet Orange','Grapefruit','Ylang Ylang']
    };
    var list = (map[goal]||map.relax).slice(0,3);
    // adjust for pets/pregnancy: avoid some oils
    if(pets) list = list.filter(function(o){return o!=='Tea Tree' && o!=='Eucalyptus'});
    if(pregnancy) list = list.filter(function(o){return o!=='Clary Sage' && o!=='Rosemary' && o!=='Peppermint'});
    return list.slice(0,3);
  }

  plannerBuild && plannerBuild.addEventListener('click', function(){
    var goal = el('planner-goal').value;
    var duration = Number(el('planner-duration').value);
    var sensitivity = el('planner-sensitivity').value;
    var pets = el('planner-pets').checked;
    var pregnancy = el('planner-pregnancy').checked;
    var dilution = safeDilutionRecommendation({sensitivity:sensitivity,duration:duration,pets:pets,pregnancy:pregnancy});
    var oils = recommendOils(goal,pets,pregnancy);
    var delivery = (sensitivity==='high' || pregnancy) ? 'diffuse in short bursts or use inhaler' : 'diffuse or topical with proper dilution';
    var plan = [];
    plan.push('Session Planner — personalized plan');
    plan.push('Goal: '+goal);
    plan.push('Duration: '+duration+' minutes');
    plan.push('Sensitivity: '+sensitivity);
    plan.push('Delivery: '+delivery);
    plan.push('Suggested oils: '+oils.join(', '));
    plan.push('Suggested dilution: '+dilution+'% (use percent guidance; e.g. for 10ml carrier: '+ Math.max(1,Math.round(0.1*dilution*10))/10 +' ml of essential oil approx)');
    plan.push('Patch test: always do a small patch test on the inner forearm and wait 24 hours. Stop use if irritation occurs.');
    if(pets) plan.push('Pet note: avoid direct application on pets and keep diffuser away from their resting area. Some oils are not recommended for animals.');
    if(pregnancy) plan.push('Pregnancy note: we recommend consulting your healthcare provider before topical use.');
    plan.push('\nThis guidance is non-medical and safety-forward.');
    var output = plan.join('\n');
    plannerOutput.textContent = output;
    plannerCopy.disabled = false;
    plannerCopy.onclick = function(){ copyText(output); plannerCopy.textContent='Copied'; setTimeout(function(){plannerCopy.textContent='Copy Plan'},1500)};
  });

  // Blend builder
  var blendBuild = el('blend-build');
  var blendCopy = el('blend-copy');
  var blendOutput = el('blend-output');

  function containerVolumes(type){
    if(type==='roller') return {ml:10};
    if(type==='diffuser') return {ml:100};
    if(type==='spray') return {ml:100};
    return {ml:10};
  }

  function intensityMultiplier(level){
    if(level==='low') return 0.6;
    if(level==='medium') return 1.0;
    if(level==='high') return 1.4;
    return 1.0;
  }

  function baseRecipeForVibe(vibe){
    var map={
      calm:['Lavender','Bergamot','Cedarwood'],
      clarity:['Peppermint','Rosemary','Lemon'],
      sleep:['Lavender','Marjoram','Vetiver'],
      energize:['Grapefruit','Rosemary','Sweet Orange'],
      grounding:['Patchouli','Frankincense','Vetiver']
    };
    return (map[vibe]||map.calm).slice(0,3);
  }

  blendBuild && blendBuild.addEventListener('click', function(){
    var vibe = el('blend-vibe').value;
    var container = el('blend-container').value;
    var intensity = el('blend-intensity').value;
    var pets = el('blend-pets').checked;
    var pregnancy = el('blend-pregnancy').checked;
    var vol = containerVolumes(container).ml;
    var oils = baseRecipeForVibe(vibe);
    // base dilution percent
    var percent = 2.0; // default
    if(container==='roller') percent = 2.5; // typical
    if(container==='diffuser') percent = 1.0;
    if(container==='spray') percent = 0.8;
    // modify based on intensity and sensitivity flags
    percent = percent * intensityMultiplier(intensity);
    if(pets) percent = Math.min(percent,1.2);
    if(pregnancy) percent = Math.min(percent,0.8);
    percent = Math.round(percent*10)/10;

    // Calculate drops for a small recipe. Approx: 1ml = 20 drops
    var totalOilMl = (percent/100)*vol;
    var totalDrops = Math.max(1,Math.round(totalOilMl * 20));
    // Distribute among oils
    var perOilDrops = [];
    var remaining = totalDrops;
    for(var i=0;i<oils.length;i++){
      var take = Math.round(totalDrops*(i===oils.length-1?1: (1/(i+1))/ ( (1/oils.length)+(1/(oils.length-1)) ) ));
      // fallback simple: even split
      take = Math.round(totalDrops / oils.length);
      perOilDrops.push(take);
      remaining -= take;
    }
    // adjust last
    perOilDrops[perOilDrops.length-1] += remaining;

    var card = [];
    card.push('Blend Card — "'+(vibe.charAt(0).toUpperCase()+vibe.slice(1))+'"');
    card.push('Container: '+container+' ('+vol+' ml)');
    card.push('Intensity: '+intensity+' — suggested dilution: '+percent+'%');
    card.push('Total essential oil: '+(Math.round(totalOilMl*10)/10)+' ml ~ '+totalDrops+' drops');
    card.push('\nIngredients:');
    for(var j=0;j<oils.length;j++){
      card.push('- '+oils[j]+': '+perOilDrops[j]+' drops');
    }
    card.push('\nDirections: Mix with a carrier oil for topical (see dilution). For diffuser, add to reservoir per device guidelines.');
    card.push('Patch test recommended for topical use. Stop if irritation occurs.');
    if(pets) card.push('Pet note: keep diffuser out of pets\' primary resting spaces; avoid applying directly to animals.');
    if(pregnancy) card.push('Pregnancy note: some oils are not recommended; consult your healthcare provider before topical use.');
    card.push('\nNon-medical disclaimer: this is general guidance and not medical advice.');

    var output = card.join('\n');
    blendOutput.textContent = output;
    blendCopy.disabled = false;
    blendCopy.onclick = function(){ copyText(output); blendCopy.textContent='Copied'; setTimeout(function(){blendCopy.textContent='Copy Blend Card'},1500)};
  });

  // Accessibility: keyboard shortcuts for widgets
  document.addEventListener('keydown', function(e){
    if(e.ctrlKey && e.key==='b'){
      var node = el('blend-build'); if(node) node.focus();
    }
    if(e.ctrlKey && e.key==='p'){
      var node = el('planner-build'); if(node) node.focus();
    }
  });

})();