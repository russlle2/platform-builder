(function(){
  // Session Planner
  const buildBtn = document.getElementById('buildPlan');
  const clearBtn = document.getElementById('clearPlan');
  const planOutput = document.getElementById('planOutput');
  const copyPlan = document.getElementById('copyPlan');

  function createPlan(){
    const focus = document.getElementById('focus').value;
    const rhythm = document.getElementById('rhythm').value;
    const style = document.getElementById('style').value;
    const goalsRaw = document.getElementById('goals').value.trim();
    const goals = goalsRaw ? goalsRaw.split(',').map(s=>s.trim()).filter(Boolean) : [];

    let focusLabel = {
      stress: 'Stress management and daily energy',
      relationships: 'Relationships and communication',
      grief: 'Loss, change, or transitions',
      work: 'Work and professional concerns',
      other: 'Personal goals'
    }[focus] || focus;

    let rhythmLabel = {biweekly:'Every two weeks', weekly:'Once per week', monthly:'Monthly check-in'}[rhythm] || rhythm;
    let styleLabel = {skills:'Skills-focused', exploratory:'Reflective exploration', brief:'Goal-focused brief work', mixture:'Mixed approach'}[style] || style;

    let lines = [];
    lines.push('Session Planner — draft');
    lines.push('Primary focus: ' + focusLabel);
    lines.push('Rhythm: ' + rhythmLabel);
    lines.push('Therapeutic emphasis: ' + styleLabel);
    if(goals.length){
      lines.push('Short goals:');
      goals.forEach((g,i)=> lines.push((i+1)+'. '+g));
    } else {
      lines.push('Short goals: (to define)');
    }

    lines.push('\nHow I want sessions to feel: collaborative, practical, and paced to my life.');
    lines.push('Bring this to the consultation to make scheduling and focus clearer.');

    planOutput.textContent = lines.join('\n');
  }

  buildBtn.addEventListener('click', function(e){ e.preventDefault(); createPlan(); });
  clearBtn.addEventListener('click', function(){ document.getElementById('plannerForm').reset(); planOutput.textContent = 'Use the form to create a personalized plan.'; });

  copyPlan.addEventListener('click', function(){
    const text = planOutput.textContent;
    if(!navigator.clipboard) { alert('Copy not supported in this browser'); return; }
    navigator.clipboard.writeText(text).then(()=>{ copyPlan.textContent = 'Copied'; setTimeout(()=> copyPlan.textContent = 'Copy summary',1200); });
  });

  // Intake Wizard
  const wizard = document.getElementById('wizardApp');
  const steps = Array.from(wizard.querySelectorAll('.step'));
  let current = 0;

  function showStep(index){
    steps.forEach((s,i)=> s.style.display = i===index ? 'block' : 'none');
  }
  showStep(0);

  wizard.querySelectorAll('.next').forEach(btn=> btn.addEventListener('click', ()=>{
    if(current < steps.length-1){ current++; showStep(current); }
  }));
  wizard.querySelectorAll('.back').forEach(btn=> btn.addEventListener('click', ()=>{
    if(current>0){ current--; showStep(current); }
  }));

  document.getElementById('finishWizard').addEventListener('click', function(){
    // gather inputs
    const checked = Array.from(document.querySelectorAll('.checks input:checked')).map(i=>i.value);
    const tried = document.getElementById('tried').value.trim();
    const worse = document.getElementById('worse').value.trim();
    const three = document.getElementById('threeMonths').value.trim();
    const supports = document.getElementById('supports').value.trim();

    const parts = [];
    parts.push('Self-screening notes');
    parts.push('Current concerns: ' + (checked.length? checked.join(', '): 'Not specified'));
    parts.push('Strategies tried: ' + (tried || 'Not specified'));
    parts.push('What seems to worsen things: ' + (worse || 'Not specified'));
    parts.push('3-month aims: ' + (three || 'Not specified'));
    parts.push('Current supports: ' + (supports || 'Not specified'));

    // Suggested topics to bring
    const suggestions = [];
    if(checked.includes('anxiety')) suggestions.push('- Examples of when worry appears (times of day, triggers)');
    if(checked.includes('low_mood')) suggestions.push('- Daily routines and small changes in motivation or pleasure');
    if(checked.includes('sleep')) suggestions.push('- Typical sleep schedule and any attempts to change it');
    if(checked.includes('relationships')) suggestions.push('- Recent interactions that felt difficult and what you hope will change');
    if(checked.includes('work')) suggestions.push('- Work demands and boundaries you would like to set');
    if(checked.includes('other')) suggestions.push('- Any other concerns or stresses to mention');

    if(!suggestions.length) suggestions.push('- Top priorities for starting sessions');

    parts.push('\nSuggested details to share with the clinician:');
    parts.push(suggestions.join('\n'));

    const output = document.getElementById('wizardOutput');
    const summary = document.getElementById('wizardSummary');
    summary.textContent = parts.join('\n');
    output.style.display = 'block';

    // scroll the output into view
    output.scrollIntoView({behavior:'smooth'});
  });

  document.getElementById('copyWizard').addEventListener('click', function(){
    const text = document.getElementById('wizardSummary').textContent;
    if(!navigator.clipboard) { alert('Copy not supported'); return; }
    navigator.clipboard.writeText(text).then(()=>{ this.textContent = 'Copied'; setTimeout(()=> this.textContent = 'Copy notes',1200); });
  });

})();