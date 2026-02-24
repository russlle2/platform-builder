document.addEventListener('DOMContentLoaded',function(){
  // Session Planner
  const buildBtn = document.getElementById('buildPlan');
  const copyPlan = document.getElementById('copyPlan');
  const downloadPlan = document.getElementById('downloadPlan');
  const preview = document.getElementById('planPreview');
  const plannerForm = document.getElementById('plannerForm');

  function gatherPlan(){
    const fd = new FormData(plannerForm);
    const concern = fd.get('concern')||'Not specified';
    const length = fd.get('length')||'45 minutes';
    const sessions = fd.get('sessions')||'1';
    const notes = fd.get('notes')||'';
    const goals = fd.getAll('goals');
    const now = new Date().toLocaleString();
    let text = `Session plan generated: ${now}\n`;
    text += `Primary concern: ${concern}\n`;
    text += `Session length: ${length}\n`;
    text += `Planned sessions: ${sessions}\n`;
    text += `Goals:\n`;
    if(goals.length) goals.forEach((g,i)=> text += `  ${i+1}. ${g}\n`);
    else text += '  Not specified\n';
    text += `Notes for clinician:\n${notes || 'None'}\n`;
    return text;
  }

  buildBtn && buildBtn.addEventListener('click', function(){
    const text = gatherPlan();
    preview.textContent = text;
    copyPlan.disabled = false;
    downloadPlan.disabled = false;
  });

  copyPlan && copyPlan.addEventListener('click', async function(){
    try{
      await navigator.clipboard.writeText(preview.textContent);
      copyPlan.textContent = 'Copied';
      setTimeout(()=> copyPlan.textContent='Copy summary',1500);
    }catch(e){
      alert('Copy failed — select and copy manually.');
    }
  });

  downloadPlan && downloadPlan.addEventListener('click', function(){
    const blob = new Blob([preview.textContent],{type:'text/plain'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'session-plan.txt';
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  });

  // Intake Wizard (multi-step)
  const wizardForm = document.getElementById('wizardForm');
  if(wizardForm){
    const steps = Array.from(wizardForm.querySelectorAll('.step'));
    let i = 0;
    function showStep(idx){
      steps.forEach((s,sidx)=> s.hidden = sidx !== idx);
    }
    showStep(0);
    wizardForm.addEventListener('click', function(e){
      const action = e.target.getAttribute('data-action');
      if(!action) return;
      if(action === 'next'){ i = Math.min(steps.length-1, i+1); showStep(i); }
      if(action === 'prev'){ i = Math.max(0, i-1); showStep(i); }
    });

    const buildIntake = document.getElementById('buildIntake');
    const wizardPreview = document.getElementById('wizardPreview');
    const copyWizard = document.getElementById('copyWizard');
    const downloadWizard = document.getElementById('downloadWizard');

    buildIntake.addEventListener('click', function(){
      const fd = new FormData(wizardForm);
      const concerns = fd.get('w.concerns') || 'Not specified';
      const when = fd.get('w.when') || 'Not specified';
      const coping = fd.get('w.coping') || 'Not specified';
      const triggers = fd.get('w.triggers') || 'Not specified';
      const outcomes = fd.get('w.outcomes') || 'Not specified';
      const safety = fd.get('w.safety') || 'None reported';

      // Create clinician-friendly questions to bring
      const questions = [];
      questions.push(`Can you say more about: ${concerns}? (examples of when it happens)`);
      questions.push(`When you first noticed this: ${when} — what changed around that time?`);
      questions.push(`What strategies help or hinder: ${coping} / ${triggers}?`);
      questions.push(`What would be a meaningful next step or sign of progress: ${outcomes}?`);
      if(safety && safety.trim()) questions.push(`Safety note: ${safety} — can we review a plan?`);

      const out = 'Intake Compass — questions to bring to your consultation:\n\n' + questions.map((q,i)=>`${i+1}. ${q}`).join('\n');
      wizardPreview.textContent = out;
      copyWizard.disabled = false;
      downloadWizard.disabled = false;
    });

    copyWizard.addEventListener('click', async ()=>{
      try{ await navigator.clipboard.writeText(wizardPreview.textContent); copyWizard.textContent='Copied'; setTimeout(()=>copyWizard.textContent='Copy',1400);}catch(e){alert('Copy failed');}
    });

    downloadWizard.addEventListener('click', ()=>{
      const blob = new Blob([wizardPreview.textContent],{type:'text/plain'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download='intake-questions.txt'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    });
  }

  // Quick check-in
  const quickForm = document.getElementById('quickForm');
  const buildQuick = document.getElementById('buildQuick');
  const quickPreview = document.getElementById('quickPreview');
  const copyQuick = document.getElementById('copyQuick');

  if(buildQuick){
    buildQuick.addEventListener('click', function(){
      const fd = new FormData(quickForm);
      const stress = fd.get('q.stress');
      const sleep = fd.get('q.sleep');
      const support = fd.get('q.support');
      const worry = fd.get('q.worry') || 'Not specified';

      const prompts = [];
      prompts.push(`Stress level today: ${stress} — any recent spikes or patterns?`);
      prompts.push(`Sleep note: ${sleep} — how does sleep affect your day-to-day?`);
      prompts.push(`Support: ${support} — who do you rely on, and how available are they?`);
      prompts.push(`Most pressing worry: ${worry} — an example that captures it?`);
      prompts.push(`One thing you want from the next session: (describe briefly)`);

      const out = 'Check-in Compass — short prompts:\n\n' + prompts.map((p,i)=>`${i+1}. ${p}`).join('\n');
      quickPreview.textContent = out;
      copyQuick.disabled = false;
    });

    copyQuick.addEventListener('click', async ()=>{
      try{ await navigator.clipboard.writeText(quickPreview.textContent); copyQuick.textContent='Copied'; setTimeout(()=>copyQuick.textContent='Copy',1200);}catch(e){alert('Copy failed');}
    });
  }

});