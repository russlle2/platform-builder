(function(){
  // Session Planner
  const buildBtn = document.getElementById('build-plan');
  const copyPlanBtn = document.getElementById('copy-plan');
  const downloadPlanBtn = document.getElementById('download-plan');
  const planOutput = document.getElementById('plan-output');
  const sessionForm = document.getElementById('session-planner');

  function gatherPlanner(){
    const form = sessionForm;
    const concern = form.concern.value.trim() || 'Not specified';
    const goal = form.goal.value.trim() || 'Short-term improvement';
    const length = form.length.value;
    const freq = form.freq.value;
    const modalities = Array.from(form.querySelectorAll('input[name="modality"]:checked')).map(n=>n.value);
    return {concern,goal,length,freq,modalities};
  }

  function synthesizePlan(data){
    const now = new Date().toLocaleDateString();
    let plan = `Plan generated: ${now}\n`;
    plan += `Primary concern: ${data.concern}\n`;
    plan += `Top goal: ${data.goal}\n`;
    plan += `Session: ${data.length} minutes, suggested cadence: ${data.freq}\n`;
    if(data.modalities.length){
      plan += `Focus areas: ${data.modalities.join(', ')}\n`;
    } else {
      plan += `Focus areas: general whole-person review\n`;
    }
    plan += '\nSuggested first-visit agenda:\n';
    plan += '- Brief history and current routines (15 minutes)\n';
    plan += '- Target 2-3 specific, measurable actions\n';
    plan += '- Simple tracking plan and one check-in metric\n';
    plan += '\nHome practices (first 2 weeks):\n';
    if(data.modalities.includes('Sleep')) plan += '- Nighttime routine adjustments, 1 consistent bedtime\n';
    if(data.modalities.includes('Nutrition')) plan += '- 1 small meal habit change, simple journal\n';
    if(data.modalities.includes('Movement')) plan += '- 10–20 min daily movement practice\n';
    if(data.modalities.includes('Mind-Body')) plan += '- 5 minutes breathing or body scan daily\n';
    plan += '\nFollow-up suggestion: ' + (data.freq==='Weekly' ? 'Weekly check-ins for 4 weeks, then re-evaluate' : (data.freq==='Biweekly' ? 'Biweekly check-ins for 2–3 sessions, then monthly' : 'Monthly check-ins for 3 months')) + '\n';
    plan += '\nNotes: This is an educational plan. Discuss medications and diagnoses with your clinician.';
    return plan;
  }

  function enableCopyDownload(){
    copyPlanBtn.disabled = false;
    downloadPlanBtn.disabled = false;
  }

  buildBtn && buildBtn.addEventListener('click', function(){
    const data = gatherPlanner();
    const text = synthesizePlan(data);
    planOutput.textContent = text;
    enableCopyDownload();
  });

  copyPlanBtn && copyPlanBtn.addEventListener('click', async function(){
    if(!planOutput.textContent) return;
    try{
      await navigator.clipboard.writeText(planOutput.textContent);
      copyPlanBtn.textContent = 'Copied';
      setTimeout(()=>copyPlanBtn.textContent='Copy summary',1500);
    }catch(e){
      copyPlanBtn.textContent = 'Copy failed';
    }
  });

  downloadPlanBtn && downloadPlanBtn.addEventListener('click', function(){
    if(!planOutput.textContent) return;
    const blob = new Blob([planOutput.textContent],{type:'text/plain;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'session-plan.txt';
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  });

  // Whole-person inventory
  const buildAgendaBtn = document.getElementById('build-agenda');
  const copyAgendaBtn = document.getElementById('copy-agenda');
  const agendaOutput = document.getElementById('agenda-output');
  const inventoryForm = document.getElementById('inventory-form');

  function gatherInventory(){
    const checks = Array.from(inventoryForm.querySelectorAll('input[name="area"]:checked')).map(n=>n.value);
    return checks;
  }

  function createAgenda(areas){
    const now = new Date().toLocaleDateString();
    if(areas.length===0){
      return `No areas selected. Consider a broad review visit to build priorities.\n\nSuggested cadence: Initial review, then biweekly brief check-ins until a routine is stable.`;
    }
    let agenda = `Whole-person inventory result: ${now}\n`;
    agenda += `Selected areas: ${areas.join(', ')}\n\n`;
    agenda += 'Prioritized consultation agenda:\n';
    // Prioritize by perceived organ-system clusters
    const priorityMap = {
      'Sleep':1,'Energy':2,'Mood':3,'Digestion':2,'Movement':3,'Breathing':1,'Environment':2,'Medications':1
    };
    areas.sort((a,b)=> (priorityMap[a]||5)-(priorityMap[b]||5));
    areas.forEach((a,i)=>{
      agenda += `${i+1}. ${a} — brief review, targeted questions, one immediate action\n`;
    });

    // follow-up cadence heuristic
    let cadence = 'Monthly check-ins';
    if(areas.length>=5) cadence = 'Biweekly check-ins for 6–8 weeks, then monthly';
    else if(areas.length>=3) cadence = 'Biweekly check-ins for 3 sessions, then monthly';
    else cadence = 'Monthly check-ins with a brief 10–15 minute check-in in 2 weeks if needed';

    agenda += `\nSuggested follow-up cadence: ${cadence}\n`;
    agenda += '\nBrief tools to prepare: a 3-day routine log (sleep, meals, mood) and a medication/supplement list.';
    return agenda;
  }

  buildAgendaBtn && buildAgendaBtn.addEventListener('click', function(){
    const areas = gatherInventory();
    const text = createAgenda(areas);
    agendaOutput.textContent = text;
    copyAgendaBtn.disabled = false;
  });

  copyAgendaBtn && copyAgendaBtn.addEventListener('click', async function(){
    if(!agendaOutput.textContent) return;
    try{
      await navigator.clipboard.writeText(agendaOutput.textContent);
      copyAgendaBtn.textContent = 'Copied';
      setTimeout(()=>copyAgendaBtn.textContent='Copy agenda',1500);
    }catch(e){
      copyAgendaBtn.textContent = 'Copy failed';
    }
  });

})();
