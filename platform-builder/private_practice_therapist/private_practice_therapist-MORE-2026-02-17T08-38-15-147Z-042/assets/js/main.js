(function(){
  // Planner: dynamic actions, build, copy, download
  const addActionBtn = document.getElementById('add-action');
  const actionsList = document.getElementById('actions-list');
  const buildPlanBtn = document.getElementById('build-plan');
  const planText = document.getElementById('plan-text');
  const copyPlanBtn = document.getElementById('copy-plan');
  const downloadPlanBtn = document.getElementById('download-plan');

  function makeActionField(index){
    const lbl = document.createElement('label');
    lbl.textContent = 'Action ' + index;
    const inp = document.createElement('input');
    inp.type = 'text';
    inp.className = 'planner-action';
    inp.placeholder = 'A small actionable step';
    lbl.appendChild(inp);
    return lbl;
  }

  addActionBtn.addEventListener('click', function(){
    const count = actionsList.querySelectorAll('.planner-action').length + 1;
    actionsList.appendChild(makeActionField(count));
  });

  buildPlanBtn.addEventListener('click', function(){
    const focus = document.getElementById('planner-focus').value.trim();
    const actions = Array.from(document.querySelectorAll('.planner-action')).map(i=>i.value.trim()).filter(Boolean);
    const header = focus ? 'Focus: ' + focus + '\n' : '';
    let body = actions.length ? actions.map((a,i)=> (i+1)+'. '+a).join('\n') : 'No actions listed.';
    const plan = header + '\n' + 'Suggested rhythm:\n- Try 1 or 2 actions for one week\n- Note what changed and bring observations to your next session\n\nActions:\n' + body;
    planText.value = plan;
  });

  copyPlanBtn.addEventListener('click', function(){
    navigator.clipboard.writeText(planText.value).then(()=>{
      copyPlanBtn.textContent = 'Copied';
      setTimeout(()=>copyPlanBtn.textContent = 'Copy',900);
    }).catch(()=>{ alert('Copy failed. You can select and copy manually.'); });
  });

  downloadPlanBtn.addEventListener('click', function(){
    const blob = new Blob([planText.value], {type: 'text/plain'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'session-plan.txt';
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  });

  // Snapshot wizard
  const snapshotBuild = document.getElementById('snapshot-build');
  const snapshotText = document.getElementById('snapshot-text');
  snapshotBuild.addEventListener('click', function(){
    const concern = document.getElementById('snapshot-concern').value.trim();
    const triggers = document.getElementById('snapshot-triggers').value.trim();
    const helped = document.getElementById('snapshot-helped').value.trim();
    const lines = [];
    if(concern) lines.push('Primary concern: ' + concern);
    if(triggers) lines.push('Recent changes/triggers: ' + triggers);
    if(helped) lines.push('What helped before: ' + helped);
    lines.push('\nSuggested talking points for the first session:');
    if(concern) lines.push('- Describe how this concern shows up day to day.');
    lines.push('- Share a recent example or moment related to it.');
    if(helped) lines.push('- Note what has been helpful and whether it still fits.');
    snapshotText.value = lines.join('\n') || 'No input provided.';
  });
  document.getElementById('copy-snapshot').addEventListener('click', function(){
    navigator.clipboard.writeText(snapshotText.value).then(()=>{
      this.textContent = 'Copied';
      const btn = this;
      setTimeout(()=>btn.textContent = 'Copy',900);
    });
  });

  // Reflection Guide
  const reflectionBuild = document.getElementById('reflection-build');
  const reflectionText = document.getElementById('reflection-text');
  reflectionBuild.addEventListener('click', function(){
    const less = document.getElementById('ref-less').value.trim();
    const more = document.getElementById('ref-more').value.trim();
    const action = document.getElementById('ref-action').value.trim();
    const prompts = [];
    prompts.push('What I notice:');
    if(less) prompts.push('- I would like less of: ' + less);
    if(more) prompts.push('- I would like more of: ' + more);
    if(action) prompts.push('\nA small test for the week: ' + action);
    prompts.push('\nConversation starters for a session:');
    prompts.push('- What tends to get in the way of the change you want?');
    prompts.push('- One small sign that would show this is shifting:');
    reflectionText.value = prompts.join('\n') || 'No input provided.';
  });
  document.getElementById('copy-reflection').addEventListener('click', function(){
    navigator.clipboard.writeText(reflectionText.value).then(()=>{
      this.textContent = 'Copied';
      const btn=this; setTimeout(()=>btn.textContent='Copy',900);
    });
  });

})();
