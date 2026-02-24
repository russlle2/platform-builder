(function(){
  // Simple blend builder and session planner
  function el(id){return document.getElementById(id)}

  var blends = {
    calm: {name:'Calm Blend',notes:['Lavender','Sweet Marjoram','Cedarwood'],description:'Soft, floral-wood aroma to encourage a slower pace.'},
    focus: {name:'Focus Blend',notes:['Rosemary','Lemon','Peppermint (light)'],description:'Crisp, bright notes to anchor attention.'},
    uplift: {name:'Cheer Blend',notes:['Sweet Orange','Grapefruit','Bergamot'],description:'Citrus-forward and light-hearted.'},
    sleep: {name:'Sleep Blend',notes:['Chamomile','Lavender','Bergamot (low)'],description:'Gentle, restful-leaning profile.'},
    ground: {name:'Grounding Blend',notes:['Vetiver (very low)','Frankincense','Patchouli (sparingly)'],description:'Earthy, resinous notes for centering.'}
  };

  function buildDilution(carrierSize,percent){
    var dropsPerMl = 20; // approximate
    var ml = parseInt(carrierSize,10);
    var totalDrops = Math.round(ml * dropsPerMl);
    var essentialDrops = Math.round(totalDrops * (percent/100));
    return {ml:ml,percent:percent,drops:essentialDrops,totalDrops:totalDrops};
  }

  function showBlend(){
    var vibe = el('vibe').value;
    var size = el('carrier').value;
    var data = blends[vibe];
    var card = document.createElement('div');
    card.innerHTML = '<strong>'+data.name+'</strong><p>'+data.description+'</p><p><em>Notes: '+data.notes.join(', ')+'</em></p>';

    // recommended dilution conservative
    var percent = 1; // default 1%
    // adjust for small bottles
    if(size==='5') percent = 1.5;
    if(vibe==='sleep') percent = 0.8; // slightly lower for night

    var dilution = buildDilution(size,percent);

    el('blendCard').innerHTML = '';
    el('blendCard').appendChild(card);

    var guide = 'Recommended topical dilution (non-medical, conservative): '+dilution.percent+'%\n'+
                'Bottle: '+dilution.ml+' mL (~'+dilution.totalDrops+' drops total)\n'+
                'Essential oil drops to add: '+dilution.drops+' drops total\n'+
                'Suggested ratio: Combine the listed essential oils to reach the indicated drop count. Use a neutral carrier like fractionated coconut oil or jojoba.';
    el('dilutionGuide').textContent = guide;
    el('blendResult').hidden = false;
  }

  function copyText(text){
    navigator.clipboard && navigator.clipboard.writeText(text).then(function(){
      alert('Copied to clipboard');
    }, function(){
      // fallback
      var ta = document.createElement('textarea');ta.value=text;document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();alert('Copied to clipboard');
    });
  }

  el('buildBlend').addEventListener('click', function(e){
    e.preventDefault();
    showBlend();
  });

  el('copyBlend').addEventListener('click', function(){
    var card = el('blendCard').innerText;
    var guide = el('dilutionGuide').innerText;
    var out = card+'\n\n'+guide+'\n\nSafety: Patch test before topical use. If pregnant, nursing, or caring for pets, consult specialist guidance.';
    copyText(out);
  });

  // Session planner
  el('plannerForm').addEventListener('submit', function(e){
    e.preventDefault();
    var goal = el('goal').value||'Brief scented practice';
    var duration = el('duration').value;
    var setting = el('setting').value;
    var freq = el('frequency').value;

    var plan = [];
    plan.push('Plan: '+goal);
    plan.push('Duration: '+duration+' minutes');
    plan.push('Setting: '+setting);
    plan.push('Frequency: '+freq);
    plan.push('Suggested micro-routine:');
    plan.push('- Prepare space (5 minutes): clear small area, select a diffuser or personal inhaler.');
    plan.push('- Start (1 minute): 3 slow breaths in/out while noticing scent.');
    plan.push('- Main practice ('+(parseInt(duration,10)-3)+' minutes): set simple intention or task while keeping scent subtle.');
    plan.push('- Close (2 minutes): pause and note any shift. Store blend in labeled bottle.');
    plan.push('\nSafety notes: Use conservative dilutions and patch test before topical use. Keep oils away from eyes and out of reach of children.');

    el('planText').textContent = plan.join('\n');
    el('planResult').hidden = false;
  });

  el('copyPlan').addEventListener('click', function(){
    var text = el('planText').innerText;
    copyText(text);
  });

  // accessibility: simple live tips
  document.addEventListener('keydown', function(e){
    if(e.key==='?' ) alert('Tip: use the Blend Builder to get a conservative dilution guide. Always patch test.');
  });

})();
