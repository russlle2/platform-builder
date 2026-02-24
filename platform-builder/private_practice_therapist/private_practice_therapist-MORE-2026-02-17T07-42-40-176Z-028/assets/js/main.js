// Interactive behaviors for planner and intake wizards (local only)
document.addEventListener('DOMContentLoaded',function(){
  // Planner
  const buildBtn = document.getElementById('planner-build');
  const copyBtn = document.getElementById('planner-copy');
  const output = document.getElementById('planner-output');
  function safeVal(id){ const el = document.getElementById(id); return el?el.value.trim():'' }
  function buildPlan(){
    const goal = safeVal('planner-goal')||'Undesignated focus';
    const freq = safeVal('planner-frequency')||'Unspecified rhythm';
    const style = safeVal('planner-style')||'Flexible style';
    const note = safeVal('planner-note');
    let plan = [];
    plan.push('Session Planner — draft');
    plan.push('Focus: '+goal);
    if(freq==='once') plan.push('Recommended frame: Single-session consultation');
    else if(freq==='4') plan.push('Recommended frame: 4-session Navigation Series');
    else if(freq==='ongoing') plan.push('Recommended frame: Ongoing sessions (weekly/biweekly)');
    plan.push('Preferred approach: '+style);
    if(note) plan.push('Notes: '+note);
    plan.push('\nSuggested first meeting agenda:');
    plan.push('- Brief context and immediate concern (10–15 min)');
    plan.push('- Clarify one short-term goal and a small practice to try');
    plan.push('- Decide on rhythm and what success looks like');
    output.textContent = plan.join('\n');
  }
  if(buildBtn) buildBtn.addEventListener('click',function(e){ e.preventDefault(); buildPlan(); });
  if(copyBtn) copyBtn.addEventListener('click',function(){ if(!output.textContent) return; navigator.clipboard.writeText(output.textContent).then(()=>{ copyBtn.textContent='Copied'; setTimeout(()=>copyBtn.textContent='Copy summary',1200); }).catch(()=>{ alert('Copy to clipboard failed. You can select and copy manually.'); }); });

  // Brief screening
  const briefGen = document.getElementById('brief-generate');
  const briefOut = document.getElementById('brief-output');
  const briefCopy = document.getElementById('brief-copy');
  if(briefGen){ briefGen.addEventListener('click',function(e){ e.preventDefault();
      const strengths = document.getElementById('brief-strengths').value.trim();
      const radios = document.querySelectorAll('#screen-brief input[type=radio]');
      const noted = [];
      radios.forEach(r=>{ if(r.checked) noted.push(r.parentNode.textContent.trim()); });
      let text = 'Brief screening snapshot:\n';
      if(noted.length) text += '- Observations: '+noted.join('; ')+'\n';
      else text += '- Observations: none selected\n';
      if(strengths) text += '- Supports/Strengths: '+strengths+'\n';
      text += '\nQuestions to bring to intake:\n- What would I most like to change in the next 2 months?\n- What has helped before?\n- What practical constraints should the clinician know?';
      briefOut.textContent = text;
  }); }
  if(briefCopy){ briefCopy.addEventListener('click',function(){ if(!briefOut.textContent) return; navigator.clipboard.writeText(briefOut.textContent).then(()=>{ briefCopy.textContent='Copied'; setTimeout(()=>briefCopy.textContent='Copy notes',1200); }); }); }

  // Wizard (deep intake navigator)
  const wizard = document.getElementById('wizard');
  if(wizard){
    let step = 1; const steps = wizard.querySelectorAll('.wizard-step');
    function showStep(n){ steps.forEach(s=>s.classList.toggle('active', s.dataset.step==n)); }
    wizard.addEventListener('click',function(e){ const a = e.target.closest('button[data-action]'); if(!a) return; const act=a.dataset.action; if(act==='next'){ step = Math.min(steps.length, step+1); showStep(step); } if(act==='prev'){ step = Math.max(1, step-1); showStep(step); } });
    document.getElementById('wizard-finish').addEventListener('click',function(){
      // collect
      const areas = Array.from(wizard.querySelectorAll('.wizard-step[data-step="1"] input[type=checkbox]')).filter(i=>i.checked).map(i=>i.value);
      const tried = document.getElementById('wizard-tried').value.trim();
      const goals = [];
      if(document.getElementById('wizard-goal1').checked) goals.push(document.getElementById('wizard-goal1').value);
      if(document.getElementById('wizard-goal2').checked) goals.push(document.getElementById('wizard-goal2').value);
      if(document.getElementById('wizard-goal3').checked) goals.push(document.getElementById('wizard-goal3').value);
      const out = [];
      out.push('Intake Navigator — summary for intake');
      out.push('Areas of concern: '+(areas.length?areas.join(', '):'none selected'));
      out.push('What you have tried: '+(tried||'not specified'));
      out.push('Therapy goals: '+(goals.length?goals.join(', '):'not specified'));
      out.push('\nSuggested questions to bring to consultation:');
      out.push('- How might we sequence goals across sessions?');
      out.push('- What small practices can I try between meetings?');
      out.push('- How will we track progress and adjust the plan?');
      const outEl = document.getElementById('wizard-output'); outEl.textContent = out.join('\n');
      // show output area
      step = steps.length; showStep(step);
    });
    document.getElementById('wizard-copy').addEventListener('click',function(){ const out = document.getElementById('wizard-output').textContent; if(!out) return; navigator.clipboard.writeText(out).then(()=>{ this.textContent='Copied'; setTimeout(()=>this.textContent='Copy intake packet',1200); }); });
  }

});
