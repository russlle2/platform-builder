document.addEventListener('DOMContentLoaded',function(){
  // Footer year
  document.getElementById('year').textContent = new Date().getFullYear();

  // Session Planner logic
  const stepsList = document.getElementById('steps-list');
  const addStepBtn = document.getElementById('planner-add-step');
  const generateBtn = document.getElementById('planner-generate');
  const copyPlanBtn = document.getElementById('copy-plan');
  const downloadPlanLink = document.getElementById('download-plan');
  const planOutput = document.getElementById('plan-output');

  function addStep(text){
    const li = document.createElement('li');
    li.textContent = text || 'New step';
    li.setAttribute('contenteditable','true');
    li.className = 'step-item';
    const remove = document.createElement('button');
    remove.textContent = 'Remove';
    remove.style.marginLeft = '8px';
    remove.addEventListener('click',()=> li.remove());
    li.appendChild(remove);
    stepsList.appendChild(li);
  }

  addStepBtn.addEventListener('click',function(e){
    e.preventDefault();
    addStep();
  });

  generateBtn.addEventListener('click',function(e){
    e.preventDefault();
    const title = document.getElementById('plan-title').value.trim() || 'Untitled plan';
    const focus = document.getElementById('plan-focus').value;
    const duration = document.getElementById('plan-duration').value;
    const notes = document.getElementById('plan-notes').value.trim();
    const steps = Array.from(stepsList.querySelectorAll('li.step-item')).map((li,i)=>`${i+1}. ${li.firstChild.textContent.trim()}`);

    const lines = [];
    lines.push(title);
    lines.push('Focus: ' + focus);
    lines.push('Duration: ' + duration + ' minutes');
    lines.push('');
    lines.push('Steps:');
    if(steps.length) lines.push(...steps);
    else lines.push('- No custom steps added');
    if(notes) {
      lines.push('');
      lines.push('Notes:');
      lines.push(notes);
    }
    lines.push('');
    lines.push('Generated at: ' + new Date().toLocaleString());
    const outputText = lines.join('\n');
    planOutput.textContent = outputText;
    // prepare download link
    const blob = new Blob([outputText],{type:'text/plain;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    downloadPlanLink.href = url;
    downloadPlanLink.download = title.replace(/\s+/g,'-').toLowerCase() + '.txt';
  });

  copyPlanBtn.addEventListener('click',function(){
    const text = planOutput.textContent;
    if(!text) return;
    navigator.clipboard.writeText(text).then(()=>{
      copyPlanBtn.textContent = 'Copied';
      setTimeout(()=>copyPlanBtn.textContent = 'Copy Summary',1200);
    }).catch(()=>alert('Copy failed.'));
  });

  // Blend Builder logic
  const blendForm = document.getElementById('blend-form');
  const blendCard = document.getElementById('blend-card');
  const copyBlendBtn = document.getElementById('copy-blend');

  const presets = {
    calm:{name:'Calm',drops:[{oil:'Lavender',drop:3},{oil:'Sweet Orange',drop:2},{oil:'Roman Chamomile',drop:1}],notes:'Soft floral-citrus to invite ease.'},
    focus:{name:'Focus',drops:[{oil:'Rosemary',drop:2},{oil:'Peppermint',drop:2},{oil:'Bergamot',drop:2}],notes:'Crisp, bright notes to support attentive tasks.'},
    uplift:{name:'Uplift',drops:[{oil:'Grapefruit',drop:3},{oil:'Bergamot',drop:2},{oil:'Lavender',drop:1}],notes:'Light citrus blend for mood-lifting moments.'},
    sleep:{name:'Sleep',drops:[{oil:'Lavender',drop:4},{oil:'Cedarwood',drop:2}],notes:'A grounded floral-wood composition for evening.'},
    ground:{name:'Grounding',drops:[{oil:'Vetiver',drop:2},{oil:'Patchouli',drop:1},{oil:'Sweet Orange',drop:2}],notes:'Earthy anchor with a bright lift.'}
  };

  function calculateDilution(baseMl, totalDrops){
    // Approximate: 20 drops per 1 ml (varies). Use 20 d/ml conversion
    const dropsPerMl = 20;
    const totalDropsInMl = totalDrops / dropsPerMl;
    const percent = (totalDropsInMl / baseMl) * 100;
    return percent.toFixed(2);
  }

  blendForm.addEventListener('submit',function(e){
    e.preventDefault();
    const vibe = document.getElementById('blend-vibe').value;
    const baseSize = Number(document.getElementById('blend-base-size').value);
    const user = document.getElementById('blend-user').value;

    const preset = presets[vibe];
    // base calculation: scale drops to chosen base size (default presets assume 10 drops total -> scale)
    const baseDropsTotal = preset.drops.reduce((s,d)=>s+d.drop,0);
    const scaleFactor = (baseSize / 30) * (30/30); // keep simple: target base size influences drop count linearly
    const scaledDrops = preset.drops.map(d=>({oil:d.oil,drop:Math.max(1,Math.round(d.drop * (baseSize/30) * 2))}));
    const totalDrops = scaledDrops.reduce((s,d)=>s+d.drop,0);
    const dilutionPercent = calculateDilution(baseSize,totalDrops);

    // adjust safety phrasing for user group
    let caution = 'Recommended for general adult use. Patch test before topical application.';
    if(user === 'pregnancy') caution = 'Use with extra caution in pregnancy or nursing. Consult a qualified prenatal provider before use.';
    if(user === 'child') caution = 'For children, use lower dilutions and consult a pediatric-aware practitioner.';
    if(user === 'pet') caution = 'Not all oils are safe for pets. Check species-specific guidance and consult a veterinarian.';

    const cardLines = [];
    cardLines.push(preset.name + ' blend — suggested starter');
    cardLines.push('Base: ' + baseSize + ' ml carrier oil');
    cardLines.push('Oils:');
    scaledDrops.forEach(s=> cardLines.push('- ' + s.oil + ': ' + s.drop + ' drops'));
    cardLines.push('Total drops: ' + totalDrops);
    cardLines.push('Approx. dilution: ' + dilutionPercent + '% (approximate)');
    cardLines.push('Notes: ' + preset.notes);
    cardLines.push('Safety: ' + caution);
    cardLines.push('Patch test: apply a small amount to inner forearm in dilution and wait 24 hours for reaction.');
    cardLines.push('Generated: ' + new Date().toLocaleString());

    blendCard.innerHTML = '<pre class="blend-pre">' + cardLines.join('\n') + '</pre>';
  });

  copyBlendBtn.addEventListener('click',function(){
    const pre = blendCard.querySelector('pre');
    if(!pre) return alert('Create a blend first.');
    const text = pre.textContent;
    navigator.clipboard.writeText(text).then(()=>{
      copyBlendBtn.textContent = 'Copied';
      setTimeout(()=>copyBlendBtn.textContent = 'Copy Blend Card',1200);
    }).catch(()=>alert('Copy failed'));
  });

});
